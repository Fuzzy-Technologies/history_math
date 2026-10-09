import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {journalGroups} from '../site/assets/core.js';

async function serve(directory) {
  const root = resolve(directory);
  const mime = {'.webp': 'image/webp', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.pdf': 'application/pdf'};
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith('/history_math/')) { response.writeHead(404).end(); return; }
      let path = resolve(root, '.' + decodeURIComponent(url.pathname.slice('/history_math'.length)));
      if (path !== root && !path.startsWith(root + '/')) { response.writeHead(403).end(); return; }
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
      response.end(await readFile(path));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return {server, base: `http://127.0.0.1:${server.address().port}/history_math`};
}
const production = await serve('_site');
const fixture = await serve('test-results/browser-fixture');
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
const errors = [];
const records = JSON.parse(await readFile('_site/assets/search-ru.json', 'utf8'));
await mkdir('test-results/journal-polish', {recursive: true});
async function audit(page) {
  await page.locator('img').evaluateAll(async images => { for (const image of images) image.loading = 'eager'; await Promise.all(images.map(image => image.decode())); });
  await page.addScriptTag({path: 'node_modules/axe-core/axe.min.js'});
  const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations);
  assert.deepEqual(violations.map(item => ({id: item.id, nodes: item.nodes.map(node => node.target)})), [], page.url());
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
}
try {
  assert.equal(records.length, 5);
  assert.ok(records.every(record => record.status === 'published' && !record.url.includes('/demo-')));
  for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({viewport: {width, height: 1000}, colorScheme: theme, reducedMotion: 'reduce', timezoneId: 'Europe/Moscow'});
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    for (const language of ['ru', 'en']) {
      const prefix = language === 'ru' ? '/ru' : '';
      await page.goto(production.base + prefix + '/', {waitUntil: 'networkidle'});
      assert.equal(await page.locator('#latest-cards .material-card').count(), 5);
      assert.equal(await page.locator('.plate-label, .carousel-status, .journal-pagination').count(), 0);
      assert.equal(await page.locator('#hero-picks a').count(), 0);
      assert.equal(await page.locator('#hero-picks .selection-empty').isVisible(), true);
      assert.equal(await page.locator('.archive-section').isVisible(), true);
      assert.equal(await page.locator('#archive-cards .selection-empty').isVisible(), true);
      const navigation = page.locator('.navigation-bar > nav');
      assert.deepEqual(await navigation.locator('a').allTextContents(), language === 'ru' ?
        ['Главная', 'Читальный зал', 'Витрина', 'Поиск'] : ['Home', 'Reading room', 'Showcase', 'Search']);
      assert.deepEqual(await navigation.locator('a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))),
        ['/', '/materials/', '/showcase/', '/search/'].map(path => '/history_math' + prefix + path));
      assert.equal(await page.locator('#latest-cards .translation-label').count(), language === 'en' ? 5 : 0);
      for (const heading of await page.locator('h1, h2, h3').allTextContents()) assert.doesNotMatch(heading.trim(), /\.$/);
      assert.doesNotMatch(await page.locator('.about-teaser').innerText(), /международного математического|international mathematics/);
      await audit(page);
      await page.screenshot({path: `test-results/journal-polish/home-${language}-${width}-${theme}.png`, fullPage: true});
      await page.goto(production.base + prefix + '/materials/', {waitUntil: 'networkidle'});
      assert.equal(await page.locator('.catalog-list .material-card').count(), 5);
      assert.equal(await page.locator('link[hreflang]').count(), 2);
      assert.match(await page.locator('#catalog-count').innerText(), language === 'ru' ? /Материалов: 5/ : /Articles: 5/);
      await audit(page);
      await page.goto(production.base + prefix + '/search/', {waitUntil: 'networkidle'});
      assert.equal(await page.locator('link[hreflang]').count(), 2);
      await page.locator('#query').fill(language === 'ru' ? 'Гарднер' : 'Gardner');
      await page.locator('#search-form button').click();
      await page.waitForFunction(() => document.querySelectorAll('#search-results h3 a').length === 1);
      assert.equal(await page.locator('#search-results .translation-label').count(), language === 'en' ? 1 : 0);
      assert.match(await page.locator('#search-status').innerText(), language === 'ru' ? /Найдено материалов: 1/ : /Articles found: 1/);
      await audit(page);
    }
    for (const record of records) {
      const response = await page.goto(production.base + record.url.replace('/history_math', ''), {waitUntil: 'networkidle'});
      assert.equal(response.status(), 200);
      const captions = await page.locator('.article-body figcaption').allTextContents();
      for (const caption of captions) {
        assert.doesNotMatch(caption, /архивная репродукция|архив редакционного|редакционном архиве|Изображение без изменений|Иллюстрация с названием/i);
        assert.doesNotMatch(caption.trim(), /[.,;:]$/);
      }
      assert.equal(await page.locator('[data-citation-date]').count(), 0);
      assert.equal(await page.locator('.article-meta-row .article-pdf').count(), 1);
      assert.equal(await page.locator('.math-source:not([data-rendered=true])').count(), 0);
      assert.equal(await page.locator('.math-source[data-display=false]').evaluateAll(nodes => nodes.some(node => /[,.;:!?]$/.test(node.dataset.tex))), false);
      assert.equal(await page.locator('.math-with-punctuation').evaluateAll(nodes => nodes.some(node => {
        const text = node.lastChild; const range = document.createRange(); range.selectNode(text);
        return range.getBoundingClientRect().left < node.firstChild.getBoundingClientRect().left;
      })), false);
      if (record.url.includes('19a5')) {
        assert.equal(await page.locator('.article-body table').count(), 1);
        assert.equal(await page.locator('#fig-2').count(), 0);
        assert.match(await page.locator('.article-body').innerText(), /13/);
      }
      if (record.url.includes('5652')) assert.equal(await page.locator('#fig-1 figcaption').count(), 0);
      if (record.url.includes('0b1')) assert.match(await page.locator('h1').innerText(), /1734\u20131812/);
      await page.screenshot({path: `test-results/journal-polish/${record.url.split('/').at(-2)}-${width}-${theme}.png`, fullPage: true});
      await audit(page);
    }
    for (const language of ['ru', 'en']) {
      await page.goto(production.base + (language === 'ru' ? '/ru/about/' : '/about/'), {waitUntil: 'networkidle'});
      assert.equal(await page.locator('html').getAttribute('lang'), language);
      assert.match(await page.locator('.about-banner img').getAttribute('src'), language === 'ru' ? /Mansur-ru.svg$/ : /Mansur.svg$/);
      assert.equal(await page.locator('link[hreflang]').count(), 2);
      assert.doesNotMatch(await page.locator('main').innerText(), /Здесь можно читать|после редакционной подготовки|a place to read articles|after editorial preparation/);
      await audit(page);
    }
    await page.close();
  }
  const dated = await browser.newPage({timezoneId: 'Europe/Moscow'});
  await dated.clock.setFixedTime(new Date('2026-10-09T20:59:00Z'));
  await dated.goto(production.base + records[0].url.replace('/history_math', ''), {waitUntil: 'networkidle'});
  assert.equal(await dated.locator('[data-citation-access]').textContent(), '09.10.2026');
  await dated.clock.setFixedTime(new Date('2026-10-09T21:01:00Z'));
  await dated.reload({waitUntil: 'networkidle'});
  assert.equal(await dated.locator('[data-citation-access]').textContent(), '10.10.2026');
  await dated.close();
  for (const language of ['ru', 'en']) for (const width of [320, 1440]) for (const javaScriptEnabled of [true, false]) {
    const prefix = language === 'ru' ? '/ru' : '';
    const fixtureRecords = JSON.parse(await readFile(`test-results/browser-fixture/assets/discovery-${language}.json`, 'utf8'));
    const groups = journalGroups(fixtureRecords, language);
    assert.deepEqual([groups.latest.length, groups.featured.length, groups.archive.length], [10, 11, 30]);
    const page = await browser.newPage({viewport: {width, height: 1000}, javaScriptEnabled, reducedMotion: 'reduce'});
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(fixture.base + prefix + '/', {waitUntil: 'networkidle'});
    const urls = selector => page.locator(selector).evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    assert.deepEqual(await urls('#latest-cards h3 a'), groups.latest.map(record => record.url));
    assert.equal(await page.locator('#hero-picks a').count(), 4);
    assert.equal(await page.locator('#archive-cards h3 a').count(), 4);
    assert.equal(await page.locator('#archive-cards img, .journal-pagination').count(), 0);
    assert.ok((await urls('#hero-picks a')).every(url => groups.featured.some(record => record.url === url)));
    assert.ok((await urls('#archive-cards h3 a')).every(url => groups.archive.some(record => record.url === url)));
    const all = [...await urls('#latest-cards h3 a'), ...await urls('#hero-picks a'), ...await urls('#archive-cards h3 a')];
    assert.equal(new Set(all).size, 18);
    const boxes = await page.locator('#hero-picks a').evaluateAll(nodes => nodes.map(n => { const b=n.getBoundingClientRect(); return {x:b.x,y:b.y,width:b.width}; }));
    assert.ok(boxes[0].x < boxes[1].x && Math.abs(boxes[0].y - boxes[1].y) < 1);
    assert.ok(boxes[2].y > boxes[0].y && Math.abs(boxes[2].x - boxes[0].x) < 1);
    assert.ok(await page.locator('#hero-picks img').evaluateAll(nodes => nodes.every(n => n.clientWidth <= 120)));
    if (javaScriptEnabled) {
      const before = await urls('#archive-cards h3 a');
      await page.locator('#reshuffle').click();
      assert.notDeepEqual((await urls('#archive-cards h3 a')).sort(), before.sort());
      const heroBefore = await urls('#hero-picks a');
      const archiveBefore = await urls('#archive-cards h3 a');
      await page.reload({waitUntil: 'networkidle'});
      assert.notDeepEqual((await urls('#hero-picks a')).sort(), heroBefore.sort());
      assert.notDeepEqual((await urls('#archive-cards h3 a')).sort(), archiveBefore.sort());
      assert.deepEqual(await urls('#latest-cards h3 a'), groups.latest.map(record => record.url));
      await audit(page);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({path: `test-results/journal-polish/populated-${language}-${width}-${javaScriptEnabled}.png`, fullPage: true});
    await page.locator('.cover-bottom a').click();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('.catalog-list .material-card').count(), fixtureRecords.length);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: five published articles, captions, math punctuation, metadata/PDF placement, local-day reload, bilingual navigation/search/about pages, exclusive newest ten, quarter/three-quarter pools, reload rotation and visible empty states with/without JS');
} finally {
  await browser.close();
  await Promise.all([production, fixture].map(({server}) => new Promise(done => server.close(done))));
}
