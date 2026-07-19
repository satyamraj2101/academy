import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse } from './middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (!env.DB || !env.ENQUIRY_KV) {
    return errorResponse('Server misconfigured', 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const email = (body.email as string || '').toLowerCase().trim();
  if (!email || !email.includes('@')) {
    return errorResponse('Valid email is required', 400);
  }

  const user = await env.DB.prepare('SELECT id, full_name FROM academy_users WHERE email = ? AND is_active = 1').bind(email).first() as any;

  // Always return success to prevent email enumeration, but only process if user exists
  if (user) {
    const resetToken = crypto.randomUUID() + crypto.randomUUID();
    
    // Store token in KV for 1 hour
    try {
      await env.ENQUIRY_KV.put(`academy:reset:${resetToken}`, email, { expirationTtl: 3600 });
    } catch (e) { console.error('KV error', e); }

    // Send email via Resend (use waitUntil so CF runtime doesn't terminate early)
    if (env.RESEND_API_KEY) {
      const fromEmail = env.RESEND_FROM_EMAIL || 'info@spotclm.com';
      const resetLink = `https://${request.headers.get('host')}/reset-password?token=${resetToken}`;
      
      waitUntil(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: `SpotCLM Academy <${fromEmail}>`,
            to: [email],
            subject: 'Password Reset - SpotCLM Academy',
            text: `Hi ${user.full_name},\n\nYou requested a password reset. Click the link below to set a new password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nThe SpotCLM Team`
          })
        }).catch(e => console.error('Failed to send reset email', e))
      );
    }
  }

  return new Response(JSON.stringify({ success: true, message: 'If that email exists, a reset link has been sent.' }), { status: 200, headers: CORS_HEADERS });
};
