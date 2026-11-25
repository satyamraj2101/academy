// Video Studio: watch a lesson video, leave timestamped notes, let the AI propose changes, approve, and re-render
// only the scenes that changed. No dependencies; data lives in files under STUDIO_DIR.
//   node --env-file=.env src/studio/server.mjs            (needs an AI key in .env for "propose changes")
// Binds to 127.0.0.1 by default. To expose it (e.g. on the Oracle VM) set STUDIO_HOST, put it behind Cloudflare
// Access, and set STUDIO_TOKEN as a second lock.
import http from 'node:http';
import { fork } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { proposeEdits, applyChanges, NOTE_KINDS } from '../video/edits.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DATA = process.env.STUDIO_DIR || join(ROOT, 'studio-data');
const PORT = Number(process.env.STUDIO_PORT) || 4300;
const HOST = process.env.STUDIO_HOST || '127.0.0.1';
const TOKEN = process.env.STUDIO_TOKEN || '';
const CACHE = join(DATA, '.cache');
mkdirSync(join(DATA, 'projects'), { recursive: true });

const SLUG = /^[a-z0-9][a-z0-9-]{0,60}$/;
const VER = /^v\d{1,4}$/;
const MEDIA = { 'video.mp4': 'video/mp4', 'captions.vtt': 'text/vtt', 'captions.srt': 'text/plain', 'chapters.json': 'application/json' };
const pdir = (slug) => join(DATA, 'projects', slug);
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return d; } };
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2));
const projectMeta = (slug) => readJson(join(pdir(slug), 'project.json'), null);
const jobs = new Map(); // slug -> { status: 'running'|'done'|'failed', step, done, total, error, version }

function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); }
async function body(req) {
  let n = 0; const chunks = [];
  for await (const c of req) { n += c.length; if (n > 2_000_000) throw Object.assign(new Error('Body too large'), { status: 413 }); chunks.push(c); }
  try { return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}; } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

function createProject(slug, title, script, voice = 'am_puck', fx = 'clean') {
  mkdirSync(pdir(slug), { recursive: true });
  const scenes = script.scenes.map((s, i) => ({ ...s, id: s.id || `s${i + 1}` }));
  writeJson(join(pdir(slug), 'script.v1.json'), { ...script, scenes });
  writeJson(join(pdir(slug), 'project.json'), { slug, title: title || script.title || slug, voice, fx, current: 1, versions: [{ n: 1, createdAt: new Date().toISOString(), note: 'Imported', rendered: false }] });
  writeJson(join(pdir(slug), 'notes.json'), []);
}

function startRender(slug, n) {
  const meta = projectMeta(slug);
  const script = readJson(join(pdir(slug), `script.v${n}.json`), null);
  if (!meta || !script) throw Object.assign(new Error('Version not found'), { status: 404 });
  if (jobs.get(slug)?.status === 'running') throw Object.assign(new Error('A render is already running for this project'), { status: 409 });
  const job = { status: 'running', step: 'Starting', done: 0, total: script.scenes.length, version: n };
  jobs.set(slug, job);
  const child = fork(join(HERE, 'render-worker.mjs'));
  child.send({ script, outDir: join(pdir(slug), 'renders', `v${n}`), cacheRoot: CACHE, voice: meta.voice, fx: meta.fx });
  child.on('message', (msg) => {
    if (msg.type === 'progress') Object.assign(job, { step: msg.step, done: msg.done, total: msg.total });
    if (msg.type === 'done') {
      const m = projectMeta(slug), v = m.versions.find(x => x.n === n);
      v.rendered = true; v.timings = msg.timings;
      writeJson(join(pdir(slug), 'project.json'), m);
      Object.assign(job, { status: 'done', step: `Done: ${msg.timings.renderedScenes} scene(s) rendered, ${msg.timings.reusedScenes} reused` });
    }
    if (msg.type === 'error') Object.assign(job, { status: 'failed', error: msg.message });
  });
  child.on('exit', (code) => { if (job.status === 'running') Object.assign(job, { status: 'failed', error: `Render process stopped unexpectedly (code ${code})` }); });
  return job;
}

function projectState(slug) {
  const meta = projectMeta(slug);
  if (!meta) return null;
  const versions = meta.versions.map(v => ({ ...v, chapters: v.rendered ? readJson(join(pdir(slug), 'renders', `v${v.n}`, 'chapters.json'), null) : null }));
  return { ...meta, versions, scripts: Object.fromEntries(meta.versions.map(v => [v.n, readJson(join(pdir(slug), `script.v${v.n}.json`), null)])), notes: readJson(join(pdir(slug), 'notes.json'), []), proposal: readJson(join(pdir(slug), 'proposal.json'), null), job: jobs.get(slug) || null };
}

