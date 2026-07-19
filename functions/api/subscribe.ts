interface Env {
  DB?: D1Database;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: CORS });
  }

  const email = (body.email as string) || '';
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Valid email is required' }), { status: 400, headers: CORS });
  }

  const source = (body.source as string) || 'website_footer';
  const createdAt = new Date().toISOString();

  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO subscribers (email, created_at, source) VALUES (?, ?, ?)`
      ).bind(email, createdAt, source).run();
    } catch (e) {
      console.error('D1 Error:', e);
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: CORS });
    }
  }

  return new Response(JSON.stringify({ success: true }), { headers: CORS });
};
