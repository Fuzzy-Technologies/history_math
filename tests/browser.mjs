import {execFileSync} from 'node:child_process';
import {recordRequestFailure} from './request-failures.mjs';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, stat} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {chromium} from 'playwright';
import {runReaderChecks} from './reader.mjs';
import {runDiscoveryChecks} from './discovery.mjs';
import {runCarouselChecks} from './carousel.mjs';
import {runShowcaseChecks} from './showcase.mjs';

const discoveryOnly = process.argv.includes('--discovery-only');
const carouselOnly = process.argv.includes('--carousel-only');
const showcaseOnly = process.argv.includes('--showcase-only');

const root = resolve(process.env.BROWSER_SITE_DIR || '_site');
const articleRecords = JSON.parse(await readFile(resolve(root, 'assets/search-ru.json'), 'utf8'));
function neighbors(url) {
  const index = articleRecords.findIndex(article => article.url === url);
  return [articleRecords[index - 1], articleRecords[index + 1]].filter(Boolean).map(article => article.url);
}
const evidence = resolve('test-results');
await mkdir(evidence, {recursive: true});
const mime = {'.webp': 'image/webp', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
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
  if (!showcaseOnly && (carouselOnly || !process.argv.some(flag => ['--discovery-only', '--reading-only', '--polish-only', '--resume-only'].includes(flag)))) await runCarouselChecks({browser, origin, evidence, axe, report, checked});
  if (showcaseOnly || process.argv.length === 2) await runShowcaseChecks({browser, origin, evidence, axe, report, checked});
  if (!carouselOnly && !showcaseOnly) {
  if (!discoveryOnly && !process.argv.includes('--reading-only') && !process.argv.includes('--polish-only') && !process.argv.includes('--resume-only')) {
  for (const viewport of [{name: 'desktop', width: 1440, height: 1050}, {name: 'mobile', width: 390, height: 844}]) {
    const context = await browser.newContext({viewport, reducedMotion: 'reduce', timezoneId: 'Europe/Moscow'});
    const page = await context.newPage();
    page.on('pageerror', error => report.consoleErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => recordRequestFailure(report, request));
    const paths = ['/ru/', '/', '/ru/materials/', '/ru/search/', '/ru/about/', '/ru/showcase/', '/showcase/', '/ru/articles/demo-geometry/', '/ru/articles/demo-area/', '/ru/articles/demo-abacus/', '/ru/articles/demo-reading/', '/ru/articles/demo-notation/', '/404.html'];
    for (const path of paths) {
      const response = await page.goto(origin + '/history_math' + path);
      assert.equal(response.status(), 200);
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('html').getAttribute('lang'), path.startsWith('/ru/') ? 'ru' : 'en');
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://fuzzy-technologies.github.io/history_math' + path);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Horizontal overflow on ${viewport.name} ${path}`);
      await page.locator('img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
      assert.equal(await page.locator('script[src*=katex]').count(), ['/ru/articles/demo-geometry/', '/ru/articles/demo-area/', '/ru/articles/demo-notation/'].includes(path) ? 1 : 0);
      await page.addScriptTag({content: axe});
      const audit = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
      report.accessibility.push({viewport: viewport.name, path, violations: audit.violations});
      assert.deepEqual(audit.violations.map(item => ({id: item.id, targets: item.nodes.map(node => node.target)})), [], `Accessibility violations on ${path}`);
      if (path === '/ru/') {
        const carousel = page.locator('#latest-cards');
        if (viewport.name === 'desktop') {
          assert.ok(await page.locator('.carousel-controls').isVisible());
          assert.ok(await page.locator('[data-carousel-direction="-1"]').isDisabled());
          const initial = await carousel.evaluate(node => node.scrollLeft);
          await page.locator('[data-carousel-direction="1"]').click();
          await page.waitForFunction(initial => document.querySelector('#latest-cards').scrollLeft > initial + 10, initial);
          await carousel.focus();
          const afterClick = await carousel.evaluate(node => node.scrollLeft);
          await page.keyboard.press('ArrowRight');
          await page.waitForFunction(afterClick => document.querySelector('#latest-cards').scrollLeft > afterClick + 10, afterClick);
          await page.keyboard.press('ArrowLeft');
          await page.waitForFunction(afterClick => document.querySelector('#latest-cards').scrollLeft <= afterClick + 2, afterClick);
          await carousel.evaluate(node => { node.scrollLeft = 0; });
          checked('Desktop: magazine carousel supports buttons, keyboard, limits and reduced motion');
        } else {
          assert.equal(await page.locator('.carousel-controls').isVisible(), false);
          const cards = await carousel.locator('.material-card').evaluateAll(nodes => nodes.map(node => ({top: node.getBoundingClientRect().top, left: node.getBoundingClientRect().left})));
          assert.ok(cards.every((card, index) => index === 0 || card.top > cards[index - 1].top));
          assert.ok(cards.every(card => Math.abs(card.left - cards[0].left) < 1));
          checked('Mobile: all magazine cards form a vertical reading sequence');
        }
        const titles = await page.locator('.journal-section .material-card h3').allTextContents();
        const originalHeight = await page.locator('#archive-cards').evaluate(node => node.getBoundingClientRect().height);
        let previous = await page.locator('#archive-cards h3 a').evaluateAll(links => links.map(link => link.href).sort());
        for (let index = 0; index < 10; index += 1) {
          await page.locator('#reshuffle').click();
          const current = await page.locator('#archive-cards h3 a').evaluateAll(links => links.map(link => link.href).sort());
          assert.equal(new Set(current).size, 4);
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
        const toc = page.locator('.article-toc a');
        assert.equal(await toc.count(), await page.locator('.article-body h2').count());
        await toc.nth(1).click();
        assert.ok(await page.evaluate(() => Boolean(document.getElementById(decodeURIComponent(location.hash.slice(1))))));
        assert.deepEqual(await page.locator('.reading-navigation a').evaluateAll(links => links.map(link => link.getAttribute('href'))), neighbors('/history_math/ru/articles/demo-geometry/'));
        await page.locator('h1').scrollIntoViewIfNeeded();
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
      if (path === '/ru/articles/demo-area/') {
        assert.deepEqual(await page.locator('.reading-navigation a').evaluateAll(links => links.map(link => link.getAttribute('href'))), neighbors('/history_math/ru/articles/demo-area/'));
        checked(`${viewport.name}: article navigation respects publication order and end-of-sequence limits`);
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
        await page.getByRole('combobox', {name: /^Тип материала/}).click();
        await page.getByRole('option', {name: 'Задачи', exact: true}).click();
        assert.equal(await page.locator('.catalog-list .material-card:visible').count(), articleRecords.filter(article => article.type === 'problem').length);
        await page.getByRole('combobox', {name: /^Тема/}).click();
        await page.getByRole('option', {name: 'счёт', exact: true}).click();
        assert.ok(await page.locator('#catalog-empty').isVisible());
        await page.getByRole('combobox', {name: /^Тип материала/}).click();
        await page.getByRole('option', {name: 'Все типы', exact: true}).click();
        await page.getByRole('combobox', {name: /^Тема/}).click();
        await page.getByRole('option', {name: 'Все темы', exact: true}).click();
        await page.screenshot({path: `${evidence}/catalog-${viewport.name}.png`, fullPage: true});
      }
      checked(`${viewport.name}: ${path} language, canonical, assets, responsive width and axe WCAG AA`);
    }
    await page.goto(origin + '/history_math/ru/');
    // Finish asset requests before the keyboard test navigates to another page.
    await page.waitForLoadState('networkidle');
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
    // Closing a context with pending requests creates false requestfailed events.
    await page.waitForLoadState('networkidle');
    assert.equal(missing.status(), 404);
    assert.match(await page.locator('main').innerText(), /This page is missing/);
    await context.close();
  }
  const responsiveContext = await browser.newContext({reducedMotion: 'reduce'});
  const responsivePage = await responsiveContext.newPage();
  await responsivePage.goto(origin + '/history_math/ru/');
  await responsivePage.waitForLoadState('networkidle');
  for (const width of [320, 620, 621, 768, 1024]) {
    await responsivePage.setViewportSize({width, height: 1000});
    await responsivePage.waitForFunction(width => document.querySelector('#latest-cards').tabIndex === (width > 620 ? 0 : -1), width);
    assert.ok(await responsivePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Horizontal overflow at breakpoint ${width}px`);
    assert.equal(await responsivePage.locator('.carousel-controls').isVisible(), width > 620);
  }
  checked('Responsive breakpoints: 320, 620, 621, 768 and 1024px keep the page in bounds and update carousel controls');
  await responsiveContext.close();
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto(origin + '/history_math/ru/');
  assert.equal(await page.locator('.material-card').count(), 10);
  assert.equal(await page.locator('#archive-cards h3 a').count(), 4);
  await page.goto(origin + '/history_math/ru/materials/');
  assert.equal(await page.locator('.material-card:visible').count(), articleRecords.length);
  checked('Without JavaScript: reading, catalog and initial archive remain available');
  await context.close();
  }

  if (!discoveryOnly && !process.argv.includes('--polish-only') && !process.argv.includes('--resume-only')) {
  for (const viewport of [{name: 'desktop', width: 1440, height: 1050}, {name: 'mobile', width: 390, height: 844}]) {
    const context = await browser.newContext({viewport, reducedMotion: 'reduce', colorScheme: 'light', hasTouch: viewport.name === 'mobile'});
    // A repeated random sequence reproduces the stale-selection failure reliably.
    await context.addInitScript(() => { Math.random = () => 0.4; });
    const page = await context.newPage();
    page.on('pageerror', error => report.consoleErrors.push(error.message));
    page.on('requestfailed', request => recordRequestFailure(report, request));
    const home = origin + '/history_math/ru/';
    await page.goto(home, {waitUntil: 'networkidle'});
    let previous = await page.locator('#archive-cards h3 a').evaluateAll(links => links.map(link => link.href).sort());
    for (let visit = 0; visit < 3; visit += 1) {
      await page.reload({waitUntil: 'networkidle'});
      const current = await page.locator('#archive-cards h3 a').evaluateAll(links => links.map(link => link.href).sort());
      assert.equal(new Set(current).size, 4);
      assert.notDeepEqual(current, previous);
      previous = current;
    }
    const reopened = await context.newPage();
    await reopened.goto(home, {waitUntil: 'networkidle'});
    assert.notDeepEqual(await reopened.locator('#archive-cards h3 a').evaluateAll(links => links.map(link => link.href).sort()), previous);
    await reopened.close();
    assert.ok(await page.locator('.card-copy > p:not(.eyebrow)').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 17);
    for (const width of viewport.name === 'mobile' ? [320, 390, 620, 621] : [768, 1024, 1440]) {
      await page.setViewportSize({width, height: viewport.height});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Reading layout overflows at ${width}px`);
    }
    await page.setViewportSize(viewport);
    await page.screenshot({path: `${evidence}/reading-light-${viewport.name}.png`, fullPage: true});
    await page.locator('.theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload({waitUntil: 'networkidle'});
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), '#1e1a17');
    await page.addScriptTag({content: axe});
    const homeAudit = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
    report.accessibility.push({viewport: viewport.name, path: '/ru/', theme: 'dark', violations: homeAudit.violations});
    assert.deepEqual(homeAudit.violations.map(item => item.id), [], 'Dark home accessibility');
    await page.screenshot({path: `${evidence}/reading-dark-${viewport.name}.png`, fullPage: true});
    checked(`${viewport.name}: archive changes across reloads/new tabs; readable text and saved dark theme stay in bounds`);

    const trigger = page.locator('.about-teaser .image-trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('#image-viewer');
    await dialog.waitFor({state: 'visible'});
    await page.waitForFunction(() => document.querySelector('.viewer-canvas img')?.naturalWidth > 0 && document.querySelector('#image-viewer').getAttribute('aria-busy') === 'false');
    const fittedWidth = await page.locator('.viewer-canvas img').evaluate(node => node.getBoundingClientRect().width);
    assert.ok(fittedWidth >= await page.locator('.viewer-stage').evaluate(node => node.clientWidth) - 2);
    await page.locator('[data-viewer-action="in"]').click();
    assert.ok(await page.locator('.viewer-canvas img').evaluate(node => node.getBoundingClientRect().width) > fittedWidth * 1.2);
    const stage = page.locator('.viewer-stage');
    const box = await stage.boundingBox();
    if (viewport.name === 'desktop') {
      const before = await stage.evaluate(node => node.scrollLeft);
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.6 - 100, box.y + box.height * 0.5, {steps: 6});
      await page.mouse.up();
      assert.ok(await stage.evaluate(node => node.scrollLeft) > before + 20);
    } else {
      const before = await page.locator('.viewer-canvas img').evaluate(node => node.getBoundingClientRect().width);
      const touch = await context.newCDPSession(page);
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await touch.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x - 40, y, id: 1}, {x: x + 40, y, id: 2}]});
      await touch.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x - 80, y, id: 1}, {x: x + 80, y, id: 2}]});
      await touch.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      assert.ok(await page.locator('.viewer-canvas img').evaluate(node => node.getBoundingClientRect().width) > before * 1.5);
      await touch.detach();
    }
    await page.locator('[data-viewer-action="fit"]').click();
    assert.ok(await page.locator('.viewer-canvas img').evaluate(node => node.getBoundingClientRect().height) <= await stage.evaluate(node => node.clientHeight) + 1);
    for (let tab = 0; tab < 8; tab += 1) {
      await page.keyboard.press('Tab');
      assert.ok(await page.evaluate(() => document.querySelector('#image-viewer').contains(document.activeElement)));
    }
    await page.addScriptTag({content: axe});
    const viewerAudit = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
    report.accessibility.push({viewport: viewport.name, path: '/ru/', theme: 'dark', viewer: true, violations: viewerAudit.violations});
    assert.deepEqual(viewerAudit.violations.map(item => item.id), [], 'Image viewer accessibility');
    await page.screenshot({path: `${evidence}/image-viewer-${viewport.name}.png`});
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.documentElement.classList.contains('viewer-open'));
    assert.equal(await dialog.isVisible(), false);
    assert.ok(await trigger.evaluate(node => node === document.activeElement));
    assert.equal(await page.locator('html.viewer-open').count(), 0);
    checked(`${viewport.name}: full-width image dialog supports zoom, pan/pinch, fit, focus containment and Escape return`);

    await page.goto(origin + '/history_math/ru/articles/demo-geometry/', {waitUntil: 'networkidle'});
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.ok(await page.locator('.article-body').evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 17.2);
    assert.ok(await page.locator('.article-body figcaption').evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 16);
    assert.equal(await page.locator('.math-source:not([data-rendered=true])').count(), 0);
    await page.addScriptTag({content: axe});
    const articleAudit = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
    report.accessibility.push({viewport: viewport.name, path: '/ru/articles/demo-geometry/', theme: 'dark', violations: articleAudit.violations});
    assert.deepEqual(articleAudit.violations.map(item => item.id), [], 'Dark article accessibility');
    await page.locator('.article-body .image-trigger').click();
    await page.locator('#image-viewer').waitFor({state: 'visible'});
    await page.locator('[data-viewer-action="close"]').click();
    await page.goto(origin + '/history_math/', {waitUntil: 'networkidle'});
    assert.match(await page.title(), /Mathematics with Mansur$/);
    assert.doesNotMatch(await page.locator('.brand').innerText(), /abyi/);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('.theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    checked(`${viewport.name}: article figures and larger captions work; English branding and cross-page theme persist`);
    await page.waitForLoadState('networkidle');
    await context.close();
  }
  const restricted = await browser.newContext({viewport: {width: 390, height: 844}, colorScheme: 'dark'});
  await restricted.addInitScript(() => { Object.defineProperty(window, 'localStorage', {get() { throw new DOMException('Storage disabled', 'SecurityError'); }}); });
  const restrictedPage = await restricted.newPage();
  restrictedPage.on('pageerror', error => report.consoleErrors.push(error.message));
  await restrictedPage.goto(origin + '/history_math/ru/', {waitUntil: 'networkidle'});
  assert.equal(await restrictedPage.locator('html').getAttribute('data-theme'), 'dark');
  await restrictedPage.locator('.theme-toggle').click();
  assert.equal(await restrictedPage.locator('html').getAttribute('data-theme'), 'light');
  assert.ok(await restrictedPage.locator('#reshuffle').isVisible());
  await restricted.close();
  checked('System dark preference and blocked storage preserve working reading controls');
  }
  if (!discoveryOnly && !process.argv.includes('--resume-only')) {
  for (const theme of ['light', 'dark']) {
    for (const viewport of [{name: 'desktop', width: 1440, height: 1050}, {name: 'mobile', width: 390, height: 844}]) {
      const context = await browser.newContext({viewport, colorScheme: theme, reducedMotion: 'reduce', hasTouch: viewport.name === 'mobile'});
      const page = await context.newPage();
      page.on('pageerror', error => report.consoleErrors.push(error.message));
      page.on('requestfailed', request => recordRequestFailure(report, request));
      await page.goto(origin + '/history_math/ru/', {waitUntil: 'networkidle'});
      assert.equal(await page.locator('.hero-copy .eyebrow, .hero-credit').count(), 0);
      assert.equal(await page.locator('nav a[href$="/search/"]').innerText(), 'Поиск');
      const carousel = page.locator('#latest-cards');
      await carousel.scrollIntoViewIfNeeded();
      await carousel.hover({position: {x: 100, y: 100}});
      const pageTop = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 120);
      if (viewport.name === 'desktop') {
        await page.waitForFunction(() => document.querySelector('#latest-cards').scrollLeft > 100);
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - pageTop) < 2, 'Wheel moved the page inside the strip');
        await carousel.evaluate(node => { node.scrollLeft = node.scrollWidth - node.clientWidth; });
        await carousel.hover({position: {x: 100, y: 100}});
        // End the previous wheel gesture before testing native scroll chaining at a new boundary.
        await page.waitForTimeout(700);
        const atEnd = await page.evaluate(() => scrollY);
        await page.mouse.wheel(0, 120);
        // Chromium may consume one boundary event while reconciling fractional scroll widths.
        await page.waitForTimeout(200);
        if (await page.evaluate(() => scrollY) <= atEnd + 10) await page.mouse.wheel(0, 120);
        await page.waitForFunction(top => scrollY > top + 10, atEnd);
        await carousel.scrollIntoViewIfNeeded();
        await carousel.evaluate(node => { node.scrollLeft = 0; });
        await carousel.hover({position: {x: 100, y: 100}});
        await page.waitForTimeout(700);
        const atStart = await page.evaluate(() => scrollY);
        await page.mouse.wheel(0, -120);
        await page.waitForFunction(top => scrollY < top - 10, atStart);
        await carousel.scrollIntoViewIfNeeded();
        const image = page.locator('.card-image').first();
        const bounds = await image.boundingBox();
        const before = page.url();
        await page.mouse.move(bounds.x + bounds.width - 20, bounds.y + 35);
        await page.mouse.down();
        await page.mouse.move(bounds.x + 12, bounds.y + 35, {steps: 12});
        await page.mouse.up();
        await page.waitForFunction(() => document.querySelector('#latest-cards').scrollLeft > 100);
        assert.equal(page.url(), before, 'Dragging followed an article link');
        assert.equal(await carousel.evaluate(node => node.classList.contains('is-dragging')), false);
        const destination = new URL(await image.getAttribute('href'), origin).href;
        await image.click();
        await page.waitForURL(destination);
        await page.goto(origin + '/history_math/ru/articles/demo-geometry/', {waitUntil: 'networkidle'});
        checked(`${theme}: mouse drag preserves link clicks; wheel browses cards and releases page scrolling at both ends`);
      } else {
        await page.waitForFunction(top => scrollY > top + 10, pageTop);
        assert.equal(await carousel.evaluate(node => node.scrollLeft), 0);
        assert.equal(await page.locator('.carousel-controls').isVisible(), false);
        await page.goto(origin + '/history_math/ru/articles/demo-geometry/', {waitUntil: 'networkidle'});
        checked(`${theme}: mobile material cards retain ordinary vertical scrolling`);
      }
      await page.waitForLoadState('networkidle');
      const prose = page.locator('.prose');
      const measurements = await prose.evaluate(node => {
        const style = getComputedStyle(node);
        const paragraph = getComputedStyle(node.querySelector('p'));
        return {size: parseFloat(style.fontSize), leading: parseFloat(style.lineHeight) / parseFloat(style.fontSize), gap: parseFloat(paragraph.marginBottom) / parseFloat(paragraph.fontSize)};
      });
      assert.ok(measurements.size >= 17.2 && measurements.size <= 19.5);
      assert.ok(measurements.leading <= 1.6 && measurements.leading >= 1.5);
      assert.ok(measurements.gap <= 0.8);
      assert.equal(await page.locator('.math-source[data-rendered=true]').count(), 7);
      const formula = await page.locator('.math-source[data-display=true]').evaluate(node => ({height: node.getBoundingClientRect().height, content: node.querySelector('.katex').getBoundingClientRect().height, size: parseFloat(getComputedStyle(node).fontSize)}));
      assert.ok(formula.height - formula.content <= formula.size * 2, 'Display formula has doubled vertical padding');
      const content = await prose.innerHTML();
      await page.locator('.theme-toggle').click();
      assert.equal(await prose.innerHTML(), content, 'Theme changed article markup');
      await page.locator('.theme-toggle').click();
      await page.addScriptTag({content: axe});
      const audit = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
      report.accessibility.push({viewport: viewport.name, path: '/ru/articles/demo-geometry/', theme, violations: audit.violations});
      assert.deepEqual(audit.violations.map(item => item.id), []);
      await page.screenshot({path: `${evidence}/compact-article-${theme}-${viewport.name}.png`, fullPage: true});
      checked(`${theme} ${viewport.name}: compact readable prose, rendered formulas, one article markup for both themes and WCAG AA`);
      await context.close();
    }
  }
  const motionContext = await browser.newContext({viewport: {width: 1440, height: 1050}, reducedMotion: 'no-preference'});
  const motionPage = await motionContext.newPage();
  await motionPage.goto(origin + '/history_math/ru/', {waitUntil: 'networkidle'});
  await motionPage.locator('.material-card').first().hover();
  await motionPage.waitForFunction(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.material-card')).transform).m42 < -1.5);
  await motionPage.emulateMedia({reducedMotion: 'reduce'});
  assert.equal(await motionPage.locator('.material-card').first().evaluate(node => getComputedStyle(node).transform), 'none');
  await motionPage.emulateMedia({reducedMotion: 'no-preference'});
  await motionPage.locator('#latest-cards').hover({position: {x: 100, y: 100}});
  await motionPage.mouse.wheel(0, 120);
  await motionPage.waitForFunction(() => document.querySelector('#latest-cards').scrollLeft >= 119);
  const clickImage = motionPage.locator('.card-image').first();
  const clickDestination = new URL(await clickImage.getAttribute('href'), origin).href;
  await clickImage.scrollIntoViewIfNeeded();
  const clickBounds = await clickImage.boundingBox();
  await motionPage.mouse.move(clickBounds.x + 35, clickBounds.y + 35);
  await motionPage.mouse.down();
  await motionPage.mouse.move(clickBounds.x + 38, clickBounds.y + 35);
  await motionPage.mouse.up();
  await motionPage.waitForURL(clickDestination);
  await motionContext.close();
  checked('Normal motion: small card lift, continuous wheel browsing and small pointer movement keep ordinary links usable; reduced motion keeps cards stationary');
  }
  if (!discoveryOnly && !process.argv.includes('--polish-only') && !process.argv.includes('--reading-only')) await runReaderChecks({browser, origin, evidence, axe, report, checked});
  if (discoveryOnly || !process.argv.some(flag => ['--polish-only', '--reading-only', '--resume-only'].includes(flag))) await runDiscoveryChecks({browser, origin, evidence, axe, report, checked});
  }
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.requestFailures, []);
  checked('No browser console errors or failed requests');
} finally {
  await writeFile(`${evidence}/browser-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  server.close();
}

// Complete runs also verify the final article/translation navigation with an isolated fixture.
if (process.argv.length === 2) {
  execFileSync('bundle', ['exec', 'ruby', 'tests/translation_notices_test.rb'], {stdio: 'inherit'});
  await import('./translation-notices-browser.mjs');
}
