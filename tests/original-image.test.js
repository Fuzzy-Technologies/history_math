import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';
import {loadVerifiedOriginal} from '../site/assets/original-image.js';

const original = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j/pkAAAAASUVORK5CYII=', 'base64');
const sha256 = createHash('sha256').update(original).digest('hex');
const descriptor = {sha256, bytes: original.length, filename: 'diagram-01.png',
  apiUrl: 'https://api.github.com/repos/Fuzzy-Technologies/history_math/releases/assets/273',
  url: `https://github.com/Fuzzy-Technologies/history_math/releases/download/article-originals-${sha256[0]}/hm-tt-abc-diagram-01-${sha256}.png`};

function dependencies(respond) {
  const calls = [];
  const created = [];
  const revoked = [];
  return {calls, created, revoked, options: {
    crypto: webcrypto,
    fetch: async (url, options) => {
      calls.push({url, options});
      return respond(url, options);
    },
    url: {createObjectURL(blob) {
      created.push(blob);
      return 'blob:verified-original';
    }, revokeObjectURL(url) { revoked.push(url); }}
  }};
}

function binary(bytes = original) {
  return new Response(bytes, {headers: {'Content-Type': 'application/octet-stream'}});
}

test('the public asset API loads an exact original without credentials and owns one revocable blob', async () => {
  const runtime = dependencies(() => binary());
  assert.equal(runtime.calls.length, 0, 'No original is fetched until explicitly requested');
  const loaded = await loadVerifiedOriginal(descriptor, runtime.options);
  assert.equal(loaded.url, 'blob:verified-original');
  assert.equal(loaded.filename, 'diagram-01.png');
  assert.equal(runtime.calls.length, 1);
  assert.equal(runtime.calls[0].url, descriptor.apiUrl);
  assert.equal(runtime.calls[0].options.credentials, 'omit');
  assert.deepEqual(runtime.calls[0].options.headers, {Accept: 'application/octet-stream'});
  assert.equal(runtime.created[0].type, 'image/png');
  assert.deepEqual(Buffer.from(await runtime.created[0].arrayBuffer()), original);
  loaded.revoke();
  loaded.revoke();
  assert.deepEqual(runtime.revoked, ['blob:verified-original']);
});

test('JSON asset metadata falls back to the verified binary release URL', async () => {
  const runtime = dependencies(url => url === descriptor.apiUrl ?
    new Response('{"name":"image.png"}', {headers: {'Content-Type': 'application/json'}}) : binary());
  const loaded = await loadVerifiedOriginal(descriptor, runtime.options);
  assert.deepEqual(runtime.calls.map(call => call.url), [descriptor.apiUrl, descriptor.url]);
  assert.equal(runtime.created.length, 1);
  assert.deepEqual(runtime.calls[1].options.headers, {});
  loaded.revoke();
});

test('a failed API request can fall back to an exact release original', async () => {
  const runtime = dependencies(url => {
    if (url === descriptor.apiUrl) throw new TypeError('CORS request failed');
    return binary();
  });
  const loaded = await loadVerifiedOriginal(descriptor, runtime.options);
  assert.equal(runtime.calls.length, 2);
  assert.equal(runtime.created.length, 1);
  loaded.revoke();
});

test('incorrect original size or digest never creates a zoom or download blob', async () => {
  const corrupt = Buffer.from(original);
  corrupt[0] ^= 1;
  for (const [bytes, message] of [[original.subarray(1), /size mismatch/], [corrupt, /checksum mismatch/]]) {
    const runtime = dependencies(() => binary(bytes));
    await assert.rejects(loadVerifiedOriginal(descriptor, runtime.options), message);
    assert.equal(runtime.calls.length, 2);
    assert.deepEqual(runtime.created, []);
  }
});

test('unavailable or JSON originals fail without substituting a reading preview', async () => {
  for (const respond of [() => new Response('', {status: 404}),
    () => new Response('{}', {headers: {'Content-Type': 'application/json'}})]) {
    const runtime = dependencies(respond);
    await assert.rejects(loadVerifiedOriginal(descriptor, runtime.options), /binary unavailable/);
    assert.deepEqual(runtime.created, []);
  }
});

test('invalid integrity and external locations are rejected before a request', async () => {
  const mutations = [
    {sha256: 'a'.repeat(63)}, {bytes: 0}, {bytes: '68'}, {filename: '../diagram.png'},
    {url: descriptor.url.replace('github.com', 'example.com')},
    {url: descriptor.url.replace('history_math', 'another_repository')},
    {url: descriptor.url.replace(`article-originals-${sha256[0]}`, 'article-originals-z')},
    {url: descriptor.url + '?token=unwanted'},
    {apiUrl: descriptor.apiUrl.replace('/273', '/0')},
    {apiUrl: descriptor.apiUrl.replace('api.github.com', 'example.com')},
    {apiUrl: descriptor.apiUrl.replace('https://', 'https://secret@')},
    {apiUrl: descriptor.apiUrl + '#unwanted'}
  ];
  for (const mutation of mutations) {
    const runtime = dependencies(() => binary());
    await assert.rejects(loadVerifiedOriginal({...descriptor, ...mutation}, runtime.options), /Invalid/);
    assert.deepEqual(runtime.calls, []);
    assert.deepEqual(runtime.created, []);
  }
});

test('closing during the request aborts without a fallback or object URL', async () => {
  const controller = new AbortController();
  const runtime = dependencies(() => {
    controller.abort();
    return binary();
  });
  await assert.rejects(loadVerifiedOriginal(descriptor, {...runtime.options, signal: controller.signal}), {name: 'AbortError'});
  assert.equal(runtime.calls.length, 1);
  assert.deepEqual(runtime.created, []);
});

test('closing during checksum verification does not leak a completed blob', async () => {
  const controller = new AbortController();
  const runtime = dependencies(() => binary());
  const crypto = {subtle: {async digest(...args) {
    controller.abort();
    return webcrypto.subtle.digest(...args);
  }}};
  await assert.rejects(loadVerifiedOriginal(descriptor, {...runtime.options, crypto, signal: controller.signal}), {name: 'AbortError'});
  assert.equal(runtime.calls.length, 1);
  assert.deepEqual(runtime.created, []);
});

test('a legacy immutable Git URL can still be downloaded with the same integrity check', async () => {
  const runtime = dependencies(() => binary());
  const source = {...descriptor, apiUrl: undefined,
    url: `https://raw.githubusercontent.com/Fuzzy-Technologies/history_math/${'a'.repeat(40)}/site/assets/images/hm-tt-abc/diagram-01.png`};
  const loaded = await loadVerifiedOriginal(source, runtime.options);
  assert.deepEqual(runtime.calls.map(call => call.url), [source.url]);
  assert.equal(runtime.created.length, 1);
  loaded.revoke();
});
