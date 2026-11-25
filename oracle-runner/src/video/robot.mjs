// CLEM, the SpotCLM instructor robot, and SWISH, his mop-bot sidekick who follows him everywhere.
//
// Clem is a friendly full-body robot in white and navy with a glass visor that draws the REAL audio waveform
// (so there is nothing to lip-sync), the SpotCLM logo on a chest panel, a tablet in one hand and a telescopic
// pointer in the other. He breathes, tilts his head, nods while speaking and gestures by scene.
// Swish is a small round mop robot with a fringe of mop strands, two LED eyes that look up at Clem, and a happy
// wiggle when Clem talks. Names are working names and live in one place (NAMES) so they are easy to change.
import { lockup, cometMark } from './brand.mjs';

export const WAVE_POINTS = 48;
export const NAMES = { instructor: 'Clem', companion: 'Swish' };

const CX = 160; // Clem's centre line
const SH = { left: [CX - 76, 316], right: [CX + 76, 316] }; // shoulders

// Two-bone arm: where does the elbow go so the hand reaches (tx, ty)? `bend` picks which way the elbow points.
function reach([sx, sy], tx, ty, l1, l2, bend) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  const max = l1 + l2 - 1;
  if (d > max) { tx = sx + (dx * max) / d; ty = sy + (dy * max) / d; dx = tx - sx; dy = ty - sy; d = max; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return { ex: sx + (dx * a) / d + (-dy / d) * h * bend, ey: sy + (dy * a) / d + (dx / d) * h * bend, hx: tx, hy: ty };
}

const GESTURES = {
  point: (t) => ({ x: CX + 168 + Math.sin(t * 1.5) * 5, y: 318 + Math.cos(t * 1.5) * 6, pointer: true }),
  raise: (t) => ({ x: CX + 124 + Math.sin(t * 2.2) * 6, y: 214 + Math.cos(t * 2.2) * 8, pointer: false }),
  present: (t) => ({ x: CX + 172, y: 366 + Math.sin(t * 1.7) * 6, pointer: false }),
};

