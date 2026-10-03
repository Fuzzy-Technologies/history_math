import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, stat} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {chromium} from 'playwright';

const root = resolve('_site');
const evidence = resolve('test-results');
await mkdir(evidence, {recursive: true});
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith('/history_math/')) {
      response.writeHead(404); response.end(); return;
    }
    let path = resolve(root, '.' + decodeURIComponent(url.pathname.slice('/history_math'.length)));
    if (path !== root && !path.startsWith(root + '/')) { response.writeHead(403); response.end(); return; }
    try { if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html'); }
    catch { path = resolve(root, '404.html'); response.statusCode = 404; }
    response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(500); response.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined, args: ['--no-sandbox']});
const report = {checks: [], consoleErrors: [], requestFailures: [], accessibility: []};
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
function checked(message) { report.checks.push(message); console.log('PASS:', message); }

try {
  for (const viewport of [{name: 'desktop', width: 1440, height: 1050}, {name: 'mobile', width: 390, height: 844}]) {
    const context = await browser.newContext({viewport, reducedMotion: 'reduce', timezoneId: 'Europe/Moscow'});
    const page = await context.newPage();
    page.on('pageerror', error => report.consoleErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => report.requestFailures.push(request.url()));
    const paths = ['/ru/', '/', '/ru/materials/', '/ru/search/', '/ru/about/', '/ru/articles/demo-geometry/', '/ru/articles/demo-abacus/', '/404.html'];
    for (const path of paths) {
      const response = await page.goto(origin + '/history_math' + path);
      assert.equal(response.status(), 200);
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('html').getAttribute('lang'), path.startsWith('/ru/') ? 'ru' : 'en');
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://fuzzy-technologies.github.io/history_math' + path);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Horizontal overflow on ${viewport.name} ${path}`);
      assert.ok(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), `Broken image on ${path}`);
      if (!['/ru/articles/demo-geometry/'].includes(path)) assert.equal(await page.locator('script[src*=katex]').count(), 0);
      await page.addScriptTag({content: axe});
      const audit = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
      report.accessibility.push({viewport: viewport.name, path, violations: audit.violations});
      assert.deepEqual(audit.violations.map(item => ({id: item.id, targets: item.nodes.map(node => node.target)})), [], `Accessibility violations on ${path}`);
      if (path === '/ru/') {
        const titles = await page.locator('.journal-section .material-card h3').allTextContents();
        const originalHeight = await page.locator('#archive-cards').evaluate(node => node.getBoundingClientRect().height);
        let previous = await page.locator('#archive-cards a').evaluateAll(links => links.map(link => link.href).sort());
        for (let index = 0; index < 10; index += 1) {
          await page.locator('#reshuffle').click();
          const current = await page.locator('#archive-cards a').evaluateAll(links => links.map(link => link.href).sort());
          assert.equal(new Set(current).size, 3);
          assert.notDeepEqual(current, previous);
          previous = current;
        }
        assert.deepEqual(await page.locator('.journal-section .material-card h3').allTextContents(), titles);
        assert.ok(Math.abs(await page.locator('#archive-cards').evaluate(node => node.getBoundingClientRect().height) - originalHeight) < 2, 'Archive height changed during rotation');
        await page.screenshot({path: `${evidence}/home-${viewport.name}.png`, fullPage: true});
        checked(`${viewport.name}: archive rotation changes only its block, without repeats or layout shifts`);
      }
      if (path === '/') {
        assert.match(await page.locator('main').innerText(), /English edition is coming/);
        assert.equal(await page.locator('.material-card').count(), 0);
      }
      if (path === '/ru/articles/demo-geometry/') {
        assert.ok(await page.locator('.math-source[data-rendered=true]').count() >= 6);
        assert.equal(await page.locator('.math-source:not([data-rendered=true])').count(), 0);
        assert.ok(await page.locator('.math-source[data-display=true] .katex').count() >= 1);
        assert.ok(await page.locator('.math-source[data-display=false] .katex').count() >= 1);
        assert.ok(await page.locator('.footnotes').count() >= 1);
        assert.ok(await page.locator('.article-body table').count() >= 1);
        assert.equal(await page.locator('link[hreflang=en]').count(), 0);
        await page.screenshot({path: `${evidence}/article-${viewport.name}.png`, fullPage: true});
        checked(`${viewport.name}: literal dollar inline/display math rendered through Markdown to KaTeX; table, footnote and images present`);
      }
      if (path === '/ru/search/') {
        for (const query of ['СЧЕТ', 'счёт', 'ЧЕРТЕЖ']) {
          await page.locator('#query').fill(query);
          await page.locator('#search-form button').click();
          await page.locator('#search-status').filter({hasText: 'Найдено материалов:'}).waitFor();
          assert.ok(await page.locator('.search-result').count() > 0);
        }
        await page.locator('#query').fill('несуществующийзапрос');
        await page.locator('#search-form button').click();
        await page.locator('#search-status').filter({hasText: 'Ничего не найдено'}).waitFor();
        assert.equal(await page.locator('.search-result').count(), 0);
        await page.locator('#query').fill('');
        await page.locator('#search-form button').click();
        await page.locator('#search-status').filter({hasText: 'Введите слово'}).waitFor();
        await page.screenshot({path: `${evidence}/search-${viewport.name}.png`, fullPage: true});
        checked(`${viewport.name}: Cyrillic case and ё/е search, empty query and no-result state`);
      }
      if (path === '/ru/materials/') {
        await page.locator('#type-filter').selectOption('problem');
        assert.equal(await page.locator('.catalog-list .material-card:visible').count(), 1);
        await page.locator('#tag-filter').selectOption({label: 'счёт'});
        assert.ok(await page.locator('#catalog-empty').isVisible());
        await page.locator('#type-filter').selectOption('');
        await page.locator('#tag-filter').selectOption('');
        await page.screenshot({path: `${evidence}/catalog-${viewport.name}.png`, fullPage: true});
      }
      checked(`${viewport.name}: ${path} language, canonical, assets, responsive width and axe WCAG AA`);
    }
    await page.goto(origin + '/history_math/ru/');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').textContent(), 'К содержимому');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'main');
    await page.keyboard.press('Tab');
    assert.ok(await page.locator(':focus').evaluate(node => getComputedStyle(node).outlineStyle !== 'none'));
    checked(`${viewport.name}: keyboard skip link and visible focus`);
    // Probe a non-public URL directly. A missing URL must return the 404 document.
    page.removeAllListeners('console');
    const missing = await page.goto(origin + '/history_math/ru/articles/draft-probe/');
    assert.equal(missing.status(), 404);
    assert.match(await page.locator('main').innerText(), /This page is missing/);
    await context.close();
  }
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto(origin + '/history_math/ru/');
  assert.equal(await page.locator('.material-card').count(), 3);
  assert.equal(await page.locator('#archive-cards a').count(), 3);
  await page.goto(origin + '/history_math/ru/materials/');
  assert.equal(await page.locator('.material-card:visible').count(), 5);
  checked('Without JavaScript: reading, catalog and initial archive remain available');
  await context.close();
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.requestFailures, []);
  checked('No browser console errors or failed requests');
} finally {
  await writeFile(`${evidence}/browser-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  server.close();
}
