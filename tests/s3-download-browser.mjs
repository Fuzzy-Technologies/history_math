import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {assertBytes, readWithRetries, responseBytes} from '../scripts/s3-media.mjs';
import {attachmentRequestFailure, unexpectedAttachmentFailures} from './request-failures.mjs';
import {attachmentSmokeObjects, missingAttachmentKinds} from './s3-attachment-receipts.mjs';

const receipt = JSON.parse(await readFile('test-results/media-backfill/receipt.json', 'utf8'));
let published;
if (missingAttachmentKinds(receipt).length) {
  const origin = process.env.PAGES_ORIGIN, base = process.env.PAGES_BASE_PATH || '';
  assert.ok(['https://history-math.org', 'https://fuzzy-technologies.github.io'].includes(origin));
  assert.ok(['', '/history_math'].includes(base));
  published = await readWithRetries('published attachment smoke receipt', async () => {
    const response = await fetch(origin + base + '/assets/publication-media.json',
      {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30_000)});
    if (!response.ok) await responseBytes(response, 0);
    return response.json();
  });
}
const objects = attachmentSmokeObjects(receipt, published);
const server = createServer((request, response) => {
  if (request.url !== '/') { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end('<!doctype html><link rel="icon" href="data:,">' + objects.map((item, index) =>
    `<a id="file-${index}" href="${item.url}" download="${item.filename}">Download</a>`).join(''));
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
let browser;
try {
  browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
  const page = await browser.newPage(), failures = [], errors = [], verifiedDownloads = new Set();
  page.setDefaultTimeout(120_000);
  page.on('requestfailed', request => failures.push(attachmentRequestFailure(request)));
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const [index, object] of objects.entries()) {
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator(`#file-${index}`).click()]);
    assert.equal(await download.failure(), null);
    assert.equal(download.url(), object.url);
    assert.equal(download.suggestedFilename(), object.filename);
    assertBytes(object, await readFile(await download.path()));
    verifiedDownloads.add(object.url);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedAttachmentFailures(failures, verifiedDownloads), []);
  console.log(`PASS: native S3 original/PDF attachments, filenames and full SHA-256; ${failures.length} download navigation events classified`);
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
