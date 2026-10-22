import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {journalGroups, newestFirst, seriesKey, rubricArticles, articleCandidates, search} from '../site/assets/core.js';
import {publishedArticles} from './published-articles.mjs';

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
const englishRecords = JSON.parse(await readFile('_site/assets/search-en.json', 'utf8'));
await mkdir('test-results/journal-polish', {recursive: true});
const readingRules = JSON.parse(await readFile('site/_data/reading_selection.json', 'utf8'));
async function checkReading(page, records, language, randomized = true) {
  const articles = records.filter(record => record.language === language && record.status === 'published').sort(newestFirst);
  const urls = await page.locator('#latest-cards h3 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  const reading = urls.map(url => articles.find(record => record.url === url));
  assert.equal(urls.length, Math.min(readingRules.card_count, articles.length));
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(reading.every(record => record && articles.slice(0, readingRules.pool_size).includes(record)));
  assert.deepEqual(reading, [...reading].sort(newestFirst));
  const counts = new Map();
  let capacity = 0;
  for (const record of articles.slice(0, readingRules.pool_size)) {
    const key = seriesKey(record, readingRules);
    if (!key) capacity++;
    else counts.set(key, (counts.get(key) || 0) + 1);
  }
  capacity += [...counts.values()].reduce((sum, count) => sum + Math.min(count, readingRules.series_limit), 0);
  if (capacity >= urls.length) {
    for (const key of counts.keys()) assert.ok(reading.filter(record => seriesKey(record, readingRules) === key).length <= readingRules.series_limit);
  }
  if (!randomized) assert.deepEqual(reading, journalGroups(records, language, readingRules, {random: () => 1 - Number.EPSILON}).reading);
  const archive = articles.filter(record => !urls.includes(record.url));
  const archiveUrls = await page.locator('#archive-cards h3 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  assert.ok(archiveUrls.every(url => archive.some(record => record.url === url)));
  return {reading, archive};
}

async function checkArticlePicks(page, records, language) {
  const container = page.locator('#article-picks');
  const tags = (await container.getAttribute('data-exclude-tags')).split('|');
  const pool = articleCandidates(records, language, tags);
  const urls = await container.locator('a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  assert.equal(await page.locator('#article-picks-heading').textContent(), language === 'ru' ? 'Статьи' : 'Articles');
  assert.equal(urls.length, Math.min(3, pool.length));
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every(url => pool.some(record => record.url === url)));
  assert.equal(await container.locator('.selection-empty').count(), pool.length ? 0 : 1);
  await checkHeroColumns(page);
  return urls;
}

async function checkHeroColumns(page) {
  const width = page.viewportSize().width;
  assert.ok(await page.locator('.hero-pick img').evaluateAll(images => images.every(image =>
    ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].every(corner =>
      parseFloat(getComputedStyle(image)[`border${corner}Radius`]) > 0))), 'All hero thumbnails have rounded corners');
  const [copy, articles, rubrics] = await page.locator('.hero-copy, .hero-articles, .hero-rubrics')
    .evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return {x: box.x, top: box.top, bottom: box.bottom}; }));
  const cards = await page.locator('#article-picks > a').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return {x: box.x, top: box.top, bottom: box.bottom};
  }));
  if (width > 1100) {
    assert.ok(copy.x < articles.x && articles.x < rubrics.x, 'Keep the three desktop columns in order');
    assert.ok(Math.abs(articles.top - rubrics.top) <= 1, `Hero column tops differ at ${width}px`);
    assert.ok(Math.abs(articles.bottom - rubrics.bottom) <= 1, `Hero column bottoms differ at ${width}px`);
    for (let index = 1; index < cards.length; index++) {
      assert.ok(cards[index].top >= cards[index - 1].bottom, 'Ordinary articles form one vertical column');
    }
  } else if (width > 620) {
    assert.ok(articles.top >= rubrics.bottom, 'Tablet article row follows the introductory columns');
    if (cards.length === 3) {
      assert.ok(cards.every(card => Math.abs(card.top - cards[0].top) <= 1), 'Three articles share the tablet row');
      assert.ok(cards[0].x < cards[1].x && cards[1].x < cards[2].x);
    }
  } else {
    assert.ok(articles.top >= copy.bottom && rubrics.top >= articles.bottom, 'Mobile sections remain in reading order');
    for (let index = 1; index < cards.length; index++) assert.ok(cards[index].top >= cards[index - 1].bottom);
  }
  const rubricCards = await page.locator('.hero-rubric').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return {top: box.top, bottom: box.bottom};
  }));
  assert.equal(rubricCards.length, 2);
  assert.ok(rubricCards[1].top >= rubricCards[0].bottom, 'Keep humor above the single personality card');
}

