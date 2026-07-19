// functions/api/utils/certificates.ts
// Uses HMAC-SHA256 for v1 certificate verification.
//
// UPGRADE PATH TO ASYMMETRIC (v2): 
// In the future, replace this HMAC implementation with RSASSA-PKCS1-v1_5 or ECDSA. 
// Generate a key pair, store the private key securely (e.g., in a secure vault), 
// and publish the public key at a well-known endpoint (e.g., /.well-known/jwks.json).
// The signature would then be verifiable by any third party without needing the backend secret.

export async function generateCredentialId(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint8Array(10);
  crypto.getRandomValues(array);
  let result = 'CERT-';
  for (const byte of array) {
    result += chars[byte % chars.length];
  }
  return result;
}

export async function signCertificate(data: Record<string, any>, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sort keys to ensure consistent JSON stringification
  const sortedKeys = Object.keys(data).sort();
  const sortedData: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedData[k] = data[k];
  }
  
  const dataString = JSON.stringify(sortedData);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    keyMaterial,
    encoder.encode(dataString)
  );
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifyCertificate(data: Record<string, any>, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await signCertificate(data, secret);
  return expectedSignature === signature;
}

// Issues a signed certificate the first time a student reaches 100% completion
// on a course flagged has_certification=1. Idempotent — safe to call every time
// progress is recalculated; does nothing if a certificate already exists or the
// course doesn't offer one, and silently no-ops if CERTIFICATE_SECRET isn't
// configured yet (matches the fail-open pattern used for optional payment keys).
export async function issueCertificateIfEligible(
  db: D1Database,
  userId: string,
  courseId: string,
  certificateSecret: string | undefined
): Promise<string | null> {
  if (!certificateSecret) return null;

  const course = await db.prepare('SELECT title, has_certification, certification_name FROM academy_courses WHERE id = ?').bind(courseId).first() as any;
  if (!course || !course.has_certification) return null;

  const existing = await db.prepare('SELECT id FROM academy_user_certificates WHERE user_id = ? AND course_id = ?').bind(userId, courseId).first();
  if (existing) return null;

  const user = await db.prepare('SELECT full_name FROM academy_users WHERE id = ?').bind(userId).first() as any;
  if (!user) return null;

  const credentialId = await generateCredentialId();
  const issuedAt = new Date().toISOString();
  const metadata = { studentName: user.full_name, courseTitle: course.certification_name || course.title, issuedAt };
  const signature = await signCertificate(metadata, certificateSecret);

  const legacyCertId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO certificates (id, student_name, course_name, issue_date, status)
    VALUES (?, ?, ?, ?, 'valid')
  `).bind(legacyCertId, user.full_name, course.title, issuedAt).run();

  await db.prepare(`
    INSERT INTO academy_user_certificates (id, user_id, certificate_id, course_id, issued_at, credential_id, signature, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), userId, legacyCertId, courseId, issuedAt, credentialId, signature, JSON.stringify(metadata)).run();

  return credentialId;
}
