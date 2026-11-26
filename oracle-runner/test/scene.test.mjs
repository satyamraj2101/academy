import test from 'node:test';
import assert from 'node:assert/strict';
import { frameSvg, highlights, HOLD } from '../src/video/scene.mjs';
import { WAVE_POINTS } from '../src/video/robot.mjs';
import { sceneEvents } from '../src/video/sfx.mjs';

const wave = new Float32Array(WAVE_POINTS);
const scene = {
  narration: 'One. Two. Three is special.', spoken: 'One. Two. Three is special.',
  slide: { layout: 'bullets', title: 'T', bullets: [{ text: 'One', at: 'one' }, { text: 'Two', at: 'two' }, { text: 'Three', at: 'three is special', highlight: 'This one matters.' }] },
};

test('only flagged items are highlighted', () => {
  const h = highlights(scene, 12);
  assert.equal(h.length, 1);
  assert.equal(h[0].key, 'b2');
  assert.equal(h[0].note, 'This one matters.');
  assert.ok(Math.abs(h[0].t1 - h[0].t0 - HOLD) < 1e-9);
});
test('the beam, glow and key-point banner are drawn only while the highlight is active', () => {
  const t0 = highlights(scene, 12)[0].t0;
  const on = frameSvg(scene, t0 + 1, 12, wave), before = frameSvg(scene, Math.max(0, t0 - 1), 12, wave), after = frameSvg(scene, t0 + HOLD + 1, 12, wave);
  assert.ok(on.includes('id="beam"') && on.includes('KEY POINT') && on.includes('This one matters.'));
  assert.ok(!before.includes('id="beam"') && !after.includes('id="beam"'));
});
test('a scene with no flags never shows a beam', () => {
  const plain = { ...scene, slide: { ...scene.slide, bullets: scene.slide.bullets.map(({ highlight, ...b }) => b) } };
  for (const t of [0.5, 3, 6, 9]) assert.ok(!frameSvg(plain, t, 12, wave).includes('id="beam"'));
});
test('a highlight earns Indoo a notice chirp', () => {
  assert.ok(sceneEvents(scene, 12).some(e => e.sound === 'notice'));
});
test('steps, compare and recap rectangles are found for highlights too', () => {
  const steps = { narration: 'a b c', slide: { layout: 'steps', title: 'S', steps: [{ text: 'A' }, { text: 'B', highlight: true }, { text: 'C' }] } };
  const t0 = highlights(steps, 10)[0].t0;
  assert.ok(frameSvg(steps, t0 + 1, 10, wave).includes('id="beam"'));
  const cmp = { narration: 'a b', slide: { layout: 'compare', title: 'C', compare: { left: { title: 'L', items: [{ text: 'x', highlight: true }] }, right: { title: 'R', items: [{ text: 'y' }] } } } };
  assert.ok(frameSvg(cmp, highlights(cmp, 10)[0].t0 + 1, 10, wave).includes('id="beam"'));
});

import { STATIONS, stationSvg } from '../src/video/stations.mjs';
import { travelSvg } from '../src/video/travel.mjs';

test('every station draws props and a name plate, and the plate can be left out for the ship ride', () => {
  for (const [id, { name }] of Object.entries(STATIONS)) {
    const full = stationSvg(id), bare = stationSvg(id, { plate: false });
    assert.ok(full.length > 500 && full.includes(name), id);
    assert.ok(!bare.includes(`>${name}</text>`) && bare.length < full.length, `${id} bare`);
  }
  assert.equal(stationSvg('nowhere'), '');
});
test('a scene with a station draws it; one without does not', () => {
  const withStation = { ...scene, station: 'review' }, without = { ...scene };
  assert.ok(frameSvg(withStation, 1, 12, wave).includes('Review table'));
  assert.ok(!frameSvg(without, 1, 12, wave).includes('Review table'));
});
test('the ship ride shows the destination, the route and the SpotCLM ship', () => {
  const stops = [{ id: 'frontdesk', name: 'Front desk' }, { id: 'review', name: 'Review table' }];
  for (const t of [0, 1.1, 2.2]) {
    const svg = travelSvg({ from: 'frontdesk', to: 'review' }, t, 2.2, stops);
    assert.ok(svg.includes('Next stop') && svg.includes('Review table') && svg.includes('Front desk') && svg.includes('lkShip'));
  }
});

// ---- text that is longer than the hand-made samples: it must fit the card instead of running off it
import { fitTitle, layoutBullets, wrap } from '../src/video/scene.mjs';

test('a short title keeps full size and a long one shrinks to fit', () => {
  assert.deepEqual(fitTitle('Why CLM'), { text: 'Why CLM', fs: 44 });
  const mid = fitTitle('Defining Contract Lifecycle Management');
  assert.ok(mid.fs < 44 && mid.fs >= 30);
  assert.equal(mid.text, 'Defining Contract Lifecycle Management');
});

test('a title too long even at the smallest size is cut at a word with an ellipsis', () => {
  const t = fitTitle('Integrating CLM with Enterprise Systems for Holistic Management and Reporting Across Teams');
  assert.equal(t.fs, 30);
  assert.ok(t.text.endsWith('\u2026'));
  assert.ok(t.text.length * 30 * 0.58 <= 760);
  assert.ok(!/\s\u2026$/.test(t.text));
});

test('bullets are laid out at the largest size at which they all fit the card', () => {
  const short = layoutBullets([{ text: 'One short point' }, { text: 'Another' }]);
  assert.equal(short.fs, 34);
  const long = layoutBullets(Array.from({ length: 4 }, () => ({ text: 'A contract is a legally binding agreement outlining rights, responsibilities and obligations of the parties.' })));
  assert.ok(long.fs < 34);
  const bottom = 214 + long.per.reduce((n, lines) => n + lines.length * long.lh + long.gap, 0) - long.gap;
  assert.ok(bottom <= 560, `bullets end at ${bottom}`);
});

test('a wall of text at the smallest size is cut to fit the card, each cut bullet ending with an ellipsis', () => {
  const huge = layoutBullets(Array.from({ length: 6 }, () => ({ text: 'word '.repeat(60) })));
  assert.equal(huge.fs, 22);
  const bottom = 214 + huge.per.reduce((n, lines) => n + lines.length * huge.lh + huge.gap, 0) - huge.gap;
  assert.ok(bottom <= 560, `bullets end at ${bottom}`);
  assert.ok(huge.per.every(lines => lines[lines.length - 1].endsWith('\u2026')));
});

test('a long step label with a slash still fits its box (the slash is a place to break)', () => {
  const label = 'Amendments & Renewals/Termination'.replace(/\/(?=\S)/g, '/ ');
  const lines = wrap(label, 15, 120);
  assert.ok(lines.length <= 3);
  assert.ok(lines.every(l => l.length * 15 * 0.6 <= 125));
});

import { fitList } from '../src/video/scene.mjs';
test('a recap list stops above the Next button', () => {
  const three = Array.from({ length: 3 }, () => ({ text: 'It enhances efficiency, reduces risk, saves costs and unlocks new revenue for the business.' }));
  const L = fitList(three, { sizes: [32, 29, 26, 24, 22], width: 670, top: 226, bottom: 448 });
  const end = 226 + L.per.reduce((n, lines) => n + lines.length * L.lh + L.gap, 0) - L.gap;
  assert.ok(end <= 448, `list ends at ${end}`);
});
