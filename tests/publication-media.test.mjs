import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, access, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, dirname} from 'node:path';
import {HeadObjectCommand, PutObjectCommand} from '@aws-sdk/client-s3';
import {mediaObject, storage, sha256, assertBytes, validateObject, configuredClient, uploadVerified, transfer, readWithRetries} from '../scripts/s3-media.mjs';
import {publicationPlan, rewriteMedia, finalizePublication, requireReceipt, sourceBytes, localBytes} from '../scripts/publication-media.mjs';
import {eligiblePR, pullRequestObjects, deployedPdfObjects, copyPublishedPdfs, preflightMedia, githubData, revisionBytes} from '../scripts/backfill-media.mjs';
import {nativeOriginalTarget, loadVerifiedOriginal} from '../site/assets/original-image.js';

const original = Buffer.from('original image fixture'), pdf = Buffer.from('%PDF-1.7\nexisting publication\n%%EOF');
const object = mediaObject('originals', 'figure.png', sha256(original), original.length);
const publicResponse = (value = object, bytes = original, options = {}) => new Response(bytes, {status: 200,
  headers: {'content-type': value.content_type, 'content-disposition': `attachment; filename="${value.filename}"`, ...options}});
const config = {S3_ENDPOINT_URL: storage.endpoint, S3_REGION: storage.region, S3_BUCKET: storage.bucket,
  S3_PUBLIC_BASE_URL: storage.base, S3_ACCESS_KEY_ID: 'test', S3_SECRET_ACCESS_KEY: 'never-log-test-secret'};

test('public reads retry transient failures with bounded backoff and safe object diagnostics', async () => {
  const delays = [];
  let attempts = 0;
  assert.equal(await readWithRetries(object.key, async () => {
    if (++attempts < 3) throw Object.assign(new TypeError('fetch failed'), {cause: {code: 'ECONNRESET', message: 'never-log-signed-token'}});
    return 'verified';
  }, {pause: async value => delays.push(value)}), 'verified');
  assert.equal(attempts, 3); assert.deepEqual(delays, [1000, 3000]);
  await assert.rejects(readWithRetries(object.key, async () => {
    throw Object.assign(new TypeError('fetch failed'), {cause: {code: 'UND_ERR_CONNECT_TIMEOUT', message: 'never-log-signed-token'}});
  }, {pause: async () => {}}), error => error.message.includes(object.key) &&
    error.message.includes('UND_ERR_CONNECT_TIMEOUT; 3 attempts') && !error.message.includes('never-log-signed-token'));
  for (const error of [Object.assign(new Error('denied'), {status: 403}), Object.assign(new Error('missing'), {status: 404}),
    Object.assign(new TypeError('fetch failed'), {cause: {code: 'CERT_HAS_EXPIRED'}}), new Error('Media integrity failure')]) {
    await assert.rejects(readWithRetries(object.key, async () => { throw error; }, {pause: () => assert.fail('No retry for permanent failure')}), value =>
      value.message.includes(object.key) && value.message.includes('1 attempts'));
  }
});

test('source download retries a gateway error and reconnect, then checks exact original bytes', async () => {
  let calls = 0;
  const source = {...object, source: {url: 'https://github.com/Fuzzy-Technologies/history_math/releases/download/article-originals-a/test.png'}};
  const bytes = await sourceBytes(source, async (url, options) => {
    assert.equal(options.credentials, 'omit'); assert.equal(options.headers, undefined);
    if (++calls === 1) return new Response('temporary gateway failure', {status: 503});
    if (calls === 2) throw Object.assign(new TypeError('fetch failed'), {cause: {code: 'ECONNRESET'}});
    return new Response(original);
  }, {pause: async () => {}});
  assert.equal(calls, 3); assert.deepEqual(bytes, original);
  let corruptReads = 0;
  await assert.rejects(sourceBytes(source, async () => { corruptReads++; return new Response('corrupt'); },
    {pause: () => assert.fail('No retry for integrity failure')}), /integrity/);
  assert.equal(corruptReads, 1);
});

