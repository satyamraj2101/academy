// Runs one chat-style request through the free AI providers in order and returns the first reply the caller's parser accepts.
// Gemini first (best at keeping long content intact), then Cloudflare Workers AI's free allowance with a daily cap. A model that
// is retired, busy, out of quota or that answers with something unusable just hands over to the next one.
import { takeSlot } from './_aiUsage';

export interface AiEnv {
  GEMINI_API_KEY?: string;
  GEMINI_EDIT_MODELS?: string;
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<any> };
}
export type Messages = { role: string; content: string }[];

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash'];
const WORKERS_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

async function gemini(model: string, key: string, messages: Messages, json: boolean): Promise<string | null> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: messages[0].content }] },
      contents: [{ role: 'user', parts: [{ text: messages[1].content }] }],
      generationConfig: { temperature: 0.2, ...(json ? { response_mime_type: 'application/json' } : {}) },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json() as any;
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') ?? null;
}

export async function runAi<T>(
  env: AiEnv, db: D1Database, messages: Messages, parse: (raw: string) => T | null,
  opts: { kind: string; workersDailyCap: number; json?: boolean },
): Promise<{ result: T; model: string } | { unavailable: string }> {
  const tried: string[] = [];
  if (env.GEMINI_API_KEY) {
    const models = env.GEMINI_EDIT_MODELS ? env.GEMINI_EDIT_MODELS.split(',').map(s => s.trim()).filter(Boolean) : GEMINI_MODELS;
    for (const model of models) {
      try {
        const raw = await gemini(model, env.GEMINI_API_KEY, messages, !!opts.json);
        const result = raw ? parse(raw) : null;
        if (result) return { result, model };
        tried.push(`${model}: unusable reply`);
      } catch (e: any) { tried.push(`${model}: ${String(e?.message || e).slice(0, 60)}`); }
    }
  }
  if (env.AI) {
    let allowed = false;
    try { allowed = await takeSlot(db, opts.kind, opts.workersDailyCap); } catch { /* counter unavailable: skip this provider */ }
    if (allowed) {
      try {
        const out = await env.AI.run(WORKERS_MODEL, { messages, max_tokens: 4096, temperature: 0.2 });
        const raw = out?.response ?? out?.result?.response;
        const result = parse(typeof raw === 'string' ? raw : JSON.stringify(raw ?? ''));
        if (result) return { result, model: WORKERS_MODEL };
        tried.push('workers-ai: unusable reply');
      } catch (e: any) { tried.push(`workers-ai: ${String(e?.message || e).slice(0, 60)}`); }
    } else tried.push('workers-ai: daily allowance used');
  }
  console.error(`${opts.kind}: no provider produced a usable reply:`, tried.join('; '));
  return { unavailable: tried.length ? 'The AI could not make that change right now. Try again in a minute, or word the request a little differently.' : 'No AI provider is connected on this server.' };
}
