// Scene-cached video builder. Every scene renders to its own small MP4 keyed by a hash of everything that affects
// it (scene content, voice, effect, model, frame rate, renderer version). Editing one scene therefore re-renders
// only that scene; the rest are reused and the final video is a cheap concatenation.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { synth, wavBuffer } from './tts.mjs';
import { frameSvg, W, itemTimes, timeOf } from './scene.mjs';
import { WAVE_POINTS } from './robot.mjs';
import { voiceFilter } from './voicefx.mjs';
import { sceneEvents, placeEvents, mixSfx, whoosh } from './sfx.mjs';
import { travelSvg, TRAVEL_SECONDS } from './travel.mjs';
import { stationName, STATIONS } from './stations.mjs';
import { highlights } from './scene.mjs';

export const RENDER_VERSION = 16; // bump when visuals or audio processing change, so stale cache is not reused
export const GAP = 0.5; // seconds of silence after each scene
const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'fonts');
const FONT_FILES = ['400Regular', '600SemiBold', '700Bold', '800ExtraBold'].map(w => join(FONT_DIR, `Inter_${w}.ttf`));
const CAPTION_STYLE = 'FontName=Inter,FontSize=11,PrimaryColour=&H3B2F1E&,OutlineColour=&HFFFFFF&,BorderStyle=1,Outline=2,Shadow=0,MarginV=22,Alignment=2';

export const sceneKey = (scene, { voice, fx, fps }) => {
  const { id, hint, ...content } = scene; // id and hint are metadata, not picture or sound
  return createHash('sha1').update(JSON.stringify({ v: RENDER_VERSION, content, voice, fx, fps, dtype: process.env.KOKORO_DTYPE || 'q8' })).digest('hex').slice(0, 16);
};

const ff = (args, cwd) => {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
};

// Speech level target, so every scene (and every voice) sits at the same loudness.
function normalise(samples, target = 0.11) {
  let sum = 0, n = 0, peak = 0;
  for (const v of samples) { const a = Math.abs(v); peak = Math.max(peak, a); if (a > 0.01) { sum += v * v; n++; } }
  const rms = n ? Math.sqrt(sum / n) : target;
  const gain = Math.min(3, target / rms, 0.95 / (peak || 1));
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
}

