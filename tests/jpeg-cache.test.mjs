import test from 'node:test';
import assert from 'node:assert/strict';
import {checkedJpegCache} from '../scripts/check-jpeg-cache.mjs';
import {jpegPolicy} from '../scripts/image-publication.mjs';
import {verifyCurrentMedia} from '../scripts/media-cleanup.mjs';
import {mediaObject} from '../scripts/s3-media.mjs';

const path = '/assets/images/hm-test/figure.png';
const source = {sha256: 'a'.repeat(64), bytes: 50_000_000, width: 4400, height: 5432, logo: false, variants: []};
const record = {policy: jpegPolicy, source_sha256: source.sha256, source_bytes: source.bytes,
  width: source.width, height: source.height, sha256: 'b'.repeat(64), bytes: 12_000_000,
  filename: 'figure.jpg', quality: 100, source};
const registry = {version: 1, policy: jpegPolicy, replacements: {[path]: record}};
const response = (status = 200, changed = {}) => new Response(null, {status, headers: {
  'content-length': String(record.bytes), 'content-type': 'image/jpeg', 'x-amz-meta-sha256': record.sha256, ...changed
}});
const retryOptions = {pause: async () => {}};

test('pinned JPEG reuse requires anonymous HEAD, exact size, MIME and SHA metadata', async () => {
  const calls = [];
  assert.deepEqual(await checkedJpegCache(registry, async (...args) => {calls.push(args); return response();}), [path]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], `https://storage.yandexcloud.kz/history-math-media-kz/originals/${record.sha256}/figure.jpg`);
  assert.equal(calls[0][1].method, 'HEAD');
  assert.equal(calls[0][1].credentials, 'omit');
  assert.equal(calls[0][1].redirect, 'error');
  assert.ok(calls[0][1].signal instanceof AbortSignal);
  for (const changed of [{'content-length': '1'}, {'content-type': 'image/png'}, {'x-amz-meta-sha256': 'c'.repeat(64)}]) {
    assert.deepEqual(await checkedJpegCache(registry, async () => response(200, changed)), []);
  }
  assert.deepEqual(await checkedJpegCache(registry, async () => response(404)), []);
});

test('transient reads retry, while forbidden and exhausted reads block cache preparation', async () => {
  let calls = 0;
  const timeout = Object.assign(new Error('private upstream detail'), {code: 'ETIMEDOUT'});
  assert.deepEqual(await checkedJpegCache(registry, async () => ++calls === 1 ? Promise.reject(timeout) : response(), retryOptions), [path]);
  assert.equal(calls, 2);
  for (const [read, count, match] of [[async () => response(403), 1, /403/],
    [async () => {throw timeout;}, 3, /ETIMEDOUT/], [async () => response(503), 3, /503/]]) {
    calls = 0;
    await assert.rejects(checkedJpegCache(registry, async () => {calls++; return read();}, retryOptions), error => {
      assert.match(error.message, match);
      return !error.message.includes('private upstream detail');
    });
    assert.equal(calls, count);
  }
});

test('mutated registry identities are rejected before any public request', async () => {
  let calls = 0;
  const read = async () => {calls++; return response();};
  for (const changed of [{...registry, version: 2}, {...registry, policy: 'untrusted'},
    {...registry, replacements: []}, {...registry, replacements: {'/../secret': record}},
    {...registry, replacements: {[path]: {...record, source_sha256: 'c'.repeat(64)}}},
    {...registry, replacements: {[path]: {...record, filename: '../secret.jpg'}}},
    {...registry, replacements: {[path]: {...record, bytes: 16_000_000}}}]) {
    await assert.rejects(checkedJpegCache(changed, read));
  }
  assert.equal(calls, 0);
});

test('a failed verification stops queued reads after bounded in-flight workers finish', async () => {
  for (const mode of ['jpeg', 'cleanup']) {
    const entries = Array.from({length: 20}, (_, i) => [`/assets/images/hm-test/figure-${i}.png`, {...record, filename: `figure-${i}.jpg`}]);
    let calls = 0, release;
    const pending = new Promise(done => {release = done;});
    const request = async () => {
      calls++;
      if (calls === 1) return response(403);
      await pending;
      return response();
    };
    const verification = mode === 'jpeg' ? checkedJpegCache({...registry, replacements: Object.fromEntries(entries)}, request) :
      verifyCurrentMedia(entries.map(([, item]) => mediaObject('originals', item.filename, item.sha256, item.bytes)), request);
    await new Promise(done => setImmediate(done));
    assert.equal(calls, 6);
    release();
    await assert.rejects(verification, /403/);
    assert.equal(calls, 6);
  }
});
