import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {publishPreviews, rewritePreviewUrls} from '../scripts/publish-reading-previews.mjs';
import {mediaObject, storage, validateObject} from '../scripts/s3-media.mjs';

const path = '/assets/images/previews/article/figure.webp';
const url = storage.base + '/previews/content/figure.webp';

test('preview URL rewriting covers srcset and absolute metadata while leaving other URLs alone', () => {
  const originals = 'https://storage.yandexcloud.kz/history-math-media-kz/originals/file.webp';
  const unrelated = 'https://other.example' + path;
  const html = `<img src="${path}" srcset="/history_math${path} 480w, https://history-math.org${path}?v=1 960w" data-original="${originals}"><a href="${unrelated}">other</a>`;
  const result = rewritePreviewUrls(html, new Map([[path, url]]));
  assert.equal(result, `<img src="${url}" srcset="${url} 480w, ${url}?v=1 960w" data-original="${originals}"><a href="${unrelated}">other</a>`);
  assert.throws(() => rewritePreviewUrls(path, new Map()), /Missing reading preview/);
  assert.throws(() => mediaObject('previews', 'wrong.png', 'a'.repeat(64), 15));
});

test('direct bucket delivery requires a complete receipt, rewrites both locales and keeps SVG and sources', async () => {
  const root = await mkdtemp(join(tmpdir(), 'history-math-bucket-'));
  const sourceDirectory = join(root, 'source'), site = join(root, 'output');
  const bytes = Buffer.from('RIFF....WEBPfixture');
  const otherPath = path.replace('/article/', '/second/');
  try {
    for (const file of [join(site, path), join(site, otherPath), join(sourceDirectory, path)]) {
      await mkdir(join(file, '..'), {recursive: true});
      await writeFile(file, bytes);
    }
    const svg = path.replace('.webp', '.svg');
    await writeFile(join(site, svg), '<svg/>');
    const html = `<img src="${path}" srcset="${otherPath} 640w"><img src="${svg}">`;
    await writeFile(join(site, 'index.html'), html);
    for (const lang of ['en', 'ru']) await writeFile(join(site, `discovery-${lang}.json`), JSON.stringify([{preview_image: path}]));
    const options = {baseUrl: storage.base, sourceDirectory};
    await assert.rejects(publishPreviews(site, {}, {...options, baseUrl: 'https://example.org'}), /Unexpected preview/);
    await assert.rejects(publishPreviews(site, {}, {...options, upload: async () => []}), /Incomplete public verification/);
    assert.equal(await readFile(join(site, 'index.html'), 'utf8'), html);
    assert.deepEqual(await readFile(join(site, otherPath)), bytes);
    const result = await publishPreviews(site, {}, {...options, upload: async (objects, _client, read, {inventoryPrefix}) => {
      assert.equal(inventoryPrefix, 'previews/');
      assert.equal(objects.length, 1);
      assert.deepEqual(await read(objects[0]), bytes);
      return [{...validateObject(objects[0]), verified: true}];
    }});
    assert.equal(result.previews, 2);
    assert.equal(result.objects, 1);
    assert.equal(result.pages_bytes_removed, bytes.length * 2);
    for (const lang of ['en', 'ru']) {
      const [item] = JSON.parse(await readFile(join(site, `discovery-${lang}.json`)));
      assert.ok(item.preview_image.startsWith(storage.base + '/previews/'));
      assert.ok((await readFile(join(site, 'index.html'), 'utf8')).includes(item.preview_image));
    }
    for (const local of [path, otherPath]) await assert.rejects(readFile(join(site, local)), {code: 'ENOENT'});
    assert.equal(await readFile(join(site, svg), 'utf8'), '<svg/>');
    assert.deepEqual(await readFile(join(sourceDirectory, path)), bytes);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('new WebPs are uploaded inline and existing attachments or wrong bytes block delivery', async () => {
  const {PutObjectCommand, HeadObjectCommand} = await import('@aws-sdk/client-s3');
  const {sha256, uploadVerified, verifyPublic} = await import('../scripts/s3-media.mjs');
  const bytes = Buffer.from('RIFF....WEBPfixture');
  const object = mediaObject('previews', 'figure.webp', sha256(bytes), bytes.length);
  const headers = {'content-type': 'image/webp', 'content-disposition': 'inline; filename="figure.webp"'};
  const client = {send: async command => {
    if (command instanceof HeadObjectCommand) throw {$metadata: {httpStatusCode: 404}};
    assert.ok(command instanceof PutObjectCommand);
    assert.equal(command.input.ContentDisposition, headers['content-disposition']);
    assert.equal(command.input.ContentType, headers['content-type']);
    assert.match(command.input.CacheControl, /immutable/);
  }};
  const proof = await uploadVerified(client, object, async () => bytes, {request: async () => new Response(bytes, {headers})});
  assert.equal(proof.verified, true);
  await assert.rejects(verifyPublic(object, async () => new Response(Buffer.from('changed'), {headers})), /integrity mismatch/);
  await assert.rejects(verifyPublic(object, async () => new Response(bytes, {headers: {...headers,
    'content-disposition': 'attachment; filename="figure.webp"'}})), /INVALID_MEDIA/);
});

test('legacy JPEG variants keep exact bytes and inline MIME before Pages pruning', async () => {
  const root = await mkdtemp(join(tmpdir(), 'history-math-jpeg-'));
  const sourceDirectory = join(root, 'source'), site = join(root, 'output');
  const paths = ['.jpeg', '.jpg'].map(extension => path.replace('.webp', extension));
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]);
  const page = join(site, 'index.html'), html = `<img src="${paths[0]}" srcset="${paths[1]} 480w">`;
  try {
    await mkdir(sourceDirectory);
    await mkdir(join(site, paths[0], '..'), {recursive: true});
    await writeFile(page, html);
    for (const path of paths) await writeFile(join(site, path), jpeg);
    await writeFile(join(site, paths[1]), Buffer.from('RIFF....WEBP'));
    const options = {sourceDirectory, baseUrl: storage.base};
    await assert.rejects(publishPreviews(site, {}, {...options, upload: () => assert.fail('No upload of mislabeled JPEGs')}), /Invalid JPEG preview/);
    assert.equal(await readFile(page, 'utf8'), html);
    await writeFile(join(site, paths[1]), jpeg);
    const result = await publishPreviews(site, {}, {...options, upload: async (objects, _client, read) => {
      for (const obj of objects) {
        assert.equal(obj.content_type, 'image/jpeg');
        assert.deepEqual(await read(obj), jpeg);
      }
      return objects.map(obj => ({...validateObject(obj), verified: true}));
    }});
    assert.equal(result.previews, 2);
    const after = await readFile(page, 'utf8');
    for (const path of paths) {
      assert.ok(!after.includes(path));
      assert.ok(after.includes(path.split('/').at(-1)));
      await assert.rejects(readFile(join(site, path)), {code: 'ENOENT'});
    }
  } finally {await rm(root, {recursive: true, force: true});}
});
