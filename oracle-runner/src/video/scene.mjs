// Draws one video frame as SVG. Layouts: hook, bullets, steps, compare, quiz, recap. Every item can name the
// words it should appear on (`at`), so visuals land when the narrator says them instead of at fixed times.
import { robot, indooEye } from './robot.mjs';
import { lockup } from './brand.mjs';

export const W = 1280;
export const H = 720;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const norm = (arr) => (arr || []).map(x => (typeof x === 'string' ? { text: x } : x));
const PX = 440, PW = 760, CX = 820; // panel inner left edge, inner width, panel centre

export function wrap(text, fontSize, maxWidth) {
  const maxChars = Math.max(6, Math.floor(maxWidth / (fontSize * 0.58)));
  const lines = [];
  let line = '';
  for (const w of String(text).split(/\s+/)) {
    if (line && (line + ' ' + w).length > maxChars) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  if (line) lines.push(line);
  return lines;
}

// Where in the scene's audio a phrase is spoken. Scenes voiced in parts (split with "||" around a silent think
// pause) carry scene.parts = [{ text, start, dur }]; otherwise the whole narration is treated as one even stream.
function phraseTime(scene, phrase, dur) {
  const p = String(phrase).toLowerCase();
  if (scene.parts) {
    for (const part of scene.parts) {
      const k = part.text.toLowerCase().indexOf(p);
      if (k >= 0) return Math.max(0, part.start + (k / part.text.length) * part.dur - 0.2);
    }
    return -1;
  }
  const said = (scene.spoken || scene.narration || '').toLowerCase();
  const k = said.indexOf(p);
  return k >= 0 ? Math.max(0, (k / said.length) * dur - 0.2) : -1;
}

// Seconds (local to the scene) at which each item should appear.
export function itemTimes(scene, items, dur) {
  const start = Math.min(0.6, dur * 0.08), span = Math.max(1, dur * 0.72);
  return items.map((it, i) => {
    const t = it.at ? phraseTime(scene, it.at, dur) : -1;
    return t >= 0 ? t : start + (i / Math.max(1, items.length)) * span;
  });
}
export const timeOf = (scene, phrase, dur, fallback) => {
  const t = phrase ? phraseTime(scene, phrase, dur) : -1;
  return t >= 0 ? t : fallback;
};

// ----- Special points -----------------------------------------------------------------------------------------------
// An item flagged `highlight` (true, or a short note string) is lit by Indoo's eye-projector for a few seconds: a soft cone
// of light from her eyes, a glow around the item, and a "key point" banner when there is a note. Unflagged items are
// never highlighted, so the beam always means "this one matters".
export const HOLD = 3.6; // seconds a highlight stays lit
let T = {}; // item rectangles of the frame being drawn, filled by the layouts, keyed like "b0" (bullets), "s2" (steps)...

function itemLists(scene) {
  const s = scene.slide || {}, out = [];
  const layout = s.layout || 'bullets';
  if (layout === 'bullets') out.push(['b', norm(s.bullets)]);
  if (layout === 'steps') out.push(['s', norm(s.steps).slice(0, 6)]);
  if (layout === 'compare') { out.push(['l', norm(s.compare?.left?.items)]); out.push(['r', norm(s.compare?.right?.items)]); }
  if (layout === 'recap') out.push(['t', norm(s.takeaways)]);
  return out;
}
export function highlights(scene, dur) {
  const out = [], layout = scene.slide?.layout || 'bullets';
  for (const [k, items] of itemLists(scene)) {
    const ts = itemTimes(scene, items, dur);
    items.forEach((it, i) => {
      if (!it.highlight) return;
      const note = typeof it.highlight === 'string' ? it.highlight : it.note || null;
      out.push({ key: `${k}${i}`, t0: ts[i], t1: ts[i] + HOLD, note, layout });
    });
  }
  return out;
}

function spotlight(scene, lt, dur, events) {
  const hl = highlights(scene, dur).find(h => lt >= h.t0 && lt <= h.t1 && T[h.key]);
  if (!hl) return { beam: '', svg: '', k: 0 };
  const r = T[hl.key], k = Math.min(ease((lt - hl.t0) / 0.35), ease((hl.t1 - lt) / 0.35));
  const eye = indooEye(lt, events);
  const tx = hl.layout === 'steps' ? r.x + r.w / 2 : r.x - 4, ty = hl.layout === 'steps' ? r.y + r.h : r.y + r.h / 2;
  const dx = tx - eye.x, dy = ty - eye.y, n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n, wEnd = 16, wStart = 3;
  const pulse = 0.82 + 0.18 * Math.sin(lt * 7);
  // The cone is drawn under the slide's text (so words stay crisp even when the light crosses them); the glow and banner sit on top.
  const beam = `<g opacity="${(k * 0.95).toFixed(2)}">
    <defs><linearGradient id="beam" gradientUnits="userSpaceOnUse" x1="${eye.x.toFixed(1)}" y1="${eye.y.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}"><stop offset="0" stop-color="#8FE3FF" stop-opacity="0.75"/><stop offset="1" stop-color="#22D3EE" stop-opacity="0.22"/></linearGradient></defs>
    <polygon points="${(eye.x + nx * wStart).toFixed(1)},${(eye.y + ny * wStart).toFixed(1)} ${(tx + nx * wEnd).toFixed(1)},${(ty + ny * wEnd).toFixed(1)} ${(tx - nx * wEnd).toFixed(1)},${(ty - ny * wEnd).toFixed(1)} ${(eye.x - nx * wStart).toFixed(1)},${(eye.y - ny * wStart).toFixed(1)}" fill="url(#beam)"/></g>`;
  let svg = `<g opacity="${(k * 0.95).toFixed(2)}"><rect x="${r.x - 10}" y="${r.y - 8}" width="${r.w + 20}" height="${r.h + 16}" rx="18" fill="#22D3EE" fill-opacity="${(0.1 * pulse).toFixed(2)}" stroke="#22D3EE" stroke-width="3.5" stroke-opacity="${pulse.toFixed(2)}"/></g>`;
  if (hl.note && (hl.layout === 'bullets' || hl.layout === 'steps')) {
    const lines = wrap(hl.note, 22, PW - 120).slice(0, 2), h = 30 + lines.length * 28, y = 560 - h;
    svg += `<g opacity="${k.toFixed(2)}" transform="translate(0 ${((1 - k) * 14).toFixed(1)})"><rect x="${PX}" y="${y}" width="${PW}" height="${h}" rx="16" fill="#ECFEFF" stroke="#22D3EE" stroke-width="2.5"/>
      <path d="M${PX + 30} ${y + h / 2 - 12} l4.4 9 l9.8 1.4 l-7.1 6.9 l1.7 9.8 l-8.8 -4.6 l-8.8 4.6 l1.7 -9.8 l-7.1 -6.9 l9.8 -1.4z" fill="#0891B2"/>
      <text x="${PX + 62}" y="${y + 24}" font-size="14" font-weight="700" fill="#0E7490">KEY POINT</text>`;
    lines.forEach((ln, i) => { svg += `<text x="${PX + 62}" y="${y + 48 + i * 28}" font-size="22" fill="#164E63">${esc(ln)}</text>`; });
    svg += '</g>';
  }
  return { beam, svg, k };
}

const header = (title) => `<text x="${PX}" y="118" font-size="44" font-weight="bold" fill="#0F172A">${esc(title || '')}</text><rect x="${PX}" y="136" width="72" height="5" rx="2.5" fill="#2563EB"/>`;

function hook(scene, lt, dur) {
  const s = scene.slide, e = ease(lt / 0.6);
  const sub = timeOf(scene, s.subAt, dur, dur * 0.5);
  const kick = timeOf(scene, s.kickerAt, dur, 0.4);
  return `<text x="${CX}" y="190" font-size="30" fill="#2563EB" font-weight="bold" text-anchor="middle" opacity="${ease((lt - kick) / 0.4).toFixed(2)}">${esc(s.kicker || '')}</text>
  <g transform="translate(${CX} 320) scale(${(0.88 + 0.12 * e).toFixed(3)}) translate(${-CX} -320)" opacity="${e.toFixed(2)}">
    <text x="${CX}" y="330" font-size="${Math.min(104, Math.floor(740 / (String(s.title).length * 0.6)))}" font-weight="bold" fill="#0F172A" text-anchor="middle">${esc(s.title)}</text></g>
  <rect x="${CX - 40}" y="360" width="80" height="6" rx="3" fill="#2563EB" opacity="${e.toFixed(2)}"/>
  <text x="${CX}" y="440" font-size="40" fill="#475569" text-anchor="middle" opacity="${ease((lt - sub) / 0.5).toFixed(2)}">${esc(s.subtitle || '')}</text>`;
}

function bullets(scene, lt, dur) {
  const items = norm(scene.slide.bullets), ts = itemTimes(scene, items, dur);
  let y = 214, out = header(scene.slide.title);
  items.forEach((b, i) => {
    const v = ease((lt - ts[i]) / 0.4), lines = wrap(b.text, 34, 700);
    T['b' + i] = { x: PX - 8, y: y - 36, w: PW - 24, h: 42 * (lines.length - 1) + 50 };
    out += `<g opacity="${v.toFixed(2)}" transform="translate(${((1 - v) * 28).toFixed(1)} 0)"><circle cx="${PX + 12}" cy="${y - 11}" r="8" fill="#2563EB"/>`;
    lines.forEach((ln, k) => { out += `<text x="${PX + 40}" y="${y + k * 42}" font-size="34" fill="#1E293B">${esc(ln)}</text>`; });
    out += '</g>';
    y += 42 * lines.length + 34;
  });
  return out;
}

function steps(scene, lt, dur) {
  const items = norm(scene.slide.steps).slice(0, 6), ts = itemTimes(scene, items, dur), n = items.length;
  const gap = 18, bw = (PW - (n - 1) * gap) / n, by = 200, bh = 110, fs = n > 5 ? 19 : 24;
  let active = -1;
  ts.forEach((t, i) => { if (lt >= t) active = i; });
  let out = header(scene.slide.title);
  items.forEach((s, i) => {
    const x = PX + i * (bw + gap), isActive = i === active, past = i < active;
    T['s' + i] = { x, y: by, w: bw, h: bh };
    const fill = isActive ? '#2563EB' : past ? '#DBEAFE' : '#F1F5F9', stroke = isActive || past ? '#2563EB' : '#CBD5E1';
    const txt = isActive ? '#FFFFFF' : past ? '#1E3A8A' : '#64748B';
    const grow = isActive ? 1 + 0.05 * ease((lt - ts[i]) / 0.3) : 1;
    out += `<g transform="translate(${x + bw / 2} ${by + bh / 2}) scale(${grow.toFixed(3)}) translate(${-(x + bw / 2)} ${-(by + bh / 2)})" opacity="${(i <= active ? 1 : 0.7).toFixed(2)}">
      <rect x="${x}" y="${by}" width="${bw}" height="${bh}" rx="18" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
      <circle cx="${x + 24}" cy="${by + 24}" r="13" fill="${isActive ? '#FFFFFF' : '#CBD5E1'}"/><text x="${x + 24}" y="${by + 24}" font-size="15" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="${isActive ? '#2563EB' : '#475569'}">${i + 1}</text>`;
    wrap(s.text, fs, bw - 14).slice(0, 2).forEach((ln, k, a) => { out += `<text x="${x + bw / 2}" y="${by + 68 + (k - (a.length - 1) / 2) * 28}" font-size="${fs}" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="${txt}">${esc(ln)}</text>`; });
    out += '</g>';
  });
  if (active >= 0 && items[active].desc) {
    const v = ease((lt - ts[active]) / 0.35);
    out += `<g opacity="${v.toFixed(2)}"><rect x="${PX}" y="346" width="${PW}" height="142" rx="18" fill="#EFF6FF"/><text x="${PX + 28}" y="392" font-size="22" font-weight="bold" fill="#2563EB">${esc(items[active].text)}</text>`;
    wrap(items[active].desc, 30, PW - 56).slice(0, 2).forEach((ln, k) => { out += `<text x="${PX + 28}" y="${430 + k * 36}" font-size="30" fill="#1E293B">${esc(ln)}</text>`; });
    out += '</g>';
  }
  return out;
}

function compare(scene, lt, dur) {
  const c = scene.slide.compare, e = ease(lt / 0.5);
  const cols = [
    { pre: 'l', d: c.left, x: PX, fill: '#FEF2F2', stroke: '#FCA5A5', head: '#B91C1C', icon: 'x' },
    { pre: 'r', d: c.right, x: PX + PW / 2 + 20, fill: '#EFF6FF', stroke: '#93C5FD', head: '#1D4ED8', icon: 'check' },
  ];
  let out = header(scene.slide.title);
  cols.forEach(({ pre, d, x, fill, stroke, head, icon }) => {
    const items = norm(d.items), ts = itemTimes(scene, items, dur), w = PW / 2 - 20;
    out += `<g opacity="${e.toFixed(2)}"><rect x="${x}" y="166" width="${w}" height="372" rx="22" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/><text x="${x + 24}" y="212" font-size="30" font-weight="bold" fill="${head}">${esc(d.title)}</text></g>`;
    let y = 276;
    items.forEach((it, i) => {
      const v = ease((lt - ts[i]) / 0.4), lines = wrap(it.text, 26, w - 84);
      T[pre + i] = { x: x + 12, y: y - 30, w: w - 24, h: 32 * (lines.length - 1) + 44 };
      const ic = icon === 'x'
        ? `<circle cx="${x + 38}" cy="${y - 8}" r="15" fill="#DC2626"/><path d="M${x + 31} ${y - 15} l14 14 M${x + 45} ${y - 15} l-14 14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`
        : `<circle cx="${x + 38}" cy="${y - 8}" r="15" fill="#2563EB"/><path d="M${x + 30} ${y - 8} l6 7 l10 -13" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      out += `<g opacity="${v.toFixed(2)}" transform="translate(${((1 - v) * (icon === 'x' ? -20 : 20)).toFixed(1)} 0)">${ic}`;
      lines.forEach((ln, k) => { out += `<text x="${x + 66}" y="${y + k * 32}" font-size="26" fill="#1E293B">${esc(ln)}</text>`; });
      out += '</g>';
      y += 32 * lines.length + 38;
    });
  });
  return out;
}

function quiz(scene, lt, dur) {
  const q = scene.slide.quiz, opts = q.options.map(text => ({ text, at: null }));
  q.optionsAt?.forEach((a, i) => { if (opts[i]) opts[i].at = a; });
  const ts = itemTimes(scene, opts, dur);
  const ansT = timeOf(scene, q.answerAt, dur, dur * 0.8), thinkFrom = Math.max(...ts) + 0.8;
  const revealed = lt >= ansT;
  let out = header(scene.slide.title || 'Quick check');
  wrap(q.question, 32, PW).slice(0, 3).forEach((ln, k) => { out += `<text x="${PX}" y="${196 + k * 40}" font-size="32" font-weight="bold" fill="#1E293B">${esc(ln)}</text>`; });
  const y0 = 300;
  opts.forEach((o, i) => {
    const v = ease((lt - ts[i]) / 0.4), y = y0 + i * 84, correct = i === q.answer;
    let fill = '#F8FAFC', stroke = '#CBD5E1', tc = '#1E293B', op = v;
    if (revealed) { if (correct) { fill = '#DCFCE7'; stroke = '#16A34A'; } else op = v * 0.35; }
    out += `<g opacity="${op.toFixed(2)}" transform="translate(${((1 - v) * 24).toFixed(1)} 0)"><rect x="${PX}" y="${y}" width="${PW}" height="68" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
      <circle cx="${PX + 40}" cy="${y + 34}" r="20" fill="${revealed && correct ? '#16A34A' : '#2563EB'}"/><text x="${PX + 40}" y="${y + 34}" font-size="22" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">${'ABC'[i]}</text>
      <text x="${PX + 76}" y="${y + 34}" font-size="28" fill="${tc}" dominant-baseline="central">${esc(o.text)}</text>`;
    if (revealed && correct) out += `<path d="M${PX + PW - 56} ${y + 34} l10 11 l18 -22" stroke="#16A34A" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    out += '</g>';
  });
  if (lt >= thinkFrom - 0.3 && !revealed) {
    const frac = clamp01((lt - thinkFrom) / Math.max(0.5, ansT - thinkFrom)), r = 31, C = 2 * Math.PI * r;
    out += `<g transform="translate(${PX + PW - 34} 96)"><circle r="${r}" fill="none" stroke="#E2E8F0" stroke-width="7"/><circle r="${r}" fill="none" stroke="#2563EB" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * frac).toFixed(1)}" transform="rotate(-90)"/><text y="1" font-size="12" font-weight="700" fill="#2563EB" text-anchor="middle" dominant-baseline="central">THINK</text></g>`;
  }
  return out;
}

function recap(scene, lt, dur) {
  const items = norm(scene.slide.takeaways), ts = itemTimes(scene, items, dur);
  let y = 226, out = header(scene.slide.title || 'Recap');
  items.forEach((it, i) => {
    const v = ease((lt - ts[i]) / 0.4), lines = wrap(it.text, 32, PW - 90);
    T['t' + i] = { x: PX - 8, y: y - 38, w: PW - 4, h: 40 * (lines.length - 1) + 54 };
    out += `<g opacity="${v.toFixed(2)}" transform="translate(${((1 - v) * 28).toFixed(1)} 0)"><circle cx="${PX + 24}" cy="${y - 10}" r="22" fill="#2563EB"/><text x="${PX + 24}" y="${y - 10}" font-size="24" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`;
    lines.forEach((ln, k) => { out += `<text x="${PX + 66}" y="${y + k * 40}" font-size="32" fill="#1E293B">${esc(ln)}</text>`; });
    out += '</g>';
    y += 40 * lines.length + 40;
  });
  if (scene.slide.next) {
    const v = ease((lt - timeOf(scene, scene.slide.nextAt, dur, dur * 0.8)) / 0.5);
    out += `<g opacity="${v.toFixed(2)}"><rect x="${PX}" y="470" width="${PW}" height="64" rx="32" fill="#2563EB"/><text x="${CX}" y="502" font-size="26" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">Next: ${esc(scene.slide.next)}</text></g>`;
  }
  return out;
}

const LAYOUTS = { hook, bullets, steps, compare, quiz, recap };

// Frames are scene-local (lt = seconds into the scene) so a scene renders identically wherever it sits in the video,
// which is what lets edited videos reuse every unchanged scene. Progress and chapters belong to the player.
export function frameSvg(scene, lt, dur, wave) {
  const layout = LAYOUTS[scene.slide.layout || 'bullets'] || bullets;
  const e = ease(lt / 0.35);
  T = {};
  const content = layout(scene, lt, dur);
  const spot = spotlight(scene, lt, dur, scene.events || []);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter">
  <rect width="${W}" height="${H}" fill="#F1F5F9"/>
  ${robot(lt, wave, scene.gesture, scene.events || [], spot)}
  <rect x="400" y="50" width="840" height="530" rx="26" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  ${spot.beam}
  <g opacity="${e.toFixed(2)}" transform="translate(${((1 - e) * 30).toFixed(1)} 0)">${content}</g>
  ${spot.svg}
  ${lockup(40, 664, 0.36, { id: 'lkFoot' })}<text x="138" y="684" font-size="17" font-weight="600" fill="#64748B">Academy</text>
</svg>`;
}
