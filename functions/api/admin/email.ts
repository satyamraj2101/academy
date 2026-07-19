import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, logAdminAction, hasPermission } from './middleware';

interface Env {
  DB?: D1Database;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { admin, db } = result.context;

  if (!hasPermission(admin, 'email_reply')) {
    return errorResponse('Permission denied: email_reply required', 403);
  }

  const body = await request.json() as Record<string, unknown>;
  const { enquiryId, toEmail, cc, bcc, subject, replyBody } = body as {
    enquiryId: string;
    toEmail: string;
    cc?: string;
    bcc?: string;
    subject: string;
    replyBody: string;
  };

  if (!toEmail || !subject || !replyBody) {
    return errorResponse('toEmail, subject, and replyBody are required');
  }

  const fromEmail = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const now = new Date().toISOString();
  let resendMessageId: string | null = null;
  let emailStatus = 'sent';

  // Format CC and BCC arrays
  const ccArray = cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : undefined;
  const bccArray = bcc ? bcc.split(',').map(e => e.trim()).filter(Boolean) : undefined;

  // Send via Resend
  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `SpotCLM <${fromEmail}>`,
          to: [toEmail],
          ...(ccArray && ccArray.length > 0 && { cc: ccArray }),
          ...(bccArray && bccArray.length > 0 && { bcc: bccArray }),
          subject,
          text: replyBody,
          html: replyBody.replace(/\n/g, '<br>'),
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      resendMessageId = data.id as string || null;
      if (!res.ok) emailStatus = 'failed';
    } catch {
      emailStatus = 'failed';
    }
  }

  // Log to email_audit
  const auditId = crypto.randomUUID();
  if (db) {
    await db.prepare(
      'INSERT INTO email_audit (id, enquiry_id, from_address, to_address, subject, body, sent_at, sent_by, resend_message_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(auditId, enquiryId || null, fromEmail, toEmail, subject, replyBody, now, admin.email, resendMessageId, emailStatus).run();

    // Update enquiry status to replied
    if (enquiryId) {
      await db.prepare(
        'UPDATE enquiry_submissions SET status = ?, replied_at = ?, reply_subject = ?, reply_body = ? WHERE id = ?'
      ).bind('replied', now, subject, replyBody, enquiryId).run();
    }

    await logAdminAction(db, admin.email, 'reply_sent', 'enquiry', enquiryId || '', { toEmail, subject, status: emailStatus }, request);
  }

  return corsResponse({ ok: true, status: emailStatus, auditId });
};

// GET — fetch email templates
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { db } = result.context;
  const templates = await db.prepare('SELECT * FROM email_templates ORDER BY name ASC').all();
  return corsResponse({ templates: templates.results || [] });
};
