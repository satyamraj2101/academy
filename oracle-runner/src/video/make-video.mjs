// Usage: node src/video/make-video.mjs <script.json> <outDir> [--fps 12] [--voice am_puck] [--fx subtle|robot|none]
// Script JSON: { "title": "...", "scenes": [ { "narration": "caption text", "spoken": "optional text read aloud",
//   "gesture": "point|raise|present", "slide": { "layout": "hook|bullets|steps|compare|quiz|recap", ... } } ] }
// Output: <outDir>/video.mp4 (captions burned in), captions.srt/.vtt, chapters.json, audio.wav, timings.json
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { synth, wavBuffer } from './tts.mjs';
import { frameSvg, W, itemTimes, timeOf } from './scene.mjs';
import { WAVE_POINTS } from './robot.mjs';
import { voiceFilter } from './voicefx.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const [scriptPath, outDir] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!scriptPath || !outDir) { console.error('usage: make-video.mjs <script.json> <outDir> [--fps 12] [--voice am_puck] [--fx subtle|robot|none]'); process.exit(1); }
const FPS = Number(opt('fps', 12));
const VOICE = opt('voice', 'am_puck');
const FX = opt('fx', 'subtle');
const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'node_modules', 'dejavu-fonts-ttf', 'ttf');
const FONT_FILES = [join(FONT_DIR, 'DejaVuSans.ttf'), join(FONT_DIR, 'DejaVuSans-Bold.ttf')];
const GAP = 0.5; // seconds of silence between scenes

const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
mkdirSync(outDir, { recursive: true });
const framesDir = join(outDir, 'frames');
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir);

const clock = (label) => { const t = Date.now(); return () => { const s = (Date.now() - t) / 1000; console.log(`${label}: ${s.toFixed(1)}s`); return s; }; };

// 1. Voice for every scene, laid out on one timeline.
let done = clock('voice');
let rate = 24000;
const scenes = [];
let cursor = 0;
for (const [i, scene] of script.scenes.entries()) {
  // "||" in the spoken text marks a silent think pause (scene.thinkSeconds) for quiz scenes.
  const texts = (scene.spoken || scene.narration).split('||').map(x => x.trim());
  const chunks = [], parts = [];
  let local = 0;
  for (const [k, text] of texts.entries()) {
    if (k > 0) { const gap = scene.thinkSeconds ?? 3; chunks.push(new Float32Array(Math.round(24000 * gap))); local += gap; }
    const { samples, rate: r } = await synth(text, { voice: VOICE });
    rate = r;
    parts.push({ text, start: local, dur: samples.length / r });
    chunks.push(samples);
    local += samples.length / r;
  }
  const samples = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) { samples.set(c, o); o += c.length; }
  const dur = samples.length / rate;
  scenes.push({ ...scene, samples, parts: texts.length > 1 ? parts : undefined, start: cursor, dur });
  cursor += dur + GAP;
  console.log(`  scene ${i + 1}: ${dur.toFixed(1)}s`);
}
const total = cursor - GAP + 0.8; // small tail so the last caption is readable
const voiceSeconds = done();

// 2. One audio track.
const track = new Float32Array(Math.ceil(total * rate));
for (const s of scenes) track.set(s.samples, Math.round(s.start * rate));
writeFileSync(join(outDir, 'audio.wav'), wavBuffer(track, rate));

// 3. Per frame: loudness (RMS) and a short slice of the real waveform for the robot's visor.
const frames = Math.ceil(total * FPS);
const level = new Float32Array(frames);
const waves = new Array(frames);
const win = Math.round(rate / FPS), WN = 1100;
const sortedAbs = Float32Array.from({ length: Math.min(track.length, 60000) }, (_, i) => Math.abs(track[Math.floor((i / 60000) * track.length)])).sort();
const peak = (sortedAbs[Math.floor(sortedAbs.length * 0.995)] || 0.5) * 1.2;
for (let f = 0; f < frames; f++) {
  const c = Math.round((f / FPS) * rate);
  let sum = 0, n = 0;
  for (let i = Math.max(0, c - win / 2); i < Math.min(track.length, c + win / 2); i++) { sum += track[i] * track[i]; n++; }
  level[f] = n ? Math.sqrt(sum / n) : 0;
  const w = new Float32Array(WAVE_POINTS), a = c - WN / 2;
  for (let i = 0; i < WAVE_POINTS; i++) { const idx = Math.round(a + (i * (WN - 1)) / (WAVE_POINTS - 1)); w[i] = idx >= 0 && idx < track.length ? Math.max(-1, Math.min(1, track[idx] / peak)) : 0; }
  waves[f] = w;
}

