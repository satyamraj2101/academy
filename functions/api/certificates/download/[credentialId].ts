import { Env, corsResponse, corsOptionsResponse, errorResponse } from '../../academy/auth/middleware';
import { generateCertificateHtml } from '../../utils/pdf';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const credentialId = params.credentialId as string;
  if (!credentialId) return errorResponse('Credential ID required', 400);

  if (!env.DB) return errorResponse('Database not configured', 500);

  const cert = await env.DB.prepare(`
    SELECT c.credential_id, c.issued_at, u.full_name as student_name, crs.title as course_title
    FROM academy_user_certificates c
    JOIN academy_users u ON c.user_id = u.id
    JOIN academy_courses crs ON c.course_id = crs.id
    WHERE c.credential_id = ?
  `).bind(credentialId).first() as any;

  if (!cert) {
    return new Response('Certificate not found', { status: 404 });
  }

  const html = generateCertificateHtml({
    credentialId: cert.credential_id,
    studentName: cert.student_name,
    courseTitle: cert.course_title,
    issuedAt: cert.issued_at,
    verifyUrl: `spotclm-academy.pages.dev/certifications?verify=${cert.credential_id}`
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    }
  });
};
