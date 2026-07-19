interface Env {
  ASSETS_BUCKET?: R2Bucket;
}

export const onRequestHead: PagesFunction<Env> = (ctx) => onRequestGet(ctx);

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const path = params.path;
  
  if (!path || !Array.isArray(path) || path.length === 0) {
    return new Response('Not found', { status: 404 });
  }

  const key = path.join('/');

  if (!env.ASSETS_BUCKET) {
    return new Response('R2 Bucket not configured', { status: 500 });
  }

  try {
    const object = await env.ASSETS_BUCKET.get(key);

    if (object === null) {
      return new Response('Object Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    
    // Allow public caching for 30 days since assets are immutable
    headers.set('Cache-Control', 'public, max-age=2592000, immutable');
    
    // Add CORS headers so it can be loaded from anywhere (like the video player or canvas)
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, {
      headers,
    });
  } catch (err: any) {
    console.error("Error serving R2 asset:", err);
    return new Response('Internal Error', { status: 500 });
  }
};
