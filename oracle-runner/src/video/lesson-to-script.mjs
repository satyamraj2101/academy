// Turns a real Academy lesson into a video script (Soomy and Indoo scenes) that the Studio can render.
//   node src/video/lesson-to-script.mjs --course workflow-templates --lesson les-wf-6 --out script.json [--intro]
// The AI only restructures what the lesson already says: it must not add facts or numbers. Every reply is validated
// before it is accepted, and the script remembers which lesson (and which version of its text) it came from.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { complete } from '../ai.mjs';
import { api } from '../api.mjs';
import { SHAPE, validateScene, LAYOUTS } from './edits.mjs';
import { STATIONS } from './stations.mjs';

const MAX_SOURCE_CHARS = 14000;
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&rarr;/g, '->').replace(/&larr;/g, '<-').replace(/&mdash;/g, '-').replace(/&ndash;/g, '-').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

// Legacy lessons are HTML. Keep their structure (headings, lists) as plain text the model can read.
export function htmlToText(html) {
  return decode(String(html || '')
    .replace(/<\s*(script|style)[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*h[1-6][^>]*>/gi, '\n\n## ').replace(/<\/\s*h[1-6]\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ').replace(/<\/\s*(p|div|ul|ol|tr|table|section|blockquote)\s*>/gi, '\n')
    .replace(/<\s*br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// What the lesson actually teaches: its HTML body and its text sections, in order. Video, slide and quiz blocks are not text.
export function lessonSource(lesson) {
  const parts = [];
  const body = String(lesson.content_body || '').trim();
  if (body && lesson.content_type !== 'blocks') parts.push(/^\s*</.test(body) ? htmlToText(body) : body);
  for (const s of lesson.sections || []) {
    if (s.section_type === 'markdown' && String(s.content || '').trim()) parts.push(/^\s*<[a-z]/i.test(s.content) ? htmlToText(s.content) : String(s.content).trim());
  }
  // Lessons often hold the same copy twice (a legacy body mirrored into a section) and may embed diagram code
  // (mermaid). Read each block once, and never hand diagram syntax to the narrator.
  const seen = new Set(), blocks = [];
  for (const block of parts.join('\n\n').split(/\n{2,}/)) {
    const kept = block.split('\n').filter(l => !/^\s*(graph|flowchart|sequenceDiagram|classDiagram|gantt)\b/i.test(l) && !/-->|^\s*```/.test(l) && !/(diagram|chart|graph)[^.]*:\s*$/i.test(l)).join('\n').trim();
    const key = kept.replace(/\s+/g, ' ').toLowerCase();
    if (!kept || kept.length < 3 || seen.has(key)) continue;
    seen.add(key); blocks.push(kept);
  }
  const text = blocks.join('\n\n').slice(0, MAX_SOURCE_CHARS).trim();
  return { text, hash: createHash('sha1').update(text).digest('hex').slice(0, 12) };
}

export async function fetchLesson(courseId, lessonId) {
  const r = await api(`/academy/courses/${encodeURIComponent(courseId)}/structure`);
  for (const m of r.structure || []) {
    const lesson = (m.lessons || []).find(l => l.id === lessonId);
    if (lesson) return { course: { id: courseId, title: r.course?.title || courseId }, module: { title: m.title }, lesson };
  }
  throw new Error(`Lesson "${lessonId}" was not found in course "${courseId}"`);
}

const stationList = Object.entries(STATIONS).map(([id, s]) => `${id} (${s.name})`).join(', ');

function buildPrompt({ course, module, lesson, source, feedback }) {
  return `You are the scriptwriter for SpotCLM Academy's lesson videos: a friendly robot instructor, Soomy, teaches while his small mop-bot friend Indoo reacts. Turn the LESSON TEXT below into a short video script.

${SHAPE}

HARD RULES
1. Use ONLY facts that are in the LESSON TEXT. Never add facts, numbers, percentages, names, prices or claims that the text does not state. Do not add explanations, reasons, benefits or consequences the text does not state (no "to ensure...", "which is crucial", "this helps you..." unless the text says so): every statement about the subject must trace to a line of the lesson. Greetings and sign-offs are fine. If the lesson is short, write fewer and shorter scenes instead of padding. Plain, warm, practical voice; no hype.
2. 3 to 8 scenes. Open with a "hook" scene (the lesson's question or promise as "title"; "kicker" and "subtitle" are short). Close with a "recap" scene (2-3 "takeaways") when there is enough to recap.
3. Pick each layout for what the content is: "steps" for a sequence or stages (2-6 items; EVERY item has a one-line "desc" taken from the lesson), "compare" for before/after or two options, "bullets" for a list of points, one "quiz" scene (exactly 3 options, one right answer, checking a fact that IS in the lesson) when the lesson supports a fair question, "recap" to close.
4. Each scene's "spoken" is 35-110 words of natural speech. Write CLM as "C L M" in "spoken" only. Do not put numbers or symbols that are hard to say aloud; write them as words. "narration" may be omitted (it will be made from "spoken").
5. A quiz scene's spoken text is: question and the three options read aloud, then "Think about it.", then " || ", then the answer part that starts "The answer is B." (or A or C) and explains in one sentence. Set "thinkSeconds": 4, "optionsAt" (3 short phrases from the spoken options), and "answerAt": "the answer is b" (lowercase phrase from the answer part).
6. Items appear when their "at" phrase is spoken: "at" must be 2-5 words copied exactly from that scene's "spoken".
7. "highlight": use on AT MOST 2 items in the whole video, only for a genuinely important fact, warning or tip taken from the lesson; the value is a note of at most 110 characters.
8. "sfx": at most one per scene; "at" is the last 3-4 words of a sentence in "spoken" (so the chirp lands in the pause after it). Sounds: happy, curious, oops, celebrate, notice, nudge.
9. "station": choose from ${stationList}. Start at "frontdesk". Keep related scenes at the same station and change station only when the topic really changes (each change adds a ship ride). Use at most 3 different stations. "gesture": point, raise or present. "hint": one friendly nudge, never the full answer.
10. Give every scene a stable lowercase "id" (letters and digits, e.g. "intro", "steps", "check").
11. ON-SCREEN TEXT MUST BE SHORT so it fits the slide: slide "title" at most 40 characters; each bullet, takeaway or compare item at most 80 characters (a short phrase, not a sentence copied from the lesson); each step "text" at most 24 characters (two or three words) with the detail in its "desc" (at most 90 characters); at most 4 bullets per scene. Say the full detail in "spoken" instead.
Return ONLY JSON: {"title": "short video title", "scenes": [ ... ]}

COURSE: ${course.title}
MODULE: ${module.title}
LESSON: ${lesson.title}

LESSON TEXT:
${source.text}
${feedback ? `\nYOUR PREVIOUS ANSWER WAS REJECTED. Fix these problems and return the full corrected JSON:\n${feedback}\n` : ''}`;
}

// Numbers the model introduced that the lesson never mentions. Writers should not invent statistics.
export function ungroundedNumbers(scenes, sourceText) {
  const src = sourceText.toLowerCase();
  const found = new Set();
  for (const s of scenes) {
    for (const m of String(s.spoken || '').matchAll(/\b\d[\d,.]*\s?(%|percent|x)?/gi)) {
      const n = m[0].trim().toLowerCase();
      if (n.length && !src.includes(n.replace(/\s?(%|percent|x)$/, ''))) found.add(n);
    }
  }
  return [...found];
}

// "C L M" is how the voice must be told to say CLM; on screen it is "CLM". A list item's own "1." duplicates the number badge.
const TIMING_KEYS = new Set(['at', 'subAt', 'kickerAt', 'answerAt', 'nextAt', 'optionsAt']);
export function tidyOnScreenText(scene) {
  const walk = (v, key) => Array.isArray(v) ? v.map(x => walk(x, key))
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]))
    : typeof v === 'string' && !TIMING_KEYS.has(key) ? v.replace(/\bC L M\b/g, 'CLM') : v;
  const out = { ...scene, slide: walk(scene.slide, ''), ...(scene.hint ? { hint: walk(scene.hint, '') } : {}) };
  for (const list of ['steps', 'bullets', 'takeaways']) {
    if (Array.isArray(out.slide[list])) out.slide[list] = out.slide[list].map(it => (it && typeof it === 'object' && typeof it.text === 'string' ? { ...it, text: it.text.replace(/^\s*\d+\s*[.):-]\s+/, '') } : it));
  }
  return out;
}

const slugId = (s, i) => (String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `s${i + 1}`).slice(0, 30);

// Validates and tidies the model's script. Returns { script, warnings } or { problems } when it cannot be rendered.
export function finalize(raw, source, meta) {
  const problems = [], warnings = [];
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.scenes)) return { problems: ['reply must be {"title","scenes":[...]}'] };
  if (raw.scenes.length < 3 || raw.scenes.length > 8) problems.push(`need 3 to 8 scenes, got ${raw.scenes.length}`);
  const seen = new Set(), scenes = [];
  raw.scenes.forEach((sc, i) => {
    const original = { ...sc, id: slugId(sc?.id, i) };
    if (seen.has(original.id)) original.id = `${original.id}-${i + 1}`;
    seen.add(original.id);
    const spoken = String(sc?.spoken || '').trim();
    if (!spoken) { problems.push(`scene ${i + 1} has no "spoken" text`); return; }
    const words = spoken.replace(/\|\|/g, ' ').split(/\s+/).length;
    if (words < 12 || words > 160) problems.push(`scene ${i + 1} speaks ${words} words (use about 35-110)`);
    const next = { ...sc, id: original.id, spoken, narration: String(sc.narration || '').trim() || spoken.replace(/\bC L M\b/g, 'CLM') };
    if (next.station && !STATIONS[next.station]) { warnings.push(`scene ${i + 1}: unknown station "${next.station}" removed`); delete next.station; }
    const { scene, problems: p } = validateScene(next, original);
    if (!scene) { problems.push(`scene ${i + 1}: ${p.join('; ')}`); return; }
    warnings.push(...p.map(x => `scene ${i + 1}: ${x}`));
    if (scene.slide.layout === 'steps' && (scene.slide.steps || []).some(st => typeof st === 'string' || !String(st.desc || '').trim())) problems.push(`scene ${i + 1}: every step needs a one-line "desc" from the lesson`);
    if (scene.slide.layout === 'quiz') {
      if (!spoken.includes('||')) problems.push(`scene ${i + 1}: a quiz needs " || " between the question part and the answer part`);
      if (scene.slide.quiz.options.length !== 3) problems.push(`scene ${i + 1}: a quiz needs exactly 3 options`);
      scene.thinkSeconds = scene.thinkSeconds || 4;
    }
    scenes.push(tidyOnScreenText(scene));
  });
  if (scenes.filter(s => s.slide?.layout === 'quiz').length > 1) problems.push('use at most one quiz scene');
  if (scenes.filter(s => s.slide?.layout === 'hook').length > 1) problems.push('use at most one hook scene');
  const highlighted = scenes.reduce((n, s) => n + JSON.stringify(s.slide).split('"highlight"').length - 1, 0);
  if (highlighted > 2) problems.push(`only 2 highlights are allowed, got ${highlighted}`);
  const total = scenes.reduce((n, s) => n + s.spoken.split(/\s+/).length, 0);
  if (total < 90) problems.push(`the whole video speaks only ${total} words; write a little more from the lesson`);
  if (problems.length) return { problems };

  const bad = ungroundedNumbers(scenes, source.text);
  if (bad.length) warnings.push(`numbers not found in the lesson text (check them): ${bad.join(', ')}`);
  const campus = [...new Set(scenes.map(s => s.station).filter(Boolean))];
  return {
    script: { title: String(raw.title || meta.lesson.title).slice(0, 120), campus, source: { courseId: meta.course.id, courseTitle: meta.course.title, lessonId: meta.lesson.id, lessonTitle: meta.lesson.title, hash: source.hash, at: new Date().toISOString() }, scenes },
    warnings,
  };
}

// The standard welcome scene, for the first lesson of a course.
export const INTRO_SCENE = {
  id: 'intro', gesture: 'present', station: 'frontdesk',
  narration: "Hi, I'm Soomy, your instructor here at SpotCLM Academy. And this is Indoo. Wherever I go, whatever I do, Indoo follows. She cleans up the mess, and she lights up what matters. Ready? Let's get started.",
  spoken: "Hi, I'm Soomy, your instructor here at SpotCLM Academy. And this is Indoo. Wherever I go, whatever I do, Indoo follows. She cleans up the mess, and she lights up what matters. Ready? Let's get started.",
  hint: 'Say hi! Soomy teaches, I tidy up and light up what matters.',
  sfx: [{ sound: 'happy', at: 'and this is indoo' }, { sound: 'curious', at: 'indoo follows' }, { sound: 'notice', at: 'lights up what matters' }, { sound: 'celebrate', at: 'get started' }],
  slide: { layout: 'hook', kicker: 'Welcome to SpotCLM Academy', title: 'Meet Soomy and Indoo', subtitle: 'Your guides through every course', subAt: 'wherever i go' },
};

export async function lessonToScript({ course, module, lesson }, { intro = false, env = process.env, onProgress } = {}) {
  const source = lessonSource(lesson);
  if (source.text.length < 120) throw new Error(`"${lesson.title}" has too little text (${source.text.length} characters) to make a video from. Write the lesson first.`);
  const meta = { course, lesson };
  let feedback = '', last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    onProgress?.(attempt === 1 ? 'Writing the script' : `Fixing the script (try ${attempt}): ${feedback.split('\n')[0].replace(/^- /, '').slice(0, 110)}`);
    let raw;
    try {
      const { text, provider, model } = await complete('draft', buildPrompt({ course, module, lesson, source, feedback }), { json: true, env });
      raw = JSON.parse(text);
      last = { provider, model };
    } catch (e) { feedback = `The reply could not be used: ${e.message}`; continue; }
    const out = finalize(raw, source, meta);
    if (out.script) {
      if (intro) out.script.scenes.unshift({ ...INTRO_SCENE });
      out.script.campus = [...new Set(out.script.scenes.map(s => s.station).filter(Boolean))];
      return { script: out.script, warnings: out.warnings, source, ai: last, attempts: attempt };
    }
    feedback = out.problems.map(p => `- ${p}`).join('\n');
  }
  throw new Error(`The AI could not produce a valid script after 3 tries. Last problems:\n${feedback}`);
}

// ---- CLI
if (process.argv[1]?.endsWith('lesson-to-script.mjs')) { // only when run as a command, never when imported
  const args = process.argv.slice(2), opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
  const [courseId, lessonId, out] = [opt('course'), opt('lesson'), opt('out')];
  if (!courseId || !lessonId || !out) { console.error('usage: lesson-to-script.mjs --course <id> --lesson <id> --out <script.json> [--intro]'); process.exit(1); }
  try {
    const found = await fetchLesson(courseId, lessonId);
    const r = await lessonToScript(found, { intro: args.includes('--intro'), onProgress: (m) => console.log(m) });
    writeFileSync(out, JSON.stringify(r.script, null, 2));
    console.log(`Wrote ${out}: ${r.script.scenes.length} scenes via ${r.ai.provider}:${r.ai.model} in ${r.attempts} attempt(s)`);
    r.warnings.forEach(w => console.log('warning:', w));
  } catch (e) { console.error(e.message); process.exit(1); }
}
