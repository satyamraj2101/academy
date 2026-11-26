// Multi-provider AI gateway. Every step asks for a *role* (draft / review / fast) and gets the first provider in that
// role's route that has room, so a rate limit or outage on one vendor never stalls the queue. Routes are plain env strings:
//   AI_DRAFT="groq:openai/gpt-oss-120b,gemini:gemini-2.5-flash,cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast"
//   AI_REVIEW="gemini:gemini-2.5-flash-lite"
// A provider is only usable when its key is set. An empty route disables that role (no review = the review pass is skipped).
//
// Free tiers are small, so the gateway paces itself instead of finding the limit by hitting it:
//   - per provider+model: requests per minute, tokens per minute, requests per day and parallel calls (DEFAULT_LIMITS, or the
//     AI_LIMITS env as JSON, e.g. {"groq":{"rpm":20}});
//   - a request too big for a provider's per-minute token limit goes to one that can take it;
//   - a 429 puts that provider on cooldown (its Retry-After, or until midnight UTC if the limit is a daily one) and the call moves
//     straight on to the next provider, with no retry storm;
//   - when every provider is cooling the call waits for the earliest one (up to AI_MAX_WAIT_MS); beyond that it throws
//     AI_EXHAUSTED with `retryAt`, so a job can pause and resume instead of failing.
// This pacing is per process. Many cloud workers each pace themselves and learn from 429s; a shared counter is the next step.
const ROLE_DEFAULTS = {
  draft: 'gemini:gemini-2.5-flash',
  review: '',
  fast: 'cloudflare:@cf/meta/llama-3.1-8b-instruct,gemini:gemini-2.5-flash',
};

// Deliberately a little under each free tier's real limit. Groq's are per MODEL (1,000 requests a day, 8,000 tokens a minute
// on this account, read from its response headers).
export const DEFAULT_LIMITS = {
  gemini: { rpm: 8, rpd: 150, tpm: 200000, concurrency: 2 },
  groq: { rpm: 25, rpd: 900, tpm: 7500, concurrency: 2 },
  mistral: { rpm: 30, tpm: 400000, concurrency: 2 },
  cloudflare: { rpm: 30, concurrency: 3 },
  anthropic: { rpm: 40, concurrency: 4 },
  openai: { rpm: 40, concurrency: 4 },
};

export function routeFor(role, env = process.env) {
  const raw = env[`AI_${role.toUpperCase()}`] ?? ROLE_DEFAULTS[role] ?? '';
  return raw.split(',').map(s => s.trim()).filter(Boolean).map(entry => {
    const i = entry.indexOf(':');
    return { provider: entry.slice(0, i), model: entry.slice(i + 1) };
  }).filter(r => r.provider && r.model && isConfigured(r.provider, env));
}

export function isConfigured(provider, env = process.env) {
  switch (provider) {
    case 'gemini': return !!env.GEMINI_API_KEY;
    case 'anthropic': return !!env.ANTHROPIC_API_KEY;
    case 'openai': return !!env.OPENAI_API_KEY; // also any OpenAI-compatible host via OPENAI_BASE_URL
    case 'groq': return !!env.GROQ_API_KEY;
    case 'mistral': return !!env.MISTRAL_API_KEY;
    case 'cloudflare': return !!(env.CF_ACCOUNT_ID && env.CF_API_TOKEN);
    default: return false;
  }
}

// A request that never answers must not stall a whole job (or burn cloud credit while it waits): give up after AI_TIMEOUT_MS
// (default 2 minutes) and let the normal retry / fallback handle it.
const timed = (env) => ({ signal: AbortSignal.timeout(Number(env.AI_TIMEOUT_MS) || 120_000) });

// An error that carries what the gateway needs to react: the HTTP status, how long to back off and whether the limit is a daily one.
class AiError extends Error {
  constructor(message, { status, retryAfterMs, daily, fatal } = {}) { super(message); Object.assign(this, { status, retryAfterMs, daily, fatal }); }
}

// "1m26.4s", "23s", "350ms" or plain seconds -> milliseconds.
export function parseDuration(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 1000);
  let ms = 0, found = false;
  for (const m of s.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) { found = true; ms += parseFloat(m[1]) * { ms: 1, s: 1000, m: 60000, h: 3600000 }[m[2]]; }
  return found ? Math.round(ms) : null;
}

const untilMidnightUtc = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - d.getTime() + 1000; };