test('storage destination, identities and source bytes reject mutations', () => {
  const client = configuredClient(config); client.destroy();
  for (const key of Object.keys(config)) assert.throws(() => configuredClient({...config, [key]: ''}));
  for (const key of ['S3_ENDPOINT_URL', 'S3_REGION', 'S3_BUCKET', 'S3_PUBLIC_BASE_URL']) {
    assert.throws(() => configuredClient({...config, [key]: 'foreign'}));
  }
  for (const name of ['../figure.png', 'figure..png', 'x/picture.png', 'x".png', 'x.exe']) {
    assert.throws(() => mediaObject('originals', name, object.sha256, original.length));
  }
  for (const [key, value] of [['url', object.url.replace('media-kz', 'foreign')], ['key', '../picture.png'],
    ['sha256', 'x'.repeat(64)], ['bytes', 0], ['content_type', 'text/html']]) assert.throws(() => validateObject({...object, [key]: value}));
  assert.throws(() => assertBytes(object, Buffer.from('corrupt')));
  assert.throws(() => mediaObject('pdf', 'image.png', object.sha256, original.length));
});

test('upload reuses verified objects and verifies every new copy with anonymous full GET', async () => {
  for (const missing of [false, true]) {
    const calls = [];
    const client = {send: async command => {
      calls.push(command);
      assert.equal(command.input.Bucket, storage.bucket);
      if (command instanceof HeadObjectCommand && missing) throw {$metadata: {httpStatusCode: 404}};
      if (command instanceof PutObjectCommand) {
        assert.equal(command.input.Key, object.key);
        assert.deepEqual(command.input.Body, original);
        assert.equal(command.input.Metadata.sha256, object.sha256);
        assert.match(command.input.CacheControl, /immutable/);
      }
      return {};
    }};
    let reads = 0;
    const result = await uploadVerified(client, object, async () => { assert.ok(missing); return original; }, {request: async (url, options) => {
      reads++; assert.equal(url, object.url); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
      assert.equal(options.headers, undefined);
      return publicResponse();
    }});
    assert.equal(result.verified, true);
    assert.equal(calls.length, missing ? 2 : 1);
    assert.equal(reads, 1);
    assert.equal(Object.hasOwn(result, 'source'), false);
  }
});

test('forbidden operations, failed uploads and corrupt public copies cannot produce receipts', async () => {
  for (const status of [403, 429, 500]) await assert.rejects(uploadVerified({send: async () => {
    throw {$metadata: {httpStatusCode: status}};
  }}, object, async () => { assert.fail('No upload after failed HEAD'); }), /HEAD failed/);
  const exists = {send: async () => ({})};
  for (const request of [async () => new Response('Forbidden', {status: 403}),
    async () => publicResponse(object, Buffer.from('corrupt')), async () => publicResponse(object, original, {'content-type': 'text/html'}),
    async () => publicResponse(object, original, {'content-disposition': ''})]) {
    await assert.rejects(uploadVerified(exists, object, async () => original, {request}));
  }
  let calls = 0;
  await assert.rejects(uploadVerified({send: async () => {
    if (++calls === 1) throw {$metadata: {httpStatusCode: 404}};
    throw new Error('upstream error');
  }}, object, async () => original), /upload failed/);
  await assert.rejects(transfer([object], exists, async () => original, {request: async () => publicResponse(object, Buffer.from('corrupt'))}));
});

async function fixture(run) {
  const root = await mkdtemp(resolve(tmpdir(), 's3-publication-')), site = resolve(root, 'output');
  const path = '/assets/images/example/figure.png', previewPath = '/assets/images/previews/example/figure.webp';
  const preview = Buffer.from('compressed preview');
  const write = async (path, value) => { await mkdir(dirname(path), {recursive: true}); await writeFile(path, value); };
  try {
    const entry = {sha256: object.sha256, bytes: original.length, width: 1000, height: 1000, logo: false,
      variants: [{path: previewPath, width: 320, height: 320, sha256: sha256(preview), bytes: preview.length}]};
    await write(resolve(root, 'site/_data/image_assets.json'), JSON.stringify({[path]: entry}));
    await write(resolve(root, 'site', '.' + path), original);
    await write(resolve(site, '.' + path), original);
    await write(resolve(site, '.' + previewPath), preview);
    await write(resolve(site, 'assets/pdf/ru/example-ru.pdf'), pdf);
    await write(resolve(site, 'legacy/old.pdf'), pdf);
    await write(resolve(site, 'assets/article-pdfs.json'), JSON.stringify({version: 2, origin: 'https://history-math.org', baseurl: '',
      articles: [{url: '/ru/publications/example/', pdf_url: '/assets/pdf/ru/example-ru.pdf', lang: 'ru', title: 'Title'}]}));
    await write(resolve(site, 'ru/publications/example/index.html'), `<p>Original prose ${path}</p><img src="${previewPath}" data-original-path="${path}" data-original="${path}" alt="A > B"><a href="/legacy/old.pdf#page=2">Legacy PDF</a>`);
    await run({root, site, path, previewPath, write});
  } finally { await rm(root, {recursive: true, force: true}); }
}

