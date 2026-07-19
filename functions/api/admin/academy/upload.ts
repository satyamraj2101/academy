import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
  ASSETS_BUCKET?: R2Bucket;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { admin } = context;

  if (!env.ASSETS_BUCKET) {
    return errorResponse('R2 Bucket is not configured on the server.', 500);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return errorResponse('File is required', 400);
    }

    // Generate a unique filename to prevent collisions
    const ext = file.name.split('.').pop() || 'bin';
    const uniqueKey = `${crypto.randomUUID()}-${Date.now()}.${ext}`;

    // Upload to R2
    await env.ASSETS_BUCKET.put(uniqueKey, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        uploadedBy: admin.email,
        originalName: file.name
      }
    });

    await logAdminAction(context.db, admin.email, 'academy.asset.upload', 'asset', uniqueKey, { fileName: file.name, size: file.size }, request);

    // Return the proxy URL that serves from R2
    const fileUrl = `/api/assets/${uniqueKey}`;

    return corsResponse({ url: fileUrl, key: uniqueKey });
  } catch (err: any) {
    console.error("Asset Upload Error:", err);
    return errorResponse('Internal server error during upload', 500);
  }
};
