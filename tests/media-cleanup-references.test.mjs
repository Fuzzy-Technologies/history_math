import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mediaObject, sha256, storage} from '../scripts/s3-media.mjs';
import {sourceMediaReferences, referenceHeads, currentReferences, currentPublication, guardedHeads, rawReferenceBlob, referenceIdentity} from '../scripts/media-cleanup-references.mjs';

const master = 'a'.repeat(40), draft = 'b'.repeat(40);
const pdf = {...mediaObject('pdf', 'article-en.pdf', 'c'.repeat(64), 100), verified: true};
const image = {...mediaObject('originals', 'figure.jpg', 'd'.repeat(64), 200), verified: true};
const pr = () => ({state: 'open', number: 28, body: `Keep ${pdf.url}?versionId=old`, head: {sha: draft, repo: {full_name: 'Fuzzy-Technologies/history_math'}}});
const blob = (path, text) => {
  const bytes = Buffer.from(text), sha = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  return {item: {path, type: 'blob', mode: '100644', sha, size: bytes.length}, data: {encoding: 'base64', content: bytes.toString('base64'), size: bytes.length}};
};
function fixture() {
  const source = blob('site/article.md', `Read ${pdf.url}`), tracked = blob('site/assets/pdf/ru/draft-ru.pdf', '%PDF-fixture');
  const trees = {[master]: [source.item], [draft]: [source.item, tracked.item]}, blobs = {[source.item.sha]: source.data, [tracked.item.sha]: tracked.data};
  const calls = []; let pulls = [pr()];
  const api = async path => {
    calls.push(path);
    if (path === '/branches/master') return {commit: {sha: master}};
    if (path.startsWith('/pulls?')) return structuredClone(pulls);
    if (/^\/pulls\/28\/files\?/.test(path)) return trees[draft].map(item => ({filename: item.path, status: 'modified'}));
    if (path.startsWith('/git/trees/')) return {truncated: false, tree: structuredClone(trees[path.split('/')[3].split('?')[0]])};
    if (path.startsWith('/git/blobs/')) return structuredClone(blobs[path.split('/')[3]]);
    throw new Error('Unexpected API path');
  };
  return {api, calls, source, tracked, trees, blobs, setPulls: value => {pulls = value;}};
}

test('references cover direct, escaped, encoded S3 links and stable PDF aliases', () => {
  const encoded = pdf.url.replace('/article-en.pdf', '/article%2Den.pdf');
  const found = sourceMediaReferences(`${pdf.url.replaceAll('/', '\\/')} ${encoded} /assets/pdf/ru/pinned-ru.pdf`);
  assert.deepEqual(found.keys, [pdf.key]); assert.deepEqual(found.names, ['pinned-ru.pdf']);
  assert.deepEqual(sourceMediaReferences('https://storage.yandexcloud.kz/history-math-media-kz/pdf/${hash}/${name}'), {keys: [], names: [], versions: []});
});

test('all open PR heads and bodies are pinned; tracked PDF bytes protect their S3 identity', async () => {
  const f = fixture(), result = await currentReferences({api: f.api});
  assert.ok(result.keys.includes(pdf.key));
  assert.ok(result.keys.includes(mediaObject('pdf', 'draft-ru.pdf', sha256(Buffer.from('%PDF-fixture')), 12).key));
  assert.equal(result.pulls[0].number, 28); assert.equal(result.pulls[0].body, undefined);
  assert.equal(result.pulls[0].body_sha256, sha256(Buffer.from(pr().body)));
  assert.equal(f.calls.filter(path => path === `/git/blobs/${f.source.item.sha}`).length, 1);
  assert.equal(f.calls.filter(path => path.startsWith('/branches/')).length, 2);
});

test('local cache is accepted only for the pinned Git blob identity', async () => {
  for (const corrupt of [false, true]) {
    const f = fixture();
    await currentReferences({api: f.api, root: '/trusted', localRead: async () => Buffer.from(corrupt ? 'bad' : `Read ${pdf.url}`)});
    assert.equal(f.calls.includes(`/git/blobs/${f.source.item.sha}`), corrupt);
  }
});

