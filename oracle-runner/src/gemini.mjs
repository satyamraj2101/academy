// Gemini calls with retry and backoff. The runner owns long calls, so it can afford to wait out
// 429/5xx responses that would blow a Cloudflare Worker's time budget.
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function generate(prompt, { json }) {
  if (!KEY) throw new Error('GEMINI_API_KEY is not set on the runner');
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'}/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: json ? { response_mime_type: 'application/json' } : {},
        }),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`Gemini ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`), { fatal: true });
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
      if (!text) throw new Error('Gemini returned no text');
      return text;
    } catch (e) {
      lastErr = e;
      if (e.fatal) break;
      await new Promise(r => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
  throw lastErr;
}

export const generateText = (prompt) => generate(prompt, { json: false });

export async function generateJson(prompt) {
  // JSON mode occasionally returns invalid JSON on long outputs; one regenerate fixes it almost always.
  for (let i = 0; i < 2; i++) {
    const text = await generate(prompt, { json: true });
    try { return JSON.parse(text); } catch { /* retry once */ }
  }
  throw new Error('Gemini returned invalid JSON twice');
}
