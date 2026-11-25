import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PutObjectCommand} from '@aws-sdk/client-s3';
import {mediaObject, publishChanges, sha256} from '../scripts/s3-media.mjs';
import {editionChanges, publicationIndex, publishedPdfs, receiptDigest, restoreState, reusablePdf} from '../scripts/publication-state.mjs';

const bytes = Buffer.from('%PDF-test');
const pdf = mediaObject('pdf', 'sample-en.pdf', sha256(bytes), bytes.length);
const image = mediaObject('previews', 'sample.webp', sha256(Buffer.from('sample')), 6);
const proof = obj => ({...obj, verified: true});
const forbidden = () => assert.fail('Unexpected object-store or source read');
const silent = () => {};

test('an unchanged deployment reuses PDFs, originals and previews without any S3 requests', async () => {
  const cases = [pdf, image, mediaObject('originals', 'sample.png', image.sha256, 6)];
  const result = await publishChanges(cases, {send: forbidden}, forbidden,
    {known: publicationIndex(cases.map(proof)), request: forbidden, report: silent});
  assert.deepEqual(result.map(object => object.key).sort(), cases.map(object => object.key).sort());
});

test('one new object gets a conditional PUT and one bodyless availability check, including a retry after interrupted publication', async () => {
  for (const alreadyStored of [false, true]) {
    const calls = [];
    const client = {send: async command => {
      assert.ok(command instanceof PutObjectCommand);
      assert.equal(command.input.Key, pdf.key);
      assert.equal(command.input.IfNoneMatch, '*');
      assert.deepEqual(command.input.Body, bytes);
      assert.ok(command.input.ContentMD5);
      calls.push('PUT');
      if (alreadyStored) throw {$metadata: {httpStatusCode: 412}};
    }};
    const request = async (url, options) => {
      assert.equal(url, pdf.url);
      assert.equal(options.method, 'HEAD');
      calls.push('HEAD');
      return {status: 200, headers: new Headers({'Content-Length': String(bytes.length), 'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="sample-en.pdf"', 'x-amz-meta-sha256': pdf.sha256})};
    };
    const result = await publishChanges([image, pdf], client, async object => {assert.equal(object.key, pdf.key); return bytes;},
      {known: publicationIndex([proof(image)]), request, report: silent});
    assert.deepEqual(calls, ['PUT', 'HEAD']);
    assert.equal(result.length, 2);
    await publishChanges([image, pdf], {send: forbidden}, forbidden, {known: publicationIndex(result), request: forbidden, report: silent});
  }
});

test('invalid input, failed writes and mismatched new-object metadata stop publication', async () => {
  const known = publicationIndex([]), opts = {known, request: forbidden, report: silent};
  await assert.rejects(publishChanges([pdf], {send: forbidden}, () => Buffer.from('bad'), opts), /integrity/);
  await assert.rejects(publishChanges([pdf], {send: async () => {throw {$metadata: {httpStatusCode: 403}};}},
    () => bytes, opts), /conditional upload failed/);
  await assert.rejects(publishChanges([pdf], {send: async () => {}}, () => bytes,
    {...opts, request: async () => ({status: 200, headers: new Headers()})}), /metadata mismatch/);
  await assert.rejects(publishChanges([{...pdf, bytes: 42}], {send: forbidden}, forbidden,
    {...opts, known: publicationIndex([proof(pdf)])}), /Conflicting published/);
});

test('publication receipts are bound to their deployed commit, object identities and preview set', () => {
  const revision = 'a'.repeat(40), objects = [proof(pdf)], previews = [[image.key, image.bytes]];
  const manifest = {version: 1, objects, incremental: {version: 1, revision, preview_revision: revision, previews, digest: receiptDigest(objects, previews)}};
  assert.equal(restoreState(manifest, revision).objects.length, 2);
  assert.throws(() => restoreState(manifest, 'b'.repeat(40)), /deployed revision/);
  assert.throws(() => restoreState({...manifest, incremental: {...manifest.incremental, previews: []}}, revision), /Incomplete/);
  assert.throws(() => restoreState({version: 1, objects}, revision), /deployed revision/);
  assert.throws(() => publicationIndex([proof(pdf), proof(pdf)]), /duplicate/);
});

test('edition comparison uses the entire range since the deployed commit and keeps unrelated PDF URLs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hm-publication-'));
  const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
  try {
    git('init', '-q'); git('config', 'user.email', 'test@example.org'); git('config', 'user.name', 'Test');
    git('commit', '--allow-empty', '-qm', 'deployed'); const base = git('rev-parse', 'HEAD');
    await mkdir(join(root, 'site/_articles'), {recursive: true});
    await writeFile(join(root, 'site/_articles/letter.md'), '---\npermalink: /publications/letter/\nlang: en\n---\nA letter\n');
    git('add', 'site'); git('commit', '-qm', 'new letter');
    await mkdir(join(root, 'site/assets/images/sample'), {recursive: true});
    await writeFile(join(root, 'site/assets/images/sample/art.png'), 'changed');
    git('add', 'site'); git('commit', '-qm', 'image');
    const changed = editionChanges(root, base, git('rev-parse', 'HEAD'));
    assert.deepEqual(changed, {articles: ['/publications/letter/'], images: ['/assets/images/sample/art.png']});
    const pdfs = publishedPdfs({objects: [proof(pdf)]});
    const article = {pdf_url: '/assets/pdf/en/sample-en.pdf', url: '/publications/sample/'};
    const args = [pdfs, new Set(changed.articles), new Set(changed.images)];
    assert.equal(reusablePdf(article, '<p>text</p>', ...args)?.key, pdf.key);
    assert.equal(reusablePdf(article, '<img src="/assets/images/sample/art.png">', ...args), undefined);
    assert.equal(reusablePdf({...article, url: '/publications/letter/'}, '', ...args), undefined);
  } finally { await rm(root, {recursive: true, force: true}); }
});
