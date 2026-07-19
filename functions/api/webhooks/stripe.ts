import { Env } from '../academy/auth/middleware';
import { awardReferralCommission, clawbackReferralCredits } from '../academy/_referrals';

// Note: In Cloudflare Workers, validating Stripe signatures requires bringing a subtle crypto
// implementation of Stripe's signature scheme, or verifying the event manually by calling Stripe API.
// To keep dependencies light, we fetch the Event from Stripe using the ID to ensure it's authentic.

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (!env.STRIPE_SECRET_KEY) {
    return new Response('Stripe secret not configured', { status: 500 });
  }

  try {
    const rawBody = await request.text();
    let eventPayload;
    try {
      eventPayload = JSON.parse(rawBody);
    } catch (e) {
      return new Response('Invalid JSON', { status: 400 });
    }

    // Verify the event is real by fetching it from Stripe
    const stripeRes = await fetch(`https://api.stripe.com/v1/events/${eventPayload.id}`, {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    });

    if (!stripeRes.ok) {
      return new Response('Unverified event', { status: 400 });
    }

    const event = await stripeRes.json() as any;

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;
      const courseId = paymentIntent.metadata?.courseId;
      const userId = paymentIntent.metadata?.userId;

      if (!orderId || !courseId || !userId) {
        return new Response('Missing metadata', { status: 200 });
      }

      const processPayment = async () => {
        if (!env.DB) return;
        
        // Find order
        const order = await env.DB.prepare('SELECT id, status, coupon_id, credits_applied_cents FROM academy_orders WHERE id = ?').bind(orderId).first() as any;
        if (!order) return;

        if (order.status !== 'completed') {
          const now = new Date().toISOString();
          await env.DB.prepare('UPDATE academy_orders SET status = "completed", updated_at = ? WHERE id = ?').bind(now, orderId).run();

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

            await awardReferralCommission(env.DB, userId, courseId, orderId);

            if (order.credits_applied_cents > 0) {
              await env.DB.prepare('UPDATE academy_users SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?').bind(order.credits_applied_cents, userId).run();
            }
          }
        }
      };

      waitUntil(processPayment());
    }

    // A refund reverses any referral commission tied to that order — the
    // referrer shouldn't keep commission on money the buyer got back.
    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const orderId = charge.metadata?.orderId || charge.payment_intent;
      if (orderId && env.DB) {
        waitUntil((async () => {
          const order = await env.DB!.prepare('SELECT user_id, credits_applied_cents FROM academy_orders WHERE id = ?').bind(orderId).first() as any;
          await env.DB!.prepare('UPDATE academy_orders SET status = "refunded", updated_at = ? WHERE id = ?').bind(new Date().toISOString(), orderId).run();
          await clawbackReferralCredits(env.DB!, orderId);
          if (order?.credits_applied_cents > 0) {
            await env.DB!.prepare('UPDATE academy_users SET credit_balance = credit_balance + ? WHERE id = ?').bind(order.credits_applied_cents, order.user_id).run();
          }
        })());
      }
    }

    return new Response('Webhook received', { status: 200 });

  } catch (err: any) {
    console.error('Stripe Webhook Error:', err);
    return new Response('Webhook processing failed', { status: 500 });
  }
};