export async function renderScene(scene, { cacheRoot, voice, fx, fps }) {
  const key = sceneKey(scene, { voice, fx, fps });
  const dir = join(cacheRoot, key);
  const metaPath = join(dir, 'meta.json');
  if (existsSync(metaPath) && existsSync(join(dir, 'segment.mp4'))) return { ...JSON.parse(readFileSync(metaPath, 'utf8')), dir, key, cached: true };
  mkdirSync(join(dir, 'frames'), { recursive: true });
  const stats = {};
  let t0 = Date.now();

  // Voice. "||" in the spoken text marks a silent think pause (scene.thinkSeconds), used by quiz scenes.
  const texts = (scene.spoken || scene.narration).split('||').map(x => x.trim());
  const chunks = [], parts = [];
  let rate = 24000, local = 0;
  for (const [k, text] of texts.entries()) {
    if (k > 0) { const gap = scene.thinkSeconds ?? 3; chunks.push(new Float32Array(Math.round(rate * gap))); local += gap; }
    const { samples, rate: r } = await synth(text, { voice });
    rate = r;
    parts.push({ text, start: local, dur: samples.length / r });
    chunks.push(samples);
    local += samples.length / r;
  }
  const dur = local;
  const total = dur + GAP;
  const audio = new Float32Array(Math.ceil(total * rate));
  let o = 0;
  for (const c of chunks) { audio.set(c, o); o += c.length; }
  normalise(audio);
  const withParts = { ...scene, parts: texts.length > 1 ? parts : undefined };
  const voiceOnly = Float32Array.from(audio); // Soomy's visor draws his voice only, never Indoo's chirps
  const events = placeEvents(sceneEvents(withParts, dur), voiceOnly); // chirps wait for a pause so they never talk over him
  mixSfx(audio, events); // chirps go in after levelling so they stay well under the voice
  withParts.events = events;
  writeFileSync(join(dir, 'audio.wav'), wavBuffer(audio, rate));
  stats.voiceSeconds = (Date.now() - t0) / 1000;

  // Frames: the waveform drawn on the robot's visor is a real slice of this scene's audio.
  t0 = Date.now();
  const frames = Math.ceil(total * fps), WN = 1100, peak = 0.5;
  for (let f = 0; f < frames; f++) {
    const lt = f / fps, c = Math.round(lt * rate), a = c - WN / 2;
    const wave = new Float32Array(WAVE_POINTS);
    for (let i = 0; i < WAVE_POINTS; i++) { const idx = Math.round(a + (i * (WN - 1)) / (WAVE_POINTS - 1)); wave[i] = idx >= 0 && idx < voiceOnly.length ? Math.max(-1, Math.min(1, voiceOnly[idx] / peak)) : 0; }
    const svg = frameSvg(withParts, lt, dur, wave);
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng();
    writeFileSync(join(dir, 'frames', `${String(f).padStart(5, '0')}.png`), png);
  }
  stats.frameSeconds = (Date.now() - t0) / 1000;

  // Captions show `narration` (which may differ from `spoken`, e.g. "CLM" vs "C L M"); each voiced part is timed on its own.
  const cues = [];
  const capParts = scene.narration.split('||').map(x => x.trim());
  capParts.forEach((text, k) => {
    const part = parts[k] || { start: 0, dur };
    const lines = [];
    let cur = '';
    for (const w of text.replace(/\s+/g, ' ').split(' ')) { if (cur && (cur + ' ' + w).length > 48) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
    if (cur) lines.push(cur);
    const chars = lines.reduce((n, l) => n + l.length, 0);
    let t = part.start;
    for (const l of lines) { const d = (l.length / chars) * part.dur; cues.push({ start: t, end: t + d, text: l }); t += d; }
  });
  writeFileSync(join(dir, 'captions.srt'), cues.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n'));

  // Encode with identical settings for every segment so they can be joined without re-encoding the picture.
  t0 = Date.now();
  ff(['-framerate', String(fps), '-i', 'frames/%05d.png', '-i', 'audio.wav',
    '-vf', `subtitles=captions.srt:fontsdir='${relative(dir, FONT_DIR).split('\\').join('/')}':force_style='${CAPTION_STYLE}'`,
    '-af', voiceFilter(fx, rate), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '1', '-shortest', 'segment.mp4'], dir);
  stats.encodeSeconds = (Date.now() - t0) / 1000;
  rmSync(join(dir, 'frames'), { recursive: true, force: true });

  const meta = { dur, total, parts: withParts.parts, cues, events, stats };
  writeFileSync(metaPath, JSON.stringify(meta));
  return { ...meta, dir, key, cached: false };
}

// Soomy and Indoo ride the ship to the next station: no voice, a short whoosh, and the route map on the slide card.
export async function renderTravel(item, { cacheRoot, fps }) {
  const dur = TRAVEL_SECONDS;
  const key = createHash('sha1').update(JSON.stringify({ v: RENDER_VERSION, travel: item.travel, stops: item.stops, fps })).digest('hex').slice(0, 16);
  const dir = join(cacheRoot, key), metaPath = join(dir, 'meta.json');
  if (existsSync(metaPath) && existsSync(join(dir, 'segment.mp4'))) return { ...JSON.parse(readFileSync(metaPath, 'utf8')), dir, key, cached: true };
  mkdirSync(join(dir, 'frames'), { recursive: true });
  const stats = { voiceSeconds: 0 };
  let t0 = Date.now();
  const frames = Math.ceil(dur * fps);
  for (let f = 0; f < frames; f++) {
    const svg = travelSvg(item.travel, f / fps, dur, item.stops);
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng();
    writeFileSync(join(dir, 'frames', `${String(f).padStart(5, '0')}.png`), png);
  }
  stats.frameSeconds = (Date.now() - t0) / 1000;
  const rate = 24000, audio = new Float32Array(Math.ceil(dur * rate)), w = whoosh();
  audio.set(w.subarray(0, Math.min(w.length, audio.length - Math.round(0.1 * rate))), Math.round(0.1 * rate));
  writeFileSync(join(dir, 'audio.wav'), wavBuffer(audio, rate));
  t0 = Date.now();
  ff(['-framerate', String(fps), '-i', 'frames/%05d.png', '-i', 'audio.wav', '-af', 'alimiter=limit=0.7', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '1', '-shortest', 'segment.mp4'], dir);
  stats.encodeSeconds = (Date.now() - t0) / 1000;
  rmSync(join(dir, 'frames'), { recursive: true, force: true });
  const meta = { dur, total: dur, cues: [], events: [], travel: true, stats };
  writeFileSync(metaPath, JSON.stringify(meta));
  return { ...meta, dir, key, cached: false };
}

export const stamp = (s, sep) => { const ms = Math.round(s * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`; };

// The ordered list of things to render: the scenes, with a ship ride in front of any scene that changes station.
// Pure (no rendering), so a cloud coordinator can plan the work and hand each item to a different machine.
export function planTimeline(script) {
  const scenes = script.scenes.map((s, i) => ({ ...s, id: s.id || `s${i + 1}` }));
  for (const sc of scenes) if (sc.station && !STATIONS[sc.station]) throw new Error(`Scene "${sc.id}" uses unknown station "${sc.station}" (use ${Object.keys(STATIONS).join(', ')})`);

  // The campus map: stations in the order the course first visits them (or script.campus). A scene that changes station
  // gets a ship ride in front of it, unless the script sets "autoTravel": false.
  const campus = (script.campus || [...new Set(scenes.map(s => s.station).filter(Boolean))]).filter(id => STATIONS[id]);
  const stops = campus.map(id => ({ id, name: stationName(id) }));
  const timeline = [];
  scenes.forEach((sc, i) => {
    const prev = scenes[i - 1];
    if (script.autoTravel !== false && prev?.station && sc.station && prev.station !== sc.station) {
      const known = stops.some(p => p.id === prev.station) && stops.some(p => p.id === sc.station);
      timeline.push({ id: `travel-${i}`, travel: { from: prev.station, to: sc.station }, stops: known ? stops : [...stops, ...[prev.station, sc.station].filter(id => !stops.some(p => p.id === id)).map(id => ({ id, name: stationName(id) }))] });
    }
    timeline.push(sc);
  });
  return { scenes, timeline };
}

// The cache key an item will render under (so a coordinator can tell what is already done).
export const itemKey = (item, { voice, fx, fps }) => item.travel
  ? createHash('sha1').update(JSON.stringify({ v: RENDER_VERSION, travel: item.travel, stops: item.stops, fps })).digest('hex').slice(0, 16)
  : sceneKey(item, { voice, fx, fps });

// Builds <outDir>/video.mp4 + captions + chapters.json. Unchanged scenes come from cache.
// `renderItem(item, opts)` may replace the local renderer (the cloud build renders each item on its own machine) and
// `concurrency` renders that many items at once; both default to the original one-at-a-time local behaviour.
export async function buildVideo(script, outDir, { cacheRoot = join(outDir, '..', '.cache'), voice = 'am_puck', fx = 'clean', fps = 12, onProgress, renderItem, concurrency = 1 } = {}) {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(cacheRoot, { recursive: true });
  const { scenes, timeline } = planTimeline(script);

  const local = (item) => (item.travel ? renderTravel(item, { cacheRoot, fps }) : renderScene(item, { cacheRoot, voice, fx, fps }));
  const rendered = new Array(timeline.length);
  let next = 0, done = 0;
  const worker = async () => {
    while (next < timeline.length) {
      const i = next++, item = timeline[i];
      rendered[i] = await (renderItem ? renderItem(item, { cacheRoot, voice, fx, fps }) : local(item));
      done++;
      onProgress?.({ step: `Rendered ${done} of ${timeline.length}`, done, total: timeline.length });
    }
  };
  onProgress?.({ step: `Rendering ${timeline.length} items`, done: 0, total: timeline.length });
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, timeline.length)) }, worker));

  let cursor = 0;
  const cues = [], chapters = [], checkpoints = [];
  rendered.forEach((r, i) => {
    const s = timeline[i];
    if (s.travel) { cursor += r.total; return; }
    chapters.push({ index: chapters.length, id: s.id, title: s.slide?.title || `Scene ${chapters.length + 1}`, layout: s.slide?.layout || 'bullets', station: s.station || null, hint: s.hint || null, keyPoint: highlights(s, r.dur).find(h => h.note)?.note || null, start: +cursor.toFixed(2), end: +(cursor + r.dur).toFixed(2) });
    r.cues.forEach(c => cues.push({ start: cursor + c.start, end: cursor + c.end, text: c.text }));
    if (s.slide?.layout === 'quiz') {
      const q = s.slide.quiz, sc = { ...s, parts: r.parts }, opts = q.options.map((text, k) => ({ text, at: q.optionsAt?.[k] }));
      const thinkFrom = Math.max(...itemTimes(sc, opts, r.dur)) + 0.8;
      checkpoints.push({ type: 'quiz', sceneId: s.id, question: q.question, options: q.options, answer: q.answer, explanation: q.explanation || null, pauseAt: +(cursor + thinkFrom).toFixed(2), revealAt: +(cursor + timeOf(sc, q.answerAt, r.dur, r.dur * 0.8)).toFixed(2) });
    }
    cursor += r.total;
  });

  const list = rendered.map(r => `file '${relative(outDir, join(r.dir, 'segment.mp4')).split('\\').join('/')}'`).join('\n');
  writeFileSync(join(outDir, 'segments.txt'), list);
  ff(['-f', 'concat', '-safe', '0', '-i', 'segments.txt', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', 'video.mp4'], outDir);

  writeFileSync(join(outDir, 'captions.srt'), cues.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n'));
  writeFileSync(join(outDir, 'captions.vtt'), 'WEBVTT\n\n' + cues.map(c => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}\n`).join('\n'));
  const fresh = rendered.filter(r => !r.cached);
  const timings = {
    videoSeconds: +cursor.toFixed(1), voice, fx, fps, scenes: scenes.length, shipRides: timeline.length - scenes.length, reusedScenes: rendered.length - fresh.length, renderedScenes: fresh.length,
    voiceSeconds: +fresh.reduce((n, r) => n + r.stats.voiceSeconds, 0).toFixed(1), frameSeconds: +fresh.reduce((n, r) => n + r.stats.frameSeconds, 0).toFixed(1), encodeSeconds: +fresh.reduce((n, r) => n + r.stats.encodeSeconds, 0).toFixed(1),
  };
  const stationsUsed = [...new Set(chapters.map(c => c.station).filter(Boolean))].map(id => ({ id, name: stationName(id) }));
  const meta = { title: script.title, duration: +cursor.toFixed(1), stations: stationsUsed, chapters, checkpoints, timings };
  writeFileSync(join(outDir, 'chapters.json'), JSON.stringify(meta, null, 2));
  onProgress?.({ step: 'Done', done: timeline.length, total: timeline.length });
  return meta;
}
