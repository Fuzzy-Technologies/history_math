import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {storage, mediaObject, publicMediaRead, mediaRead, readWithRetries} from '../scripts/s3-media.mjs';

const object = mediaObject('originals', 'image.png', 'a'.repeat(64), 3);

function transport({status = 200, body = 'abc', error} = {}) {
  const calls = [];
  const send = (url, options, respond) => {
    calls.push({url, options});
    const request = new EventEmitter();
    request.end = () => queueMicrotask(() => {
      if (error) return request.emit('error', error);
      const response = Readable.from([Buffer.from(body)]);
      response.statusCode = status;
      response.headers = {'content-length': '3', 'content-type': 'image/png', 'x-amz-meta-sha256': object.sha256};
      if (status === 302) response.headers.location = 'https://example.invalid/private';
      respond(response);
    });
    return request;
  };
  return {send, calls};
}

test('anonymous bucket HEAD and GET use IPv4, the TLS hostname and bounded caller signals', async () => {
  for (const method of ['HEAD', 'GET']) {
    const {send, calls} = transport(), signal = AbortSignal.timeout(1000);
    const response = await publicMediaRead(object.url, {method, signal, credentials: 'omit', redirect: 'error'}, send);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-amz-meta-sha256'), object.sha256);
    assert.equal(await response.text(), method === 'HEAD' ? '' : 'abc');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.origin, storage.endpoint);
    assert.equal(calls[0].url.hostname, 'storage.yandexcloud.kz');
    assert.equal(calls[0].options.family, 4);
    assert.equal(calls[0].options.signal, signal);
    assert.notEqual(calls[0].options.agent.options.rejectUnauthorized, false);
    assert.equal(calls[0].options.headers, undefined);
  }
});

test('public transport rejects destination, credentials, redirect and write mutations before connecting', async () => {
  const {send, calls} = transport();
  for (const [url, options] of [
    [object.url.replace('https:', 'http:'), {}],
    [object.url.replace(storage.bucket, 'other-bucket'), {}],
    [object.url.replace(storage.endpoint, 'https://example.invalid'), {}],
    [object.url.replace('https://', 'https://user:secret@'), {}],
    [object.url + '?versionId=private', {}], [object.url + '#fragment', {}],
    [object.url, {credentials: 'include'}], [object.url, {redirect: 'follow'}],
    [object.url, {method: 'DELETE'}], [object.url, {body: 'write'}],
    [object.url, {headers: {Authorization: 'secret'}}],
    [object.url, {headers: new Headers({Cookie: 'secret'})}]
  ]) await assert.rejects(publicMediaRead(url, options, send), /Invalid anonymous media request/);
  assert.equal(calls.length, 0);
});

test('redirects are returned without following their target', async () => {
  const {send, calls} = transport({status: 302});
  const response = await publicMediaRead(object.url, {}, send);
  assert.equal(response.status, 302);
  assert.equal(response.ok, false);
  assert.equal(calls.length, 1);
});

test('timeout causes reconnect while certificate failures remain permanent and sanitized', async () => {
  const timeout = Object.assign(new Error('private request'), {code: 'ABORT_ERR', cause: new DOMException('expired', 'TimeoutError')});
  const retrying = transport({error: timeout});
  await assert.rejects(readWithRetries('public HEAD', () => publicMediaRead(object.url, {}, retrying.send), {pause: async () => {}}), /TIMEOUT; 3 attempts/);
  assert.equal(retrying.calls.length, 3);
  const invalidTls = transport({error: Object.assign(new Error('secret URL'), {code: 'CERT_HAS_EXPIRED'})});
  await assert.rejects(readWithRetries('public HEAD', () => publicMediaRead(object.url, {}, invalidTls.send), {pause: async () => {}}), error => {
    assert.match(error.message, /CERT_HAS_EXPIRED; 1 attempts/);
    return !/secret|private/.test(error.message);
  });
  assert.equal(invalidTls.calls.length, 1);
});

test('GitHub and Pages requests retain the existing fetch transport', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (...args) => {calls.push(args); return new Response('ok');});
  const options = {headers: {Authorization: 'test-token'}, redirect: 'error'};
  const url = 'https://api.github.com/repos/Fuzzy-Technologies/history_math';
  assert.equal(await (await mediaRead(url, options)).text(), 'ok');
  assert.deepEqual(calls, [[url, options]]);
});
