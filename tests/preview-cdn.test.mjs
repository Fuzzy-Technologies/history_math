import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {publishPreviews, rewritePreviewUrls} from '../scripts/publish-preview-cdn.mjs';
import {mediaObject} from '../scripts/s3-media.mjs';

const path = '/assets/images/previews/article/figure.webp';
const url = 'https://media.history-math.org/previews/content/figure.webp';

test('preview URL rewriting covers srcset and absolute metadata while leaving other URLs alone', () => {
  const originals = 'https://storage.yandexcloud.kz/history-math-media-kz/originals/file.webp';
  const unrelated = 'https://other.example' + path;
  const html = `<img src="${path}" srcset="/history_math${path} 480w, https://history-math.org${path}?v=1 960w" data-original="${originals}"><a href="${unrelated}">other</a>`;
  const result = rewritePreviewUrls(html, new Map([[path, url]]));
  assert.equal(result, `<img src="${url}" srcset="${url} 480w, ${url}?v=1 960w" data-original="${originals}"><a href="${unrelated}">other</a>`);
  assert.throws(() => mediaObject('previews', 'wrong.jpg', 'a'.repeat(64), 15));
});

test('pruning requires exact origin bytes and a verified warm CDN response', async () => {
  const root = await mkdtemp(join(tmpdir(), 'history-math-preview-'));
  const sourceDirectory = join(root, 'source'), site = join(root, 'site');
  const preview = join(site, path), page = join(site, 'index.html');
  const bytes = Buffer.from('RIFF....WEBPfixture'), changed = Buffer.from('RIFF....WEBPchanged');
  try {
    await mkdir(sourceDirectory);
    await mkdir(join(preview, '..'), {recursive: true});
    await writeFile(preview, bytes);
    const initial = `<img src="${path}"><a href="/assets/article.pdf">PDF</a>`;
    await writeFile(page, initial);
    await writeFile(join(site, 'assets/article.pdf'), '%PDF-1.7');
    const upload = async ([object], _client, read) => {
      assert.match(object.key, /^previews\/[a-f0-9]{64}\/figure\.webp$/);
      assert.deepEqual(await read(object), bytes);
    };
    const request = (data, age = '1') => async (target, options) => {
      assert.match(target, /^https:\/\/media\.history-math\.org\/previews\//);
      assert.equal(options.credentials, 'omit');
      return new Response(data, {headers: {'content-type': 'image/webp', age}});
    };
    await assert.rejects(publishPreviews(site, {}, {request: request(changed), upload, sourceDirectory}), /integrity mismatch/);
    assert.equal(await readFile(page, 'utf8'), initial);
    assert.deepEqual(await readFile(preview), bytes);
    await assert.rejects(publishPreviews(site, {}, {request: request(bytes, '0'), upload, sourceDirectory}), /HTTP_503/);
    assert.equal(await readFile(page, 'utf8'), initial);
    assert.deepEqual(await readFile(preview), bytes);
    const result = await publishPreviews(site, {}, {request: request(bytes), upload, sourceDirectory});
    assert.equal(result.warm_cache_verified, true);
    assert.equal(result.previews, 1);
    await assert.rejects(readFile(preview), {code: 'ENOENT'});
    assert.match(await readFile(page, 'utf8'), /https:\/\/media\.history-math\.org\/previews\/[a-f0-9]{64}\/figure\.webp/);
    assert.equal(await readFile(join(site, 'assets/article.pdf'), 'utf8'), '%PDF-1.7');
  } finally { await rm(root, {recursive: true, force: true}); }
});
