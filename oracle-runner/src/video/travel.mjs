// Travel scene: Soomy and Indoo ride a small SpotCLM spaceship from one station to the next. The camera follows them, so they
// stay put while the old station slides away and the new one slides in, with speed streaks behind. The slide card turns into
// a route map showing where the ship is heading. No narration: a short whoosh and a pause for the eye.
import { robot, WAVE_POINTS } from './robot.mjs';
import { lockup } from './brand.mjs';
import { stationSvg, stationName } from './stations.mjs';

export const TRAVEL_SECONDS = 2.2;
const W = 1280, H = 720;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };

function ship(lt, s) {
  const bob = Math.sin(lt * 5) * 2.5, flame = 0.75 + 0.25 * Math.sin(lt * 31), fade = 1 - smooth((s - 0.86) / 0.14), rise = smooth(s / 0.12) * smooth(1);
  return `<g opacity="${(Math.min(1, s / 0.1) * fade).toFixed(2)}" transform="translate(0 ${(bob + (1 - rise) * 14).toFixed(1)})">
    <ellipse cx="190" cy="612" rx="${(160 * flame).toFixed(0)}" ry="9" fill="#22D3EE" fill-opacity="0.25"/>
    <path d="M6 556 H356 Q388 556 392 572 Q388 590 352 592 H20 Q2 590 6 574Z" fill="url(#shell)" stroke="#9FB3CC" stroke-width="2"/>
    <rect x="22" y="564" width="330" height="22" rx="11" fill="#0D1F4A"/>
    ${lockup(124, 563, 0.31, { dark: true, id: 'lkShip' })}
    <circle cx="44" cy="575" r="4" fill="#5BC8F5"/><circle cx="62" cy="575" r="4" fill="#5BC8F5" fill-opacity="0.55"/><circle cx="340" cy="575" r="4" fill="#5BC8F5"/>
    <path d="M6 556 L-22 536 L-4 570Z" fill="#9FB3CC"/><path d="M-6 568 L-${(46 + 18 * flame).toFixed(0)} 575 L-6 582Z" fill="#8FE3FF" fill-opacity="${(0.55 + 0.3 * flame).toFixed(2)}"/><path d="M-6 571 L-${(28 + 12 * flame).toFixed(0)} 575 L-6 579Z" fill="#FFFFFF" fill-opacity="0.85"/>
    <path d="M300 556 Q330 520 372 556" fill="#8FE3FF" fill-opacity="0.18" stroke="#5BC8F5" stroke-width="2"/>
  </g>`;
}

function streaks(lt) {
  return Array.from({ length: 16 }, (_, i) => {
    const speed = 700 + (i % 5) * 220, len = 70 + ((i * 37) % 110), y = 70 + ((i * 53) % 500);
    const x = 1400 - ((lt * speed + i * 211) % 1500);
    return `<rect x="${x.toFixed(0)}" y="${y}" width="${len}" height="3" rx="1.5" fill="#8FD3F5" fill-opacity="${(0.28 + (i % 3) * 0.08).toFixed(2)}"/>`;
  }).join('');
}

// stops: [{ id, name }] in route order; the card shows them as a line with the ship marker between from and to.
function routeCard(from, to, s, lt, stops) {
  const x0 = 520, x1 = 1130, n = stops.length, step = n > 1 ? (x1 - x0) / (n - 1) : 0, y = 330;
  const fi = Math.max(0, stops.findIndex(p => p.id === from)), ti = Math.max(0, stops.findIndex(p => p.id === to));
  const pos = x0 + (fi + (ti - fi) * smooth((s - 0.1) / 0.8)) * step;
  const e = smooth(s / 0.15);
  let out = `<rect x="400" y="50" width="840" height="530" rx="26" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
    <g opacity="${e.toFixed(2)}"><text x="440" y="118" font-size="30" font-weight="700" fill="#2563EB">Next stop</text>
    <text x="440" y="190" font-size="62" font-weight="800" fill="#0F172A">${stationName(to)}</text>
    <rect x="440" y="206" width="72" height="5" rx="2.5" fill="#2563EB"/>
    <line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#DBEAFE" stroke-width="8" stroke-linecap="round"/>
    <line x1="${x0}" y1="${y}" x2="${pos.toFixed(1)}" y2="${y}" stroke="#2563EB" stroke-width="8" stroke-linecap="round"/>`;
  stops.forEach((p, i) => {
    const x = x0 + i * step, done = x <= pos + 1, isTo = p.id === to;
    out += `<circle cx="${x}" cy="${y}" r="${isTo ? 20 + 2 * Math.sin(lt * 6) : 15}" fill="${done ? '#2563EB' : '#FFFFFF'}" stroke="#2563EB" stroke-width="4"/>
      <text x="${x}" y="${y + 52}" font-size="18" font-weight="${isTo ? 700 : 500}" fill="${isTo ? '#0F172A' : '#64748B'}" text-anchor="middle">${p.name}</text>`;
  });
  out += `<g transform="translate(${pos.toFixed(1)} ${y - 40})"><path d="M-22 6 Q-22 -10 0 -10 Q22 -10 28 0 Q22 12 0 12 Q-22 12 -22 6Z" fill="#0D1F4A"/><path d="M-22 6 l-12 -8 l4 14z" fill="#8FE3FF"/><circle cx="10" cy="0" r="5" fill="#8FE3FF"/></g></g>`;
  out += `<text x="440" y="470" font-size="26" fill="#64748B">Soomy and Indoo are on their way.</text>`;
  return out;
}

export function travelSvg(tr, lt, dur, stops, silent = new Float32Array(WAVE_POINTS)) {
  const s = clamp01(lt / dur), slide = smooth((s - 0.08) / 0.84);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter">
  <rect width="${W}" height="${H}" fill="#F1F5F9"/>
  ${streaks(lt)}
  <g opacity="${(1 - slide).toFixed(2)}" transform="translate(${(-slide * 430).toFixed(1)} 0)">${stationSvg(tr.from, { plate: false })}</g>
  <g opacity="${slide.toFixed(2)}" transform="translate(${((1 - slide) * 430).toFixed(1)} 0)">${stationSvg(tr.to, { plate: false })}</g>
  ${ship(lt, s)}
  ${robot(lt, silent, 'point', [], null)}
  ${routeCard(tr.from, tr.to, s, lt, stops)}
  ${lockup(40, 664, 0.36, { id: 'lkFootT' })}<text x="138" y="684" font-size="17" font-weight="600" fill="#64748B">Academy</text>
</svg>`;
}
