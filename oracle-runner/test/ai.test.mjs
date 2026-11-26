import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFor, complete, stripFences, reviewEnabled, resetAiState, parseDuration, estimateTokens, quotaSnapshot } from '../src/ai.mjs';

const realFetch = globalThis.fetch;
const reply = (status, body) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
const gemini = (text) => reply(200, { candidates: [{ content: { parts: [{ text }] } }] });
const anthropic = (text) => reply(200, { content: [{ type: 'text', text }] });
const baseEnv = { AI_RETRY_BASE_MS: '1' };

test.afterEach(() => { globalThis.fetch = realFetch; resetAiState(); });

test('routes skip providers without keys and respect order', () => {
  const env = { AI_DRAFT: 'gemini:g1,anthropic:a1,openai:o1', GEMINI_API_KEY: 'k', OPENAI_API_KEY: 'k' };
  assert.deepEqual(routeFor('draft', env).map(r => r.provider), ['gemini', 'openai']);
});

test('review role is disabled by default and enabled by config', () => {
  assert.equal(reviewEnabled({}), false);
  assert.equal(reviewEnabled({ AI_REVIEW: 'anthropic:claude-haiku-5-5', ANTHROPIC_API_KEY: 'k' }), true);
});

test('a 429 sends the call straight to the next provider, without retrying the limited one', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return String(url).includes('generativelanguage') ? reply(429, {}) : anthropic('from anthropic');
  };
  const env = { ...baseEnv, AI_DRAFT: 'gemini:g1,anthropic:a1', GEMINI_API_KEY: 'k', ANTHROPIC_API_KEY: 'k' };
  const r = await complete('draft', 'hi', { env });
  assert.equal(r.provider, 'anthropic');
  assert.equal(r.text, 'from anthropic');
  assert.equal(calls.filter(u => u.includes('generativelanguage')).length, 1, 'a rate-limited provider is not hit again');
});

test('a fatal 400 does not retry the same provider', async () => {
  let n = 0;
  globalThis.fetch = async (url) => { if (String(url).includes('generativelanguage')) { n++; return reply(400, 'bad'); } return anthropic('ok'); };
  const env = { ...baseEnv, AI_DRAFT: 'gemini:g1,anthropic:a1', GEMINI_API_KEY: 'k', ANTHROPIC_API_KEY: 'k' };
  assert.equal((await complete('draft', 'hi', { env })).provider, 'anthropic');
  assert.equal(n, 1);
});

test('json mode strips code fences and rejects invalid JSON', async () => {
  globalThis.fetch = async () => anthropic('```json\n{"a":1}\n```');
  const env = { ...baseEnv, AI_DRAFT: 'anthropic:a1', ANTHROPIC_API_KEY: 'k' };
  assert.equal((await complete('draft', 'x', { json: true, env })).text, '{"a":1}');
  globalThis.fetch = async () => anthropic('not json');
  await assert.rejects(complete('draft', 'x', { json: true, env }), /All providers failed/);
});

test('errors name every provider that failed; no providers is a clear error', async () => {
  globalThis.fetch = async () => reply(400, 'nope');
  const env = { ...baseEnv, AI_DRAFT: 'gemini:g1', GEMINI_API_KEY: 'k' };
  await assert.rejects(complete('draft', 'x', { env }), /gemini:g1/);
  await assert.rejects(complete('review', 'x', { env: {} }), /No configured AI provider/);
});

test('stripFences leaves plain text alone', () => {
  assert.equal(stripFences('  plain '), 'plain');
});

// ---- the gateway: pacing, cooldowns and waiting ----
const groqOk = (text) => reply(200, { choices: [{ message: { content: text } }] });
const withHeaders = (status, body, headers) => new Response(JSON.stringify(body), { status, headers });

test('parseDuration reads provider rate-limit hints', () => {
  assert.equal(parseDuration('1m26.4s'), 86400);
  assert.equal(parseDuration('23s'), 23000);
  assert.equal(parseDuration('350ms'), 350);
  assert.equal(parseDuration('12'), 12000);
  assert.equal(parseDuration(null), null);
  assert.equal(parseDuration('soon'), null);
});

