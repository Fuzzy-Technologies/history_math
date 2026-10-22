// Native PDF attachment checks after the server-side storage receipt passes.
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {stubMetrika} from './metrika-fixture.mjs';

const root = resolve(process.env.PDF_SITE_DIR || '_site-pages-external');
const manifest = JSON.parse(await readFile(resolve(root, 'assets/article-pdfs.json'), 'utf8'));
assert.equal(manifest.version, 3, 'External output must pass the strict Python manifest validator first');
const compatibilityBytes = await readFile(resolve(root, 'assets/pdf-compatibility.json'));
const compatibility = JSON.parse(compatibilityBytes);
assert.equal(createHash('sha256').update(compatibilityBytes).digest('hex'), manifest.compatibility_sha256);
const mock = process.env.PDF_DELIVERY_MOCK === '1';
assert.ok(!mock || process.env.GITHUB_ACTIONS !== 'true', 'Production cannot use mocked downloads');
const mime = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith(manifest.baseurl + '/')) throw new Error('Outside base');
    let path = resolve(root, '.' + decodeURIComponent(url.pathname.slice(manifest.baseurl.length)));
    if (!path.startsWith(root + sep)) throw new Error('Outside site');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
try {
  for (const retained of compatibility.pdfs) {
    const response = await fetch(origin + manifest.baseurl + retained.path);
    assert.equal(response.status, 200, `Previously public direct PDF must remain available: ${retained.path}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, retained.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), retained.sha256);
  }
  for (const language of ['ru', 'en']) {
    const article = manifest.articles.find(article => article.lang === language);
    assert.ok(article, `Missing ${language} PDF`);
    const external = article.external_pdf;
    const filename = external.url.split('/').at(-1);
    assert.ok(filename.endsWith(`-${language}.pdf`));
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({javaScriptEnabled, acceptDownloads: true, viewport: {width: 320, height: 800}});
      await stubMetrika(context);
      if (mock) {
        const bytes = await readFile(resolve(process.env.PDF_MOCK_FILES, article.pdf_url.slice(1)));
        await context.route(external.url, route => route.fulfill({status: 200, contentType: 'application/pdf',
          headers: {'Content-Disposition': `attachment; filename="${filename}"`}, body: bytes}));
      }
      const page = await context.newPage();
      await page.goto(origin + manifest.baseurl + article.url, {waitUntil: 'load'});
      const control = page.locator('.article-pdf');
      assert.equal(await control.getAttribute('href'), external.url);
      assert.equal(await control.getAttribute('download'), filename);
      assert.equal(await control.getAttribute('aria-label'), language === 'ru' ? 'Скачать статью в PDF' : 'Download article as PDF');
      assert.ok(await control.isVisible());
      const pending = page.waitForEvent('download');
      await control.click();
      const download = await pending;
      assert.equal(await download.failure(), null);
      assert.equal(download.suggestedFilename(), filename);
      const bytes = await readFile(await download.path());
      assert.equal(bytes.length, external.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), external.sha256);
      await context.close();
    }
  }
  console.log(`PASS: ${compatibility.pdf_count} previously public direct URLs retain exact bytes; ${mock ? 'MOCK external transport only; ' : 'anonymous native Release delivery; '}RU/EN PDF controls and exact downloads with and without JavaScript`);
} finally { await browser.close(); await new Promise(done => server.close(done)); }
