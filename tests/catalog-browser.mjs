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
async function checkDocumentEnd(page) {
  const bounds = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    end: Math.max(innerHeight, Math.ceil(document.querySelector('.site-footer').getBoundingClientRect().bottom + scrollY))
  }));
  assert.ok(bounds.height <= bounds.end + 1,
    `Closed filters leave ${bounds.height - bounds.end}px of empty scrolling below the footer at ${page.url()}`);
}
await mkdir('test-results/catalog', {recursive: true});
try {
  for (const lang of ['ru', 'en']) {
    const prefix = lang === 'ru' ? '/ru' : '';
    const records = JSON.parse(await readFile(resolve(root, `assets/discovery-${lang}.json`), 'utf8'));
    const otherLanguage = lang === 'ru' ? 'en' : 'ru';
    const otherRecords = JSON.parse(await readFile(resolve(root, `assets/discovery-${otherLanguage}.json`), 'utf8'));
    assert.ok(records.length > 20, 'Pagination checks need a populated fixture');
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const url = origin + base + prefix + '/publications/';
    const visible = () => page.locator('.catalog-list h3 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    const indexRequests = [];
    page.on('request', request => { if (/assets\/(?:discovery|search)-/.test(request.url())) indexRequests.push(request.url()); });
    for (const size of [5, 100, 20]) {
      await page.goto(url + `?per_page=${size}`, {waitUntil: 'networkidle'});
      assert.equal(await page.getByRole('combobox').count(), 3);
      assert.deepEqual(await visible(), records.slice(0, size).map(record => record.url));
      await checkDocumentEnd(page);
      await page.locator('#tag-filter-button').click();
      assert.equal(await page.locator('#tag-filter-list').isVisible(), true);
      await page.locator('#tag-filter-button').press('End');
      await page.locator('#tag-filter-button').press('Escape');
      assert.equal(await page.locator('#tag-filter-list').isVisible(), false);
      await checkDocumentEnd(page);
    }
    await page.goto(url, {waitUntil: 'networkidle'});
    assert.equal(await page.locator('h1').innerText(), lang === 'ru' ? 'Публикации' : 'Reading room');
    assert.equal(await page.locator('.catalog-list').getAttribute('aria-label'), lang === 'ru' ? 'Публикации журнала' : 'Journal articles');
    assert.ok(indexRequests.some(url => url.includes('/discovery-')));
    assert.ok(indexRequests.every(url => !url.includes('/search-')));
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
    await page.goto(url + 'page/2/', {waitUntil: 'networkidle'});
    assert.equal(new URL(page.url()).pathname, new URL(url).pathname);
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
      await checkDocumentEnd(page);
      await page.locator('#page-size-button').scrollIntoViewIfNeeded();
      await page.locator('#page-size-button').click();
      const bounds = await page.locator('#page-size-list').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 1000);
      await page.locator('#page-size-button').press('Escape');
      await checkDocumentEnd(page);
      if (width === 390) await page.screenshot({path: `test-results/catalog/${lang}-mobile.png`, fullPage: true});
    }
    await context.close();
    const noJs = await browser.newPage({javaScriptEnabled: false, viewport: {width: 1440, height: 1000}});
    const allStatic = [];
    for (let number = 1; number <= Math.ceil(records.length / 20); number++) {
      await noJs.goto(number === 1 ? url : url + `page/${number}/`, {waitUntil: 'networkidle'});
      const suffix = number === 1 ? '' : `page/${number}/`;
      const path = `${base}${prefix}/publications/${suffix}`;
      assert.equal(new URL(await noJs.locator('link[rel=canonical]').getAttribute('href')).pathname, path);
      assert.equal(new URL(await noJs.locator('meta[property="og:url"]').getAttribute('content')).pathname, path);
      assert.equal(await noJs.locator('.navigation-bar nav').first().locator('a[aria-current=page]').getAttribute('href'), `${base}${prefix}/publications/`);
      assert.equal(await noJs.locator('a[href*="/materials/"]').count(), 0);
      if (number <= Math.ceil(otherRecords.length / 20)) {
        const counterpart = `${base}${otherLanguage === 'ru' ? '/ru' : ''}/publications/${suffix}`;
        assert.equal(new URL(await noJs.locator(`link[rel=alternate][hreflang=${otherLanguage}]`).getAttribute('href')).pathname, counterpart);
        assert.equal(await noJs.locator(`.language-nav a[lang=${otherLanguage}]`).getAttribute('href'), counterpart);
      }
      const links = await noJs.locator('.catalog-list h3 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
      assert.ok(links.length <= 20);
      allStatic.push(...links);
      assert.equal(await noJs.locator('.catalog-controls').isVisible(), false);
      assert.equal(await noJs.locator('.catalog-pagination').isVisible(), true);
      if (number < Math.ceil(records.length / 20)) assert.ok(await noJs.locator(`.catalog-pagination a[href$="page/${number + 1}/"]`).count());
    }
    assert.deepEqual(allStatic, records.map(record => record.url));
    await noJs.close();
    const offline = await browser.newPage();
    await offline.route('**/assets/discovery-*.json*', route => route.fulfill({status: 503, body: 'Unavailable'}));
    await offline.goto(url + 'page/2/', {waitUntil: 'networkidle'});
    assert.deepEqual(await offline.locator('.catalog-list h3 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), records.slice(20, 40).map(record => record.url));
    assert.equal(await offline.locator('.catalog-controls').isVisible(), false);
    await offline.locator('.catalog-pagination a').filter({hasText: /^1$/}).click();
    await offline.waitForURL(url);
    assert.equal(await offline.locator('.catalog-list .material-card').count(), 20);
    await offline.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: bilingual publications routes, canonical/hreflang/language navigation, compact catalog, URL state, filters and complete no-JS pagination');
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
