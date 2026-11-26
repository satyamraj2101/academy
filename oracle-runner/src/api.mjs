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
  // A connection that never answers must not freeze a job (a cloud worker would sit idle, still being billed). Give up after
  // ACADEMY_API_TIMEOUT_MS (default 60 s). Reads are tried up to three times; writes are not repeated, so nothing is done twice.
  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(Number(process.env.ACADEMY_API_TIMEOUT_MS) || 60_000) });
      break;
    } catch (e) {
      if (method !== 'GET' || attempt >= 2) throw new Error(`${method} ${path} failed: ${e.name === 'TimeoutError' ? 'no answer within the time limit' : e.message}`);
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${data.error || data.raw || 'request failed'}`);
  return data;
}

export const claimJob = () => api('/academy/ai-jobs/claim', { method: 'POST', body: {} }).then(r => r.job);
export const patchJob = (id, patch) => api(`/academy/ai-jobs/${id}`, { method: 'PATCH', body: patch });
