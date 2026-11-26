import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEditedScript, findVideo, explain, firstLessonId } from '../src/cloud/video-edit.mjs';
import { INTRO_SCENE } from '../src/video/lesson-to-script.mjs';

const HTML = '<h3>Panels</h3><p>Before launching a template, analyze its specifications using the slide-out panel. The panel has a status bar that shows the configured actions and an overview of approvals.</p>';
const found = { course: { id: 'c1', title: 'Course' }, module: { title: 'M' }, lesson: { id: 'l1', title: 'Panels', content_type: 'text', content_body: HTML, sections: [] } };
const scene = (id, extra = {}) => ({ id, spoken: 'The panel has a status bar that shows the configured actions. It also gives an overview of manual and final approvals, so nothing surprises you later on at all. It is a small habit that pays off every single time you launch one, and it takes only a few seconds to do.', station: 'frontdesk', slide: { layout: 'hook', title: 'Read the panel first', subtitle: 'Before you launch' }, ...extra });
const good = () => ({ title: 'Panels', scenes: [scene('a'), scene('b', { slide: { layout: 'bullets', title: 'Panel', bullets: [{ text: 'Status', at: 'status bar' }] } }), scene('c', { slide: { layout: 'recap', title: 'Recap', takeaways: [{ text: 'Open it', at: 'status bar' }] } })] });

test('an edited script is checked like an AI one and keeps the welcome scene first', () => {
  const edited = good(); edited.scenes.unshift({ ...INTRO_SCENE });
  const r = checkEditedScript(edited, found, 'Old title');
  assert.equal(r.script.scenes[0].id, 'intro');
  assert.equal(r.script.scenes.length, 4);
  assert.equal(new Set(r.script.scenes.map(s => s.id)).size, 4);
});
test('a scene the AI named intro does not clash with the welcome scene', () => {
  const edited = good(); edited.scenes[0].id = 'intro'; edited.scenes.unshift({ ...INTRO_SCENE });
  const ids = checkEditedScript(edited, found, 't').script.scenes.map(s => s.id);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});
test('an edited script that cannot be rendered says why', () => {
  const edited = good(); edited.scenes[1].slide.layout = 'nonsense';
  assert.throws(() => checkEditedScript(edited, found, 't'), /cannot be used yet/);
  const empty = good(); empty.scenes[0].spoken = '';
  assert.throws(() => checkEditedScript(empty, found, 't'), /no "spoken" text/);
  assert.throws(() => checkEditedScript({ scenes: [] }, found, 't'), /3 to 8 scenes/);
});
test('the video is found by its id inside the lesson sections', () => {
  const lesson = { sections: [{ section_type: 'markdown', content: 'x' }, { section_type: 'interactive_video', content: JSON.stringify({ videoId: 'v1', title: 'T' }) }, { section_type: 'interactive_video', content: 'not json' }] };
  assert.equal(findVideo(lesson, 'v1').title, 'T');
  assert.equal(findVideo(lesson, 'v2'), null);
});
test('failures are explained in plain words', () => {
  assert.match(explain({ code: 'AI_EXHAUSTED', retryAt: '2026-11-27T00:00:00Z' }), /free AI limits.*Try again after/);
  assert.equal(explain(new Error('boom')), 'boom');
});

test('the welcome scene goes to the first lesson of the first module only', () => {
  const structure = [{ lessons: [{ id: 'l1' }, { id: 'l2' }] }, { lessons: [{ id: 'l3' }] }];
  assert.equal(firstLessonId(structure), 'l1');
  assert.equal(firstLessonId([{ lessons: [] }, { lessons: [{ id: 'x' }] }]), 'x');
  assert.equal(firstLessonId([]), null);
});
