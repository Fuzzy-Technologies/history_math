import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ListObjectVersionsCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import {storage, configuredClient, mediaObject, validateObject, uploadVerified, readWithRetries, mediaRead, storageFailure} from './s3-media.mjs';
import {sourceBytes, uniqueObjects} from './publication-media.mjs';
import {revisionBytes} from './backfill-media.mjs';
import {currentReferences, currentPublication, referenceIdentity, guardedHeads, rawReferenceBlob} from './media-cleanup-references.mjs';
import {githubInventory, githubCleanupPlan, applyGithubCleanup} from './github-storage-cleanup.mjs';

const identity = object => JSON.stringify([object.key, object.version_id]);
const signature = object => JSON.stringify([object.key, object.version_id, object.bytes, object.last_modified, object.delete_marker]);
const retiredProbes = new Set([
  '_infrastructure-checks/2026-10-29T11-52-48-681Z-d1c871f55f195f17/probe.txt',
  '_infrastructure-checks/2026-10-29T11-54-10-354Z-e42f61f8138a399a/probe.txt'
]);

export function mediaKey(value) {
  if (retiredProbes.has(value)) return value;
  const match = typeof value === 'string' && /^(pdf|originals)\/([a-f0-9]{64})\/([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(value);
  if (!match || mediaObject(match[1], match[3], match[2], 1).key !== value) throw new Error('Invalid managed media key');
  return value;
}

export function versionRecord(value, now) {
  mediaKey(value?.key);
  const stamp = typeof value.last_modified === 'string' && Date.parse(value.last_modified);
  if (!Number.isFinite(now) || typeof value.version_id !== 'string' || !value.version_id || value.version_id.length > 1024 ||
      !Number.isSafeInteger(value.bytes) || value.bytes < (value.delete_marker ? 0 : 1) ||
      typeof value.latest !== 'boolean' || typeof value.delete_marker !== 'boolean' ||
      !Number.isFinite(stamp) || new Date(stamp).toISOString() !== value.last_modified || stamp > now) throw new Error('Invalid media version');
  return {key: value.key, version_id: value.version_id, bytes: value.bytes, latest: value.latest,
    last_modified: value.last_modified, delete_marker: value.delete_marker};
}

export async function mediaVersions(client, now) {
  const result = [];
  for (const prefix of ['pdf/', 'originals/', '_infrastructure-checks/']) {
    const cursors = new Set(); let keyMarker, versionMarker;
    do {
      const page = await client.send(new ListObjectVersionsCommand({Bucket: storage.bucket, Prefix: prefix,
        KeyMarker: keyMarker, VersionIdMarker: versionMarker}));
      if (typeof page.IsTruncated !== 'boolean' || !Array.isArray(page.Versions || []) || !Array.isArray(page.DeleteMarkers || [])) throw new Error('Incomplete media version inventory');
      for (const [records, marker] of [[page.Versions || [], false], [page.DeleteMarkers || [], true]]) for (const item of records) {
        if (!item.Key?.startsWith(prefix)) throw new Error('Version inventory escaped its managed prefix');
        if (prefix === '_infrastructure-checks/' && !retiredProbes.has(item.Key)) continue;
        result.push(versionRecord({key: item.Key, version_id: item.VersionId, bytes: marker ? 0 : item.Size,
          latest: item.IsLatest, last_modified: item.LastModified instanceof Date ? item.LastModified.toISOString() : item.LastModified, delete_marker: marker}, now));
      }
      if (!page.IsTruncated) break;
      keyMarker = page.NextKeyMarker; versionMarker = page.NextVersionIdMarker;
      const cursor = JSON.stringify([keyMarker, versionMarker]);
      if (!keyMarker || cursors.has(cursor)) throw new Error('Media version pagination did not advance');
      cursors.add(cursor);
    } while (true);
  }
  if (new Set(result.map(identity)).size !== result.length) throw new Error('Duplicate media version');
  return result;
}

export function cleanupPlan({versions, liveObjects, protectedKeys = [], protectedVersions = [], protectedNames = [], now}) {
  if (!Number.isFinite(now) || !Array.isArray(versions) || !Array.isArray(liveObjects) || !liveObjects.length) throw new Error('Missing cleanup inputs');
  const inventory = versions.map(item => versionRecord(item, now));
  if (new Set(inventory.map(identity)).size !== inventory.length) throw new Error('Duplicate version identity');
  const active = new Set(protectedKeys.map(mediaKey)), names = new Map(), live = new Map();
  for (const object of liveObjects) {
    validateObject(object); mediaKey(object.key);
    if (object.verified !== true || live.has(object.key)) throw new Error('Unverified or duplicate current media');
    live.set(object.key, object); active.add(object.key);
    if (!names.has(object.filename)) names.set(object.filename, []);
    names.get(object.filename).push(object.key);
    const latest = inventory.filter(version => version.key === object.key && version.latest);
    if (latest.length !== 1 || latest[0].delete_marker || latest[0].bytes !== object.bytes) throw new Error('Current media missing from authenticated inventory');
  }
  // A stable alias selects current objects, never every historical hash with
  // the same filename. Unresolved content aliases block destructive cleanup.
  for (const name of protectedNames) {
    if (!names.has(name)) throw new Error('Unresolved current PDF alias');
    for (const key of names.get(name)) active.add(key);
  }
  const pinned = new Set(protectedVersions.map(item => {
    mediaKey(item.key);
    if (!item.version_id || !inventory.some(v => identity(v) === identity(item) && !v.delete_marker)) throw new Error('Unavailable referenced media version');
    return identity(item);
  }));
  for (const key of active) if (!inventory.some(v => v.key === key && v.latest && !v.delete_marker)) throw new Error('Referenced media is missing');
  const retained = [], deletions = [];
  for (const version of inventory) {
    if ((active.has(version.key) && version.latest && !version.delete_marker) || pinned.has(identity(version))) retained.push({...version, reason: 'currently-referenced'});
    else deletions.push(version);
  }
  return {version: 2, policy: 'current-only-v1', generated_at: new Date(now).toISOString(),
    protected_keys: [...active], pinned_versions: [...pinned], retained, deletions,
    summary: {versions: inventory.length, current_objects: live.size, retained: retained.length, candidates: deletions.length,
      candidate_bytes: deletions.reduce((sum, item) => sum + item.bytes, 0)}};
}

export async function verifyCurrentMedia(objects, request = mediaRead, retryOptions) {
  let cursor = 0, failed = false;
  const results = await Promise.allSettled(Array.from({length: Math.min(6, objects.length)}, async () => {
    while (!failed && cursor < objects.length) {
      try {
        const object = objects[cursor++]; validateObject(object);
        await readWithRetries(`current media ${object.key}`, async () => {
          const response = await request(object.url, {method: 'HEAD', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60_000)});
          if (response.status !== 200) throw Object.assign(new Error('Current media unavailable'), {status: response.status});
          if (response.headers.get('content-length') !== String(object.bytes) ||
              response.headers.get('content-type')?.split(';')[0] !== object.content_type || response.headers.get('x-amz-meta-sha256') !== object.sha256) {
            throw new Error('Current media metadata mismatch');
          }
        }, retryOptions);
      } catch (error) { failed = true; throw error; }
    }
  }));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
}

export async function applyCleanup(client, plan, {guard, journal = async () => {}}) {
  if (plan?.version !== 2 || plan.policy !== 'current-only-v1' || !Array.isArray(plan.deletions) || !Array.isArray(plan.retained) ||
      !Array.isArray(plan.protected_keys) || !Array.isArray(plan.pinned_versions) || typeof guard !== 'function') throw new Error('Invalid current-only cleanup plan');
  const now = Date.parse(plan.generated_at), kept = new Set(plan.retained.map(identity)), seen = new Set();
  for (const item of plan.deletions) {
    versionRecord(item, now);
    if (seen.has(identity(item)) || kept.has(identity(item)) || plan.pinned_versions.includes(identity(item)) ||
        (item.latest && plan.protected_keys.includes(item.key))) throw new Error('Cleanup candidate is still referenced');
    seen.add(identity(item));
  }
  const result = {version: 1, deleted: [], complete: false}; await journal(result);
  for (const item of plan.deletions) {
    await guard();
    try { await client.send(new DeleteObjectCommand({Bucket: storage.bucket, Key: item.key, VersionId: item.version_id})); }
    catch (error) {
      const details = storageFailure('version deletion', item, error);
      result.failure = {key: item.key, version_id: item.version_id, http_status: details.http_status,
        code: details.code, sdk_attempts: details.sdk_attempts};
      await journal(result); throw new Error(`Media deletion failed (HTTP ${details.http_status || 'unknown'}); ${details.code}; ${details.sdk_attempts || 'unknown'} SDK attempts; check explicit bucket policy, IAM and locks`);
    }
    result.deleted.push(item); await journal(result);
  }
  result.complete = true; await journal(result); return result;
}

export function executionMode(args, env = process.env) {
  if (args.length > 1 || (args.length && !['--dry-run', '--apply', '--apply-s3'].includes(args[0]))) throw new Error('Choose --dry-run, --apply or --apply-s3');
  const mode = args[0] || '--dry-run';
  if (mode === '--apply' && (env.GITHUB_REF !== 'refs/heads/master' || !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) ||
      env.MEDIA_CLEANUP_AFTER_DEPLOY !== 'true' || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || ''))) throw new Error('Deletion requires a trusted master post-deployment job');
  if (mode === '--apply-s3' && (env.GITHUB_REF !== 'refs/heads/master' || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
      env.MEDIA_CLEANUP_MANUAL !== 'true' || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || ''))) throw new Error('S3 recovery requires an explicit trusted master manual job');
  return mode;
}

