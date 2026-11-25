// Makes short voice samples so a person can pick the narrator by ear.
// Usage: node src/video/voice-demo.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { synth, wavBuffer } from './tts.mjs';
import { voiceFilter } from './voicefx.mjs';

const outDir = process.argv[2];
if (!outDir) { console.error('usage: voice-demo.mjs <outDir>'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const TEXT = "Hi, I'm your contract counsel. A contract lifecycle starts with a request, then it is drafted, reviewed, approved, and signed.";
const SAMPLES = [
  ['am_puck', 'clean'], ['am_puck', 'cute'], ['am_michael', 'clean'], ['am_michael', 'cute'], ['am_fenrir', 'clean'], ['am_puck', 'robot'],
];
for (const [voice, fx] of SAMPLES) {
  const { samples, rate } = await synth(TEXT, { voice });
  const wav = join(outDir, `${voice}-${fx}.wav`);
  writeFileSync(wav, wavBuffer(samples, rate));
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', voiceFilter(fx, rate), '-codec:a', 'libmp3lame', '-q:a', '3', join(outDir, `${voice}-${fx}.mp3`)], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  console.log('made', `${voice}-${fx}.mp3`);
}
