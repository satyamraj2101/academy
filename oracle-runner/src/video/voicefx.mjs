// Voice colour, applied with plain ffmpeg filters. Kokoro's raw output is already very quiet between words
// (about -80 dBFS), so the clean presets add no noise. The modulating effects (buzz, echo) are what make a voice
// sound "noisy", so only the optional "robot" preset uses them.
//   clean : warmth + gentle presence + even levels. The default: pleasant and easy to listen to for long lessons.
//   cute  : clean, plus the voice lifted ~4% in pitch (tempo unchanged) for a friendlier, younger tone.
//   robot : cute, plus a slight buzz and a short metallic echo. Clearly synthetic; use sparingly.
//   none  : untouched.
const CLEAN = [
  'highpass=f=70',
  'equalizer=f=180:t=q:w=1:g=1.5',    // a little body
  'equalizer=f=3200:t=q:w=1.2:g=1.5', // a little clarity
  'acompressor=threshold=-22dB:ratio=2:attack=20:release=250:makeup=1',
  'alimiter=limit=0.7',
];
const pitch = (rate, p) => [`asetrate=${Math.round(rate * p)}`, `aresample=${rate}`, `atempo=${(1 / p).toFixed(4)}`];

export function voiceFilter(level, rate = 24000) {
  switch (level) {
    case 'none': return 'alimiter=limit=0.7';
    case 'clean': return CLEAN.join(',');
    case 'cute': return [...pitch(rate, 1.04), ...CLEAN].join(',');
    case 'robot': return [...pitch(rate, 1.07), 'tremolo=f=55:d=0.12', 'aecho=0.9:0.75:11:0.18', ...CLEAN].join(',');
    default: throw new Error(`unknown --fx "${level}" (use clean, cute, robot or none)`);
  }
}