// 4. Frames.
done = clock('frames');
for (let f = 0; f < frames; f++) {
  const t = f / FPS;
  let idx = scenes.findIndex(s => t >= s.start && t < s.start + s.dur + GAP);
  if (idx < 0) idx = scenes.length - 1;
  const scene = scenes[idx];
  const svg = frameSvg(scene, Math.max(0, t - scene.start), scene.dur, waves[f], t, { index: idx, total: scenes.length, progress: Math.min(1, t / total) });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'DejaVu Sans' } }).render().asPng();
  writeFileSync(join(framesDir, `${String(f).padStart(5, '0')}.png`), png);
}
const frameSeconds = done();

// 5. Captions (shows `narration`, which may differ from what is spoken, e.g. "CLM" vs "C L M").
const stamp = (s, sep) => { const ms = Math.round(s * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`; };
const cues = [];
for (const s of scenes) {
  // Caption each voiced part against that part's own timing, so a think pause shows no stale text.
  const capParts = s.narration.split('||').map(x => x.trim());
  capParts.forEach((text, k) => {
    const part = s.parts?.[k] || { start: 0, dur: s.dur };
    const words = text.replace(/\s+/g, ' ').split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) { if (cur && (cur + ' ' + w).length > 48) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
    if (cur) lines.push(cur);
    const chars = lines.reduce((n, l) => n + l.length, 0);
    let t = s.start + part.start;
    for (const l of lines) { const d = (l.length / chars) * part.dur; cues.push({ start: t, end: t + d, text: l }); t += d; }
  });
}
writeFileSync(join(outDir, 'captions.srt'), cues.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n'));
writeFileSync(join(outDir, 'captions.vtt'), 'WEBVTT\n\n' + cues.map(c => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}\n`).join('\n'));

// 6. Chapters and quiz checkpoints, so the course player can offer "jump to" and pause for questions.
const chapters = scenes.map((s, i) => ({ index: i, title: s.slide.title || `Scene ${i + 1}`, layout: s.slide.layout || 'bullets', start: +s.start.toFixed(2), end: +(s.start + s.dur).toFixed(2) }));
const checkpoints = scenes.flatMap((s) => {
  if (s.slide.layout !== 'quiz') return [];
  const q = s.slide.quiz, opts = q.options.map((text, i) => ({ text, at: q.optionsAt?.[i] }));
  const thinkFrom = Math.max(...itemTimes(s, opts, s.dur)) + 0.8;
  return [{ type: 'quiz', question: q.question, options: q.options, answer: q.answer, pauseAt: +(s.start + thinkFrom).toFixed(2), revealAt: +(s.start + timeOf(s, q.answerAt, s.dur, s.dur * 0.8)).toFixed(2) }];
});
writeFileSync(join(outDir, 'chapters.json'), JSON.stringify({ title: script.title, duration: +total.toFixed(1), chapters, checkpoints }, null, 2));

// 7. Encode. Run inside outDir so the subtitle path has no drive letter to escape.
done = clock('encode');
// libass scales sizes against a 288px-tall canvas, so FontSize=11 is roughly 28px on a 720p frame.
const style = "FontName=DejaVu Sans,FontSize=11,PrimaryColour=&H3B2F1E&,OutlineColour=&HFFFFFF&,BorderStyle=1,Outline=2,Shadow=0,MarginV=22,Alignment=2";
const af = voiceFilter(FX, rate);
const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', 'frames/%05d.png', '-i', 'audio.wav',
  '-vf', `subtitles=captions.srt:fontsdir='${relative(outDir, FONT_DIR).split('\\').join('/')}':force_style='${style}'`,
  ...(af ? ['-af', af] : []),
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', 'video.mp4'], { cwd: outDir, encoding: 'utf8' });
if (ff.status !== 0) { console.error('ffmpeg failed:', ff.stderr); process.exit(1); }
const encodeSeconds = done();

rmSync(framesDir, { recursive: true, force: true });
const timings = { videoSeconds: +total.toFixed(1), voice: VOICE, fx: FX, voiceSeconds, frameSeconds, encodeSeconds, fps: FPS, frames };
timings.machineSeconds = +(voiceSeconds + frameSeconds + encodeSeconds).toFixed(1);
timings.speedVideoPerMachineMinute = +(total / timings.machineSeconds).toFixed(2);
writeFileSync(join(outDir, 'timings.json'), JSON.stringify(timings, null, 2));
console.log('\n' + JSON.stringify(timings, null, 2));