test('foreign PRs, truncated trees, unsafe paths, corrupt bytes and reference races block cleanup', async () => {
  const foreign = fixture(); foreign.setPulls([{...pr(), head: {...pr().head, repo: {full_name: 'fork/repo'}}}]);
  await assert.rejects(referenceHeads(foreign.api), /cannot be fully inventoried/);
  for (const change of [
    f => {f.trees[draft][1].path = '../escape.pdf';},
    f => {f.trees[draft][1].mode = '120000';},
    f => {f.trees[draft][1].size = -1;},
    f => {f.trees[draft][1].path = 'oversized.md'; f.trees[draft][1].size = 2_000_001;},
    f => {f.trees[draft].push({type: 'commit', path: 'submodule'});},
    f => {f.blobs[f.tracked.item.sha].content = Buffer.from('corrupt').toString('base64');}
  ]) {const f = fixture(); change(f); await assert.rejects(currentReferences({api: f.api}));}
  const f = fixture();
  await assert.rejects(currentReferences({api: async path => {
    const value = await f.api(path); return path.startsWith('/git/trees/') ? {...value, truncated: true} : value;
  }}), /Incomplete/);
  const race = fixture(); let reads = 0;
  await assert.rejects(currentReferences({api: async path => {
    if (path === '/branches/master' && ++reads === 2) race.setPulls([{...pr(), body: 'Changed references'}]);
    return race.api(path);
  }}), /changed during collection/);
});

test('open PR pagination cannot silently omit drafts', async () => {
  let pages = 0;
  const result = await referenceHeads(async path => {
    if (path === '/branches/master') return {commit: {sha: master}};
    pages++;
    return pages === 1 ? Array.from({length: 100}, (_, i) => ({...pr(), number: i + 1})) : [{...pr(), number: 101}];
  });
  assert.equal(result.pulls.length, 101); assert.equal(pages, 2);
});

function publicFixture({article = `<a href="${pdf.url}">PDF</a><img data-original="${image.url}">`, articles, objects} = {}) {
  const urls = [];
  const request = async (url, options) => {
    urls.push(url); assert.equal(options.redirect, 'error');
    if (url.endsWith('/publication-media.json')) return Response.json({version: 1, objects: objects || [pdf, image]});
    if (url.endsWith('/article-pdfs.json')) return Response.json({version: 2, origin: 'https://history-math.org', baseurl: '',
      articles: articles || [{url: '/publications/article-en/', lang: 'en', pdf_url: pdf.url}]});
    return new Response(article);
  };
  return {request, urls};
}

test('live pages must link to receipt PDFs and S3 originals; guards can reread just the manifests', async () => {
  const f = publicFixture(), result = await currentPublication({request: f.request});
  assert.deepEqual(result.objects, [pdf, image]); assert.deepEqual(result.pdfObjects, [pdf]); assert.deepEqual(result.protectedKeys, [pdf.key, image.key]);
  assert.equal(f.urls.length, 3);
  f.urls.length = 0;
  assert.equal((await currentPublication({request: f.request, pages: false})).digest, result.digest);
  assert.equal(f.urls.length, 2);
  for (const mutation of [
    {article: '<a href="/assets/pdf/en/article-en.pdf">PDF</a>'},
    {article: `<a href="${pdf.url}">PDF</a><img data-original="/assets/images/full.jpg">`},
    {article: `<a href="${pdf.url}">PDF</a><img data-original="${storage.base}/originals/unknown.jpg">`},
    {articles: [{url: 'https://foreign.test/', lang: 'en', pdf_url: pdf.url}]},
    {articles: [{url: '/publications/article-en/', lang: 'en', pdf_url: 'https://foreign.test/a.pdf'}]},
    {objects: [pdf, pdf]}, {objects: [{...pdf, verified: false}, image]}
  ]) await assert.rejects(currentPublication({request: publicFixture(mutation).request}));
});

test('live manifests and pages reconnect without weakening content validation', async () => {
  const f = publicFixture(), attempts = new Map();
  const result = await currentPublication({retryOptions: {pause: async () => {}}, request: async (url, options) => {
    const count = (attempts.get(url) || 0) + 1; attempts.set(url, count);
    if (count === 1) return new Response('temporary', {status: 503});
    if (count === 2) throw Object.assign(new TypeError('fetch failed'), {cause: {code: 'UND_ERR_SOCKET'}});
    return f.request(url, options);
  }});
  assert.deepEqual(result.objects, [pdf, image]);
  assert.equal(attempts.size, 3); assert.ok([...attempts.values()].every(value => value === 3));
  let calls = 0;
  await assert.rejects(currentPublication({retryOptions: {pause: () => assert.fail('No authentication retry')},
    request: async () => {calls++; return new Response('SECRET', {status: 403});}}), /HTTP_403/);
  assert.equal(calls, 1);
});

test('pinned raw source reads never forward tokens, accept redirects or exceed their byte bound', async () => {
  const source = blob('site/assets/a.pdf', '%PDF-fixture');
  const result = await rawReferenceBlob(master, source.item, async (url, options) => {
    assert.equal(url, `https://raw.githubusercontent.com/Fuzzy-Technologies/history_math/${master}/site/assets/a.pdf`);
    assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); assert.equal(options.headers, undefined);
    return new Response('%PDF-fixture');
  });
  assert.equal(result.size, source.item.size);
  await assert.rejects(rawReferenceBlob(master, {...source.item, path: '../secret'}, async () => assert.fail('No read')));
  await assert.rejects(rawReferenceBlob(master, {...source.item, size: 2}, async () => new Response('too long')));
});

