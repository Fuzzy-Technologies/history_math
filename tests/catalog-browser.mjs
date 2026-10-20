import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root = resolve(process.env.CATALOG_SITE_DIR || 'test-results/browser-fixture');
const base = process.env.CATALOG_BASEURL ?? '/history_math';
const mime = {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2'};
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith(base + '/')) throw new Error('Outside base');
    let path = resolve(root, '.' + decodeURIComponent(pathname.slice(base.length)));
    if (!path.startsWith(root + sep)) throw new Error('Outside site');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
const errors = [];
await mkdir('test-results/catalog', {recursive: true});
try {
  for (const lang of ['ru', 'en']) {
    const prefix = lang === 'ru' ? '/ru' : '';
    const records = JSON.parse(await readFile(resolve(root, `assets/discovery-${lang}.json`), 'utf8'));
    assert.ok(records.length > 20, 'Pagination checks need a populated fixture');
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const url = origin + base + prefix + '/materials/';
    const visible = () => page.locator('.catalog-list h3 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    await page.goto(url, {waitUntil: 'networkidle'});
    assert.equal(await page.getByRole('combobox').count(), 3);
    assert.deepEqual(await visible(), records.slice(0, 20).map(record => record.url));
    assert.equal(await page.locator('#page-size').inputValue(), '20');
    assert.equal(await page.locator('.catalog-list').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 5);
    assert.equal(await page.locator('.catalog-list .card-copy > p:not(.eyebrow):not(.translation-label):visible').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({path: `test-results/catalog/${lang}-desktop.png`, fullPage: true});
    await page.locator('.catalog-pagination a').filter({hasText: /^2$/}).click();
    assert.equal(new URL(page.url()).searchParams.get('page'), '2');
    assert.deepEqual(await visible(), records.slice(20, 40).map(record => record.url));
    assert.equal(await page.locator('.catalog-pagination [aria-current=page]').textContent(), '2');
    await page.reload({waitUntil: 'networkidle'});
    assert.deepEqual(await visible(), records.slice(20, 40).map(record => record.url));
    await page.locator('#page-size-button').click();
    await page.getByRole('option', {name: '50', exact: true}).click();
    assert.equal(new URL(page.url()).searchParams.has('page'), false);
    assert.equal(new URL(page.url()).searchParams.get('per_page'), '50');
    assert.deepEqual(await visible(), records.slice(0, 50).map(record => record.url));
    await page.goBack({waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.querySelector('#page-size').value === '20');
    assert.equal(await page.locator('#page-size-button span').textContent(), '20');
    assert.deepEqual(await visible(), records.slice(20, 40).map(record => record.url));
    await page.goto(url + '?page=2&per_page=10', {waitUntil: 'networkidle'});
    await page.reload({waitUntil: 'networkidle'});
    assert.equal(new URL(page.url()).searchParams.get('per_page'), '10');
    assert.equal(await page.locator('#page-size').inputValue(), '10');
    assert.deepEqual(await visible(), records.slice(10, 20).map(record => record.url));
    await page.goto(url + '?page=999999&per_page=20&type=unknown&tag=unknown', {waitUntil: 'networkidle'});
    const last = Math.ceil(records.length / 20);
    assert.equal(new URL(page.url()).searchParams.get('page'), String(last));
    assert.equal(new URL(page.url()).searchParams.has('type'), false);
    assert.equal(new URL(page.url()).searchParams.has('tag'), false);
    assert.deepEqual(await visible(), records.slice((last - 1) * 20).map(record => record.url));
    await page.goto(url + '?page=2&per_page=5', {waitUntil: 'networkidle'});
    const targetType = records.find(record => record.type)?.type;
    const label = await page.locator('#type-filter').evaluate((select, value) => [...select.options].find(option => option.value === value).textContent, targetType);
    await page.locator('#type-filter-button').click();
    await page.getByRole('option', {name: label, exact: true}).click();
    const matches = records.filter(record => record.type === targetType);
    assert.equal(new URL(page.url()).searchParams.has('page'), false);
    assert.deepEqual(await visible(), matches.slice(0, 5).map(record => record.url));
    await page.screenshot({path: `test-results/catalog/${lang}-filtered.png`, fullPage: true});
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({width, height: 1000});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.locator('#page-size-button').scrollIntoViewIfNeeded();
      await page.locator('#page-size-button').click();
      const bounds = await page.locator('#page-size-list').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 1000);
      await page.locator('#page-size-button').press('Escape');
      if (width === 390) await page.screenshot({path: `test-results/catalog/${lang}-mobile.png`, fullPage: true});
    }
    await context.close();
    const noJs = await browser.newPage({javaScriptEnabled: false, viewport: {width: 1440, height: 1000}});
    await noJs.goto(url, {waitUntil: 'networkidle'});
    assert.equal(await noJs.locator('.catalog-list .material-card').count(), records.length);
    assert.equal(await noJs.locator('.catalog-controls').isVisible(), false);
    assert.equal(await noJs.locator('.catalog-pagination').isVisible(), false);
    await noJs.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: bilingual compact five-column catalog, default/page-size pagination, URL reload/back/clamping, filters, responsive menus and complete no-JS fallback');
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
