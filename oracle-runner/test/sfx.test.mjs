import test from 'node:test';
import assert from 'node:assert/strict';
import { sound, SOUNDS, sceneEvents, placeEvents, mixSfx, RATE } from '../src/video/sfx.mjs';

test('every chirp is finite, quiet, short, and starts and ends at silence (no clicks)', () => {
  for (const name of SOUNDS) {
    const s = sound(name);
    let peak = 0;
    for (const v of s) { assert.ok(Number.isFinite(v)); peak = Math.max(peak, Math.abs(v)); }
    assert.ok(peak > 0.05 && peak <= 0.25, `${name} peak ${peak}`);
    assert.ok(s.length / RATE > 0.1 && s.length / RATE < 0.6, `${name} length`);
    assert.ok(Math.abs(s[0]) < 0.02 && Math.abs(s[s.length - 1]) < 0.02, `${name} edges`);
  }
});
test('unknown sound names are rejected', () => assert.throws(() => sound('boom'), /unknown sound/));
test('events resolve from phrases and times; unknown sounds and missing phrases are skipped', () => {
  const scene = { spoken: 'Hello there, welcome to the lesson.', sfx: [{ sound: 'happy', at: 'welcome' }, { sound: 'nope', at: 'hello' }, { sound: 'oops', at: 'not said' }, { sound: 'nudge', time: 1 }] };
  const ev = sceneEvents(scene, 4);
  assert.deepEqual(ev.map(e => e.sound), ['nudge', 'happy'].sort((a, b) => (a === 'nudge' ? -1 : 1)));
  assert.ok(ev.every(e => e.t >= 0 && e.t < 4));
});
test('a quiz reveal gets a happy chirp unless one is already placed there', () => {
  const quiz = { spoken: 'a b c', slide: { layout: 'quiz', quiz: { answerAt: 'c' } } };
  assert.equal(sceneEvents(quiz, 6).filter(e => e.sound === 'happy').length, 1);
  assert.equal(sceneEvents({ ...quiz, sfx: [{ sound: 'celebrate', at: 'c' }] }, 6).length, 1);
});
test('mixing adds the chirp at its time and stops at the end of the buffer', () => {
  const audio = new Float32Array(RATE);
  mixSfx(audio, [{ t: 0.5, sound: 'happy' }, { t: 0.99, sound: 'celebrate' }]);
  assert.equal(audio[0], 0);
  assert.ok(audio.slice(Math.round(0.5 * RATE), Math.round(0.6 * RATE)).some(v => Math.abs(v) > 0.05));
});

const speech = (seconds, amp = 0.2) => Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => amp * Math.sin(i * 0.3));
const withSilence = (parts) => { const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

test('a chirp attached to a phrase waits for the next pause', () => {
  const voice = withSilence([speech(1), new Float32Array(Math.round(0.6 * RATE)), speech(1)]);
  const [placed] = placeEvents([{ t: 0.8, sound: 'happy' }], voice);
  assert.equal(placed.snapped, true);
  assert.ok(placed.t >= 1.0 && placed.t < 1.45, `placed at ${placed.t}`);
});
test('with no pause nearby the voice is dipped under the chirp, not left at full level', () => {
  const voice = speech(2);
  const [placed] = placeEvents([{ t: 1, sound: 'nudge' }], voice);
  assert.equal(placed.snapped, false);
  const mixed = Float32Array.from(voice);
  mixSfx(mixed, [placed]);
  const mid = Math.round(1.04 * RATE);
  assert.ok(Math.abs(mixed[mid] - (voice[mid] * 0.5 + sound('nudge')[mid - Math.round(1 * RATE)])) < 1e-6);
});
