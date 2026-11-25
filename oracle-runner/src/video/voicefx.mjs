// Gives the Kokoro voice a "friendly little robot" colour with plain ffmpeg filters (no model, no cost).
//   pitch   : raised a few percent without changing speed (asetrate, then resample and compensate the tempo)
//   buzz    : a slight amplitude flutter, the classic "synthetic" cue (tremolo)
//   metal   : a very short echo that adds a comb-filter ring, like a speaker in a small metal body
//   clarity : a gentle presence boost so the voice stays easy to understand
// Levels: none (untouched human voice), subtle (mostly human, a hint of robot), robot (clearly synthetic).
const LEVELS = {
  subtle: { pitch: 1.05, buzzHz: 62, buzz: 0.07, echoMs: 8, echo: 0.1 },
  robot: { pitch: 1.09, buzzHz: 52, buzz: 0.2, echoMs: 13, echo: 0.28 },
};

export function voiceFilter(level, rate = 24000) {
  if (!level || level === 'none') return 'loudnorm=I=-16:TP=-1.5';
  const p = LEVELS[level];
  if (!p) throw new Error(`unknown --fx "${level}" (use none, subtle or robot)`);
  return [
    `asetrate=${Math.round(rate * p.pitch)}`, `aresample=${rate}`, `atempo=${(1 / p.pitch).toFixed(4)}`,
    `tremolo=f=${p.buzzHz}:d=${p.buzz}`,
    `aecho=0.9:0.75:${p.echoMs}:${p.echo}`,
    'highpass=f=80', 'equalizer=f=3000:t=q:w=1:g=2',
    'loudnorm=I=-16:TP=-1.5',
  ].join(',');
}
