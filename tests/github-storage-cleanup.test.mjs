import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaObject} from '../scripts/s3-media.mjs';
import {githubInventory, githubCleanupPlan, applyGithubCleanup, storageRequest} from '../scripts/github-storage-cleanup.mjs';

const sha = 'a'.repeat(64), master = 'b'.repeat(40), draft = 'c'.repeat(40);
const replica = mediaObject('originals', 'figure.png', sha, 200), url = `https://github.com/Fuzzy-Technologies/history_math/releases/download/article-originals-a/article-figure-${sha}.png`;
const asset = (id = 123) => ({id, name: `article-figure-${sha}.png`, size: 200, state: 'uploaded', digest: 'sha256:' + sha,
  release_tag: 'article-originals-a', browser_download_url: url});
const references = () => ({pulls: [{number: 28, sha: draft}], releaseUrls: [], migrations: [{object: replica,
  external: {asset_id: 123, url, bytes: 200, sha256: sha}}]});
const artifact = (id, head = master, name = 'article-report-' + master, run = id) => ({id, name, size_in_bytes: 100,
  created_at: `2026-01-${String(id).padStart(2, '0')}T00:00:00Z`, workflow_run: {id: run, head_sha: head}});
const inventory = () => ({assets: [asset()], artifacts: [], caches: [], running: []});
const plan = (extra = {}, refs = references()) => githubCleanupPlan({...inventory(), ...extra}, refs, {master, runId: 999});

test('release copies require exact S3 migration identities; direct links and new staging uploads remain', () => {
  assert.equal(plan().actions[0].replica.key, replica.key);
  const refs = references(); refs.releaseUrls.push(url); assert.equal(plan({}, refs).actions.length, 0);
  assert.equal(plan({assets: [asset(456)]}).retained[0].reason, 'unclassified-staging-upload');
  assert.equal(plan({assets: [asset(630538942)]}).actions[0].reason, 'unreferenced-original');
  for (const mutate of [a => {a.size++;}, a => {a.digest = 'sha256:' + 'f'.repeat(64);}, a => {a.release_tag = 'product';}, a => {a.state = 'uploading';}]) {
    const bad = asset(); mutate(bad); assert.throws(() => plan({assets: [bad]}));
  }
});

test('stale artifacts are deleted while current reports and all active runs remain', () => {
  const result = plan({artifacts: [artifact(1), artifact(2), artifact(3, 'd'.repeat(40)), artifact(4, draft),
    artifact(5, master, 'article-pdfs-master'), artifact(6, master, 'github-pages', 10), artifact(7, master, 'github-pages', 999)], running: [10]});
  assert.deepEqual(result.actions.filter(a => a.kind === 'artifact').map(a => a.id).sort(), [1, 3, 5]);
  assert.ok(result.retained.some(a => a.id === 2)); assert.ok(result.retained.some(a => a.id === 4));
  assert.ok(result.retained.some(a => a.id === 6)); assert.ok(result.retained.some(a => a.id === 7));
});

test('the current review preview of an open draft survives while its previous preview is removed', () => {
  const result = plan({artifacts: [artifact(8, draft, 'article-preview-' + draft), artifact(9, draft, 'article-preview-' + draft)]});
  assert.ok(result.retained.some(item => item.kind === 'artifact' && item.id === 9));
  assert.ok(!result.actions.some(item => item.kind === 'artifact' && item.id === 9));
  assert.ok(result.actions.some(item => item.kind === 'artifact' && item.id === 8));
  const bad = structuredClone(result); bad.actions.push({kind: 'artifact', id: 9, bytes: 100});
  return assert.rejects(applyGithubCleanup(bad, {api: async () => assert.fail('Never delete the current preview'), guard: async () => {}, verify: async () => {}}));
});

