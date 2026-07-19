import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { requireInstructor } from './_helpers';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env & { ASSETS_BUCKET?: R2Bucket }> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  if (!env.ASSETS_BUCKET) return errorResponse('R2 bucket is not configured on the server', 500, request);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return errorResponse('File is required', 400, request);

    const ext = file.name.split('.').pop() || 'bin';
    const uniqueKey = `${crypto.randomUUID()}-${Date.now()}.${ext}`;

    await env.ASSETS_BUCKET.put(uniqueKey, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
      customMetadata: { uploadedBy: authResult.context.user.email, originalName: file.name },
    });

    return corsResponse({ url: `/api/assets/${uniqueKey}`, key: uniqueKey }, 200, request);
  } catch (err: any) {
    console.error('Instructor upload error:', err);
    return errorResponse('Upload failed', 500, request);
  }
};
