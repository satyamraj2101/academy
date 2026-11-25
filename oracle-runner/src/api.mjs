// Thin client for the Cloudflare admin REST API, authenticated with a service key. Like the MCP
// server, it never touches D1 directly: every write goes through the same endpoints the admin UI
// uses, so validation, permissions and audit logging stay in one place.
const BASE = (process.env.ACADEMY_ADMIN_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.ACADEMY_SERVICE_API_KEY;
// Cloudflare Access service token, needed once /api/admin/* is gated at the edge (ISS-013).
const CF_ID = process.env.CF_ACCESS_CLIENT_ID;
const CF_SECRET = process.env.CF_ACCESS_CLIENT_SECRET;

export function assertConfigured() {
  if (!BASE) throw new Error('ACADEMY_ADMIN_BASE_URL is not set');
  if (!KEY) throw new Error('ACADEMY_SERVICE_API_KEY is not set');
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` };
  if (CF_ID && CF_SECRET) {
    headers['CF-Access-Client-Id'] = CF_ID;
    headers['CF-Access-Client-Secret'] = CF_SECRET;
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${data.error || data.raw || 'request failed'}`);
  return data;
}

export const claimJob = () => api('/academy/ai-jobs/claim', { method: 'POST', body: {} }).then(r => r.job);
export const patchJob = (id, patch) => api(`/academy/ai-jobs/${id}`, { method: 'PATCH', body: patch });
