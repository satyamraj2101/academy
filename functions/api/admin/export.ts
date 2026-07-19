import { verifyAdminRequest, corsOptionsResponse, errorResponse, logAdminAction, hasPermission } from './middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { admin, db } = result.context;

  if (!hasPermission(admin, 'export')) {
    return errorResponse('Permission denied: export required', 403);
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'enquiries';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let rows: Record<string, unknown>[] = [];
  let filename = 'export.csv';
  let headers: string[] = [];

  if (type === 'enquiries') {
    filename = `spotclm-enquiries-${new Date().toISOString().split('T')[0]}.csv`;
    headers = ['id', 'full_name', 'email', 'company', 'phone', 'service', 'timeline', 'budget', 'message', 'source', 'status', 'submitted_at', 'replied_at'];
    let q = 'SELECT ' + headers.join(', ') + ' FROM enquiry_submissions';
    const params: unknown[] = [];
    if (from || to) {
      const conditions = [];
      if (from) { conditions.push('submitted_at >= ?'); params.push(from); }
      if (to) { conditions.push('submitted_at <= ?'); params.push(to); }
      q += ' WHERE ' + conditions.join(' AND ');
    }
    q += ' ORDER BY submitted_at DESC';
    const result2 = await db.prepare(q).bind(...params).all();
    rows = (result2.results || []) as Record<string, unknown>[];
  } else if (type === 'assessments') {
    filename = `spotclm-assessments-${new Date().toISOString().split('T')[0]}.csv`;
    headers = ['id', 'email', 'contract_volume', 'user_count', 'current_process', 'platform_preference', 'recommended_platform', 'readiness_score', 'submitted_at'];
    const result2 = await db.prepare('SELECT ' + headers.join(', ') + ' FROM assessment_submissions ORDER BY submitted_at DESC').all();
    rows = (result2.results || []) as Record<string, unknown>[];
  } else if (type === 'sessions') {
    filename = `spotclm-sessions-${new Date().toISOString().split('T')[0]}.csv`;
    headers = ['id', 'email', 'country', 'city', 'device_type', 'referrer', 'lang', 'page_views', 'is_converted', 'first_seen', 'last_seen'];
    const result2 = await db.prepare('SELECT ' + headers.join(', ') + ' FROM user_sessions ORDER BY last_seen DESC').all();
    rows = (result2.results || []) as Record<string, unknown>[];
  } else if (type === 'chats') {
    filename = `spotclm-chats-${new Date().toISOString().split('T')[0]}.csv`;
    headers = ['session_id', 'user_email', 'sender_type', 'content', 'sent_at'];
    const result2 = await db.prepare('SELECT m.session_id, s.user_email, m.sender_type, m.content, m.sent_at FROM chat_messages m LEFT JOIN chat_sessions s ON s.id = m.session_id ORDER BY m.sent_at DESC').all();
    rows = (result2.results || []) as Record<string, unknown>[];
  } else if (type === 'audit') {
    filename = `spotclm-audit-${new Date().toISOString().split('T')[0]}.csv`;
    headers = ['id', 'admin_email', 'action', 'target_type', 'target_id', 'created_at'];
    const result2 = await db.prepare('SELECT ' + headers.join(', ') + ' FROM admin_audit_log ORDER BY created_at DESC').all();
    rows = (result2.results || []) as Record<string, unknown>[];
  } else {
    return errorResponse('Invalid export type');
  }

  // Build CSV
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
  };

  const csvLines = [
    `# SpotCLM Export — ${type} — Generated: ${new Date().toISOString()}`,
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(','))
  ];

  await logAdminAction(db, admin.email, 'export_downloaded', type, '', { rows: rows.length }, request);

  return new Response(csvLines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
};
