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
    // Video needs byte ranges: without them a browser cannot seek, which breaks chapter jumps and resume.
    const wantsRange = /^bytes=/.test(request.headers.get('Range') || '');
    const object = wantsRange ? await env.ASSETS_BUCKET.get(key, { range: request.headers }) : await env.ASSETS_BUCKET.get(key);

    if (object === null) {
      return new Response('Object Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Accept-Ranges', 'bytes');

    // Allow public caching for 30 days since assets are immutable
    headers.set('Cache-Control', 'public, max-age=2592000, immutable');

    // Add CORS headers so it can be loaded from anywhere (like the video player or canvas)
    headers.set('Access-Control-Allow-Origin', '*');

    const range = wantsRange ? (object as R2ObjectBody & { range?: { offset?: number; length?: number; suffix?: number } }).range : undefined;
    if (range) {
      const offset = range.suffix !== undefined ? Math.max(0, object.size - range.suffix) : range.offset ?? 0;
      const length = range.suffix !== undefined ? Math.min(range.suffix, object.size) : range.length ?? object.size - offset;
      headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
      headers.set('Content-Length', String(length));
      return new Response(object.body, { status: 206, headers });
    }

    headers.set('Content-Length', String(object.size));
    return new Response(object.body, { headers });
  } catch (err: any) {
    console.error("Error serving R2 asset:", err);
    return new Response('Internal Error', { status: 500 });
  }
};
