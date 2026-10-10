import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root = resolve(process.env.URL_SITE_DIR || '_site');
const base = process.env.URL_BASEURL ?? '/history_math';
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'};
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
try {
  const records = JSON.parse(await readFile(resolve(root, 'assets/article-pdfs.json'), 'utf8')).articles;
  assert.equal(records.length, 10);
  for (const article of records) {
    const page = await browser.newPage({viewport: {width: 320, height: 800}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + base + article.url, {waitUntil: 'networkidle'});
    const anchor = await page.locator('article [id]').first().getAttribute('id');
    const legacy = article.url.replace(/-(?:ru|en)\/$/, '/');
    const suffix = `?from=legacy#${anchor}`;
    await page.goto(origin + base + legacy + suffix, {waitUntil: 'networkidle'});
    await page.waitForURL(origin + base + article.url + suffix);
    assert.equal(await page.locator('html').getAttribute('lang'), article.lang);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://fuzzy-technologies.github.io' + base + article.url);
    await page.locator('.article-details summary').click();
    assert.ok((await page.locator('.article-details').innerText()).includes(article.url));
    const otherLang = article.lang === 'ru' ? 'en' : 'ru';
    const alternate = await page.locator(`link[hreflang=${otherLang}]`).getAttribute('href');
    assert.ok(alternate.endsWith(`-${otherLang}/`));
    assert.deepEqual(errors, []);
    await page.close();
    const nojs = await browser.newPage({javaScriptEnabled: false});
    await nojs.goto(origin + base + legacy);
    assert.equal(await nojs.locator('html').getAttribute('lang'), article.lang);
    assert.equal(await nojs.locator('[data-article-redirect]').getAttribute('href'), base + article.url);
    await nojs.locator('[data-article-redirect]').click();
    assert.equal(new URL(nojs.url()).pathname, base + article.url);
    await nojs.close();
  }
  console.log(`PASS: ${records.length} localized article URLs, legacy redirects with query/anchors, citations, hreflang and no-JS links (${base || 'root'})`);
} finally { await browser.close(); await new Promise(done => server.close(done)); }