async function main() {
  const mode = executionMode(process.argv.slice(2)), output = resolve('test-results/media-cleanup');
  await mkdir(output, {recursive: true});
  const record = (name, value) => writeFile(resolve(output, name), JSON.stringify(value, null, 2) + '\n');
  const client = configuredClient();
  try {
    const live = await currentPublication(); console.log('Verified current published page references');
    const references = await currentReferences({root: process.cwd(), readBlob: rawReferenceBlob});
    console.log(`Pinned master and ${references.pulls.length} open PR heads`);
    if (references.master_sha !== process.env.GITHUB_SHA) throw new Error('Workflow no longer matches master');
    const expected = referenceIdentity(references);
    const guard = async () => {
      const current = await guardedHeads(), publication = await currentPublication({pages: false});
      if (referenceIdentity(current) !== expected || publication.digest !== live.digest) throw new Error('Master, PR references or live publication changed; cleanup stopped');
    };
    await guard();
    let versions = await mediaVersions(client, Date.now());
    await record('inventory-before.json', {complete: true, versions});
    console.log(`Inventoried ${versions.length} managed versions`);
    const apply = mode === '--apply' || mode === '--apply-s3';
    // Newly prepared draft originals are copied as bounded data; no draft is
    // published and no PR code runs with the storage credentials.
    const missing = references.objects.filter(object => !versions.some(v => v.key === object.key && v.latest && !v.delete_marker));
    if (apply) for (const object of missing) {
      await guard();
      await uploadVerified(client, object, async () => object.source.revision ? revisionBytes(object.source.revision, object.source.path, fetch, object.bytes) : sourceBytes(object));
    }
    if (missing.length && apply) versions = await mediaVersions(client, Date.now());
    const objects = uniqueObjects([...live.objects, ...references.objects]);
    await verifyCurrentMedia(objects);
    console.log(`Verified ${objects.length} current published and draft media objects`);
    const plan = cleanupPlan({versions, liveObjects: objects.map(object => ({...object, verified: true})),
      protectedKeys: [...live.protectedKeys, ...references.keys], protectedNames: references.names, protectedVersions: references.versions, now: Date.now()});
    plan.context = {master_sha: references.master_sha, pulls: references.pulls, live_sha256: live.digest};
    await record('plan.json', plan);
    const github = await githubInventory();
    const githubPlan = githubCleanupPlan(github, references, {master: references.master_sha, runId: Number(process.env.GITHUB_RUN_ID)});
    await record('github-plan.json', githubPlan);
    await guard();
    if (apply) {
      const result = await applyCleanup(client, plan, {guard, journal: value => record('retirement.json', value)});
      const after = await mediaVersions(client, Date.now()), deleted = new Set(result.deleted.map(identity));
      const remaining = new Map(versions.filter(v => !deleted.has(identity(v))).map(v => [identity(v), signature(v)]));
      if (after.length !== remaining.size || after.some(v => remaining.get(identity(v)) !== signature(v))) throw new Error('Remaining inventory differs from the exact deletion journal');
      await verifyCurrentMedia(objects);
      await record('inventory-after.json', {complete: true, versions: after});
      if (mode === '--apply') await applyGithubCleanup(githubPlan, {guard, journal: value => record('github-retirement.json', value)});
    }
    const summary = {mode, ...plan.summary, open_prs: references.pulls.length, github: githubPlan.summary};
    await record('summary.json', summary); console.log(JSON.stringify(summary));
  } finally { client.destroy(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