test('only the newest current master PDF cache is retained; unrelated dependency caches are untouched', () => {
  const result = plan({caches: [1, 2].map(id => ({id, key: `pdf-v1-Linux-${master}-${id}-1-build`, version: String(id), ref: 'refs/heads/master',
    size_in_bytes: 1000, created_at: `2026-01-0${id}T00:00:00Z`})).concat({id: 3, key: 'node-cache', ref: 'refs/heads/master'})});
  assert.deepEqual(result.actions.filter(a => a.kind === 'cache').map(a => a.id), [1]);
  assert.ok(result.retained.some(a => a.id === 2));
});

test('storage inventories follow all asset pages and never treat embedded release assets as complete', async () => {
  const calls = [];
  const result = await githubInventory(async path => {
    calls.push(path);
    if (path.startsWith('/releases?')) return [{id: 1, tag_name: 'article-originals-a'}, {id: 2, tag_name: 'v1.0.0'}];
    if (path.startsWith('/releases/1/assets')) return [asset()];
    if (path.startsWith('/actions/artifacts')) return {artifacts: []};
    if (path.startsWith('/actions/caches')) return {actions_caches: []};
    return {workflow_runs: []};
  });
  assert.equal(result.assets.length, 1); assert.ok(calls.some(p => p.startsWith('/releases/1/assets')));
  assert.ok(!calls.some(p => p.startsWith('/releases/2/assets')));
  await assert.rejects(githubInventory(async () => ({incomplete: true})), /Incomplete/);
});

test('all replacement bytes pass before the first exact-ID deletion; corrupt copies or changed refs block writes', async () => {
  const calls = [], selected = plan(); let verified = false;
  const api = async (path, options) => {assert.equal(verified, true); calls.push([path, options.method]); return {};};
  const result = await applyGithubCleanup(selected, {api, guard: async () => {}, verify: async o => {assert.equal(o.key, replica.key); verified = true;}});
  assert.equal(result.complete, true); assert.deepEqual(calls, [['/releases/assets/123', 'DELETE']]);
  calls.length = 0;
  await assert.rejects(applyGithubCleanup(selected, {api, guard: async () => {}, verify: async () => {throw Error('corrupt S3');}}), /corrupt/);
  await assert.rejects(applyGithubCleanup(selected, {api, guard: async () => {throw Error('changed refs');}, verify: async () => {}}), /changed/);
  assert.equal(calls.length, 0);
  const bad = structuredClone(selected); bad.retained.push({kind: 'release-asset', id: 123});
  await assert.rejects(applyGithubCleanup(bad, {api, guard: async () => {}, verify: async () => {}}));
});

test('rate limits produce an honest resumable result and failures keep an incremental journal', async () => {
  const selected = plan(), calls = [], journals = [];
  const result = await applyGithubCleanup(selected, {quota: () => 100, guard: async () => {},
    api: async () => calls.push('delete'), verify: async () => assert.fail('No useless full download without quota')});
  assert.equal(result.complete, false); assert.equal(result.remaining, 1); assert.equal(calls.length, 0);
  await assert.rejects(applyGithubCleanup(selected, {guard: async () => {}, verify: async () => {},
    api: async () => {throw Object.assign(Error('SECRET'), {status: 403});}, journal: async value => journals.push(structuredClone(value))}), /HTTP 403/);
  assert.equal(journals.at(-1).failure.id, 123); assert.ok(!JSON.stringify(journals).includes('SECRET'));
});

test('GitHub write adapter only permits the fixed repository and three exact deletion endpoints', async () => {
  for (const path of ['/git/refs/heads/master', '/releases/123', '/actions/artifacts/../123', 'https://foreign.test/123']) {
    await assert.rejects(storageRequest(path, {method: 'DELETE', token: 'test', request: async () => assert.fail('No request')}));
  }
  await storageRequest('/releases/assets/123', {method: 'DELETE', token: 'test', request: async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/Fuzzy-Technologies/history_math/releases/assets/123');
    assert.equal(options.redirect, 'error'); return new Response(null, {status: 204});
  }});
});
