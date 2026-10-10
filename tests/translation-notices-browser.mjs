import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root = resolve('test-results/notices-fixture');
const mime = {'.webp': 'image/webp', '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/history_math/')) { response.writeHead(404).end(); return; }
    let path = resolve(root, '.' + pathname.slice('/history_math'.length));
    if (path !== root && !path.startsWith(root + '/')) { response.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}/history_math`;
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
const ids = Object.keys(JSON.parse(await readFile('site/_data/english_notices.json', 'utf8')));
try {
  await mkdir('test-results/notice-screenshots', {recursive: true});
  for (const width of [320, 1440]) {
    const page = await browser.newPage({viewport: {width, height: 1000}, colorScheme: width === 320 ? 'dark' : 'light'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${origin}/ru/`, {waitUntil: 'networkidle'});
    assert.equal(await page.locator('.demo-strip').count(), 0);
    const latest = await page.locator('#latest-cards .card-image').evaluateAll(links => links.map(link => link.getAttribute('href')));
    assert.deepEqual(latest.slice().sort(), ids.map(id => `/history_math/ru/articles/${id}-ru/`).sort());
    assert.equal(await page.locator('.cover-bottom a').getAttribute('href'), '/history_math/ru/materials/');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({path: `test-results/notice-screenshots/russian-home-${width}.png`, fullPage: true});
    await page.goto(`${origin}/`, {waitUntil: 'networkidle'});
    for (const id of ids) assert.equal(await page.locator(`#latest-cards h3 a[href="/history_math/articles/${id}-en/"]`).count(), 1);
    await page.screenshot({path: `test-results/notice-screenshots/home-${width}.png`, fullPage: true});
    for (const id of ids) {
      assert.equal((await page.goto(`${origin}/articles/${id}-en/`, {waitUntil: 'networkidle'})).status(), 200);
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), `https://fuzzy-technologies.github.io/history_math/articles/${id}-en/`);
      assert.equal(await page.getByText('An English translation of this article is not available yet.', {exact: true}).count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.addScriptTag({path: 'node_modules/axe-core/axe.min.js'});
      const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations);
      assert.deepEqual(violations.map(item => item.id), []);
      await page.screenshot({path: `test-results/notice-screenshots/${id}-${width}.png`, fullPage: true});
      await page.getByRole('link', {name: 'Read the Russian original'}).click();
      assert.equal(new URL(page.url()).pathname, `/history_math/ru/articles/${id}-ru/`);
      await page.getByRole('link', {name: 'English translation status', exact: true}).click();
      assert.equal(new URL(page.url()).pathname, `/history_math/articles/${id}-en/`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: five English notices, published list, language navigation, 320/1440px, light/dark and accessibility');
} finally { await browser.close(); await new Promise(done => server.close(done)); }
