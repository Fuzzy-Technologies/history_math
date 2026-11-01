import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mediaObject, sha256, storage} from '../scripts/s3-media.mjs';
import {sourcePdfReferences, referenceHeads, retentionReferences, liveRetentionReferences} from '../scripts/pdf-retention-references.mjs';

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
    if (path.startsWith('/git/trees/')) return {truncated: false, tree: structuredClone(trees[path.split('/')[3].split('?')[0]])};
    if (path.startsWith('/git/blobs/')) return structuredClone(blobs[path.split('/')[3]]);
    throw new Error('Unexpected API path');
  };
  return {api, calls, source, tracked, trees, blobs, setPulls: value => {pulls = value;}};
}

test('references cover direct, escaped, encoded S3 links and stable PDF aliases', () => {
  const encoded = pdf.url.replace('/article-en.pdf', '/article%2Den.pdf');
  const found = sourcePdfReferences(`${pdf.url.replaceAll('/', '\\/')} ${encoded} /assets/pdf/ru/pinned-ru.pdf`);
  assert.deepEqual(found.keys, [pdf.key]); assert.deepEqual(found.names, ['pinned-ru.pdf']);
  assert.deepEqual(sourcePdfReferences('https://storage.yandexcloud.kz/history-math-media-kz/pdf/${hash}/${name}'), {keys: [], names: []});
});

test('all open PR heads and bodies are pinned; tracked PDF bytes protect their S3 identity', async () => {
  const f = fixture(), result = await retentionReferences({api: f.api});
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
    await retentionReferences({api: f.api, root: '/trusted', localRead: async () => Buffer.from(corrupt ? 'bad' : `Read ${pdf.url}`)});
    assert.equal(f.calls.includes(`/git/blobs/${f.source.item.sha}`), corrupt);
  }
});

test('foreign PRs, truncated trees, unsafe paths, corrupt bytes and reference races block retention', async () => {
  const foreign = fixture(); foreign.setPulls([{...pr(), head: {...pr().head, repo: {full_name: 'fork/repo'}}}]);
  await assert.rejects(referenceHeads(foreign.api), /cannot be fully inventoried/);
  for (const change of [
    f => {f.trees[draft][1].path = '../escape.pdf';},
    f => {f.trees[draft][1].mode = '120000';},
    f => {f.trees[draft][1].size = -1;},
    f => {f.trees[draft][1].path = 'oversized.md'; f.trees[draft][1].size = 2_000_001;},
    f => {f.trees[draft].push({type: 'commit', path: 'submodule'});},
    f => {f.blobs[f.tracked.item.sha].content = Buffer.from('corrupt').toString('base64');}
  ]) {const f = fixture(); change(f); await assert.rejects(retentionReferences({api: f.api}));}
  const f = fixture();
  await assert.rejects(retentionReferences({api: async path => {
    const value = await f.api(path); return path.startsWith('/git/trees/') ? {...value, truncated: true} : value;
  }}), /Incomplete/);
  const race = fixture(); let reads = 0;
  await assert.rejects(retentionReferences({api: async path => {
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
  const f = publicFixture(), result = await liveRetentionReferences({request: f.request});
  assert.deepEqual(result.objects, [pdf]); assert.deepEqual(result.protectedKeys, [pdf.key]);
  assert.equal(f.urls.length, 3);
  f.urls.length = 0;
  assert.equal((await liveRetentionReferences({request: f.request, pages: false})).digest, result.digest);
  assert.equal(f.urls.length, 2);
  for (const mutation of [
    {article: '<a href="/assets/pdf/en/article-en.pdf">PDF</a>'},
    {article: `<a href="${pdf.url}">PDF</a><img data-original="/assets/images/full.jpg">`},
    {article: `<a href="${pdf.url}">PDF</a><img data-original="${storage.base}/originals/unknown.jpg">`},
    {articles: [{url: 'https://foreign.test/', lang: 'en', pdf_url: pdf.url}]},
    {articles: [{url: '/publications/article-en/', lang: 'en', pdf_url: 'https://foreign.test/a.pdf'}]},
    {objects: [pdf, pdf]}, {objects: [{...pdf, verified: false}, image]}
  ]) await assert.rejects(liveRetentionReferences({request: publicFixture(mutation).request}));
});
