import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root = resolve(process.env.IMAGE_SITE_DIR || '_site');
const base = process.env.IMAGE_BASEURL ?? '/history_math';
const inventory = JSON.parse(await readFile('site/_data/image_assets.json', 'utf8'));
const mime = {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith(base + '/')) { response.writeHead(404).end(); return; }
    let path = resolve(root, '.' + decodeURIComponent(url.pathname.slice(base.length)));
    if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
const records = JSON.parse(await readFile(resolve(root, 'assets/search-ru.json'), 'utf8'));
const pages = base ? ['/', '/ru/', '/about/', '/ru/about/', '/showcase/', '/ru/showcase/',
  '/ru/materials/', '/ru/search/', ...records.map(record => record.url.slice(base.length))] : ['/ru/about/', '/about/'];
const report = [];
await mkdir('test-results/image-delivery', {recursive: true});
let checkedDownload = false;
try {
  for (const width of [390, 1440]) for (const path of pages) {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce',
      colorScheme: width === 390 ? 'dark' : 'light'});
    const page = await context.newPage();
    const requests = [];
    const failures = [];
    page.on('request', request => { if (request.resourceType() === 'image') requests.push(new URL(request.url()).pathname); });
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    await page.goto(origin + base + path, {waitUntil: 'networkidle'});
    // Decode even offscreen images: lazy loading must not hide accidental original requests.
    await page.locator('img').evaluateAll(async images => {
      images.forEach(img => { img.loading = 'eager'; });
      await Promise.all(images.map(img => img.decode()));
    });
    assert.deepEqual(failures, [], path);
    assert.deepEqual(requests.filter(url => /\.(png|jpe?g)$/i.test(url)), [], `Original fetched before zoom: ${path}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, path);
    const originalPaths = await page.locator('img[data-original]').evaluateAll(images => [...new Set(images.map(img => img.dataset.original))]);
    const originalBytes = originalPaths.reduce((sum, url) => sum + inventory[url.slice(base.length)].bytes, 0);
    const readingBytes = (await Promise.all([...new Set(requests)].map(async url => (await stat(root + url.slice(base.length))).size))).reduce((a, b) => a + b, 0);
    if (path.includes('about/')) {
      const russian = path.startsWith('/ru/');
      assert.match(await page.locator('.about-banner img').getAttribute('src'), russian ? /Mansur-ru.svg$/ : /Mansur.svg$/);
      assert.match(await page.locator('.about-banner img').getAttribute('data-original'), russian ? /Mansur-ru.png$/ : /Mansur.png$/);
      assert.ok(readingBytes < originalBytes * 0.1, 'About image transfer must decrease by at least 90%');
      await page.screenshot({path: `test-results/image-delivery/about-${russian ? 'ru' : 'en'}-${width}.png`, fullPage: true});
    }
    report.push({path, width, originalBytes, readingBytes});
    const trigger = page.locator('.image-trigger:has(img[data-original])').first();
    if (await trigger.count()) {
      const original = await trigger.locator('img').getAttribute('data-original');
      await trigger.click();
      await page.locator('.viewer-canvas img').evaluate(img => img.decode());
      assert.equal(await page.locator('.viewer-canvas img').getAttribute('src'), original);
      assert.deepEqual([...new Set(requests.filter(url => /\.(png|jpe?g)$/i.test(url)))], [original]);
      const download = page.locator('[data-viewer-download]');
      assert.equal(await download.getAttribute('href'), origin + original);
      if (!checkedDownload) {
        const [file] = await Promise.all([page.waitForEvent('download'), download.click()]);
        const bytes = await readFile(await file.path());
        assert.equal(createHash('sha256').update(bytes).digest('hex'), inventory[original.slice(base.length)].sha256);
        checkedDownload = true;
      }
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.documentElement.classList.contains('viewer-open'));
      assert.equal(await trigger.evaluate(node => document.activeElement === node), true);
      assert.equal(await download.getAttribute('href'), null);
    }
    await context.close();
  }
  for (const path of ['/ru/about/', '/ru/showcase/']) {
    const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 1000}});
    const page = await context.newPage();
    const requests = [];
    page.on('request', req => { if (req.resourceType() === 'image') requests.push(req.url()); });
    await page.goto(origin + base + path);
    await page.locator('main img').evaluateAll(async images => {
      images.forEach(img => { img.loading = 'eager'; });
      await Promise.all(images.map(img => img.decode()));
    });
    assert.deepEqual(requests.filter(url => /\.(png|jpe?g)$/i.test(url)), []);
    await context.close();
  }
  await import('node:fs/promises').then(fs => fs.writeFile('test-results/image-delivery/network.json', JSON.stringify(report, null, 2)));
  console.log(`PASS: ${report.length} page/viewport checks; no original image requests before zoom, exact original download, bilingual logos and no-JS previews`);
} finally { await browser.close(); server.close(); }
