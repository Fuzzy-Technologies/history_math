import {test} from 'node:test';
import assert from 'node:assert/strict';
import {imageBudget, jpegPolicy, sizeFinding, validSizeException, validateReplacement, imageSizeFindings} from '../scripts/image-publication.mjs';

const path = '/assets/images/hm-test/figure.png';
const entry = {sha256: 'a'.repeat(64), bytes: 50_000_000, width: 4400, height: 5432, logo: false, variants: []};
const replacement = {policy: jpegPolicy, source_sha256: entry.sha256, source_bytes: entry.bytes,
  width: entry.width, height: entry.height, sha256: 'b'.repeat(64), bytes: 14_000_000,
  filename: 'figure.jpg', quality: 100, source: entry};
const exception = {sha256: replacement.sha256, bytes: replacement.bytes, one_use: true,
  note_url: 'https://github.com/Fuzzy-Technologies/history_math/pull/293', reason: 'One exact unchanged-resolution JPEG.'};

test('decimal 10/13/15 MB boundaries require a pinned exception and never waive the hard ceiling', () => {
  assert.deepEqual(imageBudget, {recommendation: 10_000_000, critical: 13_000_000, hard: 15_000_000});
  assert.equal(sizeFinding(path, {bytes: 9_999_999}), null);
  assert.equal(sizeFinding(path, {bytes: 10_000_000}).code, 'HM_IMAGE_RECOMMENDATION');
  assert.equal(sizeFinding(path, {bytes: 12_999_999}).severity, 'warning');
  for (const bytes of [13_000_000, 15_000_000]) {
    const object = {...replacement, bytes};
    assert.equal(sizeFinding(path, object).severity, 'error');
    assert.equal(sizeFinding(path, object, {...exception, bytes}).severity, 'warning');
  }
  assert.equal(sizeFinding(path, {...replacement, bytes: 15_000_001}, {...exception, bytes: 15_000_001}).severity, 'error');
  for (const mutation of [{sha256: 'c'.repeat(64)}, {bytes: 13_000_000}, {one_use: false},
    {note_url: 'https://evil.invalid/pull/293'}, {reason: ''}]) {
    assert.equal(validSizeException({...exception, ...mutation}, replacement), false);
  }
});

test('conversion binds original bytes, exact dimensions, output identity and the one-use PR note', () => {
  const record = {...replacement, exception};
  assert.equal(validateReplacement(path, entry, record), record);
  for (const mutation of [{source_sha256: 'c'.repeat(64)}, {source_bytes: 49_999_999}, {width: 2200},
    {height: 2716}, {quality: 101}, {bytes: 15_000_001}, {filename: '../figure.jpg'}, {sha256: 'invalid'},
    {exception: {...exception, sha256: 'c'.repeat(64)}}, {policy: 'jpeg-resize-v1'}]) {
    assert.throws(() => validateReplacement(path, entry, {...record, ...mutation}));
  }
  assert.throws(() => validateReplacement(path, {...entry, sha256: 'd'.repeat(64)}, record));
  const findings = imageSizeFindings({[path]: entry}, {[path]: record});
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, 'HM_IMAGE_CRITICAL');
  assert.equal(findings[0].severity, 'warning');
  assert.equal(imageSizeFindings({[path]: entry})[0].severity, 'error');
  assert.equal(imageSizeFindings({[path]: {...entry, variants: [{path: 'reading.webp', bytes: 16_000_000}]}}, {[path]: record})[1].severity, 'error');
});
