import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { awardReferralCommission } from '../_referrals';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  try {
    const data = await request.json() as any;
    const { orderId, providerOrderId, providerSignature } = data; // Razorpay needs signature verification here

    if (!orderId) return errorResponse('Missing orderId', 400);

    const order = await db.prepare('SELECT id, course_id, status, provider, coupon_id, credits_applied_cents FROM academy_orders WHERE id = ? AND user_id = ?').bind(orderId, user.id).first() as any;
    
    if (!order) return errorResponse('Order not found', 404);

    if (order.status === 'completed') {
      return corsResponse({ success: true, message: 'Already enrolled' });
    }

    let isPaymentValid = false;

    if (order.provider === 'stripe') {
      // For Stripe, client doesn't get a signature, just a payment intent ID.
      // We can query Stripe to ensure the PI is actually "succeeded".
      const stripeRes = await fetch(`https://api.stripe.com/v1/payment_intents/${providerOrderId}`, {
        headers: {
          'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
        }
      });
      if (stripeRes.ok) {
        const pi = await stripeRes.json() as any;
        if (pi.status === 'succeeded') {
          isPaymentValid = true;
        }
      }
    } else if (order.provider === 'razorpay') {
      // For Razorpay, we must verify the HMAC-SHA256 signature
      // signature = hmac_sha256(orderId + "|" + paymentId, secret)
      if (providerSignature && data.razorpayPaymentId) {
        const text = `${providerOrderId}|${data.razorpayPaymentId}`;
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(env.RAZORPAY_KEY_SECRET),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signatureBuffer = await crypto.subtle.sign('HMAC', keyMaterial, encoder.encode(text));
        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        const generatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        if (generatedSignature === providerSignature) {
          isPaymentValid = true;
        }
      }
    }

    if (!isPaymentValid) {
      return errorResponse('Payment verification failed', 402);
    }

    const now = new Date().toISOString();

    // Mark order completed
    await db.prepare('UPDATE academy_orders SET status = "completed", updated_at = ? WHERE id = ?').bind(now, orderId).run();

    // Check if already enrolled (to avoid duplicate enrollments if webhook beat us to it)
    const existing = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?').bind(user.id, order.course_id).first();

    if (!existing) {
      const enrollmentId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO academy_enrollments (id, user_id, course_id, enrolled_at, status)
        VALUES (?, ?, ?, ?, 'active')
      `).bind(enrollmentId, user.id, order.course_id, now).run();

      // If coupon used, increment usage
      if (order.coupon_id) {
        await db.prepare('UPDATE academy_coupons SET uses = uses + 1 WHERE id = ?').bind(order.coupon_id).run();
      }

      // Award referral commission now that the purchase is genuinely
      // complete — this is the actual live path a real paid enrollment goes
      // through, unlike the free-course direct-enroll endpoint.
      await awardReferralCommission(db, user.id, order.course_id, orderId);

      // Deduct any wallet credits applied at checkout, now that payment is
      // confirmed (re-checked here rather than at order creation, since the
      // balance could have changed in between).
      if (order.credits_applied_cents > 0) {
        await db.prepare('UPDATE academy_users SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?').bind(order.credits_applied_cents, user.id).run();
      }
    }

    return corsResponse({ success: true });

  } catch (error: any) {
    console.error('Payment verify error:', error);
    return errorResponse('Internal server error', 500);
  }
};
