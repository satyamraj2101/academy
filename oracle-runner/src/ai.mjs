// Multi-provider AI layer. Every step asks for a *role* (draft / review / fast) and gets the first
// provider in that role's route that answers, so a rate limit or outage on one vendor never stalls the
// queue. Routes are plain env strings, e.g.
//   AI_DRAFT="gemini:gemini-2.5-flash,openai:gpt-4o-mini"
//   AI_REVIEW="anthropic:claude-haiku-5-5"
// A provider is only usable when its key is set; unusable entries are skipped. An empty route means
// that role is disabled (the review role being disabled simply skips the review pass).
const ROLE_DEFAULTS = {
  draft: 'gemini:gemini-2.5-flash',
  review: '',
  fast: 'cloudflare:@cf/meta/llama-3.1-8b-instruct,gemini:gemini-2.5-flash',
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
    case 'cloudflare': return !!(env.CF_ACCOUNT_ID && env.CF_API_TOKEN);
    default: return false;
  }
}

const adapters = {
  async gemini({ model, prompt, json }, env) {
    const base = env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
    const res = await fetch(`${base}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: json ? { response_mime_type: 'application/json' } : {} }),
    });
    const data = await ok(res, 'gemini');
    return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
  },
  async anthropic({ model, prompt }, env) {
    const base = env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 8192, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await ok(res, 'anthropic');
    return data?.content?.map(b => b.text || '').join('');
  },
  async openai({ model, prompt, json }, env) {
    const base = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], ...(json ? { response_format: { type: 'json_object' } } : {}) }),
    });
    const data = await ok(res, 'openai');
    return data?.choices?.[0]?.message?.content;
  },
  async cloudflare({ model, prompt }, env) {
    const base = env.CF_API_BASE || 'https://api.cloudflare.com/client/v4';
    const res = await fetch(`${base}/accounts/${env.CF_ACCOUNT_ID}/ai/run/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.CF_API_TOKEN}` },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await ok(res, 'cloudflare');
    return data?.result?.response;
  },
};

// 429 and 5xx are retryable (same provider, backoff); anything else is fatal for that provider only.
async function ok(res, name) {
  if (res.status === 429 || res.status >= 500) throw new Error(`${name} ${res.status}`);
  if (!res.ok) throw Object.assign(new Error(`${name} ${res.status}: ${(await res.text()).slice(0, 200)}`), { fatal: true });
  return res.json();
}

export const stripFences = (t) => t.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function tryProvider(entry, args, env, retries) {
  let last;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const text = await adapters[entry.provider]({ ...args, model: entry.model }, env);
      if (!text) throw new Error(`${entry.provider} returned no text`);
      return text;
    } catch (e) {
      last = e;
      if (e.fatal) break;
      if (attempt < retries - 1) await sleep((env.AI_RETRY_BASE_MS ? Number(env.AI_RETRY_BASE_MS) : 2000) * 2 ** attempt);
    }
  }
  throw last;
}

export async function complete(role, prompt, { json = false, env = process.env } = {}) {
  const route = routeFor(role, env);
  if (!route.length) throw new Error(`No configured AI provider for role "${role}" — check AI_${role.toUpperCase()} and the matching API key`);
  const errors = [];
  for (const entry of route) {
    try {
      let text = await tryProvider(entry, { prompt, json }, env, 4);
      if (json) {
        text = stripFences(text); // providers without a JSON mode wrap output in ```json fences
        try { JSON.parse(text); } catch { throw new Error('invalid JSON'); }
      }
      return { text, provider: entry.provider, model: entry.model };
    } catch (e) {
      errors.push(`${entry.provider}:${entry.model} — ${e.message}`);
    }
  }
  throw new Error(`All providers failed for "${role}": ${errors.join('; ')}`);
}

export const generateText = async (prompt, role = 'draft') => (await complete(role, prompt)).text;
export const generateJson = async (prompt, role = 'draft') => JSON.parse((await complete(role, prompt, { json: true })).text);
export const reviewEnabled = (env = process.env) => routeFor('review', env).length > 0;
