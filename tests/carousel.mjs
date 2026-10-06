import {recordRequestFailure} from './request-failures.mjs';
import assert from 'node:assert/strict';

export async function runCarouselChecks({browser, origin, evidence, axe, report, checked}) {
  const home = origin + '/history_math/ru/';
  async function track(context) {
    const page = await context.newPage();
    page.on('pageerror', error => report.consoleErrors.push(error.message));
    page.on('requestfailed', request => recordRequestFailure(report, request));
    return page;
  }
  async function staysAt(page, carousel, expected, label) {
    await page.waitForFunction(left => Math.abs(document.querySelector('#latest-cards').scrollLeft - left) <= 1, expected);
    // The former wheel timer and CSS snap both acted after input ended.
    await page.waitForTimeout(700);
    assert.ok(Math.abs(await carousel.evaluate(node => node.scrollLeft) - expected) <= 1, label);
  }
  async function copyChecks(page) {
    await page.waitForLoadState('networkidle');
    const navigation = page.getByRole('navigation', {name: 'Основная навигация', exact: true});
    assert.deepEqual(await navigation.locator('a').allTextContents(), ['Главная', 'Читальный зал', 'Витрина', 'Поиск']);
    await navigation.getByRole('link', {name: 'Читальный зал', exact: true}).click();
    await page.waitForURL('**/ru/materials/');
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('h1').innerText(), 'Материалы');
    assert.equal((await page.locator('.page-heading .eyebrow').textContent()).trim(), 'По темам');
    assert.equal(await navigation.getByRole('link', {name: 'Читальный зал', exact: true}).getAttribute('aria-current'), 'page');
    await navigation.getByRole('link', {name: 'Витрина', exact: true}).click();
    await page.waitForURL('**/ru/showcase/');
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('h1').innerText(), 'Наши издания');
    assert.equal((await page.locator('.page-heading .eyebrow').textContent()).trim(), 'Книги и курсы');
    assert.equal(await navigation.getByRole('link', {name: 'Витрина', exact: true}).getAttribute('aria-current'), 'page');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.addScriptTag({content: axe});
    const audit = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}}));
    report.accessibility.push({name: 'Updated navigation and showcase', violations: audit.violations});
    assert.deepEqual(audit.violations.map(item => item.id), []);
  }
  for (const theme of ['light', 'dark']) for (const reducedMotion of ['reduce', 'no-preference']) {
    const context = await browser.newContext({viewport: {width: 1440, height: 1050}, colorScheme: theme, reducedMotion});
    const page = await track(context);
    await page.goto(home, {waitUntil: 'networkidle'});
    const carousel = page.locator('#latest-cards');
    await carousel.scrollIntoViewIfNeeded();
    await carousel.hover({position: {x: 150, y: 100}});
    const pageTop = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 37);
    await staysAt(page, carousel, 37, 'Wheel snapped forward after input ended');
    await page.mouse.wheel(0, -19);
    await staysAt(page, carousel, 18, 'Wheel snapped backward after input ended');
    await page.mouse.wheel(35, 0);
    await staysAt(page, carousel, 53, 'Native horizontal wheel snapped to a card');
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - pageTop) < 2);
    const bounds = await page.locator('.card-image').first().boundingBox();
    const start = bounds.x + 200;
    await page.mouse.move(start, bounds.y + 35);
    await page.mouse.down();
    await page.mouse.move(start - 73, bounds.y + 35, {steps: 8});
    assert.ok(Math.abs(await carousel.evaluate(node => node.scrollLeft) - 126) <= 1, 'Drag did not follow the pointer pixel for pixel');
    await page.mouse.up();
    await staysAt(page, carousel, 126, 'Drag release snapped to a card edge');
    assert.equal(page.url(), home, 'Dragging followed the article link');
    assert.equal(await carousel.evaluate(node => node.classList.contains('is-dragging')), false);
    if (reducedMotion === 'reduce') await page.screenshot({path: `${evidence}/free-carousel-${theme}-desktop.jpg`, fullPage: false});
    await page.locator('.card-image').first().click();
    await page.waitForURL('**/demo-geometry/');
    await copyChecks(page);
    checked(`${theme}, ${reducedMotion}: exact forward/backward wheel and horizontal scrolling, 73px drag with no release snapping, ordinary links and updated headings`);
    await context.close();
  }
  for (const width of [320, 390]) {
    const context = await browser.newContext({viewport: {width, height: 844}, hasTouch: true, isMobile: true, colorScheme: 'dark', reducedMotion: 'reduce'});
    const page = await track(context);
    await page.goto(home, {waitUntil: 'networkidle'});
    const carousel = page.locator('#latest-cards');
    await carousel.scrollIntoViewIfNeeded();
    await carousel.hover({position: {x: 100, y: 100}});
    const top = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 83);
    await page.waitForFunction(previous => scrollY > previous + 20, top);
    assert.equal(await carousel.evaluate(node => node.scrollLeft), 0);
    assert.equal(await page.locator('.carousel-controls').isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await copyChecks(page);
    await page.screenshot({path: `${evidence}/updated-showcase-${width}.jpg`, fullPage: true});
    checked(`${width}px mobile: vertical cards, readable navigation and revised showcase heading without horizontal overflow`);
    await context.close();
  }
}
