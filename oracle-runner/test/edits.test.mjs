import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScene, sceneForTime, applyChanges } from '../src/video/edits.mjs';

const orig = { id: 'why', gesture: 'present', narration: 'Contracts hide in email.', spoken: 'Contracts hide in email.', slide: { layout: 'bullets', title: 'T', bullets: [{ text: 'a', at: 'hide in email' }] } };

test('keeps the original id even if the model changes it', () => {
  const { scene } = validateScene({ ...orig, id: 'hacked' }, orig);
  assert.equal(scene.id, 'why');
});
test('drops "at" phrases that are not spoken, and says so', () => {
  const next = { ...orig, slide: { ...orig.slide, bullets: [{ text: 'a', at: 'never said' }] } };
  const { scene, problems } = validateScene(next, orig);
  assert.equal(scene.slide.bullets[0].at, undefined);
  assert.equal(problems.length, 1);
});
test('rejects an unknown layout or empty narration', () => {
  assert.equal(validateScene({ ...orig, slide: { layout: 'spaceship' } }, orig).scene, null);
  assert.equal(validateScene({ ...orig, narration: ' ' }, orig).scene, null);
  assert.equal(validateScene('nonsense', orig).scene, null);
});
test('rejects a quiz whose answer index is out of range', () => {
  const quiz = { ...orig, spoken: 'x', slide: { layout: 'quiz', title: 'Q', quiz: { question: 'q', options: ['a', 'b'], answer: 5 } } };
  assert.equal(validateScene(quiz, orig).scene, null);
});
test('an invalid gesture falls back to the original', () => {
  assert.equal(validateScene({ ...orig, gesture: 'dance' }, orig).scene.gesture, 'present');
});
test('finds the scene for a time, and applies only chosen changes', () => {
  const chapters = [{ id: 'a', start: 0, end: 10 }, { id: 'b', start: 10.5, end: 20 }];
  assert.equal(sceneForTime(chapters, 12).id, 'b');
  assert.equal(sceneForTime(chapters, 999).id, 'b');
  const script = { scenes: [{ id: 'a', n: 1 }, { id: 'b', n: 2 }] };
  const out = applyChanges(script, [{ sceneId: 'b', after: { id: 'b', n: 99 } }]);
  assert.deepEqual(out.scenes.map(s => s.n), [1, 99]);
});
