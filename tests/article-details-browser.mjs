import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root = resolve('test-results/details-fixture');
const mime = {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2'};
const server = createServer(async (request, response) => {
  try {
    let path = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname.replace(/^\/history_math/, ''));
    if (!path.startsWith(root + '/')) { response.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
try {
  for (const language of ['ru', 'en']) for (const width of [320, 1440]) {
    const page = await browser.newPage({viewport: {width, height: 1000}, colorScheme: width === 320 ? 'dark' : 'light'});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/history_math/${language === 'ru' ? 'ru/' : ''}articles/citation-${language}/`, {waitUntil: 'networkidle'});
    const details = page.locator('.article-details');
    assert.equal(await details.getAttribute('open'), null);
    await details.locator('summary').focus(); await page.keyboard.press('Enter');
    assert.notEqual(await details.getAttribute('open'), null);
    if (language === 'ru') {
      assert.equal(await page.locator('[data-citation-date]').count(), 0);
      const today = await page.evaluate(() => {
        const now = new Date();
        return [now.getDate(), now.getMonth() + 1, now.getFullYear()].map((n, i) => i < 2 ? String(n).padStart(2, '0') : n).join('.');
      });
      assert.equal(await page.locator('[data-citation-access]').textContent(), today);
      assert.equal(await page.locator('[data-copy-citation]').innerText(), 'Скопировать выходные данные');
    }
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async value => { window.copiedCitation = value; }}}));
    await page.locator('[data-copy-citation]').click();
    assert.ok((await page.evaluate(() => window.copiedCitation)).includes('/history_math/'));
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async () => { throw new Error('Unavailable'); }}}));
    await page.locator('[data-copy-citation]').click();
    assert.ok((await page.evaluate(() => window.getSelection().toString())).includes('/history_math/'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.addScriptTag({path: 'node_modules/axe-core/axe.min.js'});
    const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations);
    assert.deepEqual(violations.map(item => item.id), []);
    assert.deepEqual(errors, []);
    await mkdir('test-results/details-screenshots', {recursive: true});
    await page.screenshot({path: `test-results/details-screenshots/${language}-${width}.png`, fullPage: true});
    await page.close();
  }
  const noJs = await browser.newPage({javaScriptEnabled: false});
  await noJs.goto(`${origin}/history_math/ru/articles/citation-ru/`);
  await noJs.locator('.article-details summary').click();
  assert.notEqual(await noJs.locator('.article-details').getAttribute('open'), null);
  assert.equal(await noJs.locator('[data-copy-citation]').isVisible(), false);
  await noJs.close();
  console.log('PASS: RU/EN citations, keyboard disclosure, current local access date, copying, 320/1440px, light/dark and accessibility');
} finally { await browser.close(); await new Promise(done => server.close(done)); }