test('real publication plan covers legacy PDFs, preserves source and prunes only after complete evidence', async () => {
  await fixture(async ({root, site, path, previewPath}) => {
    const plan = await publicationPlan(root, site);
    assert.equal(plan.images.length, 1); assert.equal(plan.pdfs.length, 2); assert.equal(plan.objects.length, 3);
    const receipt = plan.objects.map(value => ({...validateObject(value), verified: true}));
    await assert.rejects(finalizePublication(resolve(root, 'site'), plan, receipt, {pruneOutput: true}), /output changed/);
    await assert.rejects(publicationPlan(root, resolve(root, 'site')), /separate from source/);
    for (const broken of [[], receipt.slice(1), [...receipt, receipt[0]],
      receipt.map((value, index) => index ? value : {...value, verified: false}),
      receipt.map((value, index) => index ? value : {...value, source: {file: '/private'}})]) {
      assert.throws(() => requireReceipt(plan, broken));
      await assert.rejects(finalizePublication(site, plan, broken, {pruneOutput: true}));
      await access(resolve(site, '.' + path)); await access(resolve(site, 'legacy/old.pdf'));
    }
    await finalizePublication(site, plan, receipt);
    await access(resolve(site, '.' + path));
    await finalizePublication(site, plan, receipt, {pruneOutput: true});
    await assert.rejects(access(resolve(site, '.' + path)));
    await assert.rejects(access(resolve(site, 'legacy/old.pdf')));
    await access(resolve(site, '.' + previewPath));
    assert.deepEqual(await readFile(resolve(root, 'site', '.' + path)), original);
    const html = await readFile(resolve(site, 'ru/publications/example/index.html'), 'utf8');
    assert.ok(html.includes(`<p>Original prose ${path}</p>`));
    assert.ok(html.includes('alt="A > B"')); assert.ok(html.includes('data-original-storage="s3"'));
    assert.ok(html.includes(plan.pdfs.find(value => value.path === '/legacy/old.pdf').object.url + '#page=2'));
    const publicReceipt = JSON.parse(await readFile(resolve(site, 'assets/publication-media.json')));
    assert.equal(publicReceipt.objects.length, 3); assert.equal(JSON.stringify(publicReceipt).includes(root), false);
  });
});

test('changed local media and symlink escapes fail before output edits', async () => {
  await fixture(async ({root, site, path, write}) => {
    const plan = await publicationPlan(root, site), receipt = plan.objects.map(value => ({...validateObject(value), verified: true}));
    const htmlFile = resolve(site, 'ru/publications/example/index.html'), before = await readFile(htmlFile, 'utf8');
    await write(resolve(site, '.' + path), Buffer.from('changed'));
    await assert.rejects(finalizePublication(site, plan, receipt, {pruneOutput: true}));
    assert.equal(await readFile(htmlFile, 'utf8'), before);
    await symlink(resolve(root, 'site'), resolve(site, 'escape'));
    await assert.rejects(localBytes(site, '/escape/assets/images/example/figure.png'));
    await assert.rejects(publicationPlan(root, site), /Symlink/);
  });
});

test('URL rewriting covers root/project base, legacy HTML, CSS and JSON without changing prose or titles', async () => {
  await fixture(async ({root, site, path, previewPath}) => {
    const initial = await publicationPlan(root, site);
    for (const baseurl of ['', '/history_math']) {
      const plan = {...initial, baseurl};
      const html = `<img src='${baseurl + path}' srcset='${baseurl + path} 1000w' alt='A > B'><a href=${baseurl}/legacy/old.pdf#page=3>PDF</a><p>${path}</p>`;
      const rewritten = rewriteMedia(html, 'ru/old/index.html', plan);
      assert.ok(rewritten.includes(`src="${baseurl + previewPath}"`)); assert.ok(!rewritten.includes('srcset='));
      assert.ok(rewritten.includes('data-original-storage="s3"')); assert.ok(rewritten.includes(`<p>${path}</p>`));
      assert.ok(rewritten.includes(plan.pdfs.find(value => value.path === '/legacy/old.pdf').object.url + '#page=3'));
      const absolute = rewriteMedia('<a href="https://fuzzy-technologies.github.io/history_math/legacy/old.pdf">PDF</a>', 'index.html', plan);
      assert.ok(absolute.includes(storage.base));
      assert.equal(rewriteMedia(`<a href="https://other.invalid${path}">Other</a>`, 'index.html', plan), `<a href="https://other.invalid${path}">Other</a>`);
      const json = JSON.parse(rewriteMedia(JSON.stringify({title: path, image: path, pdf_url: '/legacy/old.pdf'}), 'assets/test.json', plan));
      assert.equal(json.title, path); assert.equal(json.image, baseurl + previewPath); assert.ok(json.pdf_url.startsWith(storage.base));
      assert.ok(rewriteMedia(`a{background:url('${baseurl + path}')}`, 'assets/style.css', plan).includes(baseurl + previewPath));
    }
  });
});