test('pinned source reads reconnect with unchanged destination and byte bounds', async () => {
  const source = blob('site/source.md', 'source'); let calls = 0;
  const result = await rawReferenceBlob(master, source.item, async (url, options) => {
    assert.equal(url, `https://raw.githubusercontent.com/Fuzzy-Technologies/history_math/${master}/site/source.md`);
    assert.equal(options.headers, undefined); assert.equal(options.redirect, 'error');
    if (++calls < 3) throw Object.assign(new TypeError('fetch failed'), {cause: {code: 'ECONNRESET'}});
    return new Response('source');
  }, {pause: async () => {}});
  assert.equal(calls, 3); assert.equal(result.content, source.data.content);
  calls = 0;
  await assert.rejects(rawReferenceBlob(master, source.item, async () => {calls++; return new Response('too many bytes');},
    {pause: () => assert.fail('No retry for invalid bytes')}));
  assert.equal(calls, 1);
});

test('GraphQL guards match REST identities and reject forks, changed pagination and partial data', async () => {
  const result = {data: {repository: {ref: {target: {oid: master}}, pullRequests: {nodes: [
    {number: 28, body: pr().body, state: 'OPEN', headRefOid: draft, headRepository: {nameWithOwner: 'Fuzzy-Technologies/history_math'}}
  ], pageInfo: {hasNextPage: false, endCursor: null}}}}};
  const heads = await guardedHeads({token: 'test', request: async (url, options) => {
    assert.equal(url, 'https://api.github.com/graphql'); assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error');
    return Response.json(result);
  }});
  assert.equal(referenceIdentity(heads), referenceIdentity(await referenceHeads(fixture().api)));
  for (const mutate of [r => {r.errors = [{message: 'do not print'}];},
    r => {r.data.repository.pullRequests.nodes[0].headRepository.nameWithOwner = 'fork/repo';},
    r => {r.data.repository.pullRequests.pageInfo.hasNextPage = true;},
    r => {r.data.repository.ref.target.oid = 'invalid';}]) {
    const bad = structuredClone(result); mutate(bad);
    await assert.rejects(guardedHeads({token: 'test', request: async () => Response.json(bad)}));
  }
});

test('read-only GraphQL guards retry transport errors without retrying partial reference data', async () => {
  const result = {data: {repository: {ref: {target: {oid: master}}, pullRequests: {nodes: [], pageInfo: {hasNextPage: false}}}}};
  let calls = 0;
  assert.equal((await guardedHeads({token: 'SECRET', retryOptions: {pause: async () => {}}, request: async () => {
    if (++calls === 1) throw Object.assign(new TypeError('fetch failed'), {cause: {code: 'ECONNRESET'}});
    return Response.json(result);
  }})).master_sha, master);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(guardedHeads({token: 'SECRET', retryOptions: {pause: () => assert.fail('No partial-data retry')},
    request: async () => {calls++; return Response.json({errors: [{message: 'SECRET'}]});}}));
  assert.equal(calls, 1);
});

test('image references protect the current S3 variant and bind its release source for migration', async () => {
  const f = fixture(), path = '/assets/images/hm-tt-example/figure.jpg', hash = image.sha256, tag = `article-originals-${hash[0]}`;
  const entry = {sha256: hash, bytes: 200, width: 10, height: 10, logo: false,
    variants: [{path: '/assets/images/previews/hm-tt-example/figure.webp', width: 5, height: 5, bytes: 10, sha256: 'e'.repeat(64)}],
    external_original: {storage: 'github-release', sha256: hash, bytes: 200, asset_id: 123, release_tag: tag,
      url: `https://github.com/Fuzzy-Technologies/history_math/releases/download/${tag}/hm-tt-example-figure-${hash}.jpg`,
      api_url: 'https://api.github.com/repos/Fuzzy-Technologies/history_math/releases/assets/123'}};
  const descriptor = blob('site/_data/article_image_assets/hm-tt-example.json', JSON.stringify({[path]: entry}));
  f.trees[draft].push(descriptor.item); f.blobs[descriptor.item.sha] = descriptor.data;
  const result = await currentReferences({api: f.api});
  assert.ok(result.objects.some(o => o.key === image.key));
  assert.equal(result.migrations[0].external.asset_id, 123);
  assert.equal(result.releaseUrls.includes(entry.external_original.url), false, 'Provenance is not a live GitHub download link');
});
