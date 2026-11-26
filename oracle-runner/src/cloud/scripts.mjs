// Writes the video scripts for several lessons in ONE process, one after another, so the AI gateway paces every call against the
// provider limits in a single place. Only the AI step runs here; rendering is fanned out afterwards.
// Usage: node scripts.mjs <courseId> <outDir> <lessonId,lessonId,...> [--intro <lessonId>]
// A lesson that already has a script file in outDir is skipped, so the run can be repeated after a pause. If AI capacity runs
// out, it waits when the next slot is close (AI_SLEEP_MAX_MS, default 20 minutes) and otherwise stops and reports what is left.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchLesson, lessonToScript } from '../video/lesson-to-script.mjs';
import { quotaSnapshot } from '../ai.mjs';

const args = process.argv.slice(2);
const introAt = args.indexOf('--intro'), introLesson = introAt >= 0 ? args[introAt + 1] : '';
const [courseId, outDir, ids] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--intro');
if (!courseId || !outDir || !ids) { console.error('usage: scripts.mjs <courseId> <outDir> <id,id,...> [--intro <lessonId>]'); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const sleepMax = Number(process.env.AI_SLEEP_MAX_MS ?? 20 * 60_000);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (m) => console.error(`${new Date().toISOString().slice(11, 19)} ${m}`);

const results = [];
for (const lessonId of ids.split(',').filter(Boolean)) {
  const file = join(outDir, `${lessonId}.json`);
  if (existsSync(file)) { results.push({ lessonId, ok: true, skipped: true }); continue; }
  for (let round = 0; ; round++) {
    try {
      const found = await fetchLesson(courseId, lessonId);
      const r = await lessonToScript(found, { intro: lessonId === introLesson, onProgress: (m) => log(`${found.lesson.title}: ${m}`) });
      writeFileSync(file, JSON.stringify(r.script));
      results.push({ lessonId, ok: true, title: r.script.title, scenes: r.script.scenes.length, warnings: r.warnings.length, ai: `${r.ai.provider}:${r.ai.model}`, attempts: r.attempts });
      log(`done ${found.lesson.title} (${r.script.scenes.length} scenes via ${r.ai.provider})`);
      break;
    } catch (e) {
      const wait = e.retryAt ? Date.parse(e.retryAt) - Date.now() : 0;
      if (e.code === 'AI_EXHAUSTED' && wait > 0 && wait <= sleepMax && round < 6) { log(`AI capacity used up; waiting ${Math.ceil(wait / 60000)} min for the next slot`); await sleep(wait + 2000); continue; }
      results.push({ lessonId, ok: false, error: e.message.slice(0, 300), retryAt: e.retryAt || null });
      log(`FAILED ${lessonId}: ${e.message.slice(0, 200)}`);
      if (e.code === 'AI_EXHAUSTED') { for (const rest of ids.split(',').slice(ids.split(',').indexOf(lessonId) + 1)) results.push({ lessonId: rest, ok: false, error: 'not tried: AI capacity used up', retryAt: e.retryAt || null }); console.log(JSON.stringify({ results, quota: quotaSnapshot() })); process.exit(0); }
      break;
    }
  }
}
console.log(JSON.stringify({ results, quota: quotaSnapshot() }));
