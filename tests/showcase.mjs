import assert from 'node:assert/strict';

export async function runShowcaseChecks({browser, origin, evidence, axe, report, checked}) {
  for (const language of ['ru', 'en']) for (const theme of ['light', 'dark']) for (const width of [320, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 1000}, colorScheme: theme, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.on('pageerror', error => report.consoleErrors.push(error.message));
    page.on('requestfailed', request => report.requestFailures.push(request.url()));
    const path = language === 'ru' ? '/ru/showcase/' : '/showcase/';
    await page.goto(origin + '/history_math' + path, {waitUntil: 'networkidle'});
    assert.equal(await page.locator('.showcase-book').count(), 5);
    assert.equal(await page.locator('.book-gallery img').count(), 7);
    assert.doesNotMatch(await page.locator('main').innerText(), /₽|\bprice\b|руб(?:лей|ля|ль)/i);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(await page.locator('.showcase-book').evaluateAll(books => books.map(book => book.id)), ['book-algebra', 'book-history', 'book-equations', 'book-calendar-2026', 'book-road-of-life']);
    assert.equal(await page.locator('#book-algebra [data-edition="ebook"] a').first().getAttribute('href'), 'https://web.tribute.tg/p/byD');
    assert.equal(await page.locator('#book-algebra [data-edition="gift"] a').first().getAttribute('href'), 'https://www.avito.ru/moskva/knigi_i_zhurnaly/kniga_bibliya_matematika_ot_mansura_gilmullina_8302534325');
    assert.equal(await page.locator('#book-calendar-2026 .book-offer a').getAttribute('href'), 'https://web.tribute.tg/p/zvp');
    await page.locator('.book-gallery img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
    await page.waitForFunction(() => [...document.querySelectorAll('.book-gallery img')].every(image => image.complete && image.naturalWidth > 0));
    const cover = page.locator('#book-algebra .book-cover button');
    await cover.click();
    assert.equal(await page.locator('#image-viewer').evaluate(dialog => dialog.open), true);
    await page.locator('.viewer-canvas img').evaluate(image => image.decode());
    await page.locator('[data-viewer-action="in"]').click();
    await page.keyboard.press('Escape');
    assert.equal(await cover.evaluate(button => button === document.activeElement), true);
    await page.addScriptTag({content: axe});
    const audit = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
    report.accessibility.push({name: `Showcase ${language} ${theme} ${width}`, violations: audit.violations});
    assert.deepEqual(audit.violations.map(item => ({id: item.id, targets: item.nodes.map(node => node.target)})), []);
    await page.screenshot({path: `${evidence}/publications-${language}-${theme}-${width}.jpg`, fullPage: true});
    checked(`Showcase ${language} ${theme} ${width}: five works, seven real images, edition links, no prices, cover zoom and WCAG AA`);
    await context.close();
  }
}
