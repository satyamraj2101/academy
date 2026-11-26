// Lets every AI worker see the same daily use and cooldowns of the free providers. Each worker still paces itself in memory (ai.mjs);
// this adds what the OTHER workers have used, through the Academy (table academy_ai_quota). It never blocks or fails a call: if the
// Academy cannot be reached, the worker simply carries on with what it knows itself.
const TTL_MS = 15_000;
const cache = new Map(); // key -> { at, state }

export const resetSharedQuota = () => cache.clear();

/** The helper for this environment, or null when sharing is off (no Academy configured, or AI_SHARED_QUOTA=off). */
export function sharedQuota(env = process.env, call = defaultCall(env)) {
  if (env.AI_SHARED_QUOTA === 'off' || !call) return null;
  return {
    /** Fresh-enough state for these keys: { key: { calls, tokens, cooldownUntil (ms or 0), reason } }. Fetches at most every 15 seconds per key. */
    async hydrate(keys) {
      const now = Date.now();
      const stale = keys.filter(k => !cache.get(k) || now - cache.get(k).at > TTL_MS);
      if (stale.length) {
        try {
          const res = await call('GET', `/academy/ai-quota?keys=${encodeURIComponent(stale.join(','))}`);
          for (const k of stale) {
            const q = res?.quota?.[k] || {};
            cache.set(k, { at: now, state: { calls: q.calls || 0, tokens: q.tokens || 0, cooldownUntil: q.cooldownUntil ? Date.parse(q.cooldownUntil) : 0, reason: q.reason || '' } });
          }
        } catch { for (const k of stale) cache.set(k, { at: now, state: cache.get(k)?.state || { calls: 0, tokens: 0, cooldownUntil: 0, reason: '' } }); }
      }
      return Object.fromEntries(keys.map(k => [k, cache.get(k).state]));
    },
    /** Counts one call (and its estimated tokens). Not awaited by the caller. */
    record(key, tokens) {
      const c = cache.get(key); if (c) { c.state.calls++; c.state.tokens += tokens; }
      return call('POST', '/academy/ai-quota', { key, calls: 1, tokens }).catch(() => {});
    },
    /** Tells the others this provider is limited until `untilMs`. */
    cool(key, untilMs, reason) {
      const c = cache.get(key); if (c) { c.state.cooldownUntil = Math.max(c.state.cooldownUntil, untilMs); c.state.reason = reason; }
      return call('POST', '/academy/ai-quota', { key, cooldownUntil: new Date(untilMs).toISOString(), reason }).catch(() => {});
    },
  };
}

// The default transport is the same Academy client the runner already uses (service key + Access token).
function defaultCall(env) {
  if (!env.ACADEMY_ADMIN_BASE_URL || !env.ACADEMY_SERVICE_API_KEY) return null;
  return async (method, path, body) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${env.ACADEMY_SERVICE_API_KEY}` };
    if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) { headers['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID; headers['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET; }
    const res = await fetch(`${env.ACADEMY_ADMIN_BASE_URL.replace(/\/$/, '')}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`quota ${res.status}`);
    return res.json();
  };
}
