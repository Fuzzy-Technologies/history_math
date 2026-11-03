// A real raster/PDF regression for migration metadata at native reading size.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {preparePrintMedia, printImageSources} from '../scripts/article-pdf.mjs';

const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
try {
  const page = await browser.newPage();
  const remoteRequests = [];
  await page.route('**/*', route => {remoteRequests.push(route.request().url()); return route.abort();});
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1000;
    const context = canvas.getContext('2d'), image = context.createImageData(1000, 1000);
    let seed = 0x1badf00d;
    for (let index = 0; index < image.data.length; index += 4) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      image.data[index] = seed >>> 24; image.data[index + 1] = (seed >>> 16) & 255;
      image.data[index + 2] = (seed >>> 8) & 255; image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0); return canvas.toDataURL('image/png');
  });
  const pngBytes = Buffer.from(png.split(',')[1], 'base64').length;
  const metadata = [
    'data-original="https://github.com/Fuzzy-Technologies/history_math/releases/download/article-originals-a/fixture.png" data-original-api="https://api.github.com/repos/Fuzzy-Technologies/history_math/releases/assets/17"',
    `data-original="https://storage.yandexcloud.kz/history-math-media-kz/originals/${'a'.repeat(64)}/fixture.jpg" data-original-storage="s3"`,
    'data-original="/assets/images/hm-tt-fixture/fixture.png"'
  ];
  const encoded = [];
  for (const attributes of metadata) {
    await page.setContent(printImageSources(`<html lang="en"><body><div class="article-body"><img src="${png}" ${attributes} style="width:400px;height:400px" alt="Deterministic raster fixture"></div></body></html>`));
    await page.locator('img').evaluate(image => image.decode());
    await page.evaluate(preparePrintMedia, {localOrigin: 'http://127.0.0.1', publicOrigin: 'https://history-math.org'});
    const result = await page.locator('img').evaluate(image => ({src: image.src, width: image.naturalWidth,
      height: image.naturalHeight, cssWidth: image.getBoundingClientRect().width, cssHeight: image.getBoundingClientRect().height}));
    assert.match(result.src, /^data:image\/jpeg;base64,/);
    assert.deepEqual([result.width, result.height, result.cssWidth, result.cssHeight], [1000, 1000, 400, 400]);
    encoded.push(result.src);
    const pdf = await page.pdf({format: 'A4', printBackground: true});
    assert.ok(pdf.includes(Buffer.from('/DCTDecode')), 'Printed raster must use JPEG encoding');
    assert.ok(pdf.length < pngBytes * 0.6, 'Native-size reading PNG must not bloat the PDF');
  }
  assert.equal(new Set(encoded).size, 1, 'S3 retains the exact established print JPEG profile');
  await page.setContent(`<div class="article-body"><img src="${png}" style="width:400px;height:400px" alt="Unmigrated raster"></div>`);
  await page.locator('img').evaluate(image => image.decode());
  await page.evaluate(preparePrintMedia, {localOrigin: 'http://127.0.0.1', publicOrigin: 'https://history-math.org'});
  assert.equal(await page.locator('img').getAttribute('src'), png);
  assert.deepEqual(remoteRequests, [], 'Print processing must not fetch full-resolution originals');
  console.log('PASS: S3, GitHub and local migration rasters keep the same compact print JPEGs at unchanged dimensions');
} finally { await browser.close(); }
