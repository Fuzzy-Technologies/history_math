import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ListObjectVersionsCommand, GetObjectCommand, PutObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import {storage, configuredClient, validateObject} from './s3-media.mjs';
import {retentionReferences, liveRetentionReferences, referenceIdentity, referenceHeads} from './pdf-retention-references.mjs';

export const retentionDays = 30;
export const stateKey = 'maintenance/pdf-retention-v1.json';
const day = 86_400_000;
const keyPattern = /^pdf\/([a-f0-9]{64})\/([a-z0-9][a-z0-9._-]*\.pdf)$/;
const identity = object => JSON.stringify([object.key, object.version_id]);
const signature = object => JSON.stringify([object.key, object.version_id, object.bytes, object.last_modified]);

export function pdfKey(value) {
  if (typeof value !== 'string' || !keyPattern.test(value) || value.includes('..')) throw new Error('Invalid PDF object key');
  return value;
}

function time(value, name) {
  const parsed = typeof value === 'string' && Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error(`Invalid ${name}`);
  return parsed;
}

export function versionRecord(value, now) {
  pdfKey(value?.key);
  if (typeof value.version_id !== 'string' || !value.version_id || value.version_id.length > 1024 ||
      !Number.isSafeInteger(value.bytes) || value.bytes <= 0 || typeof value.latest !== 'boolean' ||
      time(value.last_modified, 'version timestamp') > now) throw new Error('Invalid PDF version');
  return {key: value.key, version_id: value.version_id, bytes: value.bytes, latest: value.latest, last_modified: value.last_modified};
}

export async function pdfVersions(client, now) {
  const versions = [], seen = new Set(), cursors = new Set();
  let keyMarker, versionMarker;
  do {
    const page = await client.send(new ListObjectVersionsCommand({Bucket: storage.bucket, Prefix: 'pdf/',
      KeyMarker: keyMarker, VersionIdMarker: versionMarker}));
    if (typeof page.IsTruncated !== 'boolean' || !Array.isArray(page.Versions || [])) throw new Error('Incomplete PDF version inventory');
    for (const object of page.Versions || []) {
      const version = versionRecord({key: object.Key, version_id: object.VersionId, bytes: object.Size,
        latest: object.IsLatest, last_modified: object.LastModified instanceof Date ? object.LastModified.toISOString() : object.LastModified}, now);
      if (seen.has(identity(version))) throw new Error('Duplicate PDF version');
      seen.add(identity(version)); versions.push(version);
    }
    if (!page.IsTruncated) break;
    keyMarker = page.NextKeyMarker; versionMarker = page.NextVersionIdMarker;
    const cursor = JSON.stringify([keyMarker, versionMarker]);
    if (!keyMarker || cursors.has(cursor)) throw new Error('PDF pagination did not advance');
    cursors.add(cursor);
  } while (true);
  return versions;
}

