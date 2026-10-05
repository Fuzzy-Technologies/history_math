import assert from 'node:assert/strict';

export async function runDiscoveryChecks({browser, origin, evidence, axe, report, checked}) {
  const base = origin + '/history_math';
  const records = await (await fetch(base + '/assets/search-ru.json')).json();
  async function audit(page, name) {
    await page.addScriptTag({content: axe});
    const result = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
    report.accessibility.push({name, violations: result.violations});
    assert.deepEqual(result.violations.map(item => ({id: item.id, targets: item.nodes.map(node => node.target)})), []);
  }
  for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({viewport: {width, height: 1000}, colorScheme: theme, reducedMotion: 'reduce', isMobile: width === 390, hasTouch: width === 390});
    const page = await context.newPage();
    page.on('pageerror', error => report.consoleErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => report.requestFailures.push(request.url()));
    await page.goto(base + '/ru/materials/', {waitUntil: 'networkidle'});
    const type = page.getByRole('combobox', {name: /^Тип материала/});
    const topic = page.getByRole('combobox', {name: /^Тема/});
    await type.click();
    await audit(page, `Open catalog menu ${width} ${theme}`);
    const bounds = await page.locator('#type-filter-list').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 1000);
    await page.screenshot({path: `${evidence}/styled-filters-${theme}-${width}.jpg`, fullPage: false});
    await type.press('End');
    await type.press('Escape');
    assert.equal(await page.locator('#type-filter').inputValue(), '');
    await type.press('ArrowDown');
    await type.press('ArrowDown');
    await type.press('ArrowDown');
    await type.press('Enter');
    assert.equal(await page.locator('.catalog-list .material-card:visible').count(), 1);
    assert.equal(await page.locator('#type-filter').inputValue(), 'problem');
    assert.equal(await type.evaluate(node => node === document.activeElement), true);
    await topic.click();
    await page.getByRole('option', {name: 'счёт', exact: true}).click();
    assert.equal(await page.locator('#catalog-empty').isVisible(), true);
    await type.click();
    await page.getByRole('option', {name: 'Все типы', exact: true}).click();
    assert.equal(await page.locator('.catalog-list .material-card:visible').count(), 1);
    await topic.click();
    await topic.press('Home');
    await topic.press('Tab');
    assert.equal(await page.locator('#tag-filter').inputValue(), '');
    assert.equal(await topic.getAttribute('aria-expanded'), 'false');
    await topic.click();
    // Playwright's physical-key map omits Cyrillic keys; provide their normal keydown values.
    for (const key of 'счет') await topic.dispatchEvent('keydown', {key, bubbles: true});
    await topic.press('Enter');
    assert.equal(await page.locator('#tag-filter').inputValue(), 'счёт');
    await topic.click();
    await page.getByRole('heading', {name: 'Материалы', exact: true}).click();
    assert.equal(await topic.getAttribute('aria-expanded'), 'false');
    checked(`${width} ${theme}: styled filters combine correctly; keyboard, type-ahead, Escape, Tab and outside dismissal work`);

    await page.goto(base + '/ru/', {waitUntil: 'networkidle'});
    const archive = page.locator('#archive-cards');
    const height = await archive.evaluate(node => node.getBoundingClientRect().height);
    for (let rotation = 0; rotation < 3; rotation += 1) {
      await page.locator('#reshuffle').click();
      assert.ok(Math.abs(await archive.evaluate(node => node.getBoundingClientRect().height) - height) < 2);
    }
    await page.locator('#latest-cards [data-tag="геометрия"]').first().click();
    await page.locator('#search-status').filter({hasText: 'Найдено материалов:'}).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('tag'), 'геометрия');
    const expected = records.filter(record => record.tags.includes('геометрия')).map(record => base + record.url.slice('/history_math'.length)).sort();
    assert.deepEqual(await page.locator('.search-result h3 a').evaluateAll(links => links.map(link => link.href).sort()), expected);
    assert.match(await page.locator('#search-topic').innerText(), /геометрия/);
    await page.reload({waitUntil: 'networkidle'});
    assert.equal(await page.locator('.search-result').count(), expected.length);
    await audit(page, `Tag search ${width} ${theme}`);
    await page.screenshot({path: `${evidence}/tag-search-${theme}-${width}.jpg`, fullPage: true});
    await page.locator('.search-result [data-tag="идеи"]').first().click();
    await page.locator('#search-status').filter({hasText: 'Найдено материалов:'}).waitFor();
    assert.equal(await page.locator('.search-result').count(), records.filter(record => record.tags.includes('идеи')).length);
    await page.locator('#search-topic button').click();
    assert.equal(await page.locator('#search-topic').isVisible(), false);
    assert.equal(await page.locator('#query').evaluate(node => node === document.activeElement), true);
    assert.equal(new URL(page.url()).searchParams.has('tag'), false);
    await page.goto(base + '/ru/search/?tag=%D0%A1%D0%A7%D0%95%D0%A2&q=ignored', {waitUntil: 'networkidle'});
    assert.equal(await page.locator('.search-result').count(), 1);
    assert.equal(new URL(page.url()).searchParams.has('q'), false);
    await page.locator('#query').fill('радиусами');
    await page.locator('#search-form button').click();
    await page.locator('#search-status').filter({hasText: 'Найдено материалов:'}).waitFor();
    assert.equal(await page.locator('.search-result').count(), 1);
    assert.equal(new URL(page.url()).searchParams.has('tag'), false);
    await page.goto(base + '/ru/search/?tag=unknown', {waitUntil: 'networkidle'});
    assert.equal(await page.locator('.search-result').count(), 0);
    assert.match(await page.locator('#search-status').innerText(), /Ничего не найдено/);
    checked(`${width} ${theme}: card and result tags open exact-topic URLs; reload, Cyrillic folding, reset and ordinary text search work`);

    await page.goto(base + '/ru/articles/demo-geometry/', {waitUntil: 'networkidle'});
    const typography = await page.locator('.article-body').evaluate(node => {
      const style = getComputedStyle(node);
      return {size: parseFloat(style.fontSize), leading: parseFloat(style.lineHeight) / parseFloat(style.fontSize), link: parseFloat(getComputedStyle(node.querySelector(':scope > ul a')).fontSize)};
    });
    assert.ok(typography.size >= 17.2 && typography.size <= 19.5);
    assert.equal(typography.link, typography.size);
    assert.ok(Math.abs(typography.leading - 1.55) < 0.01);
    assert.equal(await page.locator('.math-source[data-rendered=true]').count(), 7);
    await page.locator('.article-body > p').first().scrollIntoViewIfNeeded();
    await page.screenshot({path: `${evidence}/smaller-article-${theme}-${width}.jpg`});
    await page.locator('.article-end [data-tag="геометрия"]').click();
    await page.locator('#search-status').filter({hasText: 'Найдено материалов:'}).waitFor();
    assert.equal(await page.locator('.search-result').count(), expected.length);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context.close();
    checked(`${width} ${theme}: article tags navigate to search; smaller prose, inherited link sizes and formulas render correctly`);
  }
  const context = await browser.newContext({viewport: {width: 320, height: 640}});
  const page = await context.newPage();
  await page.goto(base + '/ru/materials/', {waitUntil: 'networkidle'});
  const topic = page.getByRole('combobox', {name: /^Тема/});
  await topic.scrollIntoViewIfNeeded();
  await topic.click();
  const bounds = await page.locator('#tag-filter-list').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 320 && bounds.y >= 0 && bounds.y + bounds.height <= 640);
  assert.ok(await page.locator('#tag-filter-list').evaluate(node => parseFloat(getComputedStyle(node).transitionDuration) > 0));
  await page.emulateMedia({reducedMotion: 'reduce'});
  assert.equal(await page.locator('#tag-filter-list').evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  await context.close();
  checked('320px menus stay inside the viewport; smooth appearance respects reduced motion');
}
