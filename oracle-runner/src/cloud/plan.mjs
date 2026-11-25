// Plans a video's work without rendering anything: prints the ordered items (scenes + ship rides) and the cache key each will
// render under. A cloud coordinator sends every item to its own machine. Usage: node plan.mjs <script.json> [--voice v] [--fx f] [--fps n]
import { readFileSync } from 'node:fs';
import { planTimeline, itemKey } from '../video/render.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const scriptPath = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!scriptPath) { console.error('usage: plan.mjs <script.json> [--voice am_puck] [--fx clean] [--fps 12]'); process.exit(2); }

const opts = { voice: opt('voice', 'am_puck'), fx: opt('fx', 'clean'), fps: Number(opt('fps', 12)) };
const { timeline } = planTimeline(JSON.parse(readFileSync(scriptPath, 'utf8')));
console.log(JSON.stringify({ opts, items: timeline.map(item => ({ id: item.id, kind: item.travel ? 'travel' : 'scene', key: itemKey(item, opts), item })) }));
