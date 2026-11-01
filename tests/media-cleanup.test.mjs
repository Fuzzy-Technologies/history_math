import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaObject} from '../scripts/s3-media.mjs';
import {cleanupPlan, mediaVersions, applyCleanup, executionMode, verifyCurrentMedia} from '../scripts/media-cleanup.mjs';

const now = Date.parse('2026-01-01T00:00:00.000Z');
const object = (hash, kind = 'pdf', name = 'article-en.pdf') => ({...mediaObject(kind, name, hash.repeat(64), 100), verified: true});
const pdf = object('a'), old = object('b'), image = object('c', 'originals', 'image.jpg'), draft = object('d', 'originals', 'draft.jpg');
const version = (object, id = 'current', extra = {}) => ({key: object.key, version_id: id, bytes: object.bytes,
  latest: true, last_modified: new Date(now).toISOString(), delete_marker: false, ...extra});
const versions = () => [version(pdf), version(old), version(image), version(draft)];
const plan = (extra = {}) => cleanupPlan({versions: versions(), liveObjects: [pdf, image], protectedKeys: [draft.key], now, ...extra});

test('only current PDF/images and current draft inputs remain; there is no previous-build archive or timer', () => {
  const result = plan();
  assert.deepEqual(result.deletions, [version(old)]);
  assert.equal(result.summary.candidate_bytes, 100);
  assert.equal(result.retained.length, 3);
  assert.equal(result.policy, 'current-only-v1');
  assert.equal(Object.hasOwn(result, 'state'), false);
  const unknown = object('e', 'pdf', 'withdrawn.pdf');
  assert.ok(plan({versions: [...versions(), version(unknown)]}).deletions.some(v => v.key === unknown.key));
});

test('old versions and delete markers are removed even when the latest content key is current', () => {
  const result = plan({versions: [...versions(), version(pdf, 'previous', {latest: false}), version(pdf, 'marker', {latest: false, delete_marker: true, bytes: 0})]});
  assert.deepEqual(result.deletions.filter(v => v.key === pdf.key).map(v => v.version_id), ['previous', 'marker']);
  assert.equal(result.retained.filter(v => v.key === pdf.key).length, 1);
});

test('explicit version references protect just the referenced version; aliases select current keys', () => {
  const records = [...versions(), version(pdf, 'pinned', {latest: false})];
  const result = plan({versions: records, protectedVersions: [{key: pdf.key, version_id: 'pinned'}], protectedNames: [pdf.filename]});
  assert.ok(result.retained.some(v => v.version_id === 'pinned'));
  assert.ok(result.deletions.some(v => v.key === old.key));
  assert.throws(() => plan({protectedNames: ['missing.pdf']}));
  assert.throws(() => plan({protectedVersions: [{key: pdf.key, version_id: 'missing'}]}));
});

test('incomplete, corrupt and ambiguous current references fail before any destructive operation', () => {
  for (const change of [
    {versions: versions().slice(1)}, {versions: [...versions(), versions()[0]]},
    {versions: [{...version(pdf), bytes: 99}, ...versions().slice(1)]},
    {versions: [{...version(pdf), delete_marker: true}, ...versions().slice(1)]},
    {versions: [{...version(pdf), key: 'infrastructure/probe.txt'}, ...versions().slice(1)]},
    {versions: [{...version(pdf), version_id: ''}, ...versions().slice(1)]},
    {liveObjects: [{...pdf, verified: false}]}, {liveObjects: [pdf, pdf]}, {now: NaN}
  ]) assert.throws(() => plan(change));
});

