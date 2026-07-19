import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user } = authResult.context;

  // Checkout reads (course price/availability, coupon validity) must never see a
  // stale replica — a coupon/course created seconds ago being invisible here means
  // real customers get "not found"/"invalid coupon" errors on brand-new offers.
  // D1's default binding can read from a lagging read replica; withSession('first-primary')
  // forces this request's reads through the primary so writes are visible immediately.
  const session = env.DB!.withSession('first-primary');

  try {
    const data = await request.json() as any;
    const { courseId, provider, couponCode, currency = 'USD', useCreditsCents = 0 } = data; // provider: 'stripe' | 'razorpay'

    if (!courseId || !provider) {
      return errorResponse('Missing courseId or provider', 400);
    }

    if (currency !== 'USD' && currency !== 'INR') {
      return errorResponse('Unsupported currency', 400);
    }

    // 1. Fetch course details
    const course = await session.prepare('SELECT price_usd, price_inr, title FROM academy_courses WHERE id = ? AND (status = \'published\' OR is_published = 1)').bind(courseId).first() as any;
    if (!course) return errorResponse('Course not found or not available', 404);

    // Each currency has its own authoritative price on the course row — INR checkout
    // must charge price_inr, not a converted price_usd (previously always used price_usd
    // regardless of the selected currency/gateway, undercharging INR/Razorpay checkouts).
    let amountCents = currency === 'INR' ? course.price_inr : course.price_usd;
    let couponId = null;

    // 2. Validate and apply coupon
    if (couponCode && amountCents > 0) {
      const coupon = await session.prepare(`
        SELECT id, discount_type, discount_amount, max_uses, uses, expires_at
        FROM academy_coupons
        WHERE code = ? AND is_active = 1
      `).bind(couponCode.toUpperCase()).first() as any;

      if (coupon) {
        let valid = true;
        if (coupon.max_uses && coupon.uses >= coupon.max_uses) valid = false;
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) valid = false;

        if (valid) {
          couponId = coupon.id;
          if (coupon.discount_type === 'percentage') {
            amountCents = Math.max(0, Math.round(amountCents * (1 - coupon.discount_amount / 100)));
          } else if (coupon.discount_type === 'fixed') {
            amountCents = Math.max(0, amountCents - coupon.discount_amount);
          }
        } else {
          return errorResponse('Invalid or expired coupon code', 400);
        }
      } else {
        return errorResponse('Invalid coupon code', 400);
      }
    }

    // 2b. Apply wallet credits — INR only, since credits are earned in INR
    // paise and there's no FX conversion path for a USD checkout.
    let creditsAppliedCents = 0;
    if (useCreditsCents > 0 && currency === 'INR' && amountCents > 0) {
      const me = await session.prepare('SELECT credit_balance FROM academy_users WHERE id = ?').bind(user.id).first() as any;
      const available = me?.credit_balance || 0;
      creditsAppliedCents = Math.min(Math.floor(useCreditsCents), available, amountCents);
      amountCents -= creditsAppliedCents;
    }

    // 3. Check for 100% discount / free courses
    if (amountCents === 0) {
      // Free enrollment flow - skip payment provider entirely
      const orderId = crypto.randomUUID();
      const now = new Date().toISOString();

      await session.prepare(`
        INSERT INTO academy_orders (id, user_id, course_id, amount_cents, currency, provider, provider_order_id, coupon_id, status, credits_applied_cents, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(orderId, user.id, courseId, 0, currency, 'free', `FREE-${orderId}`, couponId, 'completed', creditsAppliedCents, now, now).run();

      // Trigger enrollment immediately
      const enrollmentId = crypto.randomUUID();
      await session.prepare(`
        INSERT INTO academy_enrollments (id, user_id, course_id, enrolled_at, status)
        VALUES (?, ?, ?, ?, 'active')
      `).bind(enrollmentId, user.id, courseId, now).run();

      if (couponId) {
        await session.prepare('UPDATE academy_coupons SET uses = uses + 1 WHERE id = ?').bind(couponId).run();
      }

      // Credits fully covered the cost — deduct the wallet balance now,
      // since there's no payment webhook to trigger it for a free order.
      if (creditsAppliedCents > 0) {
        await session.prepare('UPDATE academy_users SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?').bind(creditsAppliedCents, user.id).run();
      }

      return corsResponse({ success: true, free: true, enrollmentId });
    }

    // 4. Create order with provider
    const orderId = crypto.randomUUID();
    let providerOrderId = '';
    let clientSecret = '';

    if (provider === 'stripe') {
      if (!env.STRIPE_SECRET_KEY) {
        // Fallback to mock for Sandbox testing
        providerOrderId = `mock_pi_${crypto.randomUUID()}`;
        clientSecret = `mock_secret_${crypto.randomUUID()}`;
      } else {
        // Create Stripe PaymentIntent
        const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            amount: amountCents.toString(),
            currency: currency.toLowerCase(),
            'metadata[orderId]': orderId,
            'metadata[courseId]': courseId,
            'metadata[userId]': user.id
          })
        });

        const stripeData = await stripeRes.json() as any;
        if (!stripeRes.ok) {
          console.error('Stripe error:', stripeData);
          return errorResponse(stripeData.error?.message || 'Failed to initialize Stripe payment', 500);
        }

        providerOrderId = stripeData.id;
        clientSecret = stripeData.client_secret;
      }
    } else if (provider === 'razorpay') {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        return errorResponse('Razorpay is not configured', 500);
      }

      // Create Razorpay Order
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountCents, // Razorpay takes smallest currency unit (paise/cents)
          currency: currency.toUpperCase(),
          receipt: orderId,
          notes: {
            courseId,
            userId: user.id
          }
        })
      });

      if (!rzpRes.ok) {
        const err = await rzpRes.text();
        console.error('Razorpay error:', err);
        return errorResponse('Failed to create Razorpay order', 500);
      }

      const rzpData = await rzpRes.json() as any;
      providerOrderId = rzpData.id;
    } else {
      return errorResponse('Invalid provider', 400);
    }

    // 5. Save order to DB
    const now = new Date().toISOString();
    await session.prepare(`
      INSERT INTO academy_orders (id, user_id, course_id, amount_cents, currency, provider, provider_order_id, coupon_id, status, credits_applied_cents, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(orderId, user.id, courseId, amountCents, currency, provider, providerOrderId, couponId, 'pending', creditsAppliedCents, now, now).run();

    return corsResponse({
      success: true,
      free: false,
      orderId,
      providerOrderId,
      clientSecret, // Stripe only
      amount: amountCents,
      currency,
      creditsApplied: creditsAppliedCents,
    });

  } catch (error: any) {
    console.error('Payment create-order error:', error);
    return errorResponse('Internal server error', 500);
  }
};
