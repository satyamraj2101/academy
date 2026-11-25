// SOOMY, the SpotCLM instructor robot, and INDOO, her mop-bot sidekick (she) who follows him everywhere.
//
// Soomy is a friendly full-body robot in white and navy with a glass visor that draws the REAL audio waveform
// (so there is nothing to lip-sync), the SpotCLM logo on a chest panel, a tablet in one hand and a telescopic
// pointer in the other. He breathes, tilts his head, nods while speaking and gestures by scene.
// Indoo is a small, curious, cheeky mop robot: shaking legs, a fringe of mop strands, big glossy LED eyes and a chirp
// for every mood. She reacts to each sound with her eyes and body. Names are working names and live in one place (NAMES) so they are easy to change.
import { lockup } from './brand.mjs';

export const WAVE_POINTS = 48;
export const NAMES = { instructor: 'Soomy', companion: 'Indoo' }; // Indoo is a she

const CX = 160; // Soomy's centre line
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
  <radialGradient id="iris" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stop-color="#E9FAFF"/><stop offset="0.45" stop-color="#8FE3FF"/><stop offset="1" stop-color="#2A8FE0"/></radialGradient>
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

// What Indoo is reacting to right now (the latest chirp within the last 1.3 s), or null.
function reaction(events, t) {
  let best = null;
  for (const e of events) {
    const age = t - e.t;
    if (age >= 0 && age < 1.3 && (!best || e.t > best.t)) best = { type: e.sound, age, k: Math.max(0, 1 - age / 1.3), t: e.t };
  }
  return best;
}

const star = (x, y, r, o) => `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="#E9FAFF" fill-opacity="${o.toFixed(2)}"/>`;

