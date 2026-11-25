// "Counsel": the SpotCLM mascot. A faceless robot barrister: curled white wig, black gown with white collar bands,
// blue facings in the brand colour, gold-framed visor that draws the REAL audio waveform (so no lip-sync is needed),
// a gold SpotCLM badge, and the scales of justice in one hand. Idle life: breathing, head tilt, a nod while speaking,
// and the scales swing gently.
export const WAVE_POINTS = 48;

const GESTURES = {
  point: (t, bob) => ({ x: 352 + Math.sin(t * 1.6) * 10, y: 318 + bob + Math.cos(t * 1.6) * 12 }),
  raise: (t, bob) => ({ x: 318 + Math.sin(t * 2.4) * 8, y: 212 + bob + Math.cos(t * 2.4) * 10 }),
  present: (t, bob) => ({ x: 372, y: 362 + bob + Math.sin(t * 1.8) * 6 }),
};

const curls = (cx, y, side) => [0, 1, 2].map(i => `<circle cx="${cx + side * 1}" cy="${y + i * 24}" r="15" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>`).join('');

export function robot(t, wave, gesture = 'point') {
  const cx = 200;
  let sum = 0;
  for (const v of wave) sum += v * v;
  const amp = Math.min(1, Math.sqrt(sum / wave.length) * 1.6);
  const bob = Math.sin(t * 2.2) * 3;
  const tilt = Math.sin(t * 1.3) * 1.6 + Math.sin(t * 7) * amp * 0.8;
  const nod = amp * 3;
  const hand = (GESTURES[gesture] || GESTURES.point)(t, bob);
  const beam = Math.sin(t * 1.7) * 5;

  const x0 = cx - 46, span = 92, mid = 212 + nod;
  const pts = Array.from(wave, (v, i) => `${(x0 + (i / (WAVE_POINTS - 1)) * span).toFixed(1)},${(mid - v * 24).toFixed(1)}`).join(' ');

  // scales of justice held on the left
  const sx = cx - 122, top = 332 + bob;
  const scales = `<g transform="rotate(${beam.toFixed(2)} ${sx} ${top})">
    <line x1="${sx - 40}" y1="${top}" x2="${sx + 40}" y2="${top}" stroke="#D4A017" stroke-width="5" stroke-linecap="round"/>
    <path d="M${sx - 40} ${top} L${sx - 54} ${top + 40} M${sx - 40} ${top} L${sx - 26} ${top + 40}" stroke="#D4A017" stroke-width="2.5" fill="none"/>
    <path d="M${sx + 40} ${top} L${sx + 26} ${top + 40} M${sx + 40} ${top} L${sx + 54} ${top + 40}" stroke="#D4A017" stroke-width="2.5" fill="none"/>
    <path d="M${sx - 58} ${top + 40} h36 a18 11 0 0 1 -36 0z" fill="#F59E0B" stroke="#B45309" stroke-width="1.5"/>
    <path d="M${sx + 22} ${top + 40} h36 a18 11 0 0 1 -36 0z" fill="#F59E0B" stroke="#B45309" stroke-width="1.5"/></g>
    <line x1="${sx}" y1="${top - 6}" x2="${sx}" y2="${top + 68}" stroke="#D4A017" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${sx}" cy="${top - 8}" r="6" fill="#F59E0B"/>`;

  return `
  <ellipse cx="${cx}" cy="548" rx="104" ry="12" fill="#CBD5E1"/>
  <rect x="${cx - 58}" y="520" width="50" height="18" rx="9" fill="#020617"/>
  <rect x="${cx + 8}" y="520" width="50" height="18" rx="9" fill="#020617"/>

  <path d="M${cx - 62} ${300 + bob} Q${cx - 92} ${304 + bob} ${cx - 94} ${346 + bob} L${cx - 104} 528 Q${cx} 546 ${cx + 104} 528 L${cx + 94} ${346 + bob} Q${cx + 92} ${304 + bob} ${cx + 62} ${300 + bob} Z" fill="#111827"/>
  <polygon points="${cx - 22},${298 + bob} ${cx + 22},${298 + bob} ${cx + 12},536 ${cx - 12},536" fill="#F8FAFC"/>
  <polygon points="${cx - 32},${298 + bob} ${cx - 22},${298 + bob} ${cx - 12},536 ${cx - 24},536" fill="#2563EB"/>
  <polygon points="${cx + 22},${298 + bob} ${cx + 32},${298 + bob} ${cx + 24},536 ${cx + 12},536" fill="#2563EB"/>
  <rect x="${cx - 15}" y="${296 + bob}" width="13" height="32" rx="3" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
  <rect x="${cx + 2}" y="${296 + bob}" width="13" height="32" rx="3" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
  <rect x="${cx + 38}" y="${368 + bob}" width="62" height="26" rx="6" fill="#F59E0B" stroke="#B45309" stroke-width="1.5"/>
  <text x="${cx + 69}" y="${381 + bob}" font-size="11" font-weight="bold" fill="#111827" text-anchor="middle" dominant-baseline="central">SpotCLM</text>

  <line x1="${cx - 70}" y1="${318 + bob}" x2="${cx - 118}" y2="${402 + bob}" stroke="#111827" stroke-width="30" stroke-linecap="round"/>
  <circle cx="${cx - 120}" cy="${404 + bob}" r="13" fill="#E2E8F0"/>
  ${scales}
  <line x1="${cx + 70}" y1="${318 + bob}" x2="${hand.x.toFixed(1)}" y2="${hand.y.toFixed(1)}" stroke="#111827" stroke-width="30" stroke-linecap="round"/>
  <circle cx="${hand.x.toFixed(1)}" cy="${hand.y.toFixed(1)}" r="14" fill="#E2E8F0"/>

  <rect x="${cx - 16}" y="${278 + bob}" width="32" height="26" rx="6" fill="#94A3B8"/>
  <g transform="translate(0 ${(bob + nod).toFixed(1)}) rotate(${tilt.toFixed(2)} ${cx} 290)">
    <circle cx="${cx - 84}" cy="236" r="17" fill="#94A3B8"/><circle cx="${cx - 84}" cy="236" r="6" fill="#F59E0B"/>
    <circle cx="${cx + 84}" cy="236" r="17" fill="#94A3B8"/><circle cx="${cx + 84}" cy="236" r="6" fill="#F59E0B"/>
    <rect x="${cx - 80}" y="150" width="160" height="136" rx="42" fill="#E2E8F0" stroke="#94A3B8" stroke-width="2"/>
    <rect x="${cx - 58}" y="178" width="116" height="70" rx="22" fill="#0B1220"/>
    <line x1="${x0}" y1="${(mid - nod).toFixed(1)}" x2="${x0 + span}" y2="${(mid - nod).toFixed(1)}" stroke="#155E75" stroke-width="1.5" stroke-dasharray="3 4"/>
    <polyline points="${pts}" transform="translate(0 ${(-nod).toFixed(1)})" fill="none" stroke="#22D3EE" stroke-opacity="0.28" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>
    <polyline points="${pts}" transform="translate(0 ${(-nod).toFixed(1)})" fill="none" stroke="#67E8F9" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="${cx - 62}" y="${174}" width="124" height="78" rx="26" fill="none" stroke="#D4A017" stroke-width="4"/>
    <circle cx="${cx - 12}" cy="268" r="2.5" fill="#94A3B8"/><circle cx="${cx}" cy="268" r="2.5" fill="#94A3B8"/><circle cx="${cx + 12}" cy="268" r="2.5" fill="#94A3B8"/>
    ${curls(cx - 90, 152, -1)}${curls(cx + 90, 152, 1)}
    <ellipse cx="${cx}" cy="138" rx="90" ry="32" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
    <circle cx="${cx - 54}" cy="108" r="26" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
    <circle cx="${cx - 18}" cy="96" r="28" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
    <circle cx="${cx + 18}" cy="96" r="28" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
    <circle cx="${cx + 54}" cy="108" r="26" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
    <ellipse cx="${cx}" cy="140" rx="86" ry="26" fill="#F8FAFC"/>
    <path d="M${cx - 70} 140 q10 -12 20 0 M${cx - 36} 138 q10 -12 20 0 M${cx - 2} 138 q10 -12 20 0 M${cx + 32} 138 q10 -12 20 0" stroke="#CBD5E1" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M${cx - 44} 96 q8 -10 16 0 M${cx - 10} 88 q8 -10 16 0 M${cx + 24} 96 q8 -10 16 0" stroke="#CBD5E1" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>`;
}