test('literal percentages and malformed URI escapes stay untouched while valid media URLs migrate', async () => {
  await fixture(async ({root, site}) => {
    const plan = await publicationPlan(root, site);
    const untouched = '<meta name="description" content="Use 100% of the page"><a href="/reference/%E0%A4%A">Reference</a>';
    const html = untouched + '<a href="/legacy/%6Fld.pdf?download=1#page=2">PDF</a>';
    const rewritten = rewriteMedia(html, 'index.html', plan);
    assert.ok(rewritten.startsWith(untouched));
    assert.ok(rewritten.includes(plan.pdfs.find(value => value.path === '/legacy/old.pdf').object.url + '?download=1#page=2'));
    const css = 'a{background:url("/decorative/100%.svg")}';
    assert.equal(rewriteMedia(css, 'assets/style.css', plan), css);
    const data = {url: '/reference/%FF', image: '/decorative/100%.svg', pdf_url: '/legacy/old.pdf'};
    const json = JSON.parse(rewriteMedia(JSON.stringify(data), 'assets/example.json', plan));
    assert.equal(json.url, data.url); assert.equal(json.image, data.image);
    assert.ok(json.pdf_url.startsWith(storage.base));
  });
});

test('native S3 originals use exact identities and never require cross-origin fetch', async () => {
  const descriptor = {url: object.url, storage: 's3', sha256: object.sha256, bytes: object.bytes, filename: object.filename};
  assert.equal(nativeOriginalTarget(descriptor).url, object.url);
  for (const mutation of [{url: object.url + '?x=1'}, {url: object.url.replace('media-kz', 'foreign')},
    {sha256: 'f'.repeat(64)}, {apiUrl: 'https://api.github.com'}, {storage: 'unknown'}]) {
    assert.throws(() => nativeOriginalTarget({...descriptor, ...mutation}));
  }
  await assert.rejects(loadVerifiedOriginal(descriptor, {fetch: () => assert.fail('No CORS fetch')}), /native/);
});

test('backfill paginates and reads pinned same-repository article PR data without executing contributor code', async () => {
  const pr = {number: 81, state: 'open', base: {ref: 'master'}, head: {ref: 'feature/article-example-ru', sha: 'a'.repeat(40), repo: {full_name: 'Fuzzy-Technologies/history_math'}}};
  assert.equal(eligiblePR(pr), true);
  for (const candidate of [{...pr, state: 'closed'}, {...pr, base: {ref: 'develop'}}, {...pr, head: {...pr.head, sha: 'bad'}},
    {...pr, head: {...pr.head, ref: 'feature/other'}}, {...pr, head: {...pr.head, repo: {full_name: 'other/repo'}}}]) assert.equal(eligiblePR(candidate), false);
  const calls = [], api = async path => {
    calls.push(path);
    if (path.startsWith('/pulls?')) return [pr];
    if (path.includes('/files?')) return [];
    if (path.startsWith('/git/trees/')) return {truncated: false, tree: []};
    return pr;
  };
  const result = await pullRequestObjects(api);
  assert.deepEqual(result.pulls, [{number: 81, sha: pr.head.sha, image_manifests: 0, pdfs: 0}]);
  assert.ok(calls.some(path => path === `/git/trees/${pr.head.sha}?recursive=1`));
  await assert.rejects(pullRequestObjects(async path => path.startsWith('/pulls?') ? [pr] : {truncated: true}), /Incomplete/);
  await assert.rejects(pullRequestObjects(async path => path === '/pulls/81' ? {...pr, state: 'closed'} : api(path)), /changed/);
  for (const path of ['../secret', '/outside']) await assert.rejects(revisionBytes(pr.head.sha, path, () => assert.fail('Unsafe source request')));
  await assert.rejects(githubData('/../other', {request: () => assert.fail('Unsafe API request')}));
});