test('groq is an OpenAI-compatible provider with its own key', async () => {
  let seen;
  globalThis.fetch = async (url, init) => { seen = { url: String(url), auth: init.headers.Authorization, body: JSON.parse(init.body) }; return groqOk('from groq'); };
  const env = { ...baseEnv, AI_DRAFT: 'groq:openai/gpt-oss-120b', GROQ_API_KEY: 'gk' };
  const r = await complete('draft', 'hi', { env });
  assert.equal(r.text, 'from groq');
  assert.equal(seen.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(seen.auth, 'Bearer gk');
  assert.equal(seen.body.model, 'openai/gpt-oss-120b');
});

test('a provider that sent 429 with Retry-After is skipped on the next call, with no request made to it', async () => {
  const hits = { groq: 0, gemini: 0 };
  globalThis.fetch = async (url) => {
    if (String(url).includes('groq')) { hits.groq++; return withHeaders(429, { error: 'slow down' }, { 'retry-after': '120' }); }
    hits.gemini++; return gemini('from gemini');
  };
  const env = { ...baseEnv, AI_DRAFT: 'groq:m1,gemini:g1', GROQ_API_KEY: 'k', GEMINI_API_KEY: 'k' };
  assert.equal((await complete('draft', 'one', { env })).provider, 'gemini');
  assert.equal((await complete('draft', 'two', { env })).provider, 'gemini');
  assert.equal(hits.groq, 1, 'the cooling provider is not called again');
  assert.ok(quotaSnapshot(env)['groq:m1'].coolingForMs > 100000);
});

test('a prompt too big for a provider per-minute token limit goes to one that can take it', async () => {
  let groqCalled = false;
  globalThis.fetch = async (url) => { if (String(url).includes('groq')) { groqCalled = true; return groqOk('x'); } return gemini('from gemini'); };
  const env = { ...baseEnv, AI_DRAFT: 'groq:m1,gemini:g1', GROQ_API_KEY: 'k', GEMINI_API_KEY: 'k' };
  const big = 'word '.repeat(9000); // about 11k tokens, over groq's 7.5k a minute
  assert.ok(estimateTokens(big) > 7500);
  assert.equal((await complete('draft', big, { env })).provider, 'gemini');
  assert.equal(groqCalled, false);
});

test('when every provider is cooling for longer than we will wait, it throws AI_EXHAUSTED with a retry time', async () => {
  globalThis.fetch = async () => withHeaders(429, { error: 'quota' }, { 'retry-after': '3600' });
  const env = { ...baseEnv, AI_MAX_WAIT_MS: '1000', AI_DRAFT: 'gemini:g1', GEMINI_API_KEY: 'k' };
  await assert.rejects(complete('draft', 'x', { env }), (e) => e.code === 'AI_EXHAUSTED' && !Number.isNaN(Date.parse(e.retryAt)));
});

test('a daily limit cools the provider until midnight UTC', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Quota exceeded for metric requests per day (PerDay)' } }), { status: 429 });
  const env = { ...baseEnv, AI_MAX_WAIT_MS: '1000', AI_DRAFT: 'gemini:g1', GEMINI_API_KEY: 'k' };
  await assert.rejects(complete('draft', 'x', { env }), /AI capacity/);
  const cool = quotaSnapshot(env)['gemini:g1'];
  assert.ok(cool.coolingForMs > 60_000, 'daily limits are not retried after a minute');
});

test('a short per-minute wait is waited out instead of failing', async () => {
  let n = 0;
  globalThis.fetch = async () => (n++ === 0 ? withHeaders(429, { error: 'x' }, { 'retry-after': '0.3' }) : gemini('after the wait'));
  const env = { ...baseEnv, AI_MAX_WAIT_MS: '5000', AI_DRAFT: 'gemini:g1', GEMINI_API_KEY: 'k' };
  const t0 = Date.now();
  assert.equal((await complete('draft', 'x', { env })).text, 'after the wait');
  assert.ok(Date.now() - t0 >= 250);
});

test('requests per minute are paced: the call over the limit waits for the window', async () => {
  globalThis.fetch = async () => gemini('ok');
  const env = { ...baseEnv, AI_WINDOW_MS: '400', AI_LIMITS: JSON.stringify({ gemini: { rpm: 2 } }), AI_DRAFT: 'gemini:g1', GEMINI_API_KEY: 'k' };
  await complete('draft', 'a', { env }); await complete('draft', 'b', { env });
  const t0 = Date.now();
  await complete('draft', 'c', { env });
  assert.ok(Date.now() - t0 >= 300, 'the third call waited for the window to pass');
});

test('server errors are retried on the same provider before giving up on it', async () => {
  let n = 0;
  globalThis.fetch = async () => (++n < 3 ? reply(503, {}) : gemini('third time'));
  const env = { ...baseEnv, AI_DRAFT: 'gemini:g1', GEMINI_API_KEY: 'k' };
  assert.equal((await complete('draft', 'x', { env })).text, 'third time');
  assert.equal(n, 3);
});

test('providers that failed for this call and others that are limited is a failed call, not "out of capacity"', async () => {
  globalThis.fetch = async (url) => (String(url).includes('generativelanguage') ? withHeaders(429, { error: 'quota' }, { 'retry-after': '3600' }) : reply(400, 'bad request'));
  const env = { ...baseEnv, AI_MAX_WAIT_MS: '1000', AI_DRAFT: 'anthropic:a1,gemini:g1', ANTHROPIC_API_KEY: 'k', GEMINI_API_KEY: 'k' };
  await assert.rejects(complete('draft', 'x', { env }), (e) => e.code !== 'AI_EXHAUSTED' && /anthropic:a1/.test(e.message));
});
