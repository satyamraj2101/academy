// Text-to-speech with Kokoro (Apache-2.0 weights, runs on CPU via onnxruntime). The model downloads
// once (~90 MB) and is cached, then the whole thing works offline.
import { KokoroTTS } from 'kokoro-js';

// q8 is the small, fast model; fp32 is the full-quality one (larger download, slower, cleaner output).
const DTYPE = process.env.KOKORO_DTYPE || 'q8';
let model;
const load = () => (model ??= KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: DTYPE, device: 'cpu' }));

// Kokoro handles a few hundred tokens per call, so split long narration on sentence ends.
export function chunkText(text, max = 280) {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + s).length > max) { chunks.push(cur.trim()); cur = ''; }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

// Returns { samples: Float32Array, rate }.
export async function synth(text, { voice = 'bf_emma', speed = 1 } = {}) {
  const tts = await load();
  const parts = [];
  let rate = 24000;
  for (const chunk of chunkText(text)) {
    const a = await tts.generate(chunk, { voice, speed });
    rate = a.sampling_rate;
    parts.push(a.audio);
    parts.push(new Float32Array(Math.round(rate * 0.12))); // short breath between sentences
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const samples = new Float32Array(total);
  let o = 0;
  for (const p of parts) { samples.set(p, o); o += p.length; }
  return { samples, rate };
}

// 16-bit mono PCM WAV.
export function wavBuffer(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 32767, 44 + i * 2);
  return buf;
}
