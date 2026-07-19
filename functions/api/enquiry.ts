// SpotCLM — Enquiry Form Handler
// Dual-writes to KV (existing) + D1 (new admin DB)

interface Env {
  RESEND_API_KEY?: string;
  RESEND_TO_EMAIL?: string;
  RESEND_FROM_EMAIL?: string;
  ENQUIRY_KV?: KVNamespace;
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

  const id = 'cl-' + Math.random().toString(36).substr(2, 9);
  const syncedAt = new Date().toISOString();
  const sessionId = (body.sessionId as string) || null;

  // Write to KV (existing — keep for backward compat)
  if (env.ENQUIRY_KV) {
    try {
      await env.ENQUIRY_KV.put(`enquiry:${id}`, JSON.stringify({ ...body, syncedAt }));
    } catch (e) {
      console.error('KV Error:', e);
    }
  }

  // Write to D1 (new admin DB)
  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT INTO enquiry_submissions (id, session_id, full_name, email, company, phone, service, timeline, budget, message, source, submitted_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        sessionId,
        (body.fullName as string) || null,
        (body.email as string) || null,
        (body.companyName as string) || null,
        (body.phone as string) || null,
        (body.service as string) || null,
        (body.timeline as string) || null,
        (body.budget as string) || null,
        (body.description as string) || null,
        (body.source as string) || 'contact_form',
        syncedAt,
        'new'
      ).run();
    } catch (e) {
      console.error('D1 Error:', e);
    }
  }

  let resendStatus: number | null = null;
  let resendError: string | null = null;
  let confirmationStatus: number | null = null;
  let confirmationError: string | null = null;

  if (env.RESEND_API_KEY) {
    const fromEmail = env.RESEND_FROM_EMAIL || 'info@spotclm.com';

    // 1. Internal notification — sent to the SpotCLM team
    try {
      const emailContent = `
New Enquiry Received via SpotCLM Website
----------------------------------------
Name: ${body.fullName || 'N/A'}
Email: ${body.email || 'N/A'}
Company: ${body.companyName || 'N/A'}
Phone: ${body.phone || 'N/A'}
Service: ${body.service || 'N/A'}
Timeline: ${body.timeline || 'N/A'}
Budget: ${body.budget || 'N/A'}
Message: ${body.description || 'N/A'}

Submission ID: ${id}
Received At: ${syncedAt}
      `.trim();

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `SpotCLM <${fromEmail}>`,
          to: [env.RESEND_TO_EMAIL || 'info@spotclm.com'],
          reply_to: (body.email as string) || undefined,
          subject: `New Enquiry from ${body.fullName || 'Website'} — ${body.service || 'General'}`,
          text: emailContent,
        }),
      });
      resendStatus = resendRes.status;
      if (!resendRes.ok) {
        resendError = await resendRes.text();
      }
    } catch (e: unknown) {
      resendError = (e as Error).message;
    }

    // 2. Confirmation email — sent to the person who submitted the form
    const submitterEmail = (body.email as string) || '';
    if (submitterEmail && submitterEmail.includes('@')) {
      try {
        const firstName = ((body.fullName as string) || '').trim().split(' ')[0] || 'there';
        const serviceLabel = (body.service as string) || '';
        const steps = [
          { n: '1', title: 'Discovery Review', body: 'Within 24 hours, a senior advisor reviews your project specs to confirm we are the right fit.' },
          { n: '2', title: 'Alignment Call', body: 'A 30-minute strategic consultation to clarify scope, timeline, and any immediate technical questions.' },
          { n: '3', title: 'Proposal Delivery', body: 'Receive a detailed engagement plan with firm pricing, delivery milestones, and assigned team structure.' },
        ];
        const stepsHtml = steps.map((s, i) => `
                  <tr>
                    <td style="padding:${i === 0 ? '0' : '24'}px 0 0;" valign="top">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="36" valign="top">
                            <table role="presentation" width="32" height="32" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;border-radius:50%;">
                              <tr><td align="center" valign="middle" style="font-size:14px;font-weight:700;color:#4f46e5;">${s.n}</td></tr>
                            </table>
                          </td>
                          <td valign="top" style="padding-left:16px;">
                            <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#09090b;">${s.title}</p>
                            <p style="margin:0;font-size:14px;line-height:1.6;color:#52525b;">${s.body}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>`).join('');

        const confirmationHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Thanks ${firstName} — your SpotCLM enquiry (${id}) was received. A senior advisor will follow up within 24–72 hours.</div>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);">
            
            <!-- Header with Logo -->
            <tr>
              <td style="padding:48px 40px 32px;text-align:center;border-bottom:1px solid #f4f4f5;">
                <div style="background-color:#ffffff;padding:12px 24px;border-radius:12px;display:inline-block;">
                  <img src="https://www.spotclm.com/assets/brand/logo-lockup.svg?v=3" alt="SpotCLM" width="180" style="display:block;margin:0 auto;height:auto;" />
                </div>
              </td>
            </tr>

            <!-- Success message -->
            <tr>
              <td style="padding:48px 40px 24px;text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    <td width="64" valign="middle">
                      <table role="presentation" width="64" height="64" cellpadding="0" cellspacing="0" style="background-color:#ecfdf5;border-radius:50%;">
                        <tr><td align="center" valign="middle" style="font-size:28px;color:#10b981;">&#10003;</td></tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;font-weight:800;color:#09090b;letter-spacing:-0.03em;">Thanks, ${firstName}!<br/>We've received your enquiry.</h1>
                <p style="margin:0;font-size:16px;line-height:1.6;color:#52525b;">
                  Our strategic advisors are reviewing your${serviceLabel ? ` <strong>${serviceLabel.toLowerCase()}</strong>` : ''} project requirements. We'll be in touch within <strong>24–72 hours</strong>.
                </p>
              </td>
            </tr>

            <!-- Reference Details -->
            <tr>
              <td style="padding:0 40px 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border-radius:16px;border:1px solid #e4e4e7;">
                  <tr>
                    <td style="padding:28px;font-size:14px;color:#3f3f46;line-height:2;">
                      <strong style="color:#a1a1aa;text-transform:uppercase;font-size:11px;font-weight:700;letter-spacing:0.06em;display:block;margin-bottom:16px;">Enquiry Details</strong>
                      <strong style="color:#09090b;display:inline-block;width:90px;">Reference:</strong> <span style="font-family:'JetBrains Mono',Consolas,monospace;background:#f4f4f5;padding:4px 8px;border-radius:6px;color:#4f46e5;font-weight:600;">${id}</span><br/>
                      ${serviceLabel ? `<strong style="color:#09090b;display:inline-block;width:90px;">Service:</strong> ${serviceLabel}<br/>` : ''}
                      ${body.companyName ? `<strong style="color:#09090b;display:inline-block;width:90px;">Company:</strong> ${body.companyName}<br/>` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Timeline -->
            <tr>
              <td style="padding:0 40px 48px;">
                <h2 style="margin:0 0 24px;font-size:14px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.06em;">What happens next?</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${stepsHtml}
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding:0 40px 48px;text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="background-color:#4f46e5;border-radius:12px;text-align:center;">
                      <a href="https://www.spotclm.com" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:18px 36px;border-radius:12px;">Visit SpotCLM Website</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#71717a;">
                  Need to add more details? Just reply directly to this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:48px 40px;background-color:#09090b;text-align:center;">
                <img src="https://www.spotclm.com/assets/brand/logo-lockup-white.svg?v=3" alt="SpotCLM Logo" width="140" style="display:block;margin:0 auto 32px;height:auto;" />
                <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">
                  Certified Experts In
                </p>
                <p style="margin:0 0 32px;font-size:13px;font-weight:500;color:#e4e4e7;">
                  Leah &nbsp;&bull;&nbsp; Ironclad &nbsp;&bull;&nbsp; Sirion &nbsp;&bull;&nbsp; Icertis
                </p>
                <div style="height:1px;background-color:#27272a;width:100%;margin-bottom:32px;"></div>
                <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;">
                  &copy; 2026 SpotCLM Consulting. All rights reserved.<br/>
                </p>
                <p style="margin:0;font-size:12px;color:#a1a1aa;">
                  <a href="mailto:info@spotclm.com" style="color:#6366f1;text-decoration:none;font-weight:500;">info@spotclm.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

        const confirmRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `SpotCLM <${fromEmail}>`,
            to: [submitterEmail],
            reply_to: env.RESEND_TO_EMAIL || 'info@spotclm.com',
            subject: `We've received your enquiry, ${firstName}`,
            html: confirmationHtml,
          }),
        });
        confirmationStatus = confirmRes.status;
        if (!confirmRes.ok) {
          confirmationError = await confirmRes.text();
        }
      } catch (e: unknown) {
        confirmationError = (e as Error).message;
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    isSynced: true,
    syncedAt,
    id,
    debug: {
      kv_bound: !!env.ENQUIRY_KV,
      d1_bound: !!env.DB,
      resend_bound: !!env.RESEND_API_KEY,
      resend_status: resendStatus,
      resend_error: resendError,
      confirmation_status: confirmationStatus,
      confirmation_error: confirmationError,
    },
  }), { headers: CORS });
};
