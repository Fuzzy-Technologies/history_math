import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root = resolve(process.env.TYPOGRAPHY_SITE_DIR || '_site');
const base = process.env.TYPOGRAPHY_BASEURL ?? '/history_math';
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2'};
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith(base + '/')) throw new Error('Outside base');
    let path = resolve(root, '.' + decodeURIComponent(pathname.slice(base.length)));
    if (path !== root && !path.startsWith(root + sep)) throw new Error('Outside site');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
const widths = [320, 390, 620, 621, 760, 761, 1050, 1051, 1200, 1320, 1440, 1920, 2560];
try {
  await mkdir('test-results/typography', {recursive: true});
  for (const language of ['ru', 'en']) {
    const page = await browser.newPage({reducedMotion: 'reduce'});
    await page.goto(origin + base + (language === 'ru' ? '/ru/' : '/'), {waitUntil: 'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    for (const width of widths) {
      await page.setViewportSize({width, height: 1000});
      const heading = await page.locator('.hero-copy h1').evaluate(node => {
        const lines = [...node.querySelectorAll('.hero-title-line')];
        const bounds = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight), height: bounds.height,
          lines: lines.map(line => {
            const range = document.createRange();
            range.selectNodeContents(line);
            const text = range.getBoundingClientRect();
            return {count: range.getClientRects().length, left: text.left, right: text.right};
          }), left: bounds.left, right: bounds.right};
      });
      assert.equal(heading.lines.length, 2, `${language} ${width}: explicit title lines`);
      assert.ok(heading.fontSize <= 58.01, `${language} ${width}: capped title size`);
      assert.ok(Math.abs(heading.height - 2 * heading.lineHeight) <= 1, `${language} ${width}: exactly two title lines`);
      for (const line of heading.lines) {
        assert.equal(line.count, 1, `${language} ${width}: title phrase wrapped`);
        assert.ok(line.left >= heading.left - 1 && line.right <= heading.right + 1, `${language} ${width}: title phrase overflow`);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${language} ${width}: page overflow`);
      const carousel = await page.locator('#latest-cards').evaluate(node => {
        const bounds = node.getBoundingClientRect();
        return {left: bounds.left, right: bounds.right,
          cards: [...node.querySelectorAll('.material-card')].map(card => {
            const rect = card.getBoundingClientRect();
            return {left: rect.left, right: rect.right};
          })};
      });
      if (width >= 1051 && carousel.cards.length >= 5) {
        assert.ok(carousel.cards.slice(0, 4).every(card => card.left >= carousel.left - 1 && card.right <= carousel.right + 1), `${language} ${width}: four complete cards`);
        assert.ok(carousel.cards[4].left < carousel.right && carousel.cards[4].right > carousel.right, `${language} ${width}: fifth card preview`);
      }
      if ([320, 1320, 1920].includes(width)) await page.screenshot({path: `test-results/typography/home-${language}-${width}.png`});
    }
    const records = JSON.parse(await readFile(resolve(root, `assets/search-${language}.json`), 'utf8'));
    assert.ok(records.length, 'The reading check needs a published article');
    await page.goto(origin + records[0].url, {waitUntil: 'networkidle'});
    for (const width of [320, 1440]) {
      await page.setViewportSize({width, height: 1000});
      const size = await page.locator('.prose.article-body').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
      assert.ok(size >= 16 && size <= 18.2, `${language} ${width}: screen reading size ${size}`);
      const caption = page.locator('.article-body figcaption').first();
      if (await caption.count()) assert.equal(await caption.evaluate(node => parseFloat(getComputedStyle(node).fontSize)), 16);
    }
    await page.emulateMedia({media: 'print'});
    const printSize = await page.locator('.prose.article-body').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    assert.ok(Math.abs(printSize - 11 * 96 / 72) < .02, `${language}: PDF body typography changed`);
    await page.close();
  }
  console.log('PASS: RU/EN two-line capped slogans at 13 breakpoints, four complete desktop cards and fifth preview, smaller screen prose and unchanged PDF body/captions');
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
