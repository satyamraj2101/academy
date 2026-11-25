// Renders one sentence raw (no effects) and writes <out>.wav so variants can be measured and compared.
// Usage: KOKORO_DTYPE=fp32 node src/video/voice-lab.mjs <voice> <out.wav>
import { writeFileSync } from 'node:fs';
import { synth, wavBuffer } from './tts.mjs';
const [voice, out] = process.argv.slice(2);
const TEXT = "Hi, I'm your contract counsel. A contract lifecycle starts with a request, then it is drafted, reviewed, approved, and signed. Every step leaves a clear trail.";
const t0 = Date.now();
const { samples, rate } = await synth(TEXT, { voice });
writeFileSync(out, wavBuffer(samples, rate));
console.log(`${voice} ${process.env.KOKORO_DTYPE || 'q8'}: ${(samples.length / rate).toFixed(1)}s audio in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
