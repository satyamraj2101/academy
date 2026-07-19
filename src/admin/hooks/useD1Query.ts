import { useState, useCallback, useEffect } from 'react';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const BASE = '/api/admin';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const devAdmin = localStorage.getItem('spotclm_admin_dev');
  if (devAdmin) {
    try {
      const parsed = JSON.parse(devAdmin);
      headers['Authorization'] = `Bearer ${parsed.email}`;
    } catch { /* ignore */ }
  }
  return headers;
}

export function useD1Query<T>(endpoint: string) {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null });

  const fetch_ = useCallback(async (params?: Record<string, string>) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const url = new URL(BASE + endpoint, window.location.origin);
      if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const res = await fetch(url.toString(), {
        headers: getHeaders(),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as T;
      setState({ data, loading: false, error: null });
      return data;
    } catch (e: unknown) {
      const msg = (e as Error).message;
      setState(s => ({ ...s, loading: false, error: msg }));
      return null;
    }
  }, [endpoint]);

  // Auto-fetch on mount and whenever the endpoint changes — previously callers
  // had to remember to invoke `refetch()` themselves, and none of them did,
  // which meant every admin list page using this hook silently never loaded data.
  useEffect(() => {
    fetch_();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch_]);

    const mutate = useCallback(async (method: string, body?: unknown, extraPath = '') => {
    try {
      const res = await fetch(BASE + endpoint + extraPath, {
        method,
        headers: getHeaders(),
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e: unknown) {
      throw new Error((e as Error).message);
    }
  }, [endpoint]);

  return { ...state, refetch: fetch_, mutate };
}

export async function adminFetch(path: string, options?: RequestInit) {
  // When the body is FormData (file uploads), the browser must set its own
  // multipart Content-Type header (with boundary) — forcing application/json
  // here would silently break every upload.
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const baseHeaders = getHeaders();
  if (isFormData) delete baseHeaders['Content-Type'];

  const res = await fetch('/api/admin' + path, {
    ...options,
    credentials: 'include',
    headers: { ...baseHeaders, ...(options?.headers as Record<string, string> || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function trackEvent(event: {
  sessionId: string;
  email?: string;
  eventType: string;
  page?: string;
  element?: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
}) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: event.sessionId,
        email: event.email,
        eventType: event.eventType,
        page: event.page,
        element: event.element,
        metadata: event.metadata ? JSON.stringify(event.metadata) : undefined,
        durationMs: event.durationMs,
      }),
    });
  } catch { /* Fire-and-forget tracking */ }
}
