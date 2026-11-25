import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText, lessonSource, finalize, ungroundedNumbers, lessonToScript, INTRO_SCENE } from '../src/video/lesson-to-script.mjs';

const HTML = '<h3>Analyzing a Template</h3><p>Before launching a template, analyze its specifications using the slide-out panel.</p><ul><li><b>Status &amp; Actions:</b> A status bar showing configured actions.</li><li><b>Approvals:</b> Overview of manual vs. final approvals.</li></ul><script>evil()</script>';
const lesson = { id: 'les-x', title: 'Panels', content_type: 'text', content_body: HTML, sections: [] };
const ctx = { course: { id: 'c1', title: 'Course' }, module: { title: 'Module' }, lesson };

const base = () => ({
  title: 'Panels in one minute',
  scenes: [
    { id: 'intro', spoken: 'Before you launch a template, take a look at its details. The slide-out panel shows you everything you need in one place, so you can decide with confidence.', station: 'frontdesk', slide: { layout: 'hook', title: 'Read the panel first', subtitle: 'Before you launch' } },
    { id: 'points', spoken: 'The panel has a status bar that shows the configured actions. It also gives an overview of manual and final approvals, so nothing surprises you later on.', station: 'frontdesk', slide: { layout: 'bullets', title: 'What the panel shows', bullets: [{ text: 'Status and actions', at: 'status bar' }, { text: 'Approvals', at: 'final approvals' }] }, sfx: [{ sound: 'happy', at: 'later on' }] },
    { id: 'recap', spoken: 'So remember, check the specifications in the slide-out panel before you launch any template. It takes seconds and it saves rework later, which is always worth it.', station: 'frontdesk', slide: { layout: 'recap', title: 'Recap', takeaways: [{ text: 'Open the panel first', at: 'slide-out panel' }] } },
  ],
});

const good = () => { const g = base(); g.scenes.forEach(sc => { sc.spoken += ' It is a small habit that pays off every single time you launch one.'; }); return g; };

test('html lessons become readable text, keeping structure and dropping scripts', () => {
  const t = htmlToText(HTML);
  assert.match(t, /## Analyzing a Template/);
  assert.match(t, /- Status & Actions: A status bar/);
  assert.doesNotMatch(t, /evil|<|&amp;/);
});
test('the source uses the HTML body and markdown sections, ignores other blocks, and hashes the text', () => {
  const a = lessonSource({ ...lesson, sections: [{ section_type: 'markdown', content: '## More\nExtra text.' }, { section_type: 'video', content: 'https://x/v.mp4' }, { section_type: 'quiz', content: '{}' }] });
  assert.match(a.text, /Extra text/); assert.doesNotMatch(a.text, /x\/v\.mp4/);
  assert.notEqual(a.hash, lessonSource(lesson).hash);
  assert.equal(lessonSource(lesson).hash, lessonSource({ ...lesson }).hash);
});
test('numbers that the lesson never mentions are flagged', () => {
  const scenes = [{ spoken: 'Teams save 40% of their time with 3 approvals.' }];
  assert.deepEqual(ungroundedNumbers(scenes, 'there are 3 approvals in the list'), ['40%']);
  assert.deepEqual(ungroundedNumbers(scenes, 'saves 40 percent... 3 approvals'), []);
});
test('a good script is accepted, narration is made from the speech, and the lesson is remembered', () => {
  const src = lessonSource(lesson);
  const g = good(); g.scenes[0].spoken = g.scenes[0].spoken.replace('a template', 'a C L M template');
  const out = finalize(g, src, ctx);
  assert.ok(out.script, JSON.stringify(out.problems));
  assert.match(out.script.scenes[0].narration, /CLM template/);
  assert.equal(out.script.source.lessonId, 'les-x');
  assert.equal(out.script.source.hash, src.hash);
  assert.deepEqual(out.script.campus, ['frontdesk']);
});
test('bad item phrases are dropped with a warning; unknown stations removed', () => {
  const g = good(); g.scenes[1].slide.bullets[0].at = 'never said'; g.scenes[2].station = 'moon-base';
  const out = finalize(g, lessonSource(lesson), ctx);
  assert.ok(out.script);
  assert.equal(out.script.scenes[1].slide.bullets[0].at, undefined);
  assert.ok(out.warnings.some(w => /unknown station/.test(w)));
});
test('scripts that cannot be rendered are rejected with reasons', () => {
  const src = lessonSource(lesson);
  assert.ok(finalize({ scenes: good().scenes.slice(0, 2) }, src, ctx).problems.some(p => /3 to 8 scenes/.test(p)));
  const noSpeech = good(); noSpeech.scenes[1].spoken = '';
  assert.ok(finalize(noSpeech, src, ctx).problems.some(p => /no "spoken"/.test(p)));
  const quiz = good(); quiz.scenes[1] = { id: 'q', spoken: 'Which one shows approvals? A, the bar. B, the panel. C, the inbox. Think about it. The answer is B because that is what the panel shows.', slide: { layout: 'quiz', title: 'Check', quiz: { question: 'Which?', options: ['bar', 'panel', 'inbox'], answer: 1 } } };
  assert.ok(finalize(quiz, src, ctx).problems.some(p => /\|\|/.test(p)));
  const two = good(); two.scenes.push(JSON.parse(JSON.stringify(two.scenes[0])));
  assert.ok(finalize(two, src, ctx).problems.some(p => /at most one hook/.test(p)));
});
test('the writer retries with the problems it was shown, then succeeds', async () => {
  const real = globalThis.fetch; const prompts = [];
  let n = 0;
  globalThis.fetch = async (_u, o) => {
    prompts.push(JSON.parse(o.body).contents[0].parts[0].text);
    n++;
    const reply = n === 1 ? { title: 'x', scenes: [] } : good();
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }), { status: 200 });
  };
  try {
    const r = await lessonToScript(ctx, { intro: true, env: { AI_DRAFT: 'gemini:m', GEMINI_API_KEY: 'k', AI_RETRY_BASE_MS: '1' } });
    assert.equal(r.attempts, 2);
    assert.match(prompts[0], /Analyzing a Template/);
    assert.match(prompts[1], /REJECTED/); assert.match(prompts[1], /3 to 8 scenes/);
    assert.equal(r.script.scenes[0].id, INTRO_SCENE.id);
    assert.deepEqual(r.script.campus, ['frontdesk']);
  } finally { globalThis.fetch = real; }
});
test('a lesson with almost no text is refused instead of padded', async () => {
  await assert.rejects(lessonToScript({ ...ctx, lesson: { ...lesson, content_body: '<p>Hi.</p>' } }, { env: {} }), /too little text/);
});

