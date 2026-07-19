import { Env, corsResponse, corsOptionsResponse, errorResponse } from '../../academy/auth/middleware';
import { verifyCertificate } from '../../utils/certificates';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const credentialId = params.credentialId as string;
  if (!credentialId) return errorResponse('Credential ID required', 400);

  if (!env.DB) return errorResponse('Database not configured', 500);

  const cert = await env.DB.prepare(`
    SELECT c.id, c.credential_id, c.signature, c.metadata_json, c.issued_at,
           u.full_name as student_name, crs.title as course_title
    FROM academy_user_certificates c
    JOIN academy_users u ON c.user_id = u.id
    JOIN academy_courses crs ON c.course_id = crs.id
    WHERE c.credential_id = ?
  `).bind(credentialId).first() as any;

  if (!cert) return errorResponse('Certificate not found', 404);

  let isValid = false;
  let metadata = {};
  
  if (cert.metadata_json && cert.signature && env.CERTIFICATE_SECRET) {
    try {
      metadata = JSON.parse(cert.metadata_json);
      isValid = await verifyCertificate(metadata, cert.signature, env.CERTIFICATE_SECRET);
    } catch (err) {
      console.error('Error verifying certificate signature', err);
    }
  }

  return corsResponse({
    valid: isValid,
    credentialId: cert.credential_id,
    studentName: cert.student_name,
    courseTitle: cert.course_title,
    issuedAt: cert.issued_at,
    metadata
  });
};
