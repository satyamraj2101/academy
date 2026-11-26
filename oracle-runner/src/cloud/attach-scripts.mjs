// One-off helper: gives videos that were made before scripts were kept their script back, so they can be edited scene by scene.
// Usage: node attach-scripts.mjs <courseId> <dir with <lessonId>.json files>
// A script is attached only when the file's lesson text hash matches the lesson as it is now (so it is the one the video was made from).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { api } from '../api.mjs';
import { fetchLesson, lessonSource } from '../video/lesson-to-script.mjs';
import { findVideo } from './video-edit.mjs';

const [courseId, dir] = process.argv.slice(2);
if (!courseId || !dir) { console.error('usage: attach-scripts.mjs <courseId> <dir>'); process.exit(2); }
const BASE = process.env.ACADEMY_ADMIN_BASE_URL.replace(/\/$/, '');
const headers = () => ({ Authorization: `Bearer ${process.env.ACADEMY_SERVICE_API_KEY}`, ...(process.env.CF_ACCESS_CLIENT_ID ? { 'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID, 'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET } : {}) });

async function upload(path, name) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(path)], { type: 'application/json' }), name);
  const res = await fetch(`${BASE}/academy/upload`, { method: 'POST', headers: headers(), body: form });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`upload failed (${res.status})`);
  return d.url;
}

const r = await api(`/academy/courses/${encodeURIComponent(courseId)}/structure`);
let done = 0, skipped = 0;
for (const m of r.structure || []) for (const l of m.lessons || []) {
  const sec = (l.sections || []).find(s => s.section_type === 'interactive_video');
  if (!sec) continue;
  const video = findVideo(l, JSON.parse(sec.content).videoId);
  const file = join(dir, `${l.id}.json`);
  if (!video || video.scriptSrc) { skipped++; continue; }
  if (!existsSync(file)) { console.log(`no saved script for "${l.title}"`); skipped++; continue; }
  const script = JSON.parse(readFileSync(file, 'utf8'));
  const found = await fetchLesson(courseId, l.id);
  if (script.source?.hash !== lessonSource(found.lesson).hash) { console.log(`script for "${l.title}" is from older lesson text: skipped`); skipped++; continue; }
  const scriptSrc = await upload(file, `${l.id}.script.json`);
  await api('/academy/lesson-videos', { method: 'PATCH', body: { lessonId: l.id, videoId: video.videoId, scriptSrc } });
  console.log(`attached script to "${l.title}"`); done++;
}
console.log(`done: ${done} attached, ${skipped} skipped`);
