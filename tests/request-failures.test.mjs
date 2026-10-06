import assert from 'node:assert/strict';
import test from 'node:test';
import {recordRequestFailure} from './request-failures.mjs';

test('navigation cancellation is limited to search fetches; real failures remain blocking', () => {
  const report = {requestFailures: []};
  const request = (url, error, type = 'fetch') => ({url: () => url, failure: () => ({errorText: error}), resourceType: () => type});
  recordRequestFailure(report, request('http://localhost/history_math/assets/search-ru.json?v=1', 'net::ERR_ABORTED'));
  assert.deepEqual(report.requestFailures, []);
  recordRequestFailure(report, request('http://localhost/history_math/assets/search-en.json', 'net::ERR_FAILED'));
  recordRequestFailure(report, request('http://localhost/history_math/assets/figure.png', 'net::ERR_ABORTED', 'image'));
  recordRequestFailure(report, request('http://localhost/history_math/assets/search-ru.json', 'net::ERR_ABORTED', 'document'));
  assert.equal(report.requestFailures.length, 3);
});