function serveMedia(req, res, slug, ver, file) {
  const type = MEDIA[file], p = join(pdir(slug), 'renders', ver, file);
  if (!type || !existsSync(p)) { res.writeHead(404); return res.end('Not found'); }
  const size = statSync(p).size, range = req.headers.range;
  if (range && type === 'video/mp4') { // seeking needs byte ranges
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? Number(m[1]) : 0, end = m && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return createReadStream(p, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
  createReadStream(p).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split('/').filter(Boolean);
    if (TOKEN && (url.searchParams.get('token') || req.headers['x-studio-token']) !== TOKEN && parts[0] !== undefined) { res.writeHead(401); return res.end('Unauthorized'); }

    if (!parts.length) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(readFileSync(join(HERE, 'studio.html'))); }
    if (parts[0] === 'media' && parts.length === 4 && SLUG.test(parts[1]) && VER.test(parts[2])) return serveMedia(req, res, parts[1], parts[2], parts[3]);
    if (parts[0] !== 'api') { res.writeHead(404); return res.end('Not found'); }

    if (parts[1] === 'projects' && parts.length === 2 && req.method === 'GET') {
      return json(res, 200, readdirSync(join(DATA, 'projects')).filter(s => SLUG.test(s) && projectMeta(s)).map(s => { const m = projectMeta(s); return { slug: s, title: m.title, versions: m.versions.length }; }));
    }
    if (parts[1] === 'projects' && parts.length === 2 && req.method === 'POST') {
      const b = await body(req);
      if (!SLUG.test(b.slug || '') || !Array.isArray(b.script?.scenes) || !b.script.scenes.length) return json(res, 400, { error: 'slug (a-z, 0-9, -) and script.scenes are required' });
      if (projectMeta(b.slug)) return json(res, 409, { error: 'A project with that name already exists' });
      createProject(b.slug, b.title, b.script);
      return json(res, 201, projectState(b.slug));
    }

    const slug = parts[2];
    if (parts[1] !== 'projects' || !SLUG.test(slug || '') || !projectMeta(slug)) return json(res, 404, { error: 'Project not found' });
    const action = parts[3];

    if (!action && req.method === 'GET') return json(res, 200, projectState(slug));

    if (action === 'notes' && req.method === 'POST') {
      const b = await body(req);
      if (!String(b.text || '').trim()) return json(res, 400, { error: 'Write what should change' });
      const kind = NOTE_KINDS.includes(b.kind) ? b.kind : 'other';
      const notes = readJson(join(pdir(slug), 'notes.json'), []);
      const note = { id: randomUUID().slice(0, 8), version: Number(b.version) || projectMeta(slug).current, time: Math.max(0, Number(b.time) || 0), sceneId: b.sceneId || null, kind, text: String(b.text).trim().slice(0, 1000), status: 'open', createdAt: new Date().toISOString() };
      notes.push(note);
      writeJson(join(pdir(slug), 'notes.json'), notes);
      return json(res, 201, note);
    }
    if (action === 'notes' && parts[4] && req.method === 'DELETE') {
      const notes = readJson(join(pdir(slug), 'notes.json'), []).filter(n => n.id !== parts[4]);
      writeJson(join(pdir(slug), 'notes.json'), notes);
      return json(res, 200, { ok: true });
    }

    if (action === 'render' && req.method === 'POST') {
      const b = await body(req);
      return json(res, 202, startRender(slug, Number(b.version) || projectMeta(slug).current));
    }

    if (action === 'propose' && req.method === 'POST') {
      const m = projectMeta(slug), n = m.current;
      const chapters = readJson(join(pdir(slug), 'renders', `v${n}`, 'chapters.json'), null)?.chapters;
      if (!chapters) return json(res, 409, { error: 'Render this version first so notes can be matched to scenes' });
      const script = readJson(join(pdir(slug), `script.v${n}.json`), null);
      const notes = readJson(join(pdir(slug), 'notes.json'), []).filter(x => x.version === n);
      const out = await proposeEdits(script, chapters, notes);
      const proposal = { baseVersion: n, createdAt: new Date().toISOString(), ...out };
      writeJson(join(pdir(slug), 'proposal.json'), proposal);
      return json(res, 200, proposal);
    }

    if (action === 'accept' && req.method === 'POST') {
      const b = await body(req);
      const proposal = readJson(join(pdir(slug), 'proposal.json'), null);
      const m = projectMeta(slug);
      if (!proposal || proposal.baseVersion !== m.current) return json(res, 409, { error: 'That proposal is out of date. Propose again.' });
      const chosen = proposal.changes.filter(c => !Array.isArray(b.sceneIds) || b.sceneIds.includes(c.sceneId));
      if (!chosen.length) return json(res, 400, { error: 'Pick at least one change to accept' });
      const base = readJson(join(pdir(slug), `script.v${m.current}.json`), null);
      const n = m.versions.length + 1;
      writeJson(join(pdir(slug), `script.v${n}.json`), applyChanges(base, chosen));
      m.versions.push({ n, createdAt: new Date().toISOString(), note: `${chosen.length} scene(s) edited from review notes`, rendered: false, fromNotes: chosen.flatMap(c => c.noteIds) });
      m.current = n;
      writeJson(join(pdir(slug), 'project.json'), m);
      const applied = new Set(chosen.flatMap(c => c.noteIds));
      writeJson(join(pdir(slug), 'notes.json'), readJson(join(pdir(slug), 'notes.json'), []).map(x => (applied.has(x.id) ? { ...x, status: 'applied', appliedIn: n } : x)));
      writeJson(join(pdir(slug), 'proposal.json'), null);
      return json(res, 202, startRender(slug, n));
    }
    if (action === 'discard' && req.method === 'POST') { writeJson(join(pdir(slug), 'proposal.json'), null); return json(res, 200, { ok: true }); }
    if (action === 'current' && req.method === 'POST') {
      const b = await body(req), m = projectMeta(slug);
      if (!m.versions.some(v => v.n === Number(b.version))) return json(res, 404, { error: 'No such version' });
      m.current = Number(b.version);
      writeJson(join(pdir(slug), 'project.json'), m);
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'Not found' });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message });
  }
});

// First run: import the sample lesson so there is something to open.
if (!readdirSync(join(DATA, 'projects')).length) {
  const sample = readJson(join(ROOT, 'samples', 'what-is-clm.json'), null);
  if (sample) createProject('what-is-clm', 'What is CLM?', sample);
}
server.listen(PORT, HOST, () => console.log(`Video Studio on http://${HOST}:${PORT}${TOKEN ? '/?token=…' : ''}  (data: ${DATA})`));
