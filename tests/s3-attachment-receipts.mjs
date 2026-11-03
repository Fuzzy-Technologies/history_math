import assert from 'node:assert/strict';
import {validateObject} from '../scripts/s3-media.mjs';

const kinds = ['originals/', 'pdf/'];

function receiptObjects(receipt) {
  assert.equal(receipt?.version, 1, 'Unsupported attachment receipt');
  assert.ok(Array.isArray(receipt.objects), 'Missing attachment objects');
  return receipt.objects;
}

export function missingAttachmentKinds(receipt) {
  const objects = receiptObjects(receipt);
  return kinds.filter(prefix => !objects.some(item => item.key?.startsWith(prefix)));
}

// A preflight receipt contains only newly copied objects. Reused PDFs and
// originals remain in the deployed manifest and still need a native download.
export function attachmentSmokeObjects(preflight, published) {
  const candidates = receiptObjects(preflight);
  const fallback = published === undefined ? [] : receiptObjects(published);
  return kinds.map(prefix => {
    const item = candidates.find(value => value.key?.startsWith(prefix)) ??
      fallback.find(value => value.key?.startsWith(prefix));
    assert.equal(item?.verified, true, `Missing verified ${prefix} attachment`);
    return validateObject(item);
  });
}
