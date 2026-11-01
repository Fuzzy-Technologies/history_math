import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaObject} from '../scripts/s3-media.mjs';
import {retentionPlan, pdfVersions, readState, saveState, applyRetention, executionMode, verifyLivePdfs, stateKey} from '../scripts/pdf-retention.mjs';

const day = 86_400_000, start = Date.parse('2026-01-01T00:00:00.000Z');
const object = (hash, name = 'article-en.pdf') => ({...mediaObject('pdf', name, hash.repeat(64), 100), verified: true});
const active = object('a'), previous = object('b'), older = object('c');
const version = (object, id = 'v1', offset = -60) => ({key: object.key, version_id: id, bytes: object.bytes, latest: true,
  last_modified: new Date(start + offset * day).toISOString()});
const empty = () => ({version: 1, updated_at: null, entries: []});
const versions = () => [version(active), version(previous, 'previous', -10), version(older, 'old', -20)];
const plan = (extra = {}) => retentionPlan({versions: versions(), liveObjects: [active], state: empty(), now: start, ...extra});
const mature = () => plan({state: plan().state, now: start + 30 * day});

test('grace starts at the first complete observation; current and one previous PDF stay', () => {
  const first = plan();
  assert.equal(first.deletions.length, 0);
  assert.equal(first.state.entries.length, 2);
  assert.equal(plan({state: first.state, now: start + 30 * day - 1}).deletions.length, 0);
  const eligible = mature();
  assert.deepEqual(eligible.deletions, [version(older, 'old', -20)]);
  assert.equal(eligible.summary.candidate_bytes, 100);
  assert.equal(eligible.retained.find(item => item.key === previous.key).reason, 'previous-publication');
  assert.equal(eligible.retained.find(item => item.key === active.key).reason, 'referenced');
});

test('PR references, stable filename aliases and unknown filenames are never collected', () => {
  const originalState = plan().state;
  for (const protection of [{protectedKeys: [older.key]}, {protectedNames: [older.filename]}]) {
    const protectedPlan = plan({...protection, state: originalState, now: start + 31 * day});
    assert.equal(protectedPlan.deletions.length, 0);
    assert.ok(!protectedPlan.state.entries.some(entry => entry.key === older.key));
    const released = plan({state: protectedPlan.state, now: start + 32 * day});
    assert.equal(released.deletions.length, 0);
    assert.equal(released.state.entries.find(entry => entry.key === older.key).unreferenced_since, new Date(start + 32 * day).toISOString());
  }
  const result = plan({versions: [...versions(), version(object('d', 'withdrawn-ru.pdf'))], state: originalState, now: start + 31 * day});
  assert.equal(result.retained.at(-1).reason, 'no-current-counterpart');
  assert.equal(result.state.entries.length, 2);
});

test('recent versions restart observation and every version of a protected key stays', () => {
  const first = plan(), now = start + 40 * day;
  const fresh = {...version(older, 'new-id'), last_modified: new Date(now - day).toISOString()};
  const result = plan({versions: [...versions(), fresh, {...version(active), version_id: 'active-old', latest: false}], state: first.state, now});
  assert.ok(!result.deletions.some(item => item.version_id === 'new-id' || item.version_id === 'active-old'));
});

test('missing live objects, forged receipts, invalid observations and inventory ambiguity fail closed', () => {
  for (const mutation of [
    {versions: versions().slice(1)},
    {liveObjects: [{...active, verified: false}]},
    {liveObjects: [active, active]},
    {versions: [...versions(), versions()[0]]},
    {versions: [{...versions()[0], key: 'originals/unsafe.pdf'}, ...versions().slice(1)]},
    {versions: [{...versions()[0], version_id: ''}, ...versions().slice(1)]},
    {state: {...empty(), updated_at: new Date(start + day).toISOString()}},
    {state: {...plan().state, entries: [{...plan().state.entries[0], bytes: 101}]}},
    {state: {...plan().state, entries: [{...plan().state.entries[0], unreferenced_since: new Date(start + day).toISOString()}]}}
  ]) assert.throws(() => plan(mutation));
});

test('authenticated inventory follows all pages and rejects repeated or malformed cursors', async () => {
  const calls = [];
  const page = (record, rest = {}) => ({IsTruncated: false, Versions: [{Key: record.key, VersionId: record.version_id,
    Size: record.bytes, IsLatest: record.latest, LastModified: new Date(record.last_modified)}], ...rest});
  const client = {send: async command => { calls.push(command.input); return calls.length === 1 ?
    page(versions()[0], {IsTruncated: true, NextKeyMarker: active.key, NextVersionIdMarker: 'v1'}) : page(versions()[1]); }};
  assert.equal((await pdfVersions(client, start)).length, 2);
  assert.equal(calls[0].Prefix, 'pdf/'); assert.equal(calls[1].KeyMarker, active.key);
  for (const response of [{Versions: []}, {IsTruncated: true, Versions: []},
    page(versions()[0], {IsTruncated: true, NextKeyMarker: active.key})]) {
    await assert.rejects(pdfVersions({send: async () => response}, start));
  }
});