export function retentionPlan({versions, liveObjects, protectedKeys = [], protectedNames = [], state, now}) {
  if (!Number.isFinite(now) || !Array.isArray(versions) || !Array.isArray(liveObjects) || !liveObjects.length) throw new Error('Missing retention inputs');
  if (state?.version !== 1 || !Array.isArray(state.entries) ||
      (state.updated_at !== null && time(state.updated_at, 'state timestamp') > now)) throw new Error('Invalid retention state');
  const previous = new Map();
  for (const entry of state.entries) {
    versionRecord({...entry, latest: false}, now);
    if (time(entry.unreferenced_since, 'unreferenced timestamp') > time(state.updated_at, 'state timestamp') || previous.has(identity(entry))) {
      throw new Error('Invalid or duplicate retention observation');
    }
    previous.set(identity(entry), entry);
  }
  const live = new Map(), names = new Map(), protectedSet = new Set(protectedKeys.map(pdfKey));
  for (const object of liveObjects) {
    validateObject(object); pdfKey(object.key);
    if (object.verified !== true || live.has(object.key) || names.has(object.filename)) throw new Error('Ambiguous active PDF identity');
    live.set(object.key, object); names.set(object.filename, object.key); protectedSet.add(object.key);
  }
  const inventory = versions.map(version => versionRecord(version, now));
  if (new Set(inventory.map(identity)).size !== inventory.length) throw new Error('Duplicate inventory identity');
  for (const [key, object] of live) if (!inventory.some(version => version.key === key && version.latest && version.bytes === object.bytes)) {
    throw new Error('Active PDF missing from the authenticated inventory');
  }
  const pinnedNames = new Set(protectedNames);
  // Keep one previous content-addressed PDF per currently published filename.
  // Unknown/withdrawn filenames stay outside automatic deletion entirely.
  const previousKeys = new Map();
  for (const version of inventory) {
    const name = version.key.split('/').at(-1);
    if (!names.has(name) || live.has(version.key)) continue;
    const saved = previousKeys.get(name);
    if (!saved || version.last_modified > saved.last_modified ||
        (version.last_modified === saved.last_modified && version.key > saved.key)) previousKeys.set(name, version);
  }
  const rollback = new Set([...previousKeys.values()].map(version => version.key));
  const retained = [], entries = [], deletions = [];
  for (const version of inventory) {
    const name = version.key.split('/').at(-1);
    if (protectedSet.has(version.key) || pinnedNames.has(name) || !names.has(name)) {
      retained.push({...version, reason: protectedSet.has(version.key) || pinnedNames.has(name) ? 'referenced' : 'no-current-counterpart'});
      continue;
    }
    const old = previous.get(identity(version));
    if (old && signature(old) !== signature(version)) throw new Error('Observed PDF version identity changed');
    const unreferencedSince = old?.unreferenced_since || new Date(now).toISOString();
    entries.push({...version, unreferenced_since: unreferencedSince});
    const reason = rollback.has(version.key) ? 'previous-publication' :
      now - time(unreferencedSince, 'unreferenced timestamp') < retentionDays * day ? 'grace-period' :
      now - time(version.last_modified, 'version timestamp') < retentionDays * day ? 'recent-version' : null;
    if (reason) retained.push({...version, reason});
    else deletions.push(version);
  }
  deletions.sort((a, b) => identity(a).localeCompare(identity(b)));
  return {version: 1, retention_days: retentionDays, generated_at: new Date(now).toISOString(),
    deletions, retained, state: {version: 1, updated_at: new Date(now).toISOString(), entries},
    summary: {versions: inventory.length, active_pdfs: live.size, candidates: deletions.length,
      candidate_bytes: deletions.reduce((total, item) => total + item.bytes, 0),
      retained: retained.length, observed_unreferenced: entries.length}};
}

export async function readState(client, now) {
  let result;
  try { result = await client.send(new GetObjectCommand({Bucket: storage.bucket, Key: stateKey})); }
  catch (error) {
    if (error.$metadata?.httpStatusCode === 404) return {state: {version: 1, updated_at: null, entries: []}, etag: null};
    throw new Error(`Cannot read PDF retention state (HTTP ${error.$metadata?.httpStatusCode || 'unknown'})`);
  }
  if (typeof result.ETag !== 'string' || !result.ETag) throw new Error('Retention state has no ETag');
  const parts = []; let length = 0;
  for await (const part of result.Body) {
    length += part.length;
    if (length > 10_000_000) throw new Error('Retention state exceeds its size bound');
    parts.push(part);
  }
  const state = JSON.parse(Buffer.concat(parts).toString('utf8'));
  if (state.version !== 1 || !Array.isArray(state.entries) || time(state.updated_at, 'state timestamp') > now) throw new Error('Invalid retention state');
  return {state, etag: result.ETag};
}

export async function saveState(client, state, etag) {
  const body = Buffer.from(JSON.stringify(state) + '\n');
  if (body.length > 10_000_000) throw new Error('Retention state exceeds its size bound');
  await client.send(new PutObjectCommand({Bucket: storage.bucket, Key: stateKey, Body: body,
    ContentType: 'application/json', CacheControl: 'no-store',
    ...(etag ? {IfMatch: etag} : {IfNoneMatch: '*'})}));
}

export async function verifyLivePdfs(objects, request = fetch) {
  let cursor = 0;
  async function worker() {
    while (cursor < objects.length) {
      const object = objects[cursor++]; validateObject(object); pdfKey(object.key);
      const response = await request(object.url, {method: 'HEAD', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60_000)});
      if (response.status !== 200 || response.headers.get('content-length') !== String(object.bytes) ||
          response.headers.get('content-type')?.split(';')[0] !== 'application/pdf' ||
          response.headers.get('x-amz-meta-sha256') !== object.sha256) throw new Error('Current public PDF verification failed');
    }
  }
  await Promise.all(Array.from({length: Math.min(4, objects.length)}, worker));
}

