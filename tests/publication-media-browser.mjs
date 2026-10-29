import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {chromium} from 'playwright';
import {filesUnder} from '../scripts/publication-media.mjs';
import {storage, validateObject, assertBytes} from '../scripts/s3-media.mjs';
import {stubMetrika} from './metrika-fixture.mjs';

const root = resolve(process.env.MEDIA_SITE_DIR || '_site-pages'), base = process.env.MEDIA_BASEURL || '';
const receipt = JSON.parse(await readFile(resolve(root, 'assets/publication-media.json'), 'utf8'));
const objects = new Map(receipt.objects.map(object => [object.url, validateObject(object)]));
const manifest = JSON.parse(await readFile(resolve(root, 'assets/article-pdfs.json'), 'utf8'));
const files = await filesUnder(root);
assert.equal(files.filter(path => /\.pdf$/i.test(path)).length, 0, 'PDF binaries must be absent from the final Pages artifact');
for (const article of manifest.articles) assert.ok(objects.has(article.pdf_url), 'Every article PDF requires a publicly verified object');
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (!path.startsWith(base + '/')) throw Error('Outside base');
    let target = resolve(root, '.' + decodeURIComponent(path.slice(base.length)));
    if (!target.startsWith(root + sep)) throw Error('Outside output');
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    response.setHeader('Content-Type', mime[extname(target)] || 'application/octet-stream');
    response.end(await readFile(target));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
try {
  const articlePages = [];
  for (const lang of ['ru', 'en']) {
    let found;
    for (const article of manifest.articles.filter(article => article.lang === lang)) {
      if ((await readFile(resolve(root, '.' + article.url, 'index.html'), 'utf8')).includes('data-original-storage="s3"')) { found = article; break; }
    }
    assert.ok(found, `A published ${lang} image fixture is required`);
    articlePages.push(found);
  }
  await mkdir('test-results/s3-media', {recursive: true});
  for (const width of [390, 1440]) {
    for (const url of ['/about/', '/ru/about/', '/showcase/', '/ru/showcase/', ...articlePages.map(article => article.url)]) {
      const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
      await stubMetrika(context);
      const page = await context.newPage(), requests = [], errors = [];
      page.on('request', request => requests.push({url: request.url(), type: request.resourceType()}));
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => errors.push(request.url()));
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      await page.goto(origin + base + url, {waitUntil: 'networkidle'});
      await page.locator('main img').evaluateAll(async images => {
        images.forEach(image => { image.loading = 'eager'; });
        await Promise.all(images.map(image => image.decode()));
      });
      assert.deepEqual(requests.filter(request => request.url.startsWith(storage.base)), [], 'Reading must not preload originals or PDFs');
      const trigger = page.locator('.image-trigger:has(img[data-original-storage="s3"])').first();
      assert.ok(await trigger.count(), `S3 viewer fixture: ${url}`);
      const target = await trigger.locator('img').getAttribute('data-original');
      assert.ok(objects.has(target));
      await trigger.click();
      await page.locator('.viewer-canvas img').evaluate(image => image.decode());
      assert.ok(requests.some(request => request.url === target && request.type === 'image'));
      assert.ok(!requests.some(request => request.url === target && ['fetch', 'xhr'].includes(request.type)), 'Native zoom requires no bucket CORS');
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-viewer-download]').click()]);
      assert.equal(await download.failure(), null);
      assert.equal(download.suggestedFilename(), objects.get(target).filename);
      assertBytes(objects.get(target), await readFile(await download.path()));
      await page.screenshot({path: `test-results/s3-media/${url.replaceAll('/', '_')}-${width}.png`});
      await page.keyboard.press('Escape');
      const article = articlePages.find(article => article.url === url);
      if (article && width === 390) {
        const [pdf] = await Promise.all([page.waitForEvent('download'), page.locator('.article-pdf').click()]);
        assert.equal(await pdf.failure(), null);
        assertBytes(objects.get(article.pdf_url), await readFile(await pdf.path()));
      }
      assert.deepEqual(errors, [], url);
      await context.close();
    }
  }
  console.log(`PASS: ${manifest.articles.length} external PDF references; legacy/current RU/EN pages, desktop/mobile reading, click-only native S3 zoom and exact downloads`);
} finally { await browser.close(); await new Promise(done => server.close(done)); }
