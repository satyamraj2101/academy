// Shared referral-commission helper — the one place that awards L1/L2
// commission and claws it back on refund. Called from the actual payment
// finalization paths (payments/verify.ts and the Stripe/Razorpay webhooks),
// not from the free-course direct-enroll endpoint, where paid commission
// never applies anyway.
//
// IMPORTANT CONTEXT: the previous implementation lived only in
// enrollments/index.ts and checked `academy_payments` for a completed row —
// but the real checkout flow (create-order -> verify/webhook) writes to
// `academy_orders`, not `academy_payments`. That meant referral commissions
// were never actually awarded for real paid purchases. This helper reads
// from `academy_orders` (via the paymentId/orderId passed in), which is what
// the live payment flow actually completes.

export async function awardReferralCommission(
  db: D1Database,
  buyerUserId: string,
  courseId: string,
  orderId: string
): Promise<void> {
  // Commission is always denominated in INR (credit_balance is INR paise,
  // and there's no FX conversion elsewhere in this codebase), but must be
  // scaled down by however much of the course's listed price was actually
  // paid — not the sticker price. Otherwise a buyer covering most of the
  // cost with a coupon or wallet credits would still earn the referrer
  // commission on money the platform never received.
  const [order, course] = await Promise.all([
    db.prepare('SELECT amount_cents, currency FROM academy_orders WHERE id = ?').bind(orderId).first() as Promise<any>,
    db.prepare('SELECT price_usd, price_inr FROM academy_courses WHERE id = ?').bind(courseId).first() as Promise<any>,
  ]);
  if (!order || !order.amount_cents || !course || !course.price_inr) return; // free course, zero-value order, or missing data — no commission

  const listedPriceInOrderCurrency = order.currency === 'INR' ? course.price_inr : course.price_usd;
  if (!listedPriceInOrderCurrency) return;
  const paidRatio = Math.min(1, order.amount_cents / listedPriceInOrderCurrency);

  const buyer = await db.prepare('SELECT referred_by, signup_ip_hash FROM academy_users WHERE id = ?').bind(buyerUserId).first() as any;
  if (!buyer?.referred_by) return;

  const settings = await db.prepare('SELECT l1_rate, l2_rate FROM academy_referral_settings WHERE id = ?').bind('default').first() as any;
  const l1Rate = settings?.l1_rate ?? 0.15;
  const l2Rate = settings?.l2_rate ?? 0.05;
  const basePrice = Math.round((course.price_inr as number) * paidRatio);
  const now = new Date().toISOString();

  const l1Referrer = await db.prepare('SELECT id, referred_by, partner_status, signup_ip_hash FROM academy_users WHERE referral_code = ?').bind(buyer.referred_by).first() as any;
  if (!l1Referrer) return;

  const l1Coins = Math.floor(basePrice * l1Rate);
  const l1SharedIp = !!buyer.signup_ip_hash && buyer.signup_ip_hash === l1Referrer.signup_ip_hash;

  await db.prepare(`
    UPDATE academy_users SET credit_balance = credit_balance + ?, total_credits_earned = total_credits_earned + ? WHERE id = ?
  `).bind(l1Coins, l1Coins, l1Referrer.id).run();

  await db.prepare(`
    INSERT INTO academy_referral_credits (id, beneficiary_id, source_user_id, source_event, source_event_id, referral_level, credits_earned, created_at, status, payment_id, flagged_reason)
    VALUES (?, ?, ?, 'course_enrollment', ?, 1, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), l1Referrer.id, buyerUserId, orderId, l1Coins, now,
    l1SharedIp ? 'flagged' : 'confirmed', orderId, l1SharedIp ? 'shared_signup_ip' : null
  ).run();

  // L2 only pays if the L2 referrer (one level above L1) is an approved partner.
  if (l1Referrer.referred_by) {
    const l2Referrer = await db.prepare('SELECT id, partner_status, signup_ip_hash FROM academy_users WHERE referral_code = ?').bind(l1Referrer.referred_by).first() as any;
    if (l2Referrer && l2Referrer.partner_status === 'approved') {
      const l2Coins = Math.floor(basePrice * l2Rate);
      const l2SharedIp = !!buyer.signup_ip_hash && buyer.signup_ip_hash === l2Referrer.signup_ip_hash;

      await db.prepare(`
        UPDATE academy_users SET credit_balance = credit_balance + ?, total_credits_earned = total_credits_earned + ? WHERE id = ?
      `).bind(l2Coins, l2Coins, l2Referrer.id).run();

      await db.prepare(`
        INSERT INTO academy_referral_credits (id, beneficiary_id, source_user_id, source_event, source_event_id, referral_level, credits_earned, created_at, status, payment_id, flagged_reason)
        VALUES (?, ?, ?, 'course_enrollment', ?, 2, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), l2Referrer.id, buyerUserId, orderId, l2Coins, now,
        l2SharedIp ? 'flagged' : 'confirmed', orderId, l2SharedIp ? 'shared_signup_ip' : null
      ).run();
    }
  }
}

// Reverses any referral credit tied to a refunded payment — decrements the
// beneficiary's balance (floored at 0, in case they've already spent some of
// it) and marks the credit row clawed_back so it's excluded from future
// payout calculations.
export async function clawbackReferralCredits(db: D1Database, orderId: string): Promise<void> {
  const { results } = await db.prepare(`
    SELECT id, beneficiary_id, credits_earned FROM academy_referral_credits WHERE payment_id = ? AND status != 'clawed_back'
  `).bind(orderId).all();

  for (const credit of (results as any[])) {
    await db.prepare(`
      UPDATE academy_users SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?
    `).bind(credit.credits_earned, credit.beneficiary_id).run();

    await db.prepare(`UPDATE academy_referral_credits SET status = 'clawed_back' WHERE id = ?`).bind(credit.id).run();
  }
}