export async function applyRetention(client, plan, {guard, journal = async () => {}}) {
  if (plan?.version !== 1 || plan.retention_days !== retentionDays || !Array.isArray(plan.deletions) ||
      !Array.isArray(plan.state?.entries) || !Array.isArray(plan.retained) || typeof guard !== 'function') {
    throw new Error('Invalid deletion plan');
  }
  const now = time(plan.generated_at, 'plan timestamp'), seen = new Set();
  const observations = new Map(plan.state.entries.map(entry => [identity(entry), entry]));
  const retained = new Set(plan.retained.map(identity));
  // Validate the complete batch before the first irreversible request.
  for (const version of plan.deletions) {
    versionRecord(version, now);
    const observation = observations.get(identity(version));
    if (seen.has(identity(version)) || retained.has(identity(version)) || !observation ||
        signature(observation) !== signature(version) || now - time(version.last_modified, 'version timestamp') < retentionDays * day ||
        now - time(observation.unreferenced_since, 'unreferenced timestamp') < retentionDays * day) throw new Error('Unsafe PDF deletion candidate');
    seen.add(identity(version));
  }
  const result = {version: 1, deleted: [], complete: false};
  await journal(result);
  for (const version of plan.deletions) {
    await guard();
    try {
      await client.send(new DeleteObjectCommand({Bucket: storage.bucket, Key: version.key, VersionId: version.version_id}));
    } catch (error) {
      result.failure = {key: version.key, version_id: version.version_id,
        http_status: error.$metadata?.httpStatusCode || null,
        code: /^[A-Za-z0-9_]{1,80}$/.test(error.name || '') ? error.name : 'StorageError'};
      await journal(result);
      throw new Error(`PDF version deletion failed (HTTP ${result.failure.http_status || 'unknown'}; ${result.failure.code}); check IAM, bucket policy and object locks`);
    }
    result.deleted.push(version); await journal(result);
  }
  result.complete = true; await journal(result); return result;
}

export function executionMode(args, env = process.env) {
  if (args.length > 1 || (args.length && !['--dry-run', '--observe', '--apply'].includes(args[0]))) throw new Error('Choose --dry-run, --observe or --apply');
  const mode = args[0] || '--dry-run';
  const afterDeploy = env.PDF_RETENTION_AFTER_DEPLOY === 'true' && ['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME);
  if (mode !== '--dry-run' && (env.GITHUB_REF !== 'refs/heads/master' ||
      !(['schedule', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) || afterDeploy) ||
      !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || ''))) throw new Error('Retention mutations require a trusted master schedule or manual run');
  if (mode === '--apply' && (!afterDeploy || env.PDF_RETENTION_DELETE_ENABLED !== 'true')) throw new Error('PDF deletion requires an enabled post-deployment job');
  return mode;
}

async function main() {
  const mode = executionMode(process.argv.slice(2));
  const output = resolve('test-results/pdf-retention');
  await mkdir(output, {recursive: true});
  const client = configuredClient();
  try {
    const now = Date.now(), observation = await readState(client, now);
    const live = await liveRetentionReferences(), references = await retentionReferences({root: process.cwd()});
    if (mode !== '--dry-run' && references.master_sha !== process.env.GITHUB_SHA) throw new Error('This trusted workflow no longer matches master');
    const versions = await pdfVersions(client, now);
    const plan = retentionPlan({versions, liveObjects: live.objects,
      protectedKeys: [...live.protectedKeys, ...references.keys], protectedNames: references.names, state: observation.state, now});
    plan.context = {master_sha: references.master_sha, pulls: references.pulls, live_sha256: live.digest};
    await writeFile(resolve(output, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
    const expected = referenceIdentity(references);
    const guard = async () => {
      const heads = await referenceHeads(), current = await liveRetentionReferences({pages: false});
      if (referenceIdentity(heads) !== expected || current.digest !== live.digest) throw new Error('Publication or open PR references changed; no further deletions');
    };
    await guard();
    await verifyLivePdfs(live.objects);
    await guard();
    if (mode !== '--dry-run') await saveState(client, plan.state, observation.etag);
    let deleted = [];
    if (mode === '--apply') {
      const result = await applyRetention(client, plan, {guard, journal: value =>
        writeFile(resolve(output, 'retirement.json'), JSON.stringify(value, null, 2) + '\n')});
      deleted = result.deleted;
      const after = await pdfVersions(client, Date.now());
      const removed = new Set(deleted.map(identity));
      const beforeRemaining = new Map(versions.filter(version => !removed.has(identity(version))).map(version => [identity(version), signature(version)]));
      if (after.length !== beforeRemaining.size || after.some(version => beforeRemaining.get(identity(version)) !== signature(version))) {
        throw new Error('Post-retirement inventory differs from the exact deletion journal');
      }
      await verifyLivePdfs(live.objects);
      await writeFile(resolve(output, 'inventory-after.json'), JSON.stringify({version: 1, complete: true, versions: after}, null, 2) + '\n');
    }
    const summary = {mode, ...plan.summary, deleted_versions: deleted.length, deleted_bytes: deleted.reduce((sum, version) => sum + version.bytes, 0),
      protected_prs: references.pulls.length, verified_live_pdfs: live.objects.length};
    await writeFile(resolve(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
    console.log(JSON.stringify(summary));
  } finally { client.destroy(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
