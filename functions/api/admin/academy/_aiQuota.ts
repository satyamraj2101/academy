// Rules for the shared AI quota (table academy_ai_quota, migration 0033). Pure functions, so they are unit-tested.

export const MAX_KEYS = 24;
export const MAX_COOLDOWN_MS = 48 * 3600_000;

const KEY = /^[\w.:@/-]{1,120}$/;

export function parseKeys(raw: string | null): string[] {
  return (raw || '').split(',').map(s => s.trim()).filter(k => KEY.test(k)).slice(0, MAX_KEYS);
}

export interface QuotaPost { key: string; calls: number; tokens: number; cooldownUntil: string | null; reason: string | null }

/** Cleans what a worker reports: counts are bounded and a cooldown cannot be set more than two days ahead or in the past. */
export function validateQuotaPost(body: any, now = Date.now()): { ok: true; post: QuotaPost } | { ok: false; error: string } {
  const key = typeof body?.key === 'string' ? body.key : '';
  if (!KEY.test(key)) return { ok: false, error: 'key must look like provider:model' };
  const n = (v: unknown, max: number) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(max, Math.max(0, x)) : 0; };
  let cooldownUntil: string | null = null;
  if (body?.cooldownUntil !== undefined && body?.cooldownUntil !== null) {
    const t = Date.parse(String(body.cooldownUntil));
    if (!Number.isFinite(t)) return { ok: false, error: 'cooldownUntil must be a time' };
    if (t > now) cooldownUntil = new Date(Math.min(t, now + MAX_COOLDOWN_MS)).toISOString();
  }
  const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 160) : null;
  return { ok: true, post: { key, calls: n(body?.calls, 100), tokens: n(body?.tokens, 1_000_000), cooldownUntil, reason } };
}

/** What a worker should see for one key: today's counts (zero if the stored day is older) and a cooldown only while it still lasts. */
export function quotaView(row: any, today: string, now = Date.now()) {
  const sameDay = row?.day === today;
  const until = row?.cooldown_until && Date.parse(row.cooldown_until) > now ? row.cooldown_until : null;
  return { calls: sameDay ? Number(row.calls) || 0 : 0, tokens: sameDay ? Number(row.tokens) || 0 : 0, cooldownUntil: until, reason: until ? row?.reason || null : null };
}
