// Thin fetch wrapper over the existing admin REST API. Deliberately does
// NOT reimplement any D1 business logic — every tool call here is just a
// request builder + this client, so validation, permission checks, and
// audit logging all stay in one place (the REST endpoints themselves).

const BASE_URL = process.env.ACADEMY_ADMIN_BASE_URL || 'https://spotclm-academy.pages.dev/api/admin';
const SERVICE_API_KEY = process.env.ACADEMY_SERVICE_API_KEY;

if (!SERVICE_API_KEY) {
  console.error('ACADEMY_SERVICE_API_KEY is not set — every API call will fail with 401. Set it in your MCP client config.');
}

export async function adminApiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_API_KEY}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const message = body?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return body as T;
}

export const adminGet = <T = any>(path: string) => adminApiFetch<T>(path, { method: 'GET' });
export const adminPost = <T = any>(path: string, body: unknown) => adminApiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const adminPut = <T = any>(path: string, body: unknown) => adminApiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const adminDelete = <T = any>(path: string) => adminApiFetch<T>(path, { method: 'DELETE' });