test('copy that appears twice is read once, and diagram code is never narrated', () => {
  const md = '## The 5 Stages\nEvery contract goes through a lifecycle:\n\n- Generation: Drafting.\n- Negotiation: Redlining.\nBelow is a diagram:\ngraph LR\n  A[Generation] --> B[Negotiation]';
  const l = { id: 'd', title: 'Dup', content_type: 'text', content_body: md, sections: [{ section_type: 'markdown', content: md }] };
  const t = lessonSource(l).text;
  assert.equal(t.split('Every contract goes through').length - 1, 1, t);
  assert.doesNotMatch(t, /graph LR|-->|A\[Generation\]/);
  assert.match(t, /Negotiation: Redlining/);
});

test('steps must come with their one-line descriptions', () => {
  const g = good();
  g.scenes[1] = { id: 'flow', spoken: g.scenes[1].spoken, slide: { layout: 'steps', title: 'Flow', steps: [{ text: 'One', desc: 'First thing.' }, { text: 'Two' }] } };
  const out = finalize(g, lessonSource(lesson), ctx);
  assert.ok(out.problems.some(p => /every step needs/.test(p)), JSON.stringify(out.problems));
});
test('timing phrases match through punctuation and curly quotes', () => {
  const g = good();
  g.scenes[1].spoken = "The panel has a status bar that shows the configured actions. After that, Approval comes next, so nothing surprises you later. It's a small habit that pays off every single time.";
  g.scenes[1].sfx = [];
  g.scenes[1].slide.bullets = [{ text: 'Approval', at: 'After that Approval' }, { text: 'Habit', at: 'It’s a small habit' }];
  const out = finalize(g, lessonSource(lesson), ctx);
  assert.ok(out.script, JSON.stringify(out.problems));
  assert.equal(out.script.scenes[1].slide.bullets[0].at, 'After that Approval');
  assert.equal(out.script.scenes[1].slide.bullets[1].at, 'It’s a small habit');
  assert.ok(!out.warnings.some(w => /not in the spoken/.test(w)));
});

test('a single chirp written as an object instead of a list is accepted', () => {
  const g = good(); g.scenes[1].sfx = { sound: 'happy', at: 'later on' };
  const out = finalize(g, lessonSource(lesson), ctx);
  assert.ok(out.script, JSON.stringify(out.problems));
  assert.ok(Array.isArray(out.script.scenes[1].sfx));
  assert.equal(out.script.scenes[1].sfx[0].sound, 'happy');
});

test('on-screen text says CLM (the spaced spelling is only for the voice) and list items are not numbered twice', () => {
  const g = good();
  g.scenes[1] = { id: 'flow', spoken: 'First we draft the C L M contract, then we review it, and finally we sign it off together as a team, which is the whole journey from start to finish.', hint: 'Think about C L M.', slide: { layout: 'steps', title: 'The Five Stages of C L M', steps: [{ text: '1. Draft', desc: 'Draft the C L M contract.', at: 'draft the C L M contract' }, { text: '2) Review', desc: 'Review it.' }] } };
  const out = finalize(g, lessonSource(lesson), ctx);
  assert.ok(out.script, JSON.stringify(out.problems));
  const sc = out.script.scenes[1];
  assert.equal(sc.slide.title, 'The Five Stages of CLM');
  assert.equal(sc.slide.steps[0].text, 'Draft');
  assert.equal(sc.slide.steps[1].text, 'Review');
  assert.equal(sc.slide.steps[0].desc, 'Draft the CLM contract.');
  assert.equal(sc.hint, 'Think about CLM.');
  assert.equal(sc.slide.steps[0].at, 'draft the C L M contract', 'timing phrases keep matching the spoken text');
  assert.match(sc.spoken, /C L M contract/);
});