async function failure(res, name) {
  const body = await res.text().catch(() => '');
  if (res.status === 429) {
    const daily = /per[ _-]?day|\bTPD\b|\bRPD\b|daily|PerDay/i.test(body);
    const hinted = parseDuration(res.headers.get('retry-after')) ?? parseDuration(/"retryDelay"\s*:\s*"([^"]+)"/.exec(body)?.[1]) ?? parseDuration(res.headers.get('x-ratelimit-reset-requests'));
    return new AiError(`${name} 429${daily ? ' (daily limit)' : ''}`, { status: 429, daily, retryAfterMs: daily ? Math.max(hinted ?? 0, untilMidnightUtc()) : (hinted ?? 60_000) });
  }
  if (res.status >= 500) return new AiError(`${name} ${res.status}`, { status: res.status });
  return new AiError(`${name} ${res.status}: ${body.slice(0, 200)}`, { status: res.status, fatal: true });
}
async function ok(res, name) {
  if (!res.ok) throw await failure(res, name);
  return res.json();
}

async function chatCompletions({ base, key, model, prompt, json, env, name }) {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST', ...timed(env),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], ...(json ? { response_format: { type: 'json_object' } } : {}) }),
  });
  return (await ok(res, name))?.choices?.[0]?.message?.content;
}

