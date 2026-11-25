// SpotCLM brand marks, copied from the site's own logo (public/assets/brand/logo-lockup*.svg): the wordmark is
// Inter ExtraBold and the "o" is a comet ring. Colours are the site's navy/blue and the sky-blue comet tail.
export const BRAND = { navy: '#0D1F4A', blue: '#1246A0', mid: '#1460C8', sky: '#5BC8F5', ice: '#C0EAFF', wordSky: '#7DD3FC' };

const COMET = 'M 256 100 A 156 156 0 1 1 127 169 C 136 175 154 187 163 193 A 112 112 0 1 0 256 144 A 22 22 0 0 1 256 100 Z';

// Full lockup ("SpotCLM" with the comet ring). `dark` = for dark backgrounds. id must be unique per frame.
// Drawn inside a 262x64 box; (x, y) is the box's top-left, scale shrinks it.
export function lockup(x, y, scale, { dark = false, id = 'lk' } = {}) {
  const word = dark ? '#FFFFFF' : BRAND.navy, clm = dark ? BRAND.wordSky : BRAND.blue;
  const stops = dark
    ? ['#2A8FE0', '#5BC5F5', '#C0EAFF'] : [BRAND.navy.replace('0D1F4A', '0A2A6A'), '#1460C8', '#5BC8F5'];
  const t = (px, fill, s) => `<text x="${px}" y="47" font-family="Inter" font-size="45" font-weight="800" letter-spacing="-1.4" fill="${fill}" stroke="${fill}" stroke-width="4" stroke-linejoin="round">${s}</text>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <defs><linearGradient id="${id}" x1="145" y1="200" x2="270" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${stops[0]}"/><stop offset="0.42" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient></defs>
    ${t(4, word, 'Sp')}
    <g transform="translate(47.8 2) scale(0.122)"><path d="${COMET}" fill="url(#${id})"/><circle cx="256" cy="256" r="40" fill="none" stroke="${dark ? '#FFFFFF' : '#0A2A63'}" stroke-width="3.5" stroke-opacity="0.35"/><circle cx="256" cy="256" r="23" fill="${dark ? '#FFFFFF' : '#0A2A63'}"/></g>
    ${t(99, word, 't')}${t(120, clm, 'CLM')}
  </g>`;
}

// Comet ring on its own (e.g. on the companion robot). cx, cy = centre, r = visual radius.
export function cometMark(cx, cy, r, { dark = true, id = 'cm' } = {}) {
  const s = r / 156;
  return `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-256 -256)">
    <defs><linearGradient id="${id}" x1="145" y1="200" x2="270" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${dark ? '#2A8FE0' : '#0A2A6A'}"/><stop offset="0.45" stop-color="${dark ? '#5BC5F5' : '#1460C8'}"/><stop offset="1" stop-color="${dark ? '#C0EAFF' : '#5BC8F5'}"/></linearGradient></defs>
    <path d="${COMET}" fill="url(#${id})"/><circle cx="256" cy="256" r="23" fill="${dark ? '#FFFFFF' : '#0A2A63'}"/></g>`;
}
