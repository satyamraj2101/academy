import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;

  const { results } = await db.prepare(`
    SELECT id, amount, redemption_type, status, payout_details, admin_notes, processed_at, created_at
    FROM academy_credit_redemptions WHERE user_id = ? ORDER BY created_at DESC
  `).bind(user.id).all();

  return corsResponse({ success: true, redemptions: results }, 200, request);
};

// Requests a cash payout of earned credits — deducts the balance immediately
// (so it can't be double-spent while the request is pending) and restores it
// if an admin rejects the request.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;

  let body: { amountCents?: number; payoutDetails?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400, request);
  }

  const amountCents = Math.floor(body.amountCents || 0);
  if (amountCents <= 0) return errorResponse('amountCents must be positive', 400, request);
  if (!body.payoutDetails?.trim()) return errorResponse('Payout details (UPI/bank info) are required', 400, request);

  const settings = await db.prepare('SELECT min_payout_cents FROM academy_referral_settings WHERE id = ?').bind('default').first() as any;
  const minPayout = settings?.min_payout_cents ?? 50000;
  if (amountCents < minPayout) {
    return errorResponse(`Minimum payout amount is ${(minPayout / 100).toFixed(2)}`, 400, request);
  }

  const me = await db.prepare('SELECT credit_balance FROM academy_users WHERE id = ?').bind(user.id).first() as any;
  if (!me || me.credit_balance < amountCents) {
    return errorResponse('Insufficient credit balance', 400, request);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare('UPDATE academy_users SET credit_balance = credit_balance - ? WHERE id = ?').bind(amountCents, user.id).run();
  await db.prepare(`
    INSERT INTO academy_credit_redemptions (id, user_id, amount, redemption_type, status, payout_details, created_at)
    VALUES (?, ?, ?, 'cash_payout', 'pending', ?, ?)
  `).bind(id, user.id, amountCents, body.payoutDetails.trim(), now).run();

  return corsResponse({ success: true, id }, 200, request);
};
