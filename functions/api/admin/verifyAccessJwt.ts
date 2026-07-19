// Cloudflare Access JWT verification.
//
// The old middleware only base64-decoded the JWT payload and trusted the
// `email` claim — it never checked the cryptographic signature. That means
// anyone who could reach these Functions directly (e.g. via the *.pages.dev
// preview URL, or if the Access policy config ever drifted) could forge the
// Cf-Access-Jwt-Assertion header themselves and impersonate any admin email
// already present in the admin_users table.
//
// This verifies the token against Cloudflare's published JWKS for your Access
// team, and checks issuer/audience/expiry — the standard way to validate a
// CF Access JWT from within a Worker/Pages Function.

interface Jwk {
  kid: string;
  kty: string;
  alg: string;
  n: string;
  e: string;
}

interface JwksCache {
  keys: Jwk[];
  fetchedAt: number;
}

// Module-scope cache — persists across requests within the same isolate.
let jwksCache: JwksCache | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function base64UrlDecodeJson(base64Url: string): any {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return JSON.parse(atob(base64));
}

async function getJwks(teamDomain: string): Promise<Jwk[]> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) {
    throw new Error(`Failed to fetch Access JWKS: ${res.status}`);
  }
  const data = await res.json() as { keys: Jwk[] };
  jwksCache = { keys: data.keys, fetchedAt: now };
  return data.keys;
}

export interface VerifiedAccessPayload {
  email: string;
  aud: string[];
  exp: number;
  iss: string;
  sub: string;
}

/**
 * Verifies a Cloudflare Access JWT's signature, issuer, audience, and expiry.
 * Throws on any failure — callers should treat a thrown error as "reject the request".
 */
export async function verifyAccessJwt(
  token: string,
  teamDomain: string,
  expectedAudience?: string
): Promise<VerifiedAccessPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = base64UrlDecodeJson(headerB64);
  const payload = base64UrlDecodeJson(payloadB64) as VerifiedAccessPayload;

  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported JWT alg: ${header.alg}`);
  }

  const keys = await getJwks(teamDomain);
  const jwk = keys.find(k => k.kid === header.kid);
  if (!jwk) {
    throw new Error('No matching JWKS key for this token');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(signatureB64);

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signature,
    signedData
  );

  if (!isValid) {
    throw new Error('JWT signature verification failed');
  }

  // Expiry check
  if (!payload.exp || payload.exp * 1000 < Date.now()) {
    throw new Error('JWT expired');
  }

  // Issuer check — must be this exact Access team
  const expectedIssuer = `https://${teamDomain}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error('JWT issuer mismatch');
  }

  // Audience check — must match the configured Access Application AUD tag
  if (expectedAudience) {
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(expectedAudience)) {
      throw new Error('JWT audience mismatch');
    }
  }

  if (!payload.email) {
    throw new Error('JWT missing email claim');
  }

  return payload;
}
