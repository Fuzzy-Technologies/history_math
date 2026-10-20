import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {chromium} from 'playwright';

const root = resolve(process.env.VIEWER_SITE_DIR || '_site');
const assets = resolve('site/assets');
const shapes = {wide: [4000, 800], portrait: [800, 4000], square: [1000, 1000], tall: [100, 10000], small: [32, 24]};
const dialogs = {};
for (const language of ['ru', 'en']) {
  const html = await readFile(resolve(root, language === 'ru' ? 'ru/index.html' : 'index.html'), 'utf8');
  dialogs[language] = html.match(/<dialog\b[^>]*id="image-viewer"[\s\S]*?<\/dialog>/)?.[0];
  assert.ok(dialogs[language], 'The built page must provide the shared viewer');
}
const mime = {'.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') {
      const language = url.searchParams.get('lang'), shape = url.searchParams.get('shape');
      if (!dialogs[language] || !shapes[shape]) throw new Error('Unknown fixture');
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end('<!doctype html><html lang="' + language + '"><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<meta name="theme-color" content="#f4eddf"><link rel="stylesheet" href="/assets/style.css"></head>' +
        '<body data-lang="' + language + '"><button class="theme-toggle" data-light-label="Light" data-dark-label="Dark">' +
        '<span class="theme-icon"></span><span class="theme-label"></span></button>' +
        '<main class="prose"><figure><img src="/' + shape + '.svg" alt="Fit regression diagram"><figcaption>' +
        (language === 'ru' ? 'Подпись к иллюстрации · Источник' : 'Illustration caption · Source') +
        '</figcaption></figure></main>' + dialogs[language] + '<script type="module" src="/assets/app.js"></script></body></html>');
      return;
    }
    const shape = shapes[url.pathname.slice(1).replace(/\.svg$/, '')];
    if (shape) {
      response.setHeader('Content-Type', 'image/svg+xml');
      response.end('<svg xmlns="http://www.w3.org/2000/svg" width="' + shape[0] + '" height="' + shape[1] + '">' +
        '<rect width="100%" height="100%" fill="#b58d61"/><path d="M0 0 L' + shape.join(' ') + '" stroke="#33271f"/></svg>');
      return;
    }
    if (!url.pathname.startsWith('/assets/')) throw new Error('Outside assets');
    const path = resolve(assets, '.' + url.pathname.slice('/assets'.length));
    if (!path.startsWith(assets + sep)) throw new Error('Outside assets');
    response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
const state = page => page.evaluate(() => {
  const stage = document.querySelector('.viewer-stage'), image = document.querySelector('.viewer-canvas img');
  const bounds = image.getBoundingClientRect();
  return {width: bounds.width, height: bounds.height, availableWidth: stage.clientWidth, availableHeight: stage.clientHeight,
    scrollWidth: stage.scrollWidth, scrollHeight: stage.scrollHeight, left: stage.scrollLeft, top: stage.scrollTop};
});
async function assertFit(page, label, ratio) {
  const fit = await state(page);
  assert.ok(fit.width > 0 && fit.height > 0, label + ': visible image');
  assert.ok(fit.width <= fit.availableWidth + 1 && fit.height <= fit.availableHeight + 1, label + ': both dimensions fit');
  assert.ok(fit.scrollWidth <= fit.availableWidth + 1 && fit.scrollHeight <= fit.availableHeight + 1, label + ': no initial scroll');
  assert.ok(Math.min(Math.abs(fit.width - fit.availableWidth), Math.abs(fit.height - fit.availableHeight)) <= 2,
    label + ': use the largest size that fits');
  assert.ok(Math.abs(fit.width / fit.height - ratio) <= ratio * 0.005, label + ': preserve aspect ratio');
  assert.equal(fit.left, 0);
  assert.equal(fit.top, 0);
  return fit;
}
async function resizeViewport(page, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
}
try {
  await mkdir('test-results/image-viewer', {recursive: true});
  for (const language of ['ru', 'en']) for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}, {width: 844, height: 390}]) {
    const page = await browser.newPage({viewport, reducedMotion: 'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [shape, dimensions] of Object.entries(shapes)) {
      const label = language + ' ' + viewport.width + ' ' + shape, ratio = dimensions[0] / dimensions[1];
      await page.goto(origin + '/?lang=' + language + '&shape=' + shape);
      await page.locator('.image-trigger').click();
      await page.waitForFunction(() => document.querySelector('#image-viewer').getAttribute('aria-busy') === 'false');
      const fitted = await assertFit(page, label, ratio);
      await page.locator('[data-viewer-action="in"]').click();
      assert.ok((await state(page)).width > fitted.width * 1.2, label + ': manual zoom remains available');
      await page.locator('[data-viewer-action="fit"]').click();
      await assertFit(page, label + ' reset', ratio);
      await resizeViewport(page, {width: viewport.height, height: viewport.width});
      await assertFit(page, label + ' rotated', ratio);
      await resizeViewport(page, viewport);
      await assertFit(page, label + ' restored', ratio);
      if (shape === 'portrait') await page.screenshot({path: 'test-results/image-viewer/' + language + '-' + viewport.width + '.png'});
      await page.locator('[data-viewer-action="in"]').click();
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#image-viewer').open);
      await page.locator('.image-trigger').click();
      await page.waitForFunction(() => document.querySelector('#image-viewer').getAttribute('aria-busy') === 'false');
      await assertFit(page, label + ' reopened', ratio);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#image-viewer').open);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: RU/EN viewer fits both dimensions for five image shapes on desktop, mobile and landscape; zoom, fit, rotation and reopening remain correct');
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
