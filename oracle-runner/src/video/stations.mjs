// The campus: small pieces of scenery behind Soomy, one per station. Each station is a short prop set on a floor pad plus a
// name plate; a lesson picks one with `"station": "<id>"`. They share Soomy's gradients (defined in robot.mjs) and sit in
// the left column, behind the characters, so the slide card keeps all the room it needs.
import { cometMark } from './brand.mjs';

export const STATIONS = {
  frontdesk: { name: 'Front desk' },
  hub: { name: 'Lifecycle map' },
  draft: { name: 'Drafting bench' },
  review: { name: 'Review table' },
  approve: { name: 'Approval gate' },
  sign: { name: 'Signing pen' },
  track: { name: 'Archive and alerts' },
  checkpoint: { name: 'Check point' },
};
export const stationName = (id) => STATIONS[id]?.name || id;

const pad = `<rect x="12" y="546" width="376" height="16" rx="8" fill="#DCE6F3"/><rect x="12" y="546" width="376" height="5" rx="2.5" fill="#FFFFFF" fill-opacity="0.8"/>`;
const plate = (label) => {
  const w = Math.round(label.length * 8.4 + 48);
  return `<g><rect x="${392 - w}" y="70" width="${w}" height="32" rx="16" fill="#0D1F4A"/><circle cx="${392 - w + 18}" cy="86" r="4.5" fill="#5BC8F5"/><text x="${392 - w + 30}" y="86" font-size="14" font-weight="600" fill="#FFFFFF" dominant-baseline="central">${label}</text></g>`;
};
const paper = (x, y, w, h, rot, lines = 3) => `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#FFFFFF" stroke="#B5C7DD" stroke-width="1.5"/>${Array.from({ length: lines }, (_, i) => `<rect x="${x + 6}" y="${y + 8 + i * 8}" width="${w - 12 - (i % 2) * 8}" height="3" rx="1.5" fill="#CBD5E1"/>`).join('')}</g>`;
const leaf = (x, y, rot) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="22" fill="#34B79A" transform="rotate(${rot} ${x} ${y + 18})"/>`;

// Layout rule: one TALL prop on the right (x 296-390), where Soomy stands clear of it and Indoo only hides its foot, plus a
// small floor piece on the left. Everything sits behind the characters.
const ART = {
  frontdesk: () => `
    <rect x="344" y="326" width="7" height="220" rx="3" fill="#9FB3CC"/><rect x="302" y="330" width="92" height="58" rx="10" fill="url(#navy)"/>${cometMark(348, 350, 12, { dark: true, id: 'cmBanner' })}<rect x="318" y="368" width="60" height="5" rx="2.5" fill="#5BC8F5"/>
    <rect x="306" y="500" width="40" height="46" rx="9" fill="#1246A0"/>${leaf(326, 470, -20)}${leaf(314, 462, -50)}${leaf(338, 462, 18)}${leaf(326, 440, 0)}
    <rect x="12" y="488" width="92" height="58" rx="12" fill="url(#shell)" stroke="#B5C7DD" stroke-width="2"/><rect x="6" y="478" width="104" height="14" rx="7" fill="url(#navy)"/><path d="M48 478 a11 11 0 0 1 22 0z" fill="#F59E0B"/><rect x="44" y="476" width="30" height="4" rx="2" fill="#B45309"/>
    ${plate('Front desk')}`,
  hub: () => `
    <rect x="334" y="400" width="24" height="146" rx="8" fill="url(#navy)"/><rect x="318" y="536" width="56" height="12" rx="6" fill="#12326F"/>
    <ellipse cx="346" cy="372" rx="48" ry="13" fill="#22D3EE" fill-opacity="0.2" stroke="#5BC8F5" stroke-width="2"/>
    ${[0, 1, 2, 3, 4, 5].map(i => { const a = (i / 6) * Math.PI * 2 - 1.2, x = 346 + Math.cos(a) * 42, y = 372 + Math.sin(a) * 10; return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - 28 - i * 4).toFixed(1)}" stroke="#5BC8F5" stroke-opacity="0.5" stroke-width="2"/><circle cx="${x.toFixed(1)}" cy="${(y - 28 - i * 4).toFixed(1)}" r="7" fill="${i === 0 ? '#2563EB' : '#8FE3FF'}"/>`; }).join('')}
    <rect x="14" y="492" width="86" height="54" rx="12" fill="url(#navy)"/><rect x="26" y="482" width="62" height="14" rx="7" fill="#12326F"/>
    ${plate('Lifecycle map')}`,
  draft: () => `
    <path d="M308 546 L326 400 M368 546 L350 400 M338 420 V546" stroke="#9FB3CC" stroke-width="7" stroke-linecap="round" fill="none"/>
    <g transform="rotate(-6 346 400)"><rect x="304" y="338" width="84" height="104" rx="8" fill="#FFFFFF" stroke="#B5C7DD" stroke-width="2.5"/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="314" y="${352 + i * 12}" width="${i % 3 === 2 ? 40 : 62}" height="4" rx="2" fill="${i === 0 ? '#2563EB' : '#CBD5E1'}"/>`).join('')}</g>
    ${paper(14, 506, 54, 20, -4, 1)}${paper(20, 496, 54, 20, 3, 1)}${paper(14, 516, 60, 22, -2, 1)}<rect x="12" y="534" width="70" height="12" rx="6" fill="url(#navy)"/>
    ${plate('Drafting bench')}`,
  review: () => `
    <rect x="338" y="440" width="9" height="106" rx="4" fill="#9FB3CC"/><rect x="316" y="536" width="54" height="12" rx="6" fill="url(#navy)"/>
    <circle cx="342" cy="392" r="44" fill="#8FE3FF" fill-opacity="0.25" stroke="#0D1F4A" stroke-width="10"/><path d="M334 358 q14 -8 30 2" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="5" stroke-linecap="round"/>
    <path d="M326 384 l10 10 l20 -22" stroke="#2563EB" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="12" y="486" width="94" height="14" rx="7" fill="url(#navy)"/><rect x="22" y="500" width="10" height="46" rx="4" fill="#9FB3CC"/><rect x="86" y="500" width="10" height="46" rx="4" fill="#9FB3CC"/>${paper(30, 454, 46, 34, -5, 2)}
    ${plate('Review table')}`,
  approve: () => `
    <rect x="16" y="396" width="24" height="150" rx="8" fill="url(#navy)"/><rect x="352" y="330" width="26" height="216" rx="8" fill="url(#navy)"/>
    <path d="M28 396 Q120 330 352 336" fill="none" stroke="#12326F" stroke-width="12" stroke-linecap="round"/>
    <circle cx="326" cy="408" r="30" fill="#FFFFFF" stroke="#2563EB" stroke-width="6"/><path d="M312 408 l10 11 l19 -23" stroke="#2563EB" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="40" y="492" width="34" height="9" rx="4.5" fill="#5BC8F5"/><rect x="40" y="510" width="34" height="9" rx="4.5" fill="#5BC8F5" fill-opacity="0.5"/>
    ${plate('Approval gate')}`,
  sign: () => `
    <g transform="rotate(14 346 420)"><rect x="332" y="300" width="28" height="170" rx="14" fill="url(#navy)"/><rect x="332" y="300" width="28" height="44" rx="14" fill="#5BC8F5"/><path d="M332 470 l14 34 l14 -34z" fill="#E2EAF4" stroke="#9FB3CC" stroke-width="2"/></g>
    <rect x="306" y="502" width="84" height="44" rx="10" fill="url(#navy)"/>${paper(318, 478, 58, 30, -3, 1)}<path d="M326 498 q6 -12 12 0 t12 0 t12 0" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="12" y="500" width="76" height="46" rx="10" fill="url(#shell)" stroke="#B5C7DD" stroke-width="2"/>
    ${plate('Signing pen')}`,
  track: () => `
    <rect x="298" y="344" width="92" height="202" rx="12" fill="url(#shell)" stroke="#B5C7DD" stroke-width="2"/>
    ${[0, 1, 2].map(i => `<rect x="308" y="${404 + i * 46}" width="72" height="38" rx="8" fill="#EAF1F9" stroke="#CBD5E1" stroke-width="1.5"/><rect x="332" y="${420 + i * 46}" width="24" height="6" rx="3" fill="#0D1F4A"/>`).join('')}
    <rect x="308" y="352" width="72" height="44" rx="8" fill="#FFFFFF" stroke="#B5C7DD" stroke-width="1.5"/><rect x="308" y="352" width="72" height="14" rx="7" fill="#0D1F4A"/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${322 + (i % 3) * 22}" cy="${376 + Math.floor(i / 3) * 12}" r="3.2" fill="${i === 4 ? '#2563EB' : '#CBD5E1'}"/>`).join('')}
    <path d="M358 336 a16 16 0 0 1 32 0z" fill="#F59E0B"/><circle cx="374" cy="338" r="3.5" fill="#B45309"/>
    <rect x="12" y="500" width="72" height="46" rx="10" fill="url(#navy)"/><rect x="24" y="514" width="48" height="6" rx="3" fill="#5BC8F5"/>
    ${plate('Archive and alerts')}`,
  checkpoint: () => `
    <path d="M308 546 L318 440 H378 L388 546z" fill="url(#navy)"/>
    <rect x="296" y="346" width="94" height="84" rx="12" fill="url(#navy)" transform="rotate(-5 343 388)"/><rect x="303" y="353" width="80" height="70" rx="7" fill="#0B1733" transform="rotate(-5 343 388)"/>
    <text x="343" y="390" font-size="58" font-weight="800" fill="#8FE3FF" text-anchor="middle" dominant-baseline="central" transform="rotate(-5 343 388)">?</text>
    ${['A', 'B', 'C'].map((l, i) => `<circle cx="${26 + i * 28}" cy="520" r="13" fill="#2563EB"/><text x="${26 + i * 28}" y="520" font-size="14" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">${l}</text>`).join('')}
    ${plate('Check point')}`,
};

// fade/slide are used by the travel scene so one station can leave while the next arrives.
export function stationSvg(id, { plate: withPlate = true } = {}) {
  const art = ART[id];
  if (!art) return '';
  const svg = art();
  return `<g>${pad}${withPlate ? svg : svg.replace(/<g><rect x="\d+" y="70"[\s\S]*?<\/g>\s*$/, '')}</g>`;
}
