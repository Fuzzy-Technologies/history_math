import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaObject} from '../scripts/s3-media.mjs';
import {attachmentSmokeObjects, missingAttachmentKinds} from './s3-attachment-receipts.mjs';

const original = {...mediaObject('originals', 'portrait.jpeg', 'a'.repeat(64), 100), verified: true};
const pdf = {...mediaObject('pdf', 'article.pdf', 'b'.repeat(64), 200), verified: true};
const receipt = (...objects) => ({version: 1, objects});

test('partial preflight reuses the deployed PDF while checking the newly copied original', () => {
  assert.deepEqual(missingAttachmentKinds(receipt(original)), ['pdf/']);
  const selected = attachmentSmokeObjects(receipt(original), receipt(pdf));
  assert.equal(selected[0].url, original.url);
  assert.equal(selected[1].url, pdf.url);
});

test('empty preflight checks both deployed kinds; a complete preflight needs no fallback', () => {
  assert.equal(attachmentSmokeObjects(receipt(), receipt(original, pdf)).length, 2);
  assert.equal(attachmentSmokeObjects(receipt(original, pdf)).length, 2);
  assert.deepEqual(missingAttachmentKinds(receipt(original, pdf)), []);
});

test('a missing kind, false verification, changed identity or malformed receipt blocks publication', () => {
  assert.throws(() => attachmentSmokeObjects(receipt(original), receipt(original)), /verified pdf/);
  assert.throws(() => attachmentSmokeObjects(receipt({...original, verified: false}), receipt(original, pdf)), /verified originals/);
  assert.throws(() => attachmentSmokeObjects(receipt({...original, url: pdf.url}, pdf)), /destination/);
  assert.throws(() => attachmentSmokeObjects({version: 2, objects: []}, receipt(original, pdf)), /receipt/);
  assert.throws(() => attachmentSmokeObjects(receipt(), {version: 1}), /objects/);
});