async function checkArticleLayout(page) {
  const geometry = await page.evaluate(() => {
    const edges = node => { const box = node.getBoundingClientRect(); return {left: box.left, right: box.right, top: box.top, bottom: box.bottom}; };
    const nav = document.querySelector('.reading-navigation');
    return {
      separator: edges(document.querySelector('.article-spread')),
      details: edges(document.querySelector('.article-details')),
      pdf: edges(document.querySelector('.article-pdf')),
      meta: edges(document.querySelector('.article-meta')),
      nav: edges(nav),
      links: [...nav.querySelectorAll('a')].map(node => ({...edges(node), next: node.rel === 'next',
        alignment: [...node.children].map(span => getComputedStyle(span).textAlign)}))
    };
  });
  assert.ok(Math.abs(geometry.details.left - geometry.separator.left) <= 1 && Math.abs(geometry.details.right - geometry.separator.right) <= 1,
    'Publication details span the full separator width');
  assert.ok(Math.abs(geometry.pdf.right - geometry.separator.right) <= 1,
    'The compact PDF button sits at the right edge of the full article column');
  assert.ok(geometry.pdf.right - geometry.pdf.left < Math.min(160, (geometry.separator.right - geometry.separator.left) / 2),
    'The PDF button keeps its compact size');
  assert.ok(Math.abs(geometry.meta.left - geometry.separator.left) <= 1 && geometry.meta.right <= geometry.pdf.left,
    'Author metadata stays left without overlapping the PDF button');
  assert.ok(Math.abs((geometry.pdf.top + geometry.pdf.bottom) - (geometry.meta.top + geometry.meta.bottom)) <= 2,
    'The PDF button and author metadata share the same vertically centered row');
  assert.ok(geometry.details.top >= geometry.pdf.bottom, 'Publication details follow the PDF button');
  for (const link of geometry.links) {
    assert.ok(Math.abs(link.next ? link.right - geometry.nav.right : link.left - geometry.nav.left) <= 1,
      'Next stays at the right edge and previous stays at the left edge, including single-link navigation');
    if (link.next) assert.deepEqual(link.alignment, ['right', 'right'], 'Both next-article label and title align right');
  }
}

