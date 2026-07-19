// SpotCLM — User Session & Event Tracking API
// Called from the frontend on every page view, CTA click, form open, etc.

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
  if (!env.DB) {
    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json() as Record<string, unknown>; } catch { /* ignore */ }

  const {
    sessionId,
    email,
    eventType,
    page,
    element,
    metadata,
    durationMs,
    lang,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
  } = body as Record<string, string>;

  if (!sessionId || !eventType) {
    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  }

  const now = new Date().toISOString();
  const country = request.headers.get('CF-IPCountry') || '';
  const city = request.headers.get('CF-IPCity') || '';
  const userAgent = request.headers.get('User-Agent') || '';
  const ipRaw = request.headers.get('CF-Connecting-IP') || '';

  // Hash IP for privacy
  const ipData = new TextEncoder().encode(ipRaw);
  const ipHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', ipData)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const deviceType = userAgent.includes('Mobile') ? 'mobile'
    : userAgent.includes('Tablet') ? 'tablet' : 'desktop';

  // Upsert user session
  const existingSession = await env.DB
    .prepare('SELECT id, page_views FROM user_sessions WHERE id = ?')
    .bind(sessionId)
    .first() as { id: string; page_views: number } | null;

  if (existingSession) {
    const updates: string[] = ['last_seen = ?'];
    const params: unknown[] = [now];

    if (eventType === 'page_view') {
      updates.push('page_views = page_views + 1');
    }
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (eventType === 'form_submit') {
      updates.push('is_converted = 1');
    }
    params.push(sessionId);
    await env.DB.prepare(`UPDATE user_sessions SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params).run();
  } else {
    await env.DB
      .prepare(`INSERT INTO user_sessions (id, email, ip_hash, country, city, user_agent, device_type, referrer, utm_source, utm_medium, utm_campaign, lang, first_seen, last_seen, page_views, is_converted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        sessionId,
        email || null,
        ipHash,
        country,
        city,
        userAgent.substring(0, 255),
        deviceType,
        referrer || null,
        utmSource || null,
        utmMedium || null,
        utmCampaign || null,
        lang || 'en',
        now,
        now,
        eventType === 'page_view' ? 1 : 0,
        eventType === 'form_submit' ? 1 : 0
      )
      .run();
  }

  // Insert activity event
  await env.DB
    .prepare('INSERT INTO activity_events (id, session_id, email, event_type, page, element, metadata, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(
      crypto.randomUUID(),
      sessionId,
      email || null,
      eventType,
      page || null,
      element || null,
      metadata ? JSON.stringify(metadata) : null,
      durationMs ? Number(durationMs) : null,
      now
    )
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: CORS });
};