test('one-time backfill copies exact existing PDFs without a renderer or site changes', async () => {
  const origin = 'https://history-math.org', path = '/assets/pdf/ru/example-ru.pdf';
  const objects = await deployedPdfObjects(origin, '', async url => {
    if (url.endsWith('.json')) return Response.json({version: 2, origin, baseurl: '', articles: [{pdf_url: path}]});
    assert.equal(url, origin + path);
    return new Response(pdf, {headers: {'content-type': 'application/pdf'}});
  });
  assert.equal(objects.length, 1); assert.equal(objects[0].sha256, sha256(pdf));
  for (const pdf_url of ['https://evil.invalid/file.pdf', '/assets/pdf/ru/../../private.pdf']) {
    await assert.rejects(deployedPdfObjects(origin, '', async () => Response.json({version: 2, origin, baseurl: '', articles: [{pdf_url}]})));
  }
  await assert.rejects(deployedPdfObjects('https://evil.invalid', '', () => assert.fail('No arbitrary source')));
  await assert.rejects(sourceBytes({...object, source: {url: 'https://evil.invalid/file.png'}}, () => assert.fail('No arbitrary original')));
});

test('first publication automatically copies old PDFs and skips that migration after links switch to S3', async () => {
  const origin = 'https://history-math.org', path = '/assets/pdf/ru/example-ru.pdf';
  const expected = mediaObject('pdf', 'example-ru.pdf', sha256(pdf), pdf.length);
  let uploaded = 0, publicGets = 0;
  const client = {send: async command => {
    if (command instanceof HeadObjectCommand) throw {$metadata: {httpStatusCode: 404}};
    assert.ok(command instanceof PutObjectCommand); assert.deepEqual(command.input.Body, pdf); uploaded++;
  }};
  const request = async url => {
    if (url.endsWith('.json')) return Response.json({version: 2, origin, baseurl: '', articles: [{pdf_url: path}]});
    if (url === expected.url) { publicGets++; return publicResponse(expected, pdf); }
    assert.equal(url, origin + path); return new Response(pdf, {headers: {'content-type': 'application/pdf'}});
  };
  const result = await copyPublishedPdfs({origin, baseurl: '', client, request});
  assert.equal(result.summary.existing_pdfs, 1); assert.equal(uploaded, 1); assert.equal(publicGets, 1);
  assert.equal(result.objects[0].sha256, expected.sha256);
  const skipped = await copyPublishedPdfs({origin, baseurl: '', client: {send: () => assert.fail('No migration after switch')}, request: async url => {
    assert.ok(url.endsWith('.json'));
    return Response.json({version: 2, origin, baseurl: '', articles: [{pdf_url: expected.url}]});
  }});
  assert.equal(skipped.summary.existing_pdfs, 0);
});

test('early migration preflight copies originals and legacy PDFs without changing any site or source files', async () => {
  await fixture(async ({root, site, path}) => {
    const pdfObject = mediaObject('pdf', 'example-ru.pdf', sha256(pdf), pdf.length);
    const htmlFile = resolve(site, 'ru/publications/example/index.html'), before = await readFile(htmlFile, 'utf8');
    const result = await preflightMedia({root, origin: 'https://history-math.org', baseurl: '',
      client: {send: async command => { if (command instanceof HeadObjectCommand) throw {$metadata: {httpStatusCode: 404}}; }},
      request: async url => {
        if (url.endsWith('.json')) return Response.json({version: 2, origin: 'https://history-math.org', baseurl: '', articles: [{pdf_url: '/assets/pdf/ru/example-ru.pdf'}]});
        if (url === pdfObject.url) return publicResponse(pdfObject, pdf);
        if (url === object.url) return publicResponse(object, original);
        return new Response(pdf, {headers: {'content-type': 'application/pdf'}});
      }});
    assert.equal(result.summary.existing_pdfs, 1); assert.equal(result.summary.originals, 1); assert.equal(result.summary.deleted, 0);
    assert.equal(await readFile(htmlFile, 'utf8'), before);
    await access(resolve(site, '.' + path)); assert.deepEqual(await readFile(resolve(root, 'site', '.' + path)), original);
    const skipped = await preflightMedia({root: '/unavailable-not-needed', origin: 'https://history-math.org', baseurl: '',
      client: {send: () => assert.fail('No new upload for migrated site')}, request: async () => Response.json({version: 2,
        origin: 'https://history-math.org', baseurl: '', articles: [{pdf_url: pdfObject.url}]})});
    assert.equal(skipped.summary.existing_pdfs, 0);
  });
});