async function audit(page) {
  await page.locator('img').evaluateAll(async images => { for (const image of images) image.loading = 'eager'; await Promise.all(images.map(image => image.decode())); });
  await page.addScriptTag({path: 'node_modules/axe-core/axe.min.js'});
  const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations);
  assert.deepEqual(violations.map(item => ({id: item.id, nodes: item.nodes.map(node => node.target)})), [], page.url());
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false,
    `Horizontal page overflow at ${page.url()}`);
}
try {
  const expected = publishedArticles();
  assert.ok(expected.length > 0, 'The journal check needs published source articles');
  for (const [language, index] of [['ru', records], ['en', englishRecords]]) {
    assert.deepEqual(index.map(record => record.url).sort(),
      expected.filter(article => article.lang === language).map(article => '/history_math' + article.url).sort());
  }
  assert.ok(records.every(record => record.status === 'published' && !record.url.includes('/demo-')));
  assert.ok(englishRecords.every(record => record.status === 'published' && !record.translation_notice));
  for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({viewport: {width, height: 1000}, colorScheme: theme, reducedMotion: 'reduce', timezoneId: 'Europe/Moscow'});
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    for (const language of ['ru', 'en']) {
      const prefix = language === 'ru' ? '/ru' : '';
      const index = language === 'ru' ? records : englishRecords;
      await page.goto(production.base + prefix + '/', {waitUntil: 'networkidle'});
      const groups = await checkReading(page, index, language);
      await checkArticlePicks(page, index, language);
      if (width > 1100) {
        const boxes = await page.locator('.hero-copy, .hero-articles, .hero-rubrics').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().x));
        assert.ok(boxes[0] < boxes[1] && boxes[1] < boxes[2]);
      }
      assert.equal(await page.locator('#latest-heading').textContent(), language === 'ru' ? 'Рекомендуем почитать' : 'Articles to Explore');
      assert.equal(await page.locator('.masthead-blog').count(), language === 'ru' ? 1 : 0);
      if (language === 'ru') {
        assert.deepEqual(await page.locator('.masthead-links a').allTextContents(), ['Наш блог', 'О журнале']);
        assert.equal(await page.locator('.masthead-blog').getAttribute('href'), 'https://t.me/history_math');
      }
      assert.equal(await page.locator('.plate-label, .carousel-status, .journal-pagination').count(), 0);
      for (const rubric of await page.locator('[data-rubric]').all()) {
        const tags = (await rubric.getAttribute('data-rubric-tags')).split('|');
        const pool = rubricArticles(index, language, tags);
        assert.equal(await rubric.locator('a').count(), pool.length ? 1 : 0);
        assert.equal(await rubric.locator('.selection-empty').count(), pool.length ? 0 : 1);
        if (pool.length) {
          const href = await rubric.locator('a').getAttribute('href');
          assert.ok(pool.some(record => record.url === href));
        }
      }
      assert.equal(await page.locator('.archive-section').isVisible(), true);
      assert.equal(await page.locator('#archive-cards h3 a').count(), Math.min(4, groups.archive.length));
      assert.equal(await page.locator('#archive-cards .selection-empty').count(), groups.archive.length ? 0 : 1);
      const navigation = page.locator('.navigation-bar > nav');
      assert.deepEqual(await navigation.locator('a').allTextContents(), language === 'ru' ?
        ['Главная', 'Читальный зал', 'Витрина', 'Поиск'] : ['Home', 'Reading room', 'Showcase', 'Search']);
      assert.deepEqual(await navigation.locator('a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))),
        ['/', '/materials/', '/showcase/', '/search/'].map(path => '/history_math' + prefix + path));
      assert.equal(await page.locator('#latest-cards .translation-label').count(), 0);
      for (const heading of await page.locator('h1, h2, h3').allTextContents()) {
        // An author's closing ellipsis is valid title punctuation.
        assert.doesNotMatch(heading.trim().replace(/(?:\.{3}|…)$/, ''), /\.$/);
      }
      assert.doesNotMatch(await page.locator('.about-teaser').innerText(), /международного математического|international mathematics/);
      await audit(page);
      await page.screenshot({path: `test-results/journal-polish/home-${language}-${width}-${theme}.png`, fullPage: true});
      await page.goto(production.base + prefix + '/materials/', {waitUntil: 'networkidle'});
      assert.equal(await page.locator('.catalog-list .material-card').count(), Math.min(20, index.length));
      assert.equal(await page.locator('link[hreflang]').count(), 2);
      assert.equal((await page.locator('#catalog-count').innerText()).trim(),
        `${language === 'ru' ? 'Материалов' : 'Articles'}: ${index.length}`);
      await audit(page);
      await page.goto(production.base + prefix + '/search/', {waitUntil: 'networkidle'});
      assert.equal(await page.locator('link[hreflang]').count(), 2);
      const query = language === 'ru' ? 'Гарднер' : 'Gardner';
      const matches = search(index, query, language);
      assert.ok(matches.length > 0);
      await page.locator('#query').fill(query);
      await page.locator('#search-form button').click();
      await page.waitForFunction(count => document.querySelectorAll('#search-results h3 a').length === count, matches.length);
      assert.equal(await page.locator('#search-results .translation-label').count(), 0);
      assert.equal((await page.locator('#search-status').innerText()).trim(),
        `${language === 'ru' ? 'Найдено материалов' : 'Articles found'}: ${matches.length}`);
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
      await checkArticleLayout(page);
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
  for (const [language, index] of [['ru', records], ['en', englishRecords]]) {
    const page = await browser.newPage();
    await page.goto(production.base + index[0].url.replace('/history_math', ''), {waitUntil: 'networkidle'});
    const target = '/history_math' + (language === 'ru' ? '/ru' : '') + '/materials/';
    assert.equal(await page.locator('.back-link').getAttribute('href'), target);
    assert.equal(await page.locator('.article-end > a').getAttribute('href'), target);
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
    const page = await browser.newPage({viewport: {width, height: 1000}, javaScriptEnabled, reducedMotion: 'reduce'});
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(fixture.base + prefix + '/', {waitUntil: 'networkidle'});
    const urls = selector => page.locator(selector).evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    const groups = await checkReading(page, fixtureRecords, language, javaScriptEnabled);
    const articleBefore = await checkArticlePicks(page, fixtureRecords, language);
    if (width === 1440) {
      for (const responsiveWidth of [620, 621, 768, 1100, 1101, 1270, 1440]) {
        await page.setViewportSize({width: responsiveWidth, height: 1000});
        await checkHeroColumns(page);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      }
    }
    assert.deepEqual([groups.reading.length, groups.archive.length], [10, 41]);
    assert.equal(await page.locator('#hero-picks a').count(), 2);
    assert.equal(await page.locator('#archive-cards h3 a').count(), 4);
    assert.equal(await page.locator('#archive-cards img, .journal-pagination').count(), 0);
    for (const rubric of await page.locator('[data-rubric]').all()) {
      const tags = (await rubric.getAttribute('data-rubric-tags')).split('|');
      const href = await rubric.locator('a').getAttribute('href');
      assert.ok(rubricArticles(fixtureRecords, language, tags).some(record => record.url === href));
    }
    assert.ok((await urls('#archive-cards h3 a')).every(url => groups.archive.some(record => record.url === url)));
    const all = [...await urls('#latest-cards h3 a'), ...await urls('#archive-cards h3 a')];
    assert.equal(new Set(all).size, 14);
    const boxes = await page.locator('#hero-picks a').evaluateAll(nodes => nodes.map(n => { const b=n.getBoundingClientRect(); return {x:b.x,y:b.y,width:b.width}; }));
    assert.ok(boxes[1].y > boxes[0].y && Math.abs(boxes[1].x - boxes[0].x) < 1);
    assert.ok(await page.locator('#hero-picks img').evaluateAll(nodes => nodes.every(n => n.clientWidth <= 80)));
    if (javaScriptEnabled) {
      const readingBefore = await urls('#latest-cards h3 a');
      assert.equal(await page.locator('#reshuffle').count(), 0);
      const heroBefore = await urls('#hero-picks a');
      const archiveBefore = await urls('#archive-cards h3 a');
      await page.reload({waitUntil: 'networkidle'});
      const heroAfter = await urls('#hero-picks a');
      assert.ok(heroAfter.every((url, index) => url !== heroBefore[index]));
      assert.notDeepEqual((await urls('#archive-cards h3 a')).sort(), archiveBefore.sort());
      assert.notDeepEqual(await urls('#latest-cards h3 a'), readingBefore);
      assert.notDeepEqual((await checkArticlePicks(page, fixtureRecords, language)).sort(), articleBefore.sort());
      await checkReading(page, fixtureRecords, language);
      await audit(page);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({path: `test-results/journal-polish/populated-${language}-${width}-${javaScriptEnabled}.png`, fullPage: true});
    await page.locator('.cover-bottom a').click();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('.catalog-list .material-card').count(), Math.min(20, fixtureRecords.length));
    await page.close();
  }
  // Storage failures must preserve usable rubric cards and normal navigation.
  for (const storageMode of ['blocked', 'malformed']) {
    const page = await browser.newPage({viewport: {width: 390, height: 1000}});
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(mode => {
      if (mode === 'blocked') {
        for (const method of ['getItem', 'setItem']) Storage.prototype[method] = () => { throw new DOMException('Blocked', 'SecurityError'); };
      } else {
        sessionStorage.setItem('history-math:article-picks:en', '{broken');
        sessionStorage.setItem('history-math:reading:en', '{broken');
        sessionStorage.setItem('history-math:rubric:en:humor', '{broken');
        sessionStorage.setItem('history-math:rubric:en:people', '{"unexpected":true}');
      }
    }, storageMode);
    await page.goto(fixture.base + '/', {waitUntil: 'networkidle'});
    assert.equal(await page.locator('#hero-picks a').count(), 2);
    const fixtureIndex = JSON.parse(await readFile('test-results/browser-fixture/assets/discovery-en.json', 'utf8'));
    await checkReading(page, fixtureIndex, 'en');
    await checkArticlePicks(page, fixtureIndex, 'en');
    const readingBefore = await page.locator('#latest-cards h3 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    const before = await page.locator('#hero-picks a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
    const after = await page.locator('#hero-picks a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    assert.ok(after.every((url, index) => url !== before[index]));
    const readingAfter = await page.locator('#latest-cards h3 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    assert.notDeepEqual(readingAfter, readingBefore);
    await checkReading(page, fixtureIndex, 'en');
    await checkArticlePicks(page, fixtureIndex, 'en');
    await page.locator('.cover-bottom a').click();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('.catalog-list .material-card').count(), 20);
    await page.close();
  }
  // Existing topic URLs converge on the canonical option, label and result set.
  const legacy = await browser.newPage();
  const fixtureIndex = JSON.parse(await readFile('test-results/browser-fixture/assets/discovery-en.json', 'utf8'));
  const expectedTopic = fixtureIndex.filter(record => record.tags.includes('History of Mathematics'));
  assert.ok(expectedTopic.length > 1);
  await legacy.goto(fixture.base + '/materials/?tag=history_of_mathematics', {waitUntil: 'networkidle'});
  assert.equal(await legacy.locator('#tag-filter').inputValue(), 'History of Mathematics');
  assert.equal(await legacy.locator('#tag-filter option').filter({hasText: /^History of Mathematics$/}).count(), 1);
  assert.equal(new URL(legacy.url()).searchParams.get('tag'), 'History of Mathematics');
  assert.equal(await legacy.locator('.catalog-list .material-card').count(), Math.min(20, expectedTopic.length));
  await legacy.goto(fixture.base + '/search/?tag=History%20of%20mathematics', {waitUntil: 'networkidle'});
  assert.equal(await legacy.locator('#search-topic strong').textContent(), 'History of Mathematics');
  assert.equal(await legacy.locator('#search-results h3 a').count(), expectedTopic.filter(record => !record.translation_notice).length);
  await legacy.close();
  assert.deepEqual(errors, []);
  console.log('PASS: published source articles, captions, math punctuation, metadata/PDF placement, local-day reload, bilingual navigation/search/about pages, balanced recent selection and disjoint remaining archive, explicit-tag rubrics, reload rotation and visible empty states with/without JS');
} finally {
  await browser.close();
  await Promise.all([production, fixture].map(({server}) => new Promise(done => server.close(done))));
}
