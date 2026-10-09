import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root = resolve(process.env.ERROR_SITE_DIR || '_site');
const base = process.env.ERROR_BASEURL ?? '/history_math';
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2'};
// Match Pages: every unknown URL serves the root 404 document, without redirecting.
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  try {
    if (!url.pathname.startsWith(base + '/')) throw new Error('Outside base');
    let path = resolve(root, '.' + decodeURIComponent(url.pathname.slice(base.length)));
    if (path !== root && !path.startsWith(root + sep)) throw new Error('Outside site');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    response.end(await readFile(path));
  } catch {
    response.writeHead(404, {'Content-Type': 'text/html'}).end(await readFile(resolve(root, '404.html')));
  }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
const errors = [];
await mkdir('test-results/errors', {recursive: true});
const cases = [['/missing/nested/', 'en', 404], ['/ru/missing/nested/', 'ru', 404], ['/r', 'en', 404], ['/ruined/', 'en', 404], ['/404.html', 'en', 200], ['/ru/404.html', 'ru', 200]];
try {
  for (const width of [320, 1440]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({viewport: {width, height: 1000}, colorScheme: theme, locale: 'en-US'});
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && response.request().resourceType() !== 'document') errors.push(response.url()); });
    for (const [path, lang, code] of cases) {
      const response = await page.goto(origin + base + path, {waitUntil: 'networkidle'});
      assert.equal(response.status(), code);
      assert.equal(page.url(), origin + base + path, 'Preserve the missing address and HTTP status');
      assert.equal(await page.locator('html').getAttribute('lang'), lang);
      assert.equal(await page.locator('body').getAttribute('data-lang'), lang);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('h1').innerText(), lang === 'ru' ? 'Страница не найдена' : 'Page not found');
      assert.match(await page.title(), lang === 'ru' ? /^Страница не найдена · Математика/ : /^Page not found · Mathematics/);
      const text = await page.locator('body').innerText();
      if (lang === 'en') assert.doesNotMatch(text, /[А-Яа-яЁё]/);
      else assert.doesNotMatch(text, /Page not found|Reading room|Back to home|Mathematics|Illustration|Main navigation/);
      const prefix = lang === 'ru' ? '/ru' : '';
      assert.equal(await page.locator('.not-found .button').getAttribute('href'), base + prefix + '/');
      assert.equal(await page.locator('.not-found p a').first().getAttribute('href'), base + prefix + '/materials/');
      assert.equal(await page.locator('.language-nav a').getAttribute('href'), base + (lang === 'ru' ? '/404.html' : '/ru/404.html'));
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
      assert.match(await page.locator('.brand img').getAttribute('data-original'), lang === 'ru' ? /logo-ru\.png$/ : /logo\.png$/);
      assert.equal(await page.locator('.theme-toggle').isVisible(), true, 'App initializes on the selected shell');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    }
    for (const lang of ['ru', 'en']) {
      await page.goto(origin + base + (lang === 'ru' ? '/ru/missing/' : '/missing/'), {waitUntil: 'networkidle'});
      await page.addScriptTag({path: 'node_modules/axe-core/axe.min.js'});
      const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations);
      assert.deepEqual(violations.map(v => v.id), []);
      await page.screenshot({path: `test-results/errors/${base ? 'project' : 'domain'}-${lang}-${width}-${theme}.png`, fullPage: true});
      await page.locator('.language-nav a').click();
      assert.equal(await page.locator('html').getAttribute('lang'), lang === 'ru' ? 'en' : 'ru');
    }
    await page.close();
  }
  for (const lang of ['ru', 'en']) {
    const prefix = lang === 'ru' ? '/ru' : '';
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/assets/discovery-*.json*', route => route.fulfill({status: 503, body: 'Unavailable'}));
    await page.goto(origin + base + prefix + '/search/?q=geometry');
    const searchError = lang === 'ru' ? 'Поиск временно недоступен. Откройте читальный зал.' : 'Search is temporarily unavailable. Open the reading room.';
    await page.waitForFunction(value => document.querySelector('#search-status')?.textContent === value, searchError);
    await page.goto(origin + base + prefix + '/');
    const archiveError = lang === 'ru' ? 'Показана исходная подборка.' : 'Showing the original selection.';
    await page.waitForFunction(value => document.querySelector('#archive-status')?.textContent === value, archiveError);
    await page.goto(origin + base + prefix + '/about/');
    // Fail only the zoomed original, leaving responsive reading images intact.
    await page.route('**/assets/images/*.png', route => route.fulfill({status: 404, body: ''}));
    await page.locator('.prose .image-trigger').first().click();
    const imageError = lang === 'ru' ? 'Не удалось загрузить изображение.' : 'The image could not be loaded.';
    await page.waitForFunction(value => document.querySelector('#viewer-caption')?.textContent === value, imageError);
    await page.goto(origin + base + prefix + '/showcase/');
    assert.doesNotMatch(await page.locator('main').innerText(), /Все издания — на русском языке|All editions are in Russian/);
    await page.close();
    const staticPage = await browser.newPage({javaScriptEnabled: false});
    await staticPage.goto(origin + base + prefix + '/404.html');
    assert.equal(await staticPage.locator('html').getAttribute('lang'), lang);
    assert.equal(await staticPage.locator('h1').innerText(), lang === 'ru' ? 'Страница не найдена' : 'Page not found');
    if (lang === 'en') assert.doesNotMatch(await staticPage.locator('body').innerText(), /[А-Яа-яЁё]/);
    await staticPage.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: localized 404 shells/status/URLs, navigation, metadata, no-JS pages, failed search/image/archive requests and showcase copy');
} finally { await browser.close(); await new Promise(done => server.close(done)); }