test('complete inventory pages both managed prefixes, including delete markers', async () => {
  const calls = [];
  const client = {send: async command => {
    const input = command.input; calls.push(input);
    if (input.Prefix === '_infrastructure-checks/') return {IsTruncated: false};
    const o = input.Prefix === 'pdf/' ? pdf : image;
    if (input.KeyMarker) return {IsTruncated: false, DeleteMarkers: [{Key: old.key, VersionId: 'marker', IsLatest: false, LastModified: new Date(now)}]};
    return {IsTruncated: input.Prefix === 'pdf/', Versions: [{Key: o.key, VersionId: 'id', Size: o.bytes, IsLatest: true, LastModified: new Date(now)}],
      ...(input.Prefix === 'pdf/' ? {NextKeyMarker: pdf.key, NextVersionIdMarker: 'id'} : {})};
  }};
  const result = await mediaVersions(client, now);
  assert.equal(result.length, 3); assert.equal(result.filter(v => v.delete_marker).length, 1);
  assert.deepEqual(calls.map(c => c.Prefix), ['pdf/', 'pdf/', 'originals/', '_infrastructure-checks/']);
  for (const bad of [{Versions: []}, {IsTruncated: true}, {IsTruncated: false, Versions: [{Key: 'outside/file', Size: 1}]}]) {
    await assert.rejects(mediaVersions({send: async () => bad}, now));
  }
});

test('exact version deletion rechecks references for every item and journals denied actions without secrets', async () => {
  const selected = plan(), calls = [], journals = []; let guards = 0;
  const client = {send: async command => calls.push(command.input)};
  const result = await applyCleanup(client, selected, {guard: async () => guards++, journal: async value => journals.push(structuredClone(value))});
  assert.equal(result.complete, true); assert.equal(guards, 1);
  assert.deepEqual(calls, [{Bucket: 'history-math-media-kz', Key: old.key, VersionId: 'current'}]);
  calls.length = 0;
  await assert.rejects(applyCleanup(client, selected, {guard: async () => {throw Error('PR changed');}}), /PR changed/);
  assert.equal(calls.length, 0);
  for (const mutate of [p => p.deletions.push(p.deletions[0]), p => p.deletions.push(version(pdf)),
    p => {p.deletions[0].key = '../outside';}, p => {p.generated_at = 'invalid';}, p => {p.policy = 'retain-previous';}]) {
    const bad = structuredClone(selected); mutate(bad); await assert.rejects(applyCleanup(client, bad, {guard: async () => {}}));
  }
  assert.equal(calls.length, 0);
  await assert.rejects(applyCleanup({send: async () => {throw Object.assign(Error('SECRET'), {$metadata: {httpStatusCode: 403}});}}, selected,
    {guard: async () => {}, journal: async value => journals.push(structuredClone(value))}), /HTTP 403/);
  assert.equal(journals.at(-1).failure.http_status, 403); assert.ok(!JSON.stringify(journals).includes('SECRET'));
});

test('default mode only reports; apply requires trusted successful master publication context', () => {
  assert.equal(executionMode([], {}), '--dry-run');
  const env = {GITHUB_REF: 'refs/heads/master', GITHUB_SHA: 'a'.repeat(40), GITHUB_EVENT_NAME: 'push', MEDIA_CLEANUP_AFTER_DEPLOY: 'true'};
  assert.equal(executionMode(['--apply'], env), '--apply');
  for (const change of [{GITHUB_REF: 'refs/heads/feature/x'}, {GITHUB_SHA: 'bad'}, {GITHUB_EVENT_NAME: 'schedule'}, {MEDIA_CLEANUP_AFTER_DEPLOY: ''}]) {
    assert.throws(() => executionMode(['--apply'], {...env, ...change}));
  }
  assert.throws(() => executionMode(['--observe'], env));
});

test('public metadata checks cover both PDFs and original images without accepting redirects', async () => {
  await verifyCurrentMedia([pdf, image], async (url, options) => {
    const o = url === pdf.url ? pdf : image; assert.equal(options.method, 'HEAD'); assert.equal(options.redirect, 'error');
    return new Response(null, {headers: {'content-length': String(o.bytes), 'content-type': o.content_type, 'x-amz-meta-sha256': o.sha256}});
  });
  for (const patch of [{'content-length': '99'}, {'content-type': 'text/html'}, {'x-amz-meta-sha256': 'bad'}]) {
    await assert.rejects(verifyCurrentMedia([pdf], async () => new Response(null, {headers: {'content-length': '100', 'content-type': pdf.content_type,
      'x-amz-meta-sha256': pdf.sha256, ...patch}})));
  }
});
