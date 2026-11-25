// Renders ONE item (a scene or a ship ride) into a cache folder. This is the unit of work a cloud machine does.
// Usage: node scene.mjs <item.json> <cacheDir>      item.json = { item, opts: { voice, fx, fps } }
import { readFileSync } from 'node:fs';
import { renderScene, renderTravel } from '../video/render.mjs';

const [itemPath, cacheRoot] = process.argv.slice(2);
if (!itemPath || !cacheRoot) { console.error('usage: scene.mjs <item.json> <cacheDir>'); process.exit(2); }
const { item, opts } = JSON.parse(readFileSync(itemPath, 'utf8'));
const r = item.travel ? await renderTravel(item, { cacheRoot, fps: opts.fps }) : await renderScene(item, { cacheRoot, ...opts });
console.log(JSON.stringify({ key: r.key, cached: r.cached, dur: r.dur ?? r.total, stats: r.stats }));