test('checkpoint absence is distinguished from denied access and writes are conditional', async () => {
  const error = status => Object.assign(new Error('private upstream text'), {$metadata: {httpStatusCode: status}});
  assert.deepEqual(await readState({send: async () => {throw error(404);}}, start), {state: empty(), etag: null});
  await assert.rejects(readState({send: async () => {throw error(403);}}, start), /HTTP 403/);
  const observed = plan().state, body = Buffer.from(JSON.stringify(observed));
  assert.deepEqual(await readState({send: async () => ({ETag: 'etag', Body: [body]})}, start), {state: observed, etag: 'etag'});
  const calls = [], client = {send: async command => calls.push(command.input)};
  await saveState(client, observed, null); await saveState(client, observed, 'etag');
  assert.equal(calls[0].Key, stateKey); assert.equal(calls[0].IfNoneMatch, '*');
  assert.equal(calls[1].IfMatch, 'etag'); assert.equal(calls[1].IfNoneMatch, undefined);
  await assert.rejects(saveState({send: async () => {throw error(412);}}, observed, 'stale'));
});

test('exact version deletions recheck references and retain an incremental failure journal', async () => {
  const eligible = mature(), calls = [], journals = []; let guards = 0;
  const client = {send: async command => calls.push(command.input)};
  const result = await applyRetention(client, eligible, {guard: async () => guards++, journal: async value => journals.push(structuredClone(value))});
  assert.equal(guards, 1); assert.equal(result.complete, true);
  assert.deepEqual(calls, [{Bucket: 'history-math-media-kz', Key: older.key, VersionId: 'old'}]);
  assert.equal(journals[0].deleted.length, 0); assert.equal(journals.at(-1).deleted.length, 1);
  calls.length = 0;
  await assert.rejects(applyRetention(client, eligible, {guard: async () => {throw new Error('PR changed');}}), /PR changed/);
  assert.equal(calls.length, 0);
  for (const mutate of [
    value => value.deletions.push(value.deletions[0]),
    value => { value.deletions[0].key = 'originals/no.pdf'; },
    value => { value.state.entries.find(entry => entry.key === older.key).unreferenced_since = value.generated_at; },
    value => value.retained.push(value.deletions[0])
  ]) { const bad = structuredClone(eligible); mutate(bad); await assert.rejects(applyRetention(client, bad, {guard: async () => {}})); }
  assert.equal(calls.length, 0);
  const denied = {send: async () => {throw Object.assign(new Error('SECRET'), {name: 'AccessDenied', $metadata: {httpStatusCode: 403}});}};
  await assert.rejects(applyRetention(denied, eligible, {guard: async () => {}, journal: async value => journals.push(structuredClone(value))}), /HTTP 403; AccessDenied/);
  assert.equal(journals.at(-1).complete, false); assert.equal(journals.at(-1).failure.http_status, 403);
  assert.ok(!JSON.stringify(journals).includes('SECRET'));
});

test('default is read-only; deleting requires enabled trusted master post-deployment context', () => {
  assert.equal(executionMode([], {}), '--dry-run');
  const env = {GITHUB_REF: 'refs/heads/master', GITHUB_SHA: 'a'.repeat(40), GITHUB_EVENT_NAME: 'schedule'};
  assert.equal(executionMode(['--observe'], env), '--observe');
  assert.throws(() => executionMode(['--apply'], env));
  const enabled = {...env, GITHUB_EVENT_NAME: 'push', PDF_RETENTION_AFTER_DEPLOY: 'true', PDF_RETENTION_DELETE_ENABLED: 'true'};
  assert.equal(executionMode(['--apply'], enabled), '--apply');
  for (const change of [{GITHUB_REF: 'refs/heads/feature/x'}, {GITHUB_SHA: 'invalid'}, {GITHUB_EVENT_NAME: 'pull_request'},
    {PDF_RETENTION_AFTER_DEPLOY: ''}, {PDF_RETENTION_DELETE_ENABLED: ''}]) assert.throws(() => executionMode(['--apply'], {...enabled, ...change}));
  assert.throws(() => executionMode(['--delete-everything'], enabled));
});

test('current public PDFs require exact anonymous HEAD metadata without redirects', async () => {
  const headers = {'content-length': '100', 'content-type': 'application/pdf', 'x-amz-meta-sha256': active.sha256};
  const request = async (url, options) => { assert.equal(url, active.url); assert.equal(options.method, 'HEAD'); assert.equal(options.redirect, 'error'); return new Response(null, {headers}); };
  await verifyLivePdfs([active], request);
  for (const patch of [{'content-length': '99'}, {'content-type': 'text/html'}, {'x-amz-meta-sha256': 'bad'}]) {
    await assert.rejects(verifyLivePdfs([active], async () => new Response(null, {headers: {...headers, ...patch}})));
  }
});
