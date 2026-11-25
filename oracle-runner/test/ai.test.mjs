import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFor, complete, stripFences, reviewEnabled } from '../src/ai.mjs';

const realFetch = globalThis.fetch;
const reply = (status, body) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
const gemini = (text) => reply(200, { candidates: [{ content: { parts: [{ text }] } }] });
const anthropic = (text) => reply(200, { content: [{ type: 'text', text }] });
const baseEnv = { AI_RETRY_BASE_MS: '1' };

test.afterEach(() => { globalThis.fetch = realFetch; });

test('routes skip providers without keys and respect order', () => {
  const env = { AI_DRAFT: 'gemini:g1,anthropic:a1,openai:o1', GEMINI_API_KEY: 'k', OPENAI_API_KEY: 'k' };
  assert.deepEqual(routeFor('draft', env).map(r => r.provider), ['gemini', 'openai']);
});

test('review role is disabled by default and enabled by config', () => {
  assert.equal(reviewEnabled({}), false);
  assert.equal(reviewEnabled({ AI_REVIEW: 'anthropic:claude-haiku-5-5', ANTHROPIC_API_KEY: 'k' }), true);
});

test('falls back to the next provider when the first keeps returning 429', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return String(url).includes('generativelanguage') ? reply(429, {}) : anthropic('from anthropic');
  };
  const env = { ...baseEnv, AI_DRAFT: 'gemini:g1,anthropic:a1', GEMINI_API_KEY: 'k', ANTHROPIC_API_KEY: 'k' };
  const r = await complete('draft', 'hi', { env });
  assert.equal(r.provider, 'anthropic');
  assert.equal(r.text, 'from anthropic');
  assert.equal(calls.filter(u => u.includes('generativelanguage')).length, 4, 'retries the first provider before moving on');
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
