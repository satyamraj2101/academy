// Draws one video frame as an SVG string. The robot has no face on purpose: its "voice" is a row of
// sound bars on its chest driven by the real audio level, so there is no lip-sync to get wrong.
export const W = 1280;
export const H = 720;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Greedy word wrap by approximate glyph width (sans-serif averages ~0.55em).
export function wrap(text, fontSize, maxWidth) {
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * 0.55)));
  const lines = [];
  let line = '';
  for (const w of String(text).split(/\s+/)) {
    if (line && (line + ' ' + w).length > maxChars) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  if (line) lines.push(line);
  return lines;
}

// Which content items (bullets then diagram steps) are visible at local time lt, 0..1 opacity each.
function reveal(count, lt, dur) {
  const start = Math.min(0.6, dur * 0.1);
  const span = Math.max(1, dur * 0.7);
  return Array.from({ length: count }, (_, i) => clamp01((lt - (start + (i / Math.max(1, count)) * span)) / 0.4));
}

function robot(t, amp) {
  const cx = 200;
  const bob = Math.sin(t * 2.2) * 4;
  const wave = Math.sin(t * 1.6);
  const handX = cx + 150 + wave * 10, handY = 300 + bob + Math.cos(t * 1.6) * 12;
  const mult = [0.6, 1, 0.8, 1, 0.6];
  const bars = mult.map((m, i) => {
    const h = 8 + amp * 58 * m * (0.7 + 0.3 * Math.sin(t * 11 + i * 1.7));
    const x = cx - 50 + i * 20;
    return `<rect x="${x.toFixed(1)}" y="${(350 + bob - h / 2).toFixed(1)}" width="12" height="${h.toFixed(1)}" rx="6" fill="#FBBF24"/>`;
  }).join('');
  return `
  <ellipse cx="${cx}" cy="548" rx="92" ry="12" fill="#CBD5E1"/>
  <rect x="${cx - 52}" y="${470 + bob}" width="36" height="64" rx="10" fill="#1E40AF"/>
  <rect x="${cx + 16}" y="${470 + bob}" width="36" height="64" rx="10" fill="#1E40AF"/>
  <line x1="${cx - 80}" y1="${290 + bob}" x2="${cx - 112}" y2="${384 + bob}" stroke="#1E40AF" stroke-width="18" stroke-linecap="round"/>
  <rect x="${cx - 80}" y="${262 + bob}" width="160" height="214" rx="30" fill="#2563EB"/>
  <rect x="${cx - 62}" y="${306 + bob}" width="124" height="88" rx="16" fill="#0F172A"/>
  ${bars}
  <line x1="${cx + 80}" y1="${290 + bob}" x2="${handX.toFixed(1)}" y2="${handY.toFixed(1)}" stroke="#1E40AF" stroke-width="18" stroke-linecap="round"/>
  <circle cx="${handX.toFixed(1)}" cy="${handY.toFixed(1)}" r="14" fill="#3B82F6"/>
  <line x1="${cx}" y1="${130 + bob}" x2="${cx}" y2="${156 + bob}" stroke="#1E40AF" stroke-width="6" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${124 + bob}" r="9" fill="#FBBF24"/>
  <rect x="${cx - 64}" y="${154 + bob}" width="128" height="104" rx="28" fill="#2563EB"/>
  <rect x="${cx - 46}" y="${180 + bob}" width="92" height="46" rx="23" fill="#0F172A"/>
  <rect x="${cx - 30}" y="${201 + bob}" width="60" height="4" rx="2" fill="#38BDF8" opacity="${(0.5 + 0.4 * Math.sin(t * 3)).toFixed(2)}"/>`;
}

// scene: { slide: { title, bullets?, steps?, image? } }, lt: seconds into scene, dur: scene seconds, amp: 0..1 voice level
export function frameSvg(scene, lt, dur, amp, t) {
  const slide = scene.slide || {};
  const bullets = slide.bullets || [];
  const steps = (slide.steps || []).slice(0, 4);
  const vis = reveal(bullets.length + steps.length, lt, dur);

  let body = '';
  let y = 200;
  bullets.forEach((b, i) => {
    const o = vis[i].toFixed(2);
    const lines = wrap(b, 32, 740);
    body += `<g opacity="${o}" transform="translate(${((1 - vis[i]) * 24).toFixed(1)} 0)"><circle cx="452" cy="${y - 10}" r="7" fill="#2563EB"/>`;
    lines.forEach((ln, k) => { body += `<text x="476" y="${y + k * 40}" font-size="32" fill="#1E293B">${esc(ln)}</text>`; });
    body += '</g>';
    y += 40 * lines.length + 26;
  });

  if (steps.length) {
    const bw = 170, gap = 36, total = steps.length * bw + (steps.length - 1) * gap;
    const x0 = 400 + (840 - total) / 2, by = bullets.length ? Math.max(y + 20, 380) : 270;
    steps.forEach((s, i) => {
      const v = vis[bullets.length + i], x = x0 + i * (bw + gap);
      body += `<g opacity="${v.toFixed(2)}"><rect x="${x}" y="${by}" width="${bw}" height="84" rx="16" fill="#EFF6FF" stroke="#2563EB" stroke-width="2"/>`;
      wrap(s, 26, bw - 20).slice(0, 2).forEach((ln, k, a) => { body += `<text x="${x + bw / 2}" y="${by + 42 + (k - (a.length - 1) / 2) * 30}" font-size="26" text-anchor="middle" dominant-baseline="central" fill="#1E3A8A">${esc(ln)}</text>`; });
      body += '</g>';
      if (i < steps.length - 1) body += `<path opacity="${v.toFixed(2)}" d="M${x + bw + 6} ${by + 42} L${x + bw + gap - 8} ${by + 42}" stroke="#2563EB" stroke-width="3" fill="none" stroke-linecap="round"/><path opacity="${v.toFixed(2)}" d="M${x + bw + gap - 16} ${by + 34} L${x + bw + gap - 6} ${by + 42} L${x + bw + gap - 16} ${by + 50}" stroke="#2563EB" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="DejaVu Sans, Inter, Arial, sans-serif">
  <rect width="${W}" height="${H}" fill="#F1F5F9"/>
  ${robot(t, amp)}
  <rect x="400" y="50" width="840" height="530" rx="26" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <text x="440" y="118" font-size="44" font-weight="bold" fill="#0F172A">${esc(slide.title || '')}</text>
  <rect x="440" y="136" width="72" height="5" rx="2.5" fill="#2563EB"/>
  ${body}
  <text x="40" y="690" font-size="22" fill="#94A3B8">SpotCLM Academy</text>
</svg>`;
}