const adapters = {
  async gemini({ model, prompt, json }, env) {
    const base = env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
    const res = await fetch(`${base}/models/${model}:generateContent`, {
      method: 'POST', ...timed(env),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: json ? { response_mime_type: 'application/json' } : {} }),
    });
    const data = await ok(res, 'gemini');
    return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
  },
  async anthropic({ model, prompt }, env) {
    const base = env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST', ...timed(env),
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 8192, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await ok(res, 'anthropic');
    return data?.content?.map(b => b.text || '').join('');
  },
  openai: ({ model, prompt, json }, env) => chatCompletions({ base: env.OPENAI_BASE_URL || 'https://api.openai.com/v1', key: env.OPENAI_API_KEY, model, prompt, json, env, name: 'openai' }),
  groq: ({ model, prompt, json }, env) => chatCompletions({ base: env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1', key: env.GROQ_API_KEY, model, prompt, json, env, name: 'groq' }),
  mistral: ({ model, prompt, json }, env) => chatCompletions({ base: env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1', key: env.MISTRAL_API_KEY, model, prompt, json, env, name: 'mistral' }),
  async cloudflare({ model, prompt }, env) {
    const base = env.CF_API_BASE || 'https://api.cloudflare.com/client/v4';
    const res = await fetch(`${base}/accounts/${env.CF_ACCOUNT_ID}/ai/run/${model}`, {
      method: 'POST', ...timed(env),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.CF_API_TOKEN}` },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await ok(res, 'cloudflare');
    return data?.result?.response;
  },
};

export const stripFences = (t) => t.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- pacing: what each provider+model has used, in this process ----
const usage = new Map();
const slot = (e) => { const k = `${e.provider}:${e.model}`; if (!usage.has(k)) usage.set(k, { starts: [], tokens: [], day: '', dayCount: 0, cooldownUntil: 0, cooldownReason: '', active: 0 }); return usage.get(k); };
export const resetAiState = () => usage.clear();

function limitsFor(provider, env) {
  let over = {};
  try { over = env.AI_LIMITS ? JSON.parse(env.AI_LIMITS)[provider] || {} : {}; } catch { /* ignore a malformed override */ }
  return { ...DEFAULT_LIMITS[provider], ...over };
}
const windowMs = (env) => Number(env.AI_WINDOW_MS) || 60_000;
// Rough size of a call: the prompt, plus the reply we expect (about as long as the prompt for a review, 2-3k for a lesson).
export const estimateTokens = (prompt, maxOut) => Math.ceil(prompt.length / 4) + (maxOut ?? Math.min(4000, Math.max(1800, Math.ceil(prompt.length / 6))));

/** Can this entry take the call right now? Returns { ok } or { ok:false, waitMs } (wait this long) or { ok:false, skip } (never, for this call). */
function readiness(entry, est, env, now) {
  const lim = limitsFor(entry.provider, env), u = slot(entry), win = windowMs(env);
  const today = new Date(now).toISOString().slice(0, 10);
  if (u.day !== today) { u.day = today; u.dayCount = 0; }
  if (u.cooldownUntil > now) return { ok: false, waitMs: u.cooldownUntil - now, why: u.cooldownReason };
  if (lim.tpm && est > lim.tpm) return { ok: false, skip: true, why: `needs about ${est} tokens, over its ${lim.tpm} a minute` };
  if (lim.rpd && u.dayCount >= lim.rpd) return { ok: false, waitMs: untilMidnightUtc(), why: 'daily request limit reached' };
  u.starts = u.starts.filter(t => now - t < win);
  u.tokens = u.tokens.filter(t => now - t[0] < win);
  if (lim.rpm && u.starts.length >= lim.rpm) return { ok: false, waitMs: u.starts[0] + win - now + 1, why: 'requests per minute' };
  if (lim.tpm) {
    let used = u.tokens.reduce((n, t) => n + t[1], 0);
    if (used + est > lim.tpm) {
      for (const t of u.tokens) { used -= t[1]; if (used + est <= lim.tpm) return { ok: false, waitMs: t[0] + win - now + 1, why: 'tokens per minute' }; }
      return { ok: false, waitMs: win, why: 'tokens per minute' };
    }
  }
  if (lim.concurrency && u.active >= lim.concurrency) return { ok: false, waitMs: 250, why: 'busy' };
  return { ok: true };
}

// One reserved call: 5xx and timeouts are retried with backoff on the same provider; a 429 is not (it cools the provider).
async function attempt(entry, args, env, est, retries) {
  const u = slot(entry), now = Date.now();
  u.starts.push(now); u.tokens.push([now, est]); u.dayCount++; u.active++;
  let last;
  try {
    for (let n = 0; n < retries; n++) {
      try {
        const text = await adapters[entry.provider]({ ...args, model: entry.model }, env);
        if (!text) throw new AiError(`${entry.provider} returned no text`);
        return text;
      } catch (e) {
        last = e;
        if (e.fatal || e.status === 429) break;
        if (n < retries - 1) await sleep((env.AI_RETRY_BASE_MS ? Number(env.AI_RETRY_BASE_MS) : 2000) * 2 ** n);
      }
    }
  } finally { u.active--; }
  if (last?.status === 429) { u.cooldownUntil = Date.now() + (last.retryAfterMs ?? 60_000); u.cooldownReason = last.daily ? 'daily limit (provider)' : 'rate limited (provider)'; }
  throw last;
}

export async function complete(role, prompt, { json = false, env = process.env, maxOut } = {}) {
  const route = routeFor(role, env);
  if (!route.length) throw new Error(`No configured AI provider for role "${role}" — check AI_${role.toUpperCase()} and the matching API key`);
  const est = estimateTokens(prompt, maxOut), maxWait = Number(env.AI_MAX_WAIT_MS ?? 300_000), started = Date.now();
  const errors = [], failed = new Set();

  for (;;) {
    const now = Date.now();
    let soonest = Infinity, soonestWhy = '';
    for (const entry of route) {
      const key = `${entry.provider}:${entry.model}`;
      if (failed.has(key)) continue;
      const r = readiness(entry, est, env, now);
      if (r.skip) { errors.push(`${key} — ${r.why}`); failed.add(key); continue; }
      if (!r.ok) { if (r.waitMs < soonest) { soonest = r.waitMs; soonestWhy = `${key}: ${r.why}`; } continue; }
      try {
        let text = await attempt(entry, { prompt, json }, env, est, 4);
        if (json) {
          text = stripFences(text); // providers without a JSON mode wrap output in ```json fences
          try { JSON.parse(text); } catch { throw new AiError('invalid JSON'); }
        }
        return { text, provider: entry.provider, model: entry.model };
      } catch (e) {
        errors.push(`${key} — ${e.message}`);
        if (e.status === 429) continue; // cooled; the loop picks another or waits
        failed.add(key); // a real failure for this call: do not try this one again for it
      }
    }
    const live = route.filter(e => !failed.has(`${e.provider}:${e.model}`));
    if (!live.length) throw new Error(`All providers failed for "${role}": ${errors.join('; ')}`);
    // Everything left is cooling or at its limit: wait for the earliest, or give up (a job can pause and come back).
    if (soonest === Infinity) continue; // someone became ready during the pass
    if (Date.now() - started + soonest > maxWait) {
      const err = new Error(`AI capacity for "${role}" is used up for now (${soonestWhy}); next slot in about ${Math.ceil(soonest / 60000)} min`);
      err.code = 'AI_EXHAUSTED'; err.retryAt = new Date(Date.now() + soonest).toISOString();
      throw err;
    }
    await sleep(Math.min(soonest, 5000));
  }
}

/** What each provider has used this session; for logs and a future Studio panel. */
export function quotaSnapshot(env = process.env) {
  const now = Date.now(), win = windowMs(env), out = {};
  for (const [k, u] of usage) out[k] = { callsLastMinute: u.starts.filter(t => now - t < win).length, tokensLastMinute: u.tokens.filter(t => now - t[0] < win).reduce((n, t) => n + t[1], 0), callsToday: u.dayCount, coolingForMs: Math.max(0, u.cooldownUntil - now), reason: u.cooldownReason };
  return out;
}

export const generateText = async (prompt, role = 'draft') => (await complete(role, prompt)).text;
export const generateJson = async (prompt, role = 'draft') => JSON.parse((await complete(role, prompt, { json: true })).text);
export const reviewEnabled = (env = process.env) => routeFor('review', env).length > 0;
