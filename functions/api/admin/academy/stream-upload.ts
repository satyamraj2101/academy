import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCOUNT_ID?: string;
  CF_STREAM_TOKEN?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;

  if (!env.CF_ACCOUNT_ID || !env.CF_STREAM_TOKEN) {
    return errorResponse('Cloudflare Stream credentials not configured', 500);
  }

  try {
    const data = await request.json() as any;
    const { title, maxDurationSeconds } = data;

    // Call Cloudflare Stream API to get a direct upload URL
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/direct_upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CF_STREAM_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxDurationSeconds: maxDurationSeconds || 3600, // 1 hour default
        creator: admin.email,
        meta: {
          name: title || 'Academy Upload'
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Stream API Error:', text);
      return errorResponse('Failed to generate upload URL', 500);
    }

    const json = await response.json() as any;
    
    await logAdminAction(db, admin.email, 'academy.stream.upload_requested', 'stream', json.result.uid, { title }, request);

    return corsResponse({ 
      success: true, 
      uploadUrl: json.result.uploadURL,
      uid: json.result.uid
    });
  } catch (err: any) {
    console.error('Stream Direct Upload error:', err);
    return errorResponse('Failed to generate upload URL', 500);
  }
};
