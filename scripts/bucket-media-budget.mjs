import {mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ListObjectsV2Command, ListObjectVersionsCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import {configuredClient, storage, mediaObject, verifyPublic, validateObject} from './s3-media.mjs';
import {imageBudget, publicationReplacements} from './image-publication.mjs';

export async function bucketInventory(client) {
  const objects = [], versions = [], objectCursors = new Set(), versionCursors = new Set();
  let continuation;
  do {
    const page = await client.send(new ListObjectsV2Command({Bucket: storage.bucket, ContinuationToken: continuation}));
    if (!Array.isArray(page.Contents || []) || typeof page.IsTruncated !== 'boolean') throw new Error('Incomplete object inventory');
    for (const object of page.Contents || []) {
      if (typeof object.Key !== 'string' || !Number.isSafeInteger(object.Size) || object.Size < 0) throw new Error('Invalid bucket object');
      objects.push({key: object.Key, bytes: object.Size});
    }
    if (!page.IsTruncated) break;
    continuation = page.NextContinuationToken;
    if (!continuation || objectCursors.has(continuation)) throw new Error('Object pagination did not advance');
    objectCursors.add(continuation);
  } while (true);
  let keyMarker, versionMarker;
  do {
    const page = await client.send(new ListObjectVersionsCommand({Bucket: storage.bucket, KeyMarker: keyMarker, VersionIdMarker: versionMarker}));
    if (!Array.isArray(page.Versions || []) || typeof page.IsTruncated !== 'boolean') throw new Error('Incomplete version inventory');
    for (const version of page.Versions || []) {
      if (typeof version.Key !== 'string' || typeof version.VersionId !== 'string' || !version.VersionId ||
          !Number.isSafeInteger(version.Size) || version.Size < 0 || typeof version.IsLatest !== 'boolean') throw new Error('Invalid object version');
      versions.push({key: version.Key, version_id: version.VersionId, bytes: version.Size, latest: version.IsLatest});
    }
    if (!page.IsTruncated) break;
    keyMarker = page.NextKeyMarker; versionMarker = page.NextVersionIdMarker;
    const cursor = JSON.stringify([keyMarker, versionMarker]);
    if (!keyMarker || versionCursors.has(cursor)) throw new Error('Version pagination did not advance');
    versionCursors.add(cursor);
  } while (true);
  const oversizedObjects = objects.filter(object => object.bytes > imageBudget.hard);
  const oversizedVersions = versions.filter(object => object.bytes > imageBudget.hard);
  return {version: 1, bucket: storage.bucket, endpoint: storage.endpoint, complete: true,
    maximum_bytes: imageBudget.hard, objects, versions, oversized_objects: oversizedObjects,
    oversized_versions: oversizedVersions, clean: !oversizedObjects.length && !oversizedVersions.length,
    summary: {objects: objects.length, object_bytes: objects.reduce((sum, object) => sum + object.bytes, 0),
      versions: versions.length, version_bytes: versions.reduce((sum, object) => sum + object.bytes, 0),
      oversized_objects: oversizedObjects.length, oversized_versions: oversizedVersions.length}};
}

export async function retireOversized(client, inventory, replacements, liveReceipt, {request = fetch, journal = async () => {}} = {}) {
  if (inventory.complete !== true || !Array.isArray(inventory.versions)) throw new Error('Retirement requires a complete version inventory');
  if (liveReceipt.version !== 1 || !Array.isArray(liveReceipt.objects)) throw new Error('Retirement requires the deployed public receipt');
  const live = new Map(liveReceipt.objects.map(object => [object.key, validateObject(object)]));
  const sourceMap = new Map(Object.values(replacements).map(record => [record.source_sha256, record]));
  const targets = new Map(), actions = [];
  // Resolve the complete plan and verify every replacement before deleting even one version.
  for (const old of inventory.oversized_versions) {
    const match = /^originals\/([a-f0-9]{64})\/[a-z0-9._-]+$/i.exec(old.key);
    const record = match && sourceMap.get(match[1]);
    if (!record || old.bytes !== record.source_bytes || !old.version_id) throw new Error(`Unmapped oversized version; nothing retired: ${old.key}`);
    const replacement = mediaObject('originals', record.filename, record.sha256, record.bytes);
    if (live.has(old.key) || JSON.stringify(live.get(replacement.key)) !== JSON.stringify(replacement)) {
      throw new Error(`Replacement is not the active verified publication: ${old.key}`);
    }
    targets.set(replacement.key, replacement);
    actions.push({...old, replacement_key: replacement.key});
  }
  for (const old of inventory.oversized_objects) if (!actions.some(action => action.key === old.key)) {
    throw new Error(`Oversized object missing from the version plan; nothing retired: ${old.key}`);
  }
  for (const target of targets.values()) await verifyPublic(target, request);
  const result = {version: 1, planned: actions, deleted: [], complete: false};
  await journal(result);
  for (const action of actions) {
    try {
      await client.send(new DeleteObjectCommand({Bucket: storage.bucket, Key: action.key, VersionId: action.version_id}));
    } catch (error) {
      result.blocked_key = action.key;
      result.reason = error.$metadata?.httpStatusCode === 403 ? 'Deletion requires bucket-scoped storage.editor; storage.uploader cannot retire object versions' : 'Version retirement failed; inspect the fresh inventory';
      await journal(result);
      throw new Error(result.reason);
    }
    result.deleted.push({key: action.key, version_id: action.version_id, bytes: action.bytes});
    await journal(result);
  }
  result.complete = true;
  await journal(result);
  return result;
}

async function main() {
  if (process.env.GITHUB_REF !== 'refs/heads/master' || !['push', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)) {
    throw new Error('Authenticated bucket audit runs only on trusted master');
  }
  const client = configuredClient();
  try {
    let receipt = await bucketInventory(client);
    const target = resolve('test-results/bucket-budget/receipt.json');
    await mkdir(dirname(target), {recursive: true});
    await writeFile(target, JSON.stringify(receipt, null, 2) + '\n');
    if (process.argv.includes('--retire')) {
      const response = await fetch('https://history-math.org/assets/publication-media.json', {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(120_000)});
      if (!response.ok) throw new Error('Cannot verify the deployed replacement receipt');
      const live = await response.json();
      await retireOversized(client, receipt, publicationReplacements(process.cwd()), live, {journal: async result => {
        await writeFile(resolve('test-results/bucket-budget/retirement.json'), JSON.stringify(result, null, 2) + '\n');
      }});
      receipt = await bucketInventory(client);
      await writeFile(target, JSON.stringify(receipt, null, 2) + '\n');
      if (!receipt.clean) throw new Error('Post-retirement bucket inventory still contains oversized files');
    }
    console.log(JSON.stringify({...receipt.summary, clean: receipt.clean}));
  } finally { client.destroy(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
