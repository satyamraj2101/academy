// Writes the video script for one lesson (the AI step). Usage: node script.mjs <courseId> <lessonId> <out.json> [--intro]
import { writeFileSync } from 'node:fs';
import { fetchLesson, lessonToScript } from '../video/lesson-to-script.mjs';

const args = process.argv.slice(2);
const [courseId, lessonId, out] = args.filter(a => !a.startsWith('--'));
if (!courseId || !lessonId || !out) { console.error('usage: script.mjs <courseId> <lessonId> <out.json> [--intro]'); process.exit(2); }
const found = await fetchLesson(courseId, lessonId);
const r = await lessonToScript(found, { intro: args.includes('--intro'), onProgress: (m) => console.error(m) });
writeFileSync(out, JSON.stringify(r.script, null, 2));
console.log(JSON.stringify({ title: r.script.title, scenes: r.script.scenes.length, warnings: r.warnings, ai: `${r.ai.provider}:${r.ai.model}`, attempts: r.attempts }));
