// Targeted real-Chromium regression for the private print DOM.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const module = await readFile('scripts/pdf-pagination.mjs', 'utf8');
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
const figure = id => '<figure id="' + id + '"><img alt="Unchanged diagram" src="data:image/svg+xml,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#ddd"/></svg>') +
  '"><figcaption>Caption ' + id + '</figcaption></figure>';
const css = 'html,body{margin:0;padding:0}body{font:16px/20px Arial}.article-body{margin:0;padding:0}' +
  '.article-body>*{margin:0;padding:0}figure{break-inside:avoid}figure img{display:block;width:200px;height:100px}' +
  'figcaption{height:20px;font:12px/20px Arial}.pdf-math-pair{display:flow-root;break-inside:avoid}' +
  '.pdf-page-break{break-before:page}.pdf-short-paragraph{break-inside:avoid}p{orphans:3;widows:3}';
async function scenario(content) {
  const page = await browser.newPage();
  await page.emulateMedia({media: 'print'});
  await page.setContent('<style>' + css + '</style><article class="article-body">' + content + '</article>');
  await page.evaluate(async () => { await Promise.all([...document.images].map(img => img.decode())); await document.fonts.ready; });
  const before = await page.locator('.article-body').innerText();
  await page.addScriptTag({type: 'module', content: module});
  await page.waitForFunction(() => typeof window.HistoryMathPdfPagination === 'function');
  const report = await page.evaluate(() => window.HistoryMathPdfPagination({pageHeightMm: 100}));
  const imageState = await page.locator('figure img').evaluateAll(images => images.map(img => ({width: img.getBoundingClientRect().width,
    height: img.getBoundingClientRect().height, alt: img.alt, style: img.getAttribute('style')})));
  return {page, report, before, imageState};
}
try {
  let result = await scenario(figure('one'));
  assert.deepEqual(result.report.shrunk, []);
  assert.deepEqual(result.report.moved, []);
  assert.equal(result.imageState[0].style, null);
  assert.equal(result.imageState[0].height, 100);
  await result.page.close();

  result = await scenario('<div style="height:330px">Earlier content</div><p style="height:80px">A short paragraph stays intact.</p>');
  assert.equal(await result.page.locator('p.pdf-short-paragraph').count(), 1);
  assert.equal(await result.page.locator('p').evaluate(node => getComputedStyle(node).breakInside), 'avoid');
  assert.equal(await result.page.locator('.article-body').innerText(), result.before);
  await result.page.close();

  const multi = figure('first') + '<div style="height:140px">Ordinary content</div>' + figure('second');
  result = await scenario(multi);
  assert.equal(result.report.shrunk.length, 1);
  assert.equal(result.report.shrunk[0].images.length, 2);
  assert.ok(result.imageState.every(img => img.height < 100 && img.height >= 88 && Math.abs(img.width / img.height - 2) < 0.01));
  assert.deepEqual(result.report.moved, []);
  assert.equal(await result.page.locator('.article-body').innerText(), result.before);
  await mkdir('test-results/pdf-pagination', {recursive: true});
  await result.page.pdf({path: 'test-results/pdf-pagination/multi-image.pdf', width: '210mm', height: '137mm',
    margin: {top: '17mm', left: '19mm', right: '19mm', bottom: '20mm'}, printBackground: true});
  await writeFile('test-results/pdf-pagination/multi-image-report.json', JSON.stringify(result.report, null, 2));
  const firstReport = result.report;
  await result.page.close();
  result = await scenario(multi);
  assert.deepEqual(result.report, firstReport, 'Identical input produces identical bounded layout');
  await result.page.close();

  result = await scenario('<div style="height:250px">Earlier content</div><p style="height:60px">Immediately preceding paragraph.</p>' + figure('moved'));
  assert.equal(result.report.moved.length, 1);
  assert.equal(result.report.moved[0].paragraphs, 1);
  assert.equal(await result.page.locator('figure + p').innerText(), 'Immediately preceding paragraph.');
  assert.equal(result.imageState[0].height, 100, 'Reordering restores the original figure size');
  await result.page.close();

  result = await scenario('<div style="height:160px">Earlier content</div><p style="height:100px">Earlier paragraph.</p><p style="height:80px">Last paragraph.</p>' + figure('moved-twice'));
  assert.equal(result.report.moved.length, 1);
  assert.equal(result.report.moved[0].paragraphs, 2);
  assert.equal(await result.page.locator('figure + p').innerText(), 'Earlier paragraph.');
  assert.equal(result.imageState[0].height, 100);
  await result.page.close();

  result = await scenario('<div style="height:300px">Unmovable block</div>' + figure('next-page'));
  assert.deepEqual(result.report.pageBreaks, ['next-page']);
  assert.equal(result.imageState[0].style, null);
  assert.equal(await result.page.locator('figure.pdf-page-break').count(), 1);
  await result.page.pdf({path: 'test-results/pdf-pagination/fallback.pdf', width: '210mm', height: '137mm',
    margin: {top: '17mm', left: '19mm', right: '19mm', bottom: '20mm'}, printBackground: true});
  await result.page.close();

  result = await scenario('<div style="height:300px">Earlier content</div><p style="height:40px">An introducing sentence.</p><div class="math-source" data-display="true" style="height:60px">x + y = z</div>');
  assert.equal(await result.page.locator('.pdf-math-pair > p + .math-source').count(), 1);
  assert.equal(await result.page.locator('.pdf-math-pair').evaluate(node => getComputedStyle(node).breakInside), 'avoid');
  await result.page.pdf({path: 'test-results/pdf-pagination/math-pair.pdf', width: '210mm', height: '137mm',
    margin: {top: '17mm', left: '19mm', right: '19mm', bottom: '20mm'}, printBackground: true});
  await result.page.close();

  result = await scenario('<div style="height:260px">Earlier content</div><p style="height:40px">Three introduced equations.</p>' +
    '<div class="math-source" data-display="true" style="height:40px">a = b</div>'.repeat(3));
  assert.equal(await result.page.locator('.pdf-math-pair > .math-source').count(), 3,
    'A fitting run of consecutive equations stays with its shared introduction');
  assert.equal(await result.page.locator('.article-body').innerText(), result.before);
  await result.page.close();

  result = await scenario('<p style="height:300px;margin-bottom:12px">A long introduction.</p><div class="math-source" data-display="true" style="height:60px;margin:15px 0">x + y = z</div>');
  assert.equal(await result.page.locator('.pdf-math-pair').count(), 0,
    'Contained formula margins must not create a wrapper taller than the printable page');
  assert.equal(await result.page.locator('p.pdf-keep-with-next + .math-source.pdf-keep-with-previous').count(), 1);
  assert.equal(await result.page.locator('.article-body').innerText(), result.before);
  await result.page.close();
  console.log('PASS: unchanged defaults, bounded page-local multi-image shrink, original-size paragraph relocation, safe break fallback, formula pairing and deterministic print DOM');
} finally { await browser.close(); }

