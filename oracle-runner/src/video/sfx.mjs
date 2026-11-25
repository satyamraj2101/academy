// Indoo's voice: short synthesised chirps. Pure sine tones with smooth envelopes (no noise, no clicks), generated in code,
// so they are original, free to use and the same on every machine. They are mixed well under the narrator.
import { timeOf, highlights } from './scene.mjs';

export const RATE = 24000;
export const SOUNDS = ['happy', 'curious', 'oops', 'celebrate', 'notice', 'nudge'];
const MIX_GAIN = 0.24; // peak of a chirp relative to full scale; narration sits near 0.5 peaks

// freq(p): frequency in Hz at progress p (0..1). The envelope has a soft attack and release so nothing clicks.
function tone(dur, freq, { vib = 0, vibHz = 16, decay = 0 } = {}) {
  const n = Math.round(dur * RATE), out = new Float32Array(n);
  let phase = 0;
  const atk = Math.round(0.014 * RATE), rel = Math.round(Math.min(0.05, dur * 0.4) * RATE);
  for (let i = 0; i < n; i++) {
    const p = i / n, f = freq(p) + (vib ? Math.sin((i / RATE) * 2 * Math.PI * vibHz) * vib : 0);
    phase += (2 * Math.PI * f) / RATE;
    let env = Math.min(1, i / atk, (n - i) / rel);
    if (decay) env *= Math.exp(-decay * p);
    out[i] = (Math.sin(phase) + 0.07 * Math.sin(2 * phase)) * env * 0.92;
  }
  return out;
}
const join = (parts, gapSec = 0.02) => {
  const gap = Math.round(gapSec * RATE), len = parts.reduce((n, p) => n + p.length + gap, -gap), out = new Float32Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length + gap; }
  return out;
};
const glide = (a, b) => (p) => a + (b - a) * p;

const BUILD = {
  happy: () => join([tone(0.17, glide(1000, 1560)), tone(0.09, () => 1560)], 0.01),
  curious: () => tone(0.34, (p) => 940 + 360 * Math.sin(p * Math.PI) + (p > 0.6 ? -80 * (p - 0.6) : 0), { vib: 16, vibHz: 11 }),
  oops: () => tone(0.38, glide(900, 440), { vib: 10, vibHz: 7 }),
  celebrate: () => join([1047, 1319, 1568, 2093].map((f, i) => tone(i === 3 ? 0.2 : 0.09, () => f)), 0.015),
  notice: () => join([tone(0.1, () => 2093, { decay: 3 }), tone(0.14, () => 2637, { decay: 3.5 })], 0.035),
  nudge: () => tone(0.12, glide(760, 860)),
};

export function sound(name) {
  const build = BUILD[name];
  if (!build) throw new Error(`unknown sound "${name}" (use ${SOUNDS.join(', ')})`);
  const s = build();
  let peak = 0;
  for (const v of s) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < s.length; i++) s[i] = (s[i] / (peak || 1)) * MIX_GAIN;
  return s;
}

// Resolve a scene's chirps to [{ t, sound }] in scene-local seconds. `at` = a phrase in the spoken text, or `time` in seconds.
// A quiz scene gets a happy chirp on the answer reveal unless the script already places one there.
export function sceneEvents(scene, dur) {
  const events = [];
  for (const e of scene.sfx || []) {
    if (!SOUNDS.includes(e.sound)) continue;
    const t = e.at ? timeOf(scene, e.at, dur, -1) : Number(e.time);
    if (Number.isFinite(t) && t >= 0 && t < dur) events.push({ t, sound: e.sound });
  }
  for (const h of highlights(scene, dur)) {
    if (!events.some(e => Math.abs(e.t - h.t0) < 1.2)) events.push({ t: h.t0, sound: 'notice' });
  }
  if (scene.slide?.layout === 'quiz' && scene.slide.quiz) {
    const t = timeOf(scene, scene.slide.quiz.answerAt, dur, dur * 0.8);
    if (!events.some(e => Math.abs(e.t - t) < 1)) events.push({ t, sound: 'happy' });
  }
  return events.sort((a, b) => a.t - b.t);
}

// A chirp should never talk over Soomy. Starting from the phrase it was attached to, find the first pause long enough
// for the whole chirp (looking up to 1.6 s ahead, then 0.3 s back). If there is none, keep the time and let mixSfx
// lower the voice under it instead.
const rmsAt = (a, i, n) => { if (i >= a.length) return Infinity; let s = 0, c = 0; for (let k = i; k < Math.min(a.length, i + n); k++) { s += a[k] * a[k]; c++; } return c ? Math.sqrt(s / c) : 0; };
export function placeEvents(events, voice) {
  const win = Math.round(0.02 * RATE), quiet = (i) => i >= 0 && rmsAt(voice, i, win) < 0.015;
  return events.map((e) => {
    const need = sound(e.sound).length + Math.round(0.02 * RATE), start = Math.round(e.t * RATE);
    const fits = (i) => { for (let k = 0; k < need; k += win) if (!quiet(i + k)) return false; return true; };
    for (let off = 0; off <= 1.6 * RATE; off += win) if (fits(start + off)) return { ...e, t: (start + off + 0.02 * RATE) / RATE, snapped: true };
    for (let off = win; off <= 0.3 * RATE; off += win) if (start - off >= 0 && fits(start - off)) return { ...e, t: (start - off) / RATE, snapped: true };
    return { ...e, snapped: false };
  });
}

// Adds each chirp. Where a chirp still overlaps speech, the voice is dipped to about half under it (25 ms ramps).
export function mixSfx(audio, events) {
  for (const e of events) {
    const s = sound(e.sound), start = Math.round(e.t * RATE), ramp = Math.round(0.025 * RATE);
    for (let i = -ramp; i < s.length + ramp; i++) {
      const idx = start + i;
      if (idx < 0 || idx >= audio.length) continue;
      const edge = Math.min(1, (i + ramp) / ramp, (s.length + ramp - i) / ramp);
      audio[idx] *= 1 - 0.5 * Math.max(0, edge);
      if (i >= 0 && i < s.length) audio[idx] += s[i];
    }
  }
}
