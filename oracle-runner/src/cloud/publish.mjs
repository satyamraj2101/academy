// Uploads a finished render and attaches it to a lesson as a mandatory interactive video.
// Usage: node publish.mjs <renderDir> <lessonId> <name> [replaceVideoId]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { api } from '../api.mjs';

const MAX_UPLOAD = 95 * 1024 * 1024; // Pages Functions accept request bodies up to 100 MB
const BASE = (process.env.ACADEMY_ADMIN_BASE_URL || '').replace(/\/$/, '');

async function uploadAsset(path, name, type) {
  const bytes = readFileSync(path);
  if (bytes.length > MAX_UPLOAD) throw new Error(`${name} is ${(bytes.length / 1048576).toFixed(0)} MB; the upload limit is 95 MB`);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  const headers = { Authorization: `Bearer ${process.env.ACADEMY_SERVICE_API_KEY}` };
  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) { headers['CF-Access-Client-Id'] = process.env.CF_ACCESS_CLIENT_ID; headers['CF-Access-Client-Secret'] = process.env.CF_ACCESS_CLIENT_SECRET; }
  const res = await fetch(`${BASE}/academy/upload`, { method: 'POST', headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${data.error || 'unknown error'}`);
  return data.url;
}

const [dir, lessonId, name, replaceVideoId] = process.argv.slice(2);
if (!dir || !lessonId || !name) { console.error('usage: publish.mjs <renderDir> <lessonId> <name> [replaceVideoId]'); process.exit(2); }
const chapters = JSON.parse(readFileSync(join(dir, 'chapters.json'), 'utf8'));
if (!existsSync(join(dir, 'video.mp4'))) throw new Error('video.mp4 is missing: render before publishing');
const src = await uploadAsset(join(dir, 'video.mp4'), `${name}.mp4`, 'video/mp4');
const captionsSrc = existsSync(join(dir, 'captions.vtt')) ? await uploadAsset(join(dir, 'captions.vtt'), `${name}.vtt`, 'text/vtt') : null;
const result = await api('/academy/lesson-videos', { method: 'POST', body: { lessonId, replaceVideoId: replaceVideoId || undefined, video: { src, captionsSrc, title: chapters.title || name, duration: chapters.duration, stations: chapters.stations || [], chapters: chapters.chapters, checkpoints: chapters.checkpoints } } });
console.log(JSON.stringify({ ...result, src }));
