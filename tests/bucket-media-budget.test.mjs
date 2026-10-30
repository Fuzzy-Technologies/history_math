import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ListObjectsV2Command, ListObjectVersionsCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import {bucketInventory, retireOversized} from '../scripts/bucket-media-budget.mjs';
import {mediaObject, sha256} from '../scripts/s3-media.mjs';

test('bucket audit includes every page and oversized noncurrent versions', async () => {
  const calls = [];
  const client = {send: async command => {
    calls.push(command);
    if (command instanceof ListObjectsV2Command) return command.input.ContinuationToken ?
      {Contents: [{Key: 'small.jpg', Size: 15_000_000}], IsTruncated: false} :
      {Contents: [{Key: 'large.png', Size: 50_000_000}], IsTruncated: true, NextContinuationToken: 'next'};
    assert.ok(command instanceof ListObjectVersionsCommand);
    return command.input.KeyMarker ? {Versions: [{Key: 'old.pdf', VersionId: 'v1', Size: 16_000_000, IsLatest: false}], IsTruncated: false} :
      {Versions: [{Key: 'small.jpg', VersionId: 'v2', Size: 15_000_000, IsLatest: true}], IsTruncated: true, NextKeyMarker: 'small.jpg', NextVersionIdMarker: 'v2'};
  }};
  const result = await bucketInventory(client);
  assert.equal(calls.length, 4);
  assert.equal(result.complete, true);
  assert.equal(result.clean, false);
  assert.equal(result.summary.objects, 2);
  assert.equal(result.oversized_objects[0].key, 'large.png');
  assert.equal(result.oversized_versions[0].key, 'old.pdf');
  assert.equal(result.oversized_versions[0].latest, false);
});

test('retirement verifies all replacements and deletes exact versions only after the public switch', async () => {
  const bytes = Buffer.from('JPEG fixture'), sourceSha = 'a'.repeat(64);
  const target = mediaObject('originals', 'figure.jpg', sha256(bytes), bytes.length);
  const old = {key: `originals/${sourceSha}/figure.png`, bytes: 50_000_000, version_id: 'old-version', latest: false};
  const inventory = {complete: true, versions: [old], oversized_versions: [old], oversized_objects: [old]};
  const registry = {figure: {source_sha256: sourceSha, source_bytes: old.bytes, filename: target.filename, sha256: target.sha256, bytes: target.bytes}};
  const events = [];
  const request = async url => { events.push('verified'); assert.equal(url, target.url); return new Response(bytes, {headers: {
    'content-type': 'image/jpeg', 'content-disposition': 'attachment; filename="figure.jpg"'}}); };
  const client = {send: async command => {
    assert.ok(command instanceof DeleteObjectCommand);
    assert.equal(command.input.Key, old.key);
    assert.equal(command.input.VersionId, 'old-version');
    assert.ok(events.includes('verified'));
    events.push('deleted');
  }};
  const result = await retireOversized(client, inventory, registry, {version: 1, objects: [target]}, {request});
  assert.equal(result.complete, true);
  assert.equal(result.deleted.length, 1);
  for (const live of [{version: 1, objects: []}, {version: 1, objects: [target, mediaObject('originals', 'figure.png', sourceSha, old.bytes)]}]) {
    await assert.rejects(retireOversized({send: () => assert.fail('No premature deletion')}, inventory, registry, live, {request}));
  }
  await assert.rejects(retireOversized({send: () => assert.fail('No deletion of unmapped PDFs')},
    {...inventory, oversized_versions: [{...old, key: `pdf/${sourceSha}/old.pdf`}]}, registry, {version: 1, objects: [target]}, {request}), /Unmapped/);
  let receipt;
  await assert.rejects(retireOversized({send: async () => { throw {$metadata: {httpStatusCode: 403}}; }},
    inventory, registry, {version: 1, objects: [target]}, {request, journal: async value => { receipt = structuredClone(value); }}), /storage.editor/);
  assert.equal(receipt.complete, false);
  assert.equal(receipt.deleted.length, 0);
});

test('a denied, missing or looping page never produces a clean receipt', async () => {
  for (const response of [ {}, {IsTruncated: true, Contents: []},
    {IsTruncated: true, Contents: [], NextContinuationToken: 'same'},
    {IsTruncated: false, Contents: [{Key: 'large.png', Size: -1}]}]) {
    await assert.rejects(bucketInventory({send: async () => response}));
  }
  await assert.rejects(bucketInventory({send: async command => {
    if (command instanceof ListObjectsV2Command) return {Contents: [], IsTruncated: false};
    throw new Error('AccessDenied');
  }}), /AccessDenied/);
});
