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
