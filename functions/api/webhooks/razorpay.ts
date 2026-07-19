import { Env } from '../academy/auth/middleware';
import { awardReferralCommission, clawbackReferralCredits } from '../academy/_referrals';

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const signature = request.headers.get('x-razorpay-signature');
  if (!signature || !env.RAZORPAY_WEBHOOK_SECRET) {
    return new Response('Missing signature or secret', { status: 400 });
  }

  try {
    const rawBody = await request.clone().text();
    
    // Verify Webhook Signature
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.RAZORPAY_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', keyMaterial, encoder.encode(rawBody));
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const generatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (generatedSignature !== signature) {
      return new Response('Invalid signature', { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    if (payload.event === 'order.paid' || payload.event === 'payment.captured') {
      const entity = payload.payload.payment.entity;
      const orderId = entity.notes?.orderId || entity.order_id;
      const courseId = entity.notes?.courseId;
      const userId = entity.notes?.userId;

      if (!orderId || !courseId || !userId) {
        return new Response('Missing notes metadata', { status: 200 });
      }

      const processPayment = async () => {
        if (!env.DB) return;
        
        // Find order
        const order = await env.DB.prepare('SELECT id, status, coupon_id, credits_applied_cents FROM academy_orders WHERE provider_order_id = ?').bind(orderId).first() as any;
        if (!order) return;

        if (order.status !== 'completed') {
          const now = new Date().toISOString();
          await env.DB.prepare('UPDATE academy_orders SET status = "completed", updated_at = ? WHERE id = ?').bind(now, order.id).run();

          const existing = await env.DB.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?').bind(userId, courseId).first();
          if (!existing) {
            const enrollmentId = crypto.randomUUID();
            await env.DB.prepare(`
              INSERT INTO academy_enrollments (id, user_id, course_id, enrolled_at, status)
              VALUES (?, ?, ?, ?, 'active')
            `).bind(enrollmentId, userId, courseId, now).run();

            if (order.coupon_id) {
              await env.DB.prepare('UPDATE academy_coupons SET uses = uses + 1 WHERE id = ?').bind(order.coupon_id).run();
            }

            await awardReferralCommission(env.DB, userId, courseId, order.id);

            if (order.credits_applied_cents > 0) {
              await env.DB.prepare('UPDATE academy_users SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?').bind(order.credits_applied_cents, userId).run();
            }
          }
        }
      };

      waitUntil(processPayment());
    }

    // Reverse referral commission on refund — the referrer shouldn't keep
    // commission on money the buyer got back.
    if (payload.event === 'refund.processed') {
      const entity = payload.payload.refund.entity;
      const orderId = entity.notes?.orderId;
      if (orderId && env.DB) {
        waitUntil((async () => {
          const order = await env.DB!.prepare('SELECT id, user_id, credits_applied_cents FROM academy_orders WHERE id = ?').bind(orderId).first() as any;
          if (order) {
            await env.DB!.prepare('UPDATE academy_orders SET status = "refunded", updated_at = ? WHERE id = ?').bind(new Date().toISOString(), orderId).run();
            await clawbackReferralCredits(env.DB!, order.id);
            if (order.credits_applied_cents > 0) {
              await env.DB!.prepare('UPDATE academy_users SET credit_balance = credit_balance + ? WHERE id = ?').bind(order.credits_applied_cents, order.user_id).run();
            }
          }
        })());
      }
    }

    return new Response('Webhook received', { status: 200 });

  } catch (err: any) {
    console.error('Razorpay Webhook Error:', err);
    return new Response('Webhook processing failed', { status: 500 });
  }
};
