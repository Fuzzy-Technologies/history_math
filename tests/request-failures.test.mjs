import assert from 'node:assert/strict';
import test from 'node:test';
import {recordRequestFailure, attachmentRequestFailure, unexpectedAttachmentFailures} from './request-failures.mjs';

test('navigation cancellation is limited to search fetches; real failures remain blocking', () => {
  const report = {requestFailures: []};
  const request = (url, error, type = 'fetch') => ({url: () => url, failure: () => ({errorText: error}), resourceType: () => type});
  recordRequestFailure(report, request('http://localhost/history_math/assets/search-ru.json?v=1', 'net::ERR_ABORTED'));
  recordRequestFailure(report, request('http://localhost/history_math/assets/discovery-en.json?v=1', 'net::ERR_ABORTED'));
  assert.deepEqual(report.requestFailures, []);
  recordRequestFailure(report, request('http://localhost/history_math/assets/search-en.json', 'net::ERR_FAILED'));
  recordRequestFailure(report, request('http://localhost/history_math/assets/figure.png', 'net::ERR_ABORTED', 'image'));
  recordRequestFailure(report, request('http://localhost/history_math/assets/search-ru.json', 'net::ERR_ABORTED', 'document'));
  assert.equal(report.requestFailures.length, 3);
});

test('only a fully verified attachment may explain its aborted document navigation', () => {
  const url = 'https://storage.yandexcloud.kz/history-math-media-kz/originals/' + 'a'.repeat(64) + '/figure.png';
  const failure = attachmentRequestFailure({url: () => url, failure: () => ({errorText: 'net::ERR_ABORTED'}),
    resourceType: () => 'document', isNavigationRequest: () => true});
  assert.deepEqual(unexpectedAttachmentFailures([failure], new Set()), [failure]);
  const verified = new Set([url]);
  assert.deepEqual(unexpectedAttachmentFailures([failure], verified), []);
  for (const mutation of [{error: 'net::ERR_FAILED'}, {error: 'net::ERR_CONNECTION_RESET'},
    {type: 'image'}, {type: 'fetch'}, {navigation: false}, {url: url + '?other'}]) {
    const changed = {...failure, ...mutation};
    assert.deepEqual(unexpectedAttachmentFailures([changed], verified), [changed]);
  }
});
