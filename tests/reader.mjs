import assert from 'node:assert/strict';

export async function runReaderChecks({browser, origin, evidence, axe, report, checked}) {
  const home = origin + '/history_math/ru/';
  const article = home + 'articles/demo-geometry/';
  const other = home + 'articles/demo-area/';
  const key = 'history-math:reading:/history_math/ru/articles/demo-geometry/';
  let validPosition;
  function track(page) {
    page.on('pageerror', error => report.consoleErrors.push(error.message));
    page.on('requestfailed', request => report.requestFailures.push(request.url()));
  }
  async function audit(page, label) {
    await page.addScriptTag({content: axe});
    const result = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
    report.accessibility.push({label, violations: result.violations});
    assert.deepEqual(result.violations.map(item => ({id: item.id, targets: item.nodes.map(node => node.target)})), [], label);
  }
  for (const start of [{name: 'desktop', width: 1440, height: 1050, theme: 'light'}, {name: 'mobile', width: 390, height: 844, theme: 'dark'}]) {
    const context = await browser.newContext({viewport: start, colorScheme: start.theme, reducedMotion: 'reduce'});
    const page = await context.newPage();
    track(page);
    await page.goto(home, {waitUntil: 'networkidle'});
    assert.deepEqual(await page.getByRole('navigation', {name: 'Основная навигация', exact: true}).locator('a').allTextContents(), ['Главная', 'Читальный зал', 'Витрина', 'Поиск']);
    assert.ok(await page.locator('.masthead-about').isVisible());
    assert.equal((await page.locator('.latest-section .eyebrow').first().textContent()).trim(), 'Читальный зал');
    const summarySize = await page.locator('.hero-copy .lead').evaluate(node => getComputedStyle(node).fontSize);
    assert.equal(summarySize, await page.locator('.card-copy > p:not(.eyebrow)').first().evaluate(node => getComputedStyle(node).fontSize));
    assert.equal(summarySize, '17px');
    for (const width of [320, 390, 760, 1440]) {
      await page.setViewportSize({width, height: 1050});
      assert.ok(await page.locator('.masthead-about').isVisible());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1).slice(0,8).map(node => ({tag:node.tagName,class:node.className,right:node.getBoundingClientRect().right,width:innerWidth})))));
    }
    await page.setViewportSize({width: start.width, height: start.height});
    await page.getByRole('link', {name: 'Витрина', exact: true}).click();
    assert.equal(await page.getByRole('link', {name: 'Витрина', exact: true}).getAttribute('aria-current'), 'page');
    assert.equal(await page.getByRole('link', {name: 'Книга на Ridero', exact: false}).getAttribute('href'), 'https://ridero.ru/books/istoriya_matematiki/');
    assert.equal(await page.locator('.showcase-book').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await audit(page, start.theme + ' ' + start.name + ': showcase');
    await page.screenshot({path: `${evidence}/showcase-${start.name}.jpg`, fullPage: true});
    await page.goto(article, {waitUntil: 'networkidle'});
    assert.equal(await page.locator('.reading-resume').isVisible(), false);
    assert.equal(await page.evaluate(() => scrollY), 0);
    assert.equal(await page.locator('.math-source[data-rendered=true]').count(), 7);
    const typography = await page.locator('.article-body').evaluate(node => ({size: parseFloat(getComputedStyle(node).fontSize), leading: parseFloat(getComputedStyle(node).lineHeight) / parseFloat(getComputedStyle(node).fontSize)}));
    assert.ok(typography.size >= 17.2 && typography.size <= 19.5);
    assert.ok(Math.abs(typography.leading - 1.55) < 0.01);
    const paragraph = page.locator('.article-body > p').first();
    await paragraph.evaluate(node => window.scrollTo({top: scrollY + node.getBoundingClientRect().top + node.getBoundingClientRect().height * 0.25 - 24, behavior: 'instant'}));
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.offset > 0, key);
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    validPosition = saved;
    await page.goto(other, {waitUntil: 'networkidle'});
    assert.equal(await page.locator('.reading-resume').isVisible(), false, 'Another article inherited the reading position');
    const returnViewport = start.name === 'desktop' ? {width: 390, height: 844} : {width: 1440, height: 1050};
    await page.setViewportSize(returnViewport);
    await page.goto(article, {waitUntil: 'networkidle'});
    await page.locator('.reading-resume').waitFor({state: 'visible'});
    const alignment = await paragraph.evaluate((node, offset) => node.getBoundingClientRect().top + node.getBoundingClientRect().height * offset, saved.offset);
    assert.ok(Math.abs(alignment - 24) < 3, `Paragraph position changed after responsive reflow: ${alignment}`);
    await audit(page, start.theme + ' ' + start.name + ': resumed article');
    await page.screenshot({path: `${evidence}/resumed-${start.name}.jpg`, fullPage: false});
    await page.getByRole('link', {name: 'Главная', exact: true}).click();
    await page.getByRole('link', {name: 'Начать с чертежа', exact: true}).click();
    await page.locator('.reading-resume').waitFor({state: 'visible'});
    const menuAlignment = await paragraph.evaluate((node, offset) => node.getBoundingClientRect().top + node.getBoundingClientRect().height * offset, saved.offset);
    assert.ok(Math.abs(menuAlignment - 24) < 3, 'Header navigation cleared the reading position');
    const restoredTop = await page.evaluate(() => scrollY);
    await page.goto(other, {waitUntil: 'networkidle'});
    await page.goBack({waitUntil: 'networkidle'});
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - restoredTop) < 3, 'Native back navigation lost its position');
    await page.goto(other, {waitUntil: 'networkidle'});
    await page.goto(article, {waitUntil: 'networkidle'});
    await page.locator('.reading-resume [data-reading-start]').click();
    assert.equal(await page.evaluate(() => scrollY), 0);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    assert.equal(await page.locator('.reading-resume').isVisible(), false);
    assert.equal(await page.locator('.article-heading h1').evaluate(node => node === document.activeElement), true);
    await page.reload({waitUntil: 'networkidle'});
    assert.equal(await page.evaluate(() => scrollY), 0);
    await page.evaluate(({key, saved}) => localStorage.setItem(key, JSON.stringify(saved)), {key, saved});
    await page.goto(other, {waitUntil: 'networkidle'});
    await page.goto(article + '#' + encodeURIComponent('источники-и-дальнейшее-чтение'), {waitUntil: 'networkidle'});
    assert.equal(await page.locator('.reading-resume').isVisible(), false, 'Resume replaced an explicit section link');
    assert.ok(await page.locator('#источники-и-дальнейшее-чтение').evaluate(node => node.getBoundingClientRect().top < innerHeight));
    checked(`${start.name}: navigation, smaller type, accessible showcase, per-article resume across viewport changes, native back, explicit anchors and restart`);
    await context.close();
  }

  const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  const page = await context.newPage();
  track(page);
  await page.goto(other, {waitUntil: 'networkidle'});
  for (const value of ['{broken', JSON.stringify({version: 1, anchor: 'missing', offset: 0.2, updated: Date.now()}), JSON.stringify({...validPosition, updated: 1}), JSON.stringify({...validPosition, offset: -1}), JSON.stringify({...validPosition, updated: Date.now() + 60000})]) {
    await page.evaluate(({key, value}) => localStorage.setItem(key, value), {key, value});
    await page.goto(article, {waitUntil: 'networkidle'});
    assert.equal(await page.locator('.reading-resume').isVisible(), false);
    assert.equal(await page.evaluate(() => scrollY), 0);
    await page.goto(other, {waitUntil: 'networkidle'});
  }
  await context.close();
  const blocked = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  await blocked.addInitScript(() => { for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new DOMException('Blocked', 'SecurityError'); }; });
  const blockedPage = await blocked.newPage();
  track(blockedPage);
  await blockedPage.goto(article, {waitUntil: 'networkidle'});
  await blockedPage.locator('.article-body > p').first().scrollIntoViewIfNeeded();
  await blockedPage.goto(other, {waitUntil: 'networkidle'});
  await blockedPage.goto(article, {waitUntil: 'networkidle'});
  assert.equal(await blockedPage.locator('.reading-resume').isVisible(), false);
  assert.equal(await blockedPage.locator('.math-source[data-rendered=true]').count(), 7);
  await blocked.close();
  checked('Malformed, expired, obsolete and blocked local storage preserve normal article reading');
}