const limb = (a, b, c, w = 26) => {
  const d = `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)} L${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  return `<path d="${d}" fill="none" stroke="#9FB3CC" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="#EAF1F9" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="translate(-4 -4)"/>`;
};
const joint = (x, y, r) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="url(#navy)"/><circle cx="${(x - r * 0.3).toFixed(1)}" cy="${(y - r * 0.35).toFixed(1)}" r="${(r * 0.35).toFixed(1)}" fill="#FFFFFF" fill-opacity="0.28"/>`;

const DEFS = `<defs>
  <linearGradient id="shell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D5E2F2"/></linearGradient>
  <linearGradient id="torso" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#CFDCEE"/><stop offset="0.35" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9D8EC"/></linearGradient>
  <linearGradient id="navy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B3A7A"/><stop offset="1" stop-color="#0D1F4A"/></linearGradient>
  <linearGradient id="visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14213D"/><stop offset="1" stop-color="#070D1C"/></linearGradient>
  <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12326F"/><stop offset="1" stop-color="#0A1A3F"/></linearGradient>
  <linearGradient id="sw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C5DCF3"/></linearGradient>
  <radialGradient id="orb" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#E9FAFF"/><stop offset="1" stop-color="#2A9BDA"/></radialGradient>
</defs>`;

function clem(t, wave, gesture, amp) {
  const bob = Math.sin(t * 2.2) * 2.5;
  const tilt = Math.sin(t * 1.3) * 1.4 + Math.sin(t * 7) * amp * 0.7;
  const nod = amp * 2.5;
  const g = (GESTURES[gesture] || GESTURES.point)(t);
  const S = [SH.right[0], SH.right[1] + bob], L = [SH.left[0], SH.left[1] + bob];
  const r = reach(S, g.x, g.y + bob, 64, 64, 1);
  const l = reach(L, CX - 92, 404 + bob, 62, 62, 1);

  // pointer extends along the forearm
  let pointer = '';
  if (g.pointer) {
    const dx = r.hx - r.ex, dy = r.hy - r.ey, n = Math.hypot(dx, dy);
    const tx = r.hx + (dx / n) * 58, ty = r.hy + (dy / n) * 58;
    pointer = `<line x1="${r.hx.toFixed(1)}" y1="${r.hy.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="#0D1F4A" stroke-width="5" stroke-linecap="round"/>
      <line x1="${(r.hx + (dx / n) * 40).toFixed(1)}" y1="${(r.hy + (dy / n) * 40).toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="#5BC8F5" stroke-width="5" stroke-linecap="round"/>
      <circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="${(6 + amp * 3).toFixed(1)}" fill="#5BC8F5" fill-opacity="0.35"/><circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="3.5" fill="#E9FAFF"/>`;
  }

  const vx = CX - 52, vw = 104, mid = 187;
  const pts = Array.from(wave, (v, i) => `${(vx + 10 + (i / (WAVE_POINTS - 1)) * (vw - 20)).toFixed(1)},${(mid - v * 24).toFixed(1)}`).join(' ');

  return `
  <ellipse cx="${CX}" cy="552" rx="96" ry="11" fill="#0D1F4A" fill-opacity="0.13"/>
  <!-- legs and boots -->
  <rect x="${CX - 46}" y="450" width="28" height="76" rx="12" fill="url(#navy)"/><rect x="${CX + 18}" y="450" width="28" height="76" rx="12" fill="url(#navy)"/>
  <rect x="${CX - 64}" y="514" width="62" height="34" rx="16" fill="url(#shell)" stroke="#B5C7DD" stroke-width="2"/><rect x="${CX + 2}" y="514" width="62" height="34" rx="16" fill="url(#shell)" stroke="#B5C7DD" stroke-width="2"/>
  <rect x="${CX - 66}" y="540" width="66" height="9" rx="4.5" fill="#0D1F4A"/><rect x="${CX}" y="540" width="66" height="9" rx="4.5" fill="#0D1F4A"/>
  <rect x="${CX - 60}" y="520" width="26" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.8"/><rect x="${CX + 6}" y="520" width="26" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.8"/>
  <!-- left arm with tablet -->
  <g transform="translate(0 ${bob.toFixed(1)})"><g transform="rotate(-9 ${CX - 98} 410)">
    <rect x="${CX - 128}" y="372" width="60" height="80" rx="9" fill="url(#navy)"/><rect x="${CX - 122}" y="379" width="48" height="66" rx="5" fill="#0B1733"/>
    <rect x="${CX - 116}" y="388" width="36" height="5" rx="2.5" fill="#5BC8F5"/>
    <rect x="${CX - 116}" y="402" width="9" height="30" rx="2" fill="#1460C8"/><rect x="${CX - 103}" y="412" width="9" height="20" rx="2" fill="#5BC8F5"/><rect x="${CX - 90}" y="396" width="9" height="36" rx="2" fill="#2A8FE0"/></g></g>
  ${limb(L, [l.ex, l.ey], [l.hx, l.hy])}${joint(l.ex, l.ey, 13)}
  <!-- pelvis, torso -->
  <rect x="${CX - 60}" y="428" width="120" height="34" rx="16" fill="url(#navy)"/>
  <rect x="${CX - 70}" y="${288 + bob}" width="140" height="${160 - bob}" rx="46" fill="url(#torso)" stroke="#B5C7DD" stroke-width="2"/>
  <rect x="${CX - 56}" y="${296 + bob}" width="112" height="10" rx="5" fill="#FFFFFF" fill-opacity="0.85"/>
  <!-- chest panel with the SpotCLM logo (the watermark) -->
  <rect x="${CX - 54}" y="${318 + bob}" width="108" height="92" rx="22" fill="url(#panel)" stroke="#2A5CB8" stroke-width="2"/>
  ${lockup(CX - 45, 335 + bob, 0.344, { dark: true, id: 'lkChest' })}
  <rect x="${CX - 36}" y="${372 + bob}" width="72" height="3" rx="1.5" fill="#5BC8F5" fill-opacity="${(0.45 + amp * 0.5).toFixed(2)}"/>
  <circle cx="${CX - 14}" cy="${390 + bob}" r="3.5" fill="#5BC8F5"/><circle cx="${CX}" cy="${390 + bob}" r="3.5" fill="#7DD3FC" fill-opacity="${(0.4 + amp * 0.6).toFixed(2)}"/><circle cx="${CX + 14}" cy="${390 + bob}" r="3.5" fill="#1460C8"/>
  <rect x="${CX - 15}" y="${262 + bob}" width="30" height="34" rx="10" fill="url(#navy)"/>
  <!-- right arm (gesture) -->
  ${limb(S, [r.ex, r.ey], [r.hx, r.hy])}${pointer}${joint(r.ex, r.ey, 13)}
  ${joint(S[0], S[1], 22)}${joint(L[0], L[1], 22)}
  <circle cx="${r.hx.toFixed(1)}" cy="${r.hy.toFixed(1)}" r="15" fill="url(#shell)" stroke="#9FB3CC" stroke-width="2"/><circle cx="${l.hx.toFixed(1)}" cy="${l.hy.toFixed(1)}" r="15" fill="url(#shell)" stroke="#9FB3CC" stroke-width="2"/>
  <!-- head -->
  <g transform="translate(0 ${(bob + nod).toFixed(1)}) rotate(${tilt.toFixed(2)} ${CX} 270)">
    <line x1="${CX}" y1="128" x2="${CX}" y2="104" stroke="#9FB3CC" stroke-width="6" stroke-linecap="round"/>
    <circle cx="${CX}" cy="96" r="${(13 + amp * 6).toFixed(1)}" fill="#5BC8F5" fill-opacity="0.22"/><circle cx="${CX}" cy="96" r="9" fill="url(#orb)"/>
    <circle cx="${CX - 86}" cy="190" r="19" fill="url(#navy)"/><circle cx="${CX - 86}" cy="190" r="9" fill="none" stroke="#5BC8F5" stroke-width="3"/>
    <circle cx="${CX + 86}" cy="190" r="19" fill="url(#navy)"/><circle cx="${CX + 86}" cy="190" r="9" fill="none" stroke="#5BC8F5" stroke-width="3"/>
    <rect x="${CX - 76}" y="128" width="152" height="130" rx="50" fill="url(#shell)" stroke="#B5C7DD" stroke-width="2"/>
    <ellipse cx="${CX - 22}" cy="140" rx="38" ry="6" fill="#FFFFFF" fill-opacity="0.9"/>
    <rect x="${vx - 8}" y="146" width="${vw + 16}" height="84" rx="32" fill="url(#visor)" stroke="#1E3A8A" stroke-width="3"/>
    <path d="M${vx + 6} 166 Q${CX} 150 ${vx + vw - 6} 166" fill="none" stroke="#FFFFFF" stroke-opacity="0.13" stroke-width="5" stroke-linecap="round"/>
    <line x1="${vx + 6}" y1="${mid}" x2="${vx + vw - 6}" y2="${mid}" stroke="#1D4F7A" stroke-width="1.5" stroke-dasharray="3 5"/>
    <polyline points="${pts}" fill="none" stroke="#2A9BDA" stroke-opacity="0.4" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
    <polyline points="${pts}" fill="none" stroke="#8FE3FF" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="${CX - 24}" y="239" width="48" height="6" rx="3" fill="#B5C7DD"/>
  </g>`;
}

function swish(t, amp, sx) {
  const hop = -Math.abs(Math.sin(t * 6)) * amp * 3;
  const x = sx + Math.sin(t * 0.9) * 7, tilt = Math.sin(t * 0.9 + 1) * 2.2;
  const blink = t % 4.3 < 0.14 ? 0.12 : 1;
  const look = -2.5 + Math.sin(t * 0.9) * 0.8;
  const strands = Array.from({ length: 9 }, (_, i) => {
    const sway = Math.sin(t * 3.2 + i * 0.9) * (3 + amp * 3);
    return `<rect x="${-50 + i * 12}" y="-22" width="9" height="${18 + (i % 2) * 5}" rx="4.5" fill="${i % 2 ? '#FFFFFF' : '#8FD3F5'}" stroke="#7FB9DD" stroke-width="1" transform="skewX(${sway.toFixed(1)}) translate(${(sway * -0.6).toFixed(1)} 0)"/>`;
  }).join('');
  const drops = [0, 1, 2].map((k) => {
    const p = (t * 0.7 + k / 3) % 1;
    return `<circle cx="${(-30 + k * 30 + Math.sin(p * 6) * 4).toFixed(1)}" cy="${(-74 - p * 26).toFixed(1)}" r="${(3.2 - p * 1.6).toFixed(1)}" fill="#5BC8F5" fill-opacity="${(0.7 * (1 - p)).toFixed(2)}"/>`;
  }).join('');
  return `<g transform="translate(${x.toFixed(1)} ${(550 + hop).toFixed(1)}) rotate(${tilt.toFixed(2)}) scale(1.2)">
    <ellipse cx="0" cy="${(-hop).toFixed(1)}" rx="60" ry="8" fill="#0D1F4A" fill-opacity="0.15" transform="translate(0 0)"/>
    ${strands}
    <rect x="-58" y="-66" width="116" height="48" rx="24" fill="url(#sw)" stroke="#9FC3E4" stroke-width="2"/>
    <rect x="-52" y="-30" width="104" height="7" rx="3.5" fill="#1246A0"/>
    <path d="M-40 -64 Q0 -92 40 -64 Z" fill="url(#sw)" stroke="#9FC3E4" stroke-width="2"/>
    <ellipse cx="-14" cy="-76" rx="14" ry="3.5" fill="#FFFFFF" fill-opacity="0.9"/>
    <rect x="-36" y="-58" width="72" height="26" rx="13" fill="url(#visor)" stroke="#1E3A8A" stroke-width="2"/>
    <ellipse cx="${(-13 + look).toFixed(1)}" cy="-45" rx="6.5" ry="${(7 * blink).toFixed(1)}" fill="#8FE3FF"/><ellipse cx="${(13 + look).toFixed(1)}" cy="-45" rx="6.5" ry="${(7 * blink).toFixed(1)}" fill="#8FE3FF"/>
    ${cometMark(0, -84, 7, { dark: false, id: 'cmSwish' })}
    ${drops}
  </g>`;
}

// wave: Float32Array(WAVE_POINTS), -1..1. t: seconds into the scene.
export function robot(t, wave, gesture = 'point') {
  let sum = 0;
  for (const v of wave) sum += v * v;
  const amp = Math.min(1, Math.sqrt(sum / wave.length) * 1.6);
  return `${DEFS}${swish(t, amp, CX + 138)}${clem(t, wave, gesture, amp)}`;
}
