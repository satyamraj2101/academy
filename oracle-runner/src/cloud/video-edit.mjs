// The steps of an "edit this lesson video with AI" job, each a small command the cloud worker runs in order:
//   claim                                  -> prints {"job": {...}|null}   (takes the next queued video-edit job)
//   script <job.json> <out.json>           -> writes the new script; prints a one-line summary
//   progress <jobId> <step text>           -> shows the step in the admin (also keeps the job's lease alive)
//   finish <jobId> done <result.json>      -> marks the job done
//   finish <jobId> failed <message>        -> marks the job failed with a message an admin can read
// The job payload is { courseId, lessonId, videoId, instruction }. If the video kept its script, the AI changes only what the
// request needs; otherwise it writes a new script from the lesson text and the request.
import { readFileSync, writeFileSync } from 'node:fs';
import { claimJob, patchJob } from '../api.mjs';
import { fetchLesson, lessonToScript, lessonSource, finalize, isWelcomeScene, INTRO_SCENE } from '../video/lesson-to-script.mjs';

export const JOB_TYPE = 'lesson_video_edit';

/** The interactive-video section of a lesson that holds this video, parsed; or null. */
export function findVideo(lesson, videoId) {
  for (const s of lesson.sections || []) {
    if (s.section_type !== 'interactive_video') continue;
    try { const v = JSON.parse(s.content); if (v?.videoId === videoId) return v; } catch { /* not this one */ }
  }
  return null;
}

/** Plain-language reason for a failed job, for the admin to read. */
export function explain(e) {
  if (e?.code === 'AI_EXHAUSTED') return `The free AI limits are used up for now.${e.retryAt ? ` Try again after ${new Date(e.retryAt).toUTCString()}.` : ' Try again later today.'}`;
  return String(e?.message || e).slice(0, 400);
}

async function fetchBaseScript(video) {
  if (!video?.scriptSrc) return null;
  const url = /^https:/.test(video.scriptSrc) ? video.scriptSrc : `${new URL(process.env.ACADEMY_ADMIN_BASE_URL).origin}${video.scriptSrc}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const s = await res.json();
    return Array.isArray(s?.scenes) && s.scenes.length ? s : null;
  } catch { return null; } // an unreadable saved script is not fatal: write a new one from the lesson
}

/**
 * A script the admin edited by hand: checked with the same rules as an AI script, with the fixed welcome scene kept out of the
 * checks and put back first. Throws a plain-language message when something cannot be rendered.
 */
export function checkEditedScript(edited, found, title) {
  const scenes = Array.isArray(edited?.scenes) ? edited.scenes : [];
  const welcome = isWelcomeScene(scenes[0]);
  const body = welcome ? scenes.slice(1) : scenes;
  const out = finalize({ title: edited.title || title, scenes: body }, lessonSource(found.lesson), found);
  if (!out.script) throw new Error(`The edited scenes cannot be used yet: ${out.problems.join('; ')}`);
  if (welcome) {
    for (const sc of out.script.scenes) if (sc.id === INTRO_SCENE.id) sc.id = 'opening';
    out.script.scenes.unshift({ ...INTRO_SCENE });
    out.script.campus = [...new Set(out.script.scenes.map(s => s.station).filter(Boolean))];
  }
  return { script: out.script, warnings: out.warnings };
}

export async function buildEditedScript(job, onProgress) {
  const { courseId, lessonId, videoId, instruction, script: edited } = job.payload || {};
  if (!courseId || !lessonId || !videoId) throw new Error('The job is missing the course, lesson or video.');
  const found = await fetchLesson(courseId, lessonId);
  const video = findVideo(found.lesson, videoId);
  if (!video) throw new Error('That video is no longer in the lesson (it may have been replaced or removed). Open the lesson again.');
  if (edited) { // the admin changed the scenes by hand: no AI step, just check and render
    const { script, warnings } = checkEditedScript(edited, found, video.title);
    return { script, info: { title: script.title, scenes: script.scenes.length, warnings, ai: 'manual edit', usedSavedScript: true } };
  }
  const base = await fetchBaseScript(video);
  const intro = video.chapters?.[0]?.title === INTRO_SCENE.slide.title; // the welcome scene is the first chapter
  const r = await lessonToScript(found, { intro, instruction: String(instruction || '').trim(), base, onProgress });
  return { script: r.script, info: { title: r.script.title, scenes: r.script.scenes.length, warnings: r.warnings, ai: `${r.ai.provider}:${r.ai.model}`, usedSavedScript: !!base } };
}

if (process.argv[1]?.endsWith('video-edit.mjs')) {
  const [cmd, a, b, c] = process.argv.slice(2);
  try {
    if (cmd === 'claim') {
      console.log(JSON.stringify({ job: await claimJob([JOB_TYPE]) }));
    } else if (cmd === 'script') {
      const job = JSON.parse(readFileSync(a, 'utf8'));
      const { script, info } = await buildEditedScript(job, (m) => console.error(m));
      writeFileSync(b, JSON.stringify(script));
      console.log(JSON.stringify(info));
    } else if (cmd === 'progress') {
      await patchJob(a, { progress: { step: [b, c].filter(Boolean).join(' ') } });
    } else if (cmd === 'finish') {
      if (b === 'done') await patchJob(a, { status: 'done', result: JSON.parse(readFileSync(c, 'utf8')), progress: { step: 'Done' } });
      else await patchJob(a, { status: 'failed', error: String(c || 'The video could not be rebuilt.').slice(0, 1500) });
    } else { console.error('usage: video-edit.mjs claim | script <job.json> <out.json> | progress <jobId> <step> | finish <jobId> done|failed <file|message>'); process.exit(2); }
  } catch (e) {
    console.error(explain(e));
    process.exit(1);
  }
}
