import {test} from 'node:test';
import assert from 'node:assert/strict';
import {figureFitPlan, layoutPrintBlocks, PRINT_LAYOUT} from '../scripts/pdf-pagination.mjs';

test('page-local shrink preserves aspect ratios and respects both millimetre and scale caps', () => {
  const images = [{id: 'earlier', width: 400, height: 280}, {id: 'last', width: 300, height: 240}];
  const fit = figureFitPlan(45, images);
  assert.equal(fit.length, 2);
  assert.ok(fit.every((item, i) => item.scale >= PRINT_LAYOUT.minimumImageScale &&
    item.reduction <= 10 * 96 / 25.4 && Math.abs(item.width / item.height - images[i].width / images[i].height) < 1e-9));
  assert.ok(fit.reduce((sum, item) => sum + item.reduction, 0) > 45);
  assert.equal(figureFitPlan(100, images), null, 'Never force a figure to fit through excessive shrink');
  assert.equal(figureFitPlan(5, [{width: 400, height: 250, minimumHeight: 248}]), null, 'Repeated passes cannot exceed the original image limit');
  for (const overflow of [NaN, Infinity, -1, 0]) assert.equal(figureFitPlan(overflow, images), null);
});

test('atomic figure and caption stay together and expose actionable whitespace', () => {
  const blocks = [{id: 'intro', kind: 'text', lines: 10, height: 200},
    {id: 'image', kind: 'figure', height: 300, gap: 15}];
  const layout = layoutPrintBlocks(blocks, 1000, 550);
  const figure = layout.placements[1];
  assert.equal(figure.originPage, 0);
  assert.equal(figure.page, 1);
  assert.equal(figure.whitespace, 235);
  assert.equal(figure.overflow, 65);
  assert.equal(figure.end - figure.start, 300, 'Caption is part of the atomic figure height');
});

test('small multi-image savings can close a page without changing default image sizes otherwise', () => {
  const original = [{id: 'first', kind: 'figure', height: 280}, {id: 'text', kind: 'text', lines: 20, height: 400},
    {id: 'last', kind: 'figure', height: 270}];
  const before = layoutPrintBlocks(original, 1000, 90);
  assert.equal(before.placements[2].page, 1);
  const fit = figureFitPlan(before.placements[2].overflow, [{width: 300, height: 250}, {width: 300, height: 240}]);
  assert.ok(fit);
  const after = layoutPrintBlocks(original.map((block, i) => i === 0 ? {...block, height: block.height - fit[0].reduction} :
    i === 2 ? {...block, height: block.height - fit[1].reduction} : block), 1000, 90);
  assert.equal(after.placements[2].page, 0);
  assert.equal(after.pages, 1);
  assert.equal(original[0].height, 280);
});

test('paragraph line fragmentation preserves at least three lines on ordinary page fragments', () => {
  const layout = layoutPrintBlocks([{id: 'paragraph', kind: 'text', lines: 8, height: 160},
    {id: 'formula', kind: 'atomic', height: 80}], 1000, 910);
  assert.equal(layout.placements[0].end, 1080, 'Four paragraph lines continue on page two');
  assert.equal(layout.placements[1].page, 1);
  assert.equal(layout.pages, 2);
  const veryLarge = layoutPrintBlocks([{kind: 'text', height: 1200, lines: 3}], 1000);
  assert.ok(Number.isFinite(veryLarge.height), 'Impossible orphan constraints cannot create an infinite loop');
});

test('a formula pair or heading introduction moves intact, and impossible figures remain explicit', () => {
  const pair = layoutPrintBlocks([{kind: 'atomic', height: 160}], 1000, 900);
  assert.equal(pair.placements[0].page, 1);
  const heading = layoutPrintBlocks([{kind: 'atomic', height: 40, keepNextHeight: 90},
    {kind: 'text', lines: 5, height: 150}], 1000, 900);
  assert.equal(heading.placements[0].page, 1);
  const impossible = layoutPrintBlocks([{kind: 'figure', height: 1200}], 1000);
  assert.equal(impossible.placements[0].oversized, true);
  assert.equal(impossible.pages, 2);
  for (const height of [0, -1, Infinity, NaN]) assert.throws(() => layoutPrintBlocks([], height), /geometry/);
});

