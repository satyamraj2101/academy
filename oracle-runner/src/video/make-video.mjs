// Usage: node src/video/make-video.mjs <script.json> <outDir> [--fps 12] [--voice am_puck] [--fx clean|cute|robot|none] [--cache <dir>]
// Script JSON: { "title": "...", "scenes": [ { "id", "narration": "caption text", "spoken": "optional text read aloud",
//   "gesture": "point|raise|present", "slide": { "layout": "hook|bullets|steps|compare|quiz|recap", ... } } ] }
// Output: <outDir>/video.mp4 (captions burned in), captions.srt/.vtt, chapters.json (chapters, quiz checkpoints, timings)
import { readFileSync } from 'node:fs';
import { buildVideo } from './render.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const [scriptPath, outDir] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!scriptPath || !outDir) { console.error('usage: make-video.mjs <script.json> <outDir> [--fps 12] [--voice am_puck] [--fx clean|cute|robot|none] [--cache dir]'); process.exit(1); }

const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
const started = Date.now();
const meta = await buildVideo(script, outDir, {
  voice: opt('voice', 'am_puck'), fx: opt('fx', 'clean'), fps: Number(opt('fps', 12)), cacheRoot: opt('cache', undefined),
  onProgress: (p) => console.log(`${p.step} (${p.done}/${p.total})`),
});
const wall = (Date.now() - started) / 1000;
console.log(JSON.stringify({ ...meta.timings, wallSeconds: +wall.toFixed(1), videoPerMachineMinute: +(meta.duration / wall).toFixed(2) }, null, 2));
