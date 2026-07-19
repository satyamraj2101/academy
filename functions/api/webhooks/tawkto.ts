// SpotCLM — tawk.to Webhook Receiver
// Validates HMAC-SHA1 signature and syncs chat events to D1

interface Env {
  DB?: D1Database;
  TAWK_WEBHOOK_SECRET?: string;
}

const CORS = {
  'Content-Type': 'application/json',
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.text();

  // Require signature verification — fail closed if secret not configured
  if (!env.TAWK_WEBHOOK_SECRET) {
    console.error('TAWK_WEBHOOK_SECRET not configured — rejecting all webhook requests');
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), { status: 503, headers: CORS });
  }

  // Validate HMAC-SHA1 signature from tawk.to
  if (env.TAWK_WEBHOOK_SECRET) {
    const signature = request.headers.get('x-tawk-signature') || '';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.TAWK_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const computed = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (computed !== signature) {
      console.warn('Tawk.to signature mismatch — rejecting request');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: CORS });
    }
  }

  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(body); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  }

  const event = payload.event as string;
  const now = new Date().toISOString();

  if (event === 'chat:start') {
    const chat = payload.chat as Record<string, unknown>;
    const visitor = payload.visitor as Record<string, unknown>;
    const chatId = chat?.id as string;
    const userEmail = (visitor?.email as string) || 'anonymous@unknown.com';
    const userName = (visitor?.name as string) || 'Visitor';

    if (chatId) {
      await env.DB
        .prepare('INSERT OR IGNORE INTO chat_sessions (id, user_email, user_name, status, started_at, last_message_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(chatId, userEmail, userName, 'active', now, now)
        .run();
    }
  }

  if (event === 'chat:end') {
    const chat = payload.chat as Record<string, unknown>;
    const chatId = chat?.id as string;
    if (chatId) {
      await env.DB
        .prepare('UPDATE chat_sessions SET status = ?, resolved_at = ? WHERE id = ?')
        .bind('resolved', now, chatId)
        .run();
    }
  }

  if (event === 'chat:transcript') {
    const chat = payload.chat as Record<string, unknown>;
    const messages = (payload.messages as Array<Record<string, unknown>>) || [];
    const chatId = chat?.id as string;
    const visitor = payload.visitor as Record<string, unknown>;
    const userEmail = (visitor?.email as string) || 'anonymous@unknown.com';
    const userName = (visitor?.name as string) || 'Visitor';

    if (chatId) {
      // Ensure chat session exists
      await env.DB
        .prepare('INSERT OR IGNORE INTO chat_sessions (id, user_email, user_name, status, started_at, last_message_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(chatId, userEmail, userName, 'resolved', now, now)
        .run();

      // Insert messages
      for (const msg of messages) {
        const msgId = `${chatId}-${msg.time}`;
        const senderType = (msg.sender as string) === 'visitor' ? 'user' : 'admin';
        await env.DB
          .prepare('INSERT OR IGNORE INTO chat_messages (id, session_id, sender_type, sender_id, content, sent_at, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(msgId, chatId, senderType, msg.sender || 'unknown', msg.msg || '', msg.time || now, 1)
          .run();
      }
    }
  }

  if (event === 'ticket:create') {
    // Offline form submission — treat as enquiry submission
    const ticket = payload.ticket as Record<string, unknown>;
    const requester = (ticket?.requester as Record<string, unknown>) || {};
    const id = `tawk-ticket-${ticket?.id || crypto.randomUUID()}`;
    await env.DB
      .prepare('INSERT OR IGNORE INTO enquiry_submissions (id, full_name, email, message, source, submitted_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(
        id,
        (requester.name as string) || 'Visitor',
        (requester.email as string) || '',
        (ticket?.message as string) || '',
        'chat_offline_ticket',
        now,
        'new'
      )
      .run();
  }

  return new Response(JSON.stringify({ ok: true }), { headers: CORS });
};
