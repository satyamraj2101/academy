// The SpotCLM "counsel" robot: a faceless lawyer in a navy suit. Its visor is a small oscilloscope that
// draws the real audio waveform, so it looks like it is speaking without any lip-sync. A gold-framed
// pair of glasses, a blue tie, a briefcase and a "SpotCLM" pocket badge (doubles as a watermark).
export const WAVE_POINTS = 48;

const GESTURES = {
  point: (t, bob) => ({ x: 350 + Math.sin(t * 1.6) * 10, y: 300 + bob + Math.cos(t * 1.6) * 12 }),
  raise: (t, bob) => ({ x: 312 + Math.sin(t * 2.4) * 8, y: 190 + bob + Math.cos(t * 2.4) * 10 }),
  present: (t, bob) => ({ x: 366, y: 346 + bob + Math.sin(t * 1.8) * 6 }),
};

// wave: Float32Array(WAVE_POINTS) of -1..1 samples around "now".
export function robot(t, wave, gesture = 'point') {
  const cx = 200;
  const bob = Math.sin(t * 2.2) * 4;
  const hand = (GESTURES[gesture] || GESTURES.point)(t, bob);

  const x0 = cx - 42, span = 84, mid = 202 + bob;
  const pts = Array.from(wave, (v, i) => `${(x0 + (i / (WAVE_POINTS - 1)) * span).toFixed(1)},${(mid - v * 21).toFixed(1)}`).join(' ');

  return `
  <ellipse cx="${cx}" cy="548" rx="100" ry="12" fill="#CBD5E1"/>
  <rect x="${cx - 52}" y="${470 + bob}" width="36" height="56" rx="8" fill="#0F172A"/>
  <rect x="${cx + 16}" y="${470 + bob}" width="36" height="56" rx="8" fill="#0F172A"/>
  <rect x="${cx - 62}" y="524" width="54" height="16" rx="8" fill="#020617"/>
  <rect x="${cx + 8}" y="524" width="54" height="16" rx="8" fill="#020617"/>

  <line x1="${cx - 80}" y1="${292 + bob}" x2="${cx - 104}" y2="${382 + bob}" stroke="#1E293B" stroke-width="22" stroke-linecap="round"/>
  <path d="M${cx - 118} ${404 + bob} v-14 h28 v14" fill="none" stroke="#78350F" stroke-width="5" stroke-linejoin="round"/>
  <rect x="${cx - 146}" y="${404 + bob}" width="84" height="58" rx="9" fill="#92400E"/>
  <rect x="${cx - 146}" y="${428 + bob}" width="84" height="4" fill="#78350F"/>
  <rect x="${cx - 110}" y="${424 + bob}" width="12" height="12" rx="2" fill="#D4A017"/>
  <circle cx="${cx - 104}" cy="${384 + bob}" r="12" fill="#E2E8F0"/>

  <rect x="${cx - 80}" y="${262 + bob}" width="160" height="214" rx="30" fill="#1E293B"/>
  <polygon points="${cx - 32},${262 + bob} ${cx + 32},${262 + bob} ${cx},${344 + bob}" fill="#F8FAFC"/>
  <line x1="${cx - 32}" y1="${262 + bob}" x2="${cx - 4}" y2="${356 + bob}" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/>
  <line x1="${cx + 32}" y1="${262 + bob}" x2="${cx + 4}" y2="${356 + bob}" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/>
  <polygon points="${cx - 9},${266 + bob} ${cx + 9},${266 + bob} ${cx + 6},${286 + bob} ${cx - 6},${286 + bob}" fill="#2563EB"/>
  <polygon points="${cx - 6},${286 + bob} ${cx + 6},${286 + bob} ${cx + 14},${364 + bob} ${cx},${382 + bob} ${cx - 14},${364 + bob}" fill="#2563EB"/>
  <line x1="${cx}" y1="${382 + bob}" x2="${cx}" y2="${470 + bob}" stroke="#0F172A" stroke-width="3"/>
  <circle cx="${cx - 52}" cy="${296 + bob}" r="5" fill="#D4A017"/>
  <rect x="${cx + 10}" y="${396 + bob}" width="66" height="26" rx="5" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
  <text x="${cx + 43}" y="${409 + bob}" font-size="11" font-weight="bold" fill="#2563EB" text-anchor="middle" dominant-baseline="central">SpotCLM</text>

  <line x1="${cx + 80}" y1="${292 + bob}" x2="${hand.x.toFixed(1)}" y2="${hand.y.toFixed(1)}" stroke="#1E293B" stroke-width="22" stroke-linecap="round"/>
  <circle cx="${hand.x.toFixed(1)}" cy="${hand.y.toFixed(1)}" r="13" fill="#E2E8F0"/>

  <line x1="${cx}" y1="${128 + bob}" x2="${cx}" y2="${156 + bob}" stroke="#94A3B8" stroke-width="6" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${124 + bob}" r="8" fill="#D4A017"/>
  <rect x="${cx - 76}" y="${190 + bob}" width="12" height="38" rx="6" fill="#94A3B8"/>
  <rect x="${cx + 64}" y="${190 + bob}" width="12" height="38" rx="6" fill="#94A3B8"/>
  <rect x="${cx - 66}" y="${154 + bob}" width="132" height="112" rx="32" fill="#E2E8F0" stroke="#94A3B8" stroke-width="2"/>
  <rect x="${cx - 52}" y="${174 + bob}" width="104" height="56" rx="16" fill="#0B1220"/>
  <line x1="${x0}" y1="${mid.toFixed(1)}" x2="${x0 + span}" y2="${mid.toFixed(1)}" stroke="#155E75" stroke-width="1.5" stroke-dasharray="3 4"/>
  <polyline points="${pts}" fill="none" stroke="#22D3EE" stroke-opacity="0.28" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  <polyline points="${pts}" fill="none" stroke="#67E8F9" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  <rect x="${cx - 56}" y="${170 + bob}" width="112" height="64" rx="19" fill="none" stroke="#D4A017" stroke-width="4"/>
  <rect x="${cx - 24}" y="${248 + bob}" width="48" height="6" rx="3" fill="#94A3B8"/>`;
}
