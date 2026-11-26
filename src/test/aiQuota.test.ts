import { describe, it, expect } from 'vitest';
import { parseKeys, quotaView, validateQuotaPost, MAX_COOLDOWN_MS, MAX_KEYS } from '../../functions/api/admin/academy/_aiQuota';

const NOW = Date.parse('2026-11-27T10:00:00Z');

describe('parseKeys', () => {
  it('keeps provider:model keys and drops anything else', () => {
    expect(parseKeys('groq:openai/gpt-oss-20b, gemini:gemini-3.5-flash-lite,bad key,;drop')).toEqual(['groq:openai/gpt-oss-20b', 'gemini:gemini-3.5-flash-lite']);
    expect(parseKeys(null)).toEqual([]);
  });
  it('limits how many are read at once', () => {
    expect(parseKeys(Array.from({ length: 60 }, (_, i) => `p:m${i}`).join(',')).length).toBe(MAX_KEYS);
  });
});

describe('validateQuotaPost', () => {
  it('accepts a count and bounds it', () => {
    const r = validateQuotaPost({ key: 'groq:m', calls: 1, tokens: 5e9 }, NOW);
    expect(r.ok && r.post).toMatchObject({ key: 'groq:m', calls: 1, tokens: 1_000_000, cooldownUntil: null });
  });
  it('rejects a bad key', () => {
    expect(validateQuotaPost({ key: "x'; DROP" }, NOW).ok).toBe(false);
    expect(validateQuotaPost({}, NOW).ok).toBe(false);
  });
  it('keeps a future cooldown, caps it at two days and ignores one in the past', () => {
    const future = new Date(NOW + 3600_000).toISOString();
    expect((validateQuotaPost({ key: 'a:b', cooldownUntil: future }, NOW) as any).post.cooldownUntil).toBe(future);
    expect(Date.parse((validateQuotaPost({ key: 'a:b', cooldownUntil: new Date(NOW + 30 * 86400_000).toISOString() }, NOW) as any).post.cooldownUntil)).toBe(NOW + MAX_COOLDOWN_MS);
    expect((validateQuotaPost({ key: 'a:b', cooldownUntil: new Date(NOW - 1000).toISOString() }, NOW) as any).post.cooldownUntil).toBeNull();
    expect(validateQuotaPost({ key: 'a:b', cooldownUntil: 'soon' }, NOW).ok).toBe(false);
  });
  it('treats junk counts as zero', () => {
    expect((validateQuotaPost({ key: 'a:b', calls: 'many', tokens: -5 }, NOW) as any).post).toMatchObject({ calls: 0, tokens: 0 });
  });
});

describe('quotaView', () => {
  const row = { day: '2026-11-27', calls: 12, tokens: 3400, cooldown_until: new Date(NOW + 60_000).toISOString(), reason: 'daily limit' };
  it("shows today's counts and a live cooldown", () => {
    expect(quotaView(row, '2026-11-27', NOW)).toEqual({ calls: 12, tokens: 3400, cooldownUntil: row.cooldown_until, reason: 'daily limit' });
  });
  it('starts the counts over on a new day', () => {
    expect(quotaView(row, '2026-11-28', NOW).calls).toBe(0);
  });
  it('hides a cooldown that has ended, and a missing row is empty', () => {
    expect(quotaView({ ...row, cooldown_until: new Date(NOW - 1).toISOString() }, '2026-11-27', NOW)).toMatchObject({ cooldownUntil: null, reason: null });
    expect(quotaView(undefined, '2026-11-27', NOW)).toEqual({ calls: 0, tokens: 0, cooldownUntil: null, reason: null });
  });
});