// Indoo: small, curious and a little cheeky. She wanders near Soomy's feet, her stubby legs never quite stop shaking,
// her eyes follow things and react to every chirp, and she winks now and then.
function indoo(t, amp, baseX, events) {
  const rx = reaction(events, t);
  const px = baseX + Math.sin(t * 0.55) * 44 + Math.sin(t * 1.5) * 6;
  const vx = Math.cos(t * 0.55) * 44 * 0.55 + Math.cos(t * 1.5) * 6 * 1.5;
  const lean = Math.max(-4, Math.min(4, vx * 0.06));
  const excite = 0.45 + amp * 0.9 + (rx ? rx.k * 0.9 : 0);
  let hop = -Math.abs(Math.sin(t * 6.5)) * amp * 3;
  if (rx && rx.type === 'celebrate') hop -= Math.abs(Math.sin(rx.age * 11)) * 18 * rx.k;
  if (rx && rx.type === 'happy') hop -= Math.abs(Math.sin(rx.age * 10)) * 7 * rx.k;
  const squash = rx && rx.type === 'oops' ? 1 - 0.07 * rx.k : 1;
  const tilt = (rx && rx.type === 'curious' ? 7 * rx.k : 0) + Math.sin(t * 1.2) * 2;

  const look = Math.sin(t * 0.7) * 3 + (rx && rx.type === 'curious' ? 3 * rx.k : 0);
  const big = rx && (rx.type === 'curious' || rx.type === 'notice') ? 1 + 0.22 * rx.k : 1;
  const blink = t % 4.3 < 0.13 ? 0.1 : 1;
  const wink = t % 7.4 < 0.55;
  const joy = !!(rx && (rx.type === 'happy' || rx.type === 'celebrate') && rx.age < 0.95);
  const eye = (cx, closed, side) => {
    if (joy) return `<path d="M${cx - 8} -45 q8 -11 16 0" fill="none" stroke="#8FE3FF" stroke-width="3.2" stroke-linecap="round"/>`;
    if (closed) return `<path d="M${cx - 8} -48 q8 7 16 0" fill="none" stroke="#8FE3FF" stroke-width="3" stroke-linecap="round"/>`;
    const ry = 9.5 * big * blink, rxx = 8.5 * big;
    const lid = rx && rx.type === 'oops' ? `<path d="M${cx - rxx - 1} ${-48 - ry} h${2 * rxx + 2} v${ry * 0.95} h${-(2 * rxx + 2)}z" fill="#070D1C"/>` : '';
    return `<ellipse cx="${cx}" cy="-48" rx="${rxx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="url(#iris)"/>
      <circle cx="${cx - 2.6}" cy="-51.5" r="${(2.7 * blink).toFixed(1)}" fill="#FFFFFF"/><circle cx="${cx + 3}" cy="-44" r="${(1.4 * blink).toFixed(1)}" fill="#FFFFFF" fill-opacity="0.8"/>${lid}
      <path d="M${cx + side * 8} -56 q${side * 5} -3 ${side * 8} 2 M${cx + side * 6} -59 q${side * 4} -4 ${side * 8} -1" fill="none" stroke="#8FE3FF" stroke-width="1.7" stroke-linecap="round"/>`;
  };
  const ringOn = rx && rx.type === 'notice' ? rx.k : 0;

  const legs = [-40, -14, 14, 40].map((x, i) => {
    const sh = Math.sin(t * 24 + i * 1.9) * 1.8 * excite, lift = Math.max(0, Math.sin(t * 10 + i * 1.4)) * 3.5 * excite;
    return `<line x1="${x}" y1="-30" x2="${(x + sh).toFixed(1)}" y2="${(-4 - lift).toFixed(1)}" stroke="#9FB3CC" stroke-width="8" stroke-linecap="round"/><ellipse cx="${(x + sh).toFixed(1)}" cy="${(-1.5 - lift).toFixed(1)}" rx="9.5" ry="4.5" fill="#0D1F4A"/>`;
  }).join('');
  const strands = Array.from({ length: 7 }, (_, i) => {
    const sway = Math.sin(t * 3.2 + i * 0.9) * (3 + amp * 3);
    return `<rect x="${-36 + i * 11}" y="-30" width="8" height="${14 + (i % 2) * 4}" rx="4" fill="${i % 2 ? '#FFFFFF' : '#8FD3F5'}" stroke="#7FB9DD" stroke-width="1" transform="skewX(${sway.toFixed(1)}) translate(${(sway * -0.55).toFixed(1)} 0)"/>`;
  }).join('');
  const dots = rx && rx.type === 'celebrate' ? Array.from({ length: 9 }, (_, i) => {
    const a = rx.age, x = Math.sin(i * 2.3) * (14 + a * 70), y = -96 - a * 60 + a * a * 70;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${['#5BC8F5', '#FBBF24', '#2563EB', '#FFFFFF', '#F472B6'][i % 5]}" fill-opacity="${Math.max(0, 1 - a / 1.2).toFixed(2)}"/>`;
  }).join('') : '';
  const sparkles = rx && rx.type === 'notice' ? star(-34, -84, 7 * rx.k + 2, rx.k) + star(36, -92, 5 * rx.k + 1, rx.k) : '';
  const drop = rx && rx.type === 'oops' ? `<path d="M34 -86 q6 9 0 13 q-6 -4 0 -13z" fill="#7DD3FC" fill-opacity="${rx.k.toFixed(2)}" transform="translate(0 ${(rx.age * 14).toFixed(1)})"/>` : '';
  const wiggle = rx && rx.type === 'nudge' ? Math.sin(rx.age * 40) * 3 * rx.k : 0;

  return `<g transform="translate(${(px + wiggle).toFixed(1)} ${(556 + hop).toFixed(1)}) rotate(${lean.toFixed(2)}) scale(1.15 ${(1.15 * squash).toFixed(3)})">
    <ellipse cx="0" cy="${(-hop / 1.15).toFixed(1)}" rx="62" ry="8" fill="#0D1F4A" fill-opacity="0.15"/>
    ${strands}${legs}
    <rect x="-56" y="-70" width="112" height="44" rx="22" fill="url(#sw)" stroke="#9FC3E4" stroke-width="2"/>
    <rect x="-50" y="-36" width="100" height="6" rx="3" fill="#1246A0"/>
    <g transform="rotate(${tilt.toFixed(2)} 0 -60)">
      <path d="M-40 -68 Q0 -98 40 -68 Z" fill="url(#sw)" stroke="#9FC3E4" stroke-width="2"/>
      <ellipse cx="-14" cy="-80" rx="14" ry="3.5" fill="#FFFFFF" fill-opacity="0.9"/>
      <line x1="-14" y1="-90" x2="-20" y2="-104" stroke="#9FB3CC" stroke-width="4" stroke-linecap="round"/>
      <circle cx="-20" cy="-108" r="${(8 + amp * 3).toFixed(1)}" fill="#5BC8F5" fill-opacity="0.25"/><circle cx="-20" cy="-108" r="5.5" fill="url(#orb)"/>
      <path d="M16 -90 l-9 -7 v14z M16 -90 l9 -7 v14z" fill="#5BC8F5" stroke="#2A8FE0" stroke-width="1.2" stroke-linejoin="round"/><circle cx="16" cy="-90" r="3.4" fill="#1460C8"/>
      <rect x="-40" y="-66" width="80" height="36" rx="18" fill="url(#visor)" stroke="${ringOn ? '#8FE3FF' : '#1E3A8A'}" stroke-width="${(2 + ringOn * 2).toFixed(1)}"/>
      ${eye(-16 + look, false, -1)}${eye(16 + look, wink && !joy, 1)}
      <ellipse cx="-31" cy="-38" rx="5" ry="3" fill="#FF9EB5" fill-opacity="0.35"/><ellipse cx="31" cy="-38" rx="5" ry="3" fill="#FF9EB5" fill-opacity="0.35"/>
    </g>
    ${sparkles}${drop}${dots}
  </g>`;
}

// wave: Float32Array(WAVE_POINTS), -1..1. t: seconds into the scene.
export function robot(t, wave, gesture = 'point', events = []) {
  let sum = 0;
  for (const v of wave) sum += v * v;
  const amp = Math.min(1, Math.sqrt(sum / wave.length) * 1.6);
  return `${DEFS}${clem(t, wave, gesture, amp)}${indoo(t, amp, CX + 118, events)}`;
}
