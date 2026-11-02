import {validateObject, verifyPublic, readWithRetries} from './s3-media.mjs';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {currentReferences, currentPublication, rawReferenceBlob, guardedHeads, referenceIdentity} from './media-cleanup-references.mjs';

const root = 'https://api.github.com/repos/Fuzzy-Technologies/history_math';
let remaining = Infinity;
const positive = value => Number.isSafeInteger(value) && value > 0;
const stamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
// Audited on 2026-11-01 against master, 28 changed draft image manifests and
// the JPEG registry. Other unclassified uploads may be work in progress.
const retiredAssetIds = new Set([630538942,630559971,630541044,630534362,630538001,630526378,630557613,
  630553549,630571380,630525839,630499594,630530430,630528062,630528259,630526052,630560540,
  630536833,630553567,630528409,630529889,630534525,630526200,630534781,630534996,630525962,630526543,630558591]);

export async function storageRequest(path, {method = 'GET', request = fetch, token = process.env.GITHUB_TOKEN, retryOptions} = {}) {
  const allowed = method === 'DELETE' ? /^\/(?:releases\/assets|actions\/(?:artifacts|caches))\/[1-9]\d*$/ :
    /^\/(?:releases(?:\/[1-9]\d*\/assets)?|actions\/(?:artifacts|caches|runs))(?:\?[A-Za-z0-9_=&-]+)?$/;
  if (!token || !allowed.test(path) || !['GET', 'DELETE'].includes(method)) throw new Error('Unsafe GitHub storage request');
  const perform = async () => {
    const response = await request(root + path, {method, redirect: 'error', signal: AbortSignal.timeout(60_000),
      headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10'}});
    const quota = response.headers.get('x-ratelimit-remaining');
    if (quota !== null && /^\d+$/.test(quota)) remaining = Number(quota);
    if (method === 'DELETE' && response.status === 404) {
      try { await response.body?.cancel(); } catch { /* The absent object is already reconciled. */ }
      return {already_absent: true};
    }
    if (!response.ok || (method === 'DELETE' && response.status !== 204)) {
      try { await response.body?.cancel(); } catch { /* Preserve the HTTP failure. */ }
      throw Object.assign(new Error(`GitHub storage request failed (HTTP ${response.status})`), {status: response.status});
    }
    return method === 'DELETE' ? {} : response.json();
  };
  return method === 'GET' ? readWithRetries('GitHub storage inventory', perform, retryOptions) : perform();
}

async function pages(api, path, field) {
  const result = [], seen = new Set();
  for (let page = 1; page <= 100; page++) {
    const response = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`), items = field ? response[field] : response;
    if (!Array.isArray(items)) throw new Error('Incomplete GitHub storage inventory');
    for (const item of items) {
      if (!positive(item.id) || seen.has(item.id)) throw new Error('Invalid or repeated GitHub storage identity');
      seen.add(item.id); result.push(item);
    }
    if (items.length < 100) return result;
  }
  throw new Error('Incomplete GitHub storage pagination');
}

export async function githubInventory(api = storageRequest) {
  const releases = await pages(api, '/releases'), assets = [];
  for (const release of releases.filter(release => /^article-originals-[a-f0-9]$/.test(release.tag_name))) {
    for (const asset of await pages(api, `/releases/${release.id}/assets`)) assets.push({...asset, release_tag: release.tag_name});
  }
  const artifacts = await pages(api, '/actions/artifacts', 'artifacts');
  const caches = await pages(api, '/actions/caches', 'actions_caches');
  const running = new Set();
  for (const status of ['in_progress', 'queued', 'waiting']) for (const run of await pages(api, `/actions/runs?status=${status}`, 'workflow_runs')) running.add(run.id);
  return {assets, artifacts, caches, running: [...running]};
}

export function githubCleanupPlan(inventory, references, {master, runId}) {
  if (!Array.isArray(inventory.assets) || !Array.isArray(inventory.artifacts) || !Array.isArray(inventory.caches) ||
      !Array.isArray(inventory.running) || !Array.isArray(references.migrations) || !/^[a-f0-9]{40}$/.test(master)) throw new Error('Missing GitHub cleanup inputs');
  const migrations = new Map();
  for (const migration of references.migrations) {
    validateObject(migration.object);
    const id = migration.external.asset_id, prior = migrations.get(id);
    if (!positive(id) || (prior && prior.object.key !== migration.object.key)) throw new Error('Ambiguous release migration');
    migrations.set(id, migration);
  }
  const directLinks = new Set(references.releaseUrls || []), actions = [], retained = [];
  for (const asset of inventory.assets) {
    const match = typeof asset.name === 'string' && /^([a-z0-9][a-z0-9._-]*)-([a-f0-9]{64})\.(png|jpe?g|webp|gif|svg)$/.exec(asset.name);
    if (!match || asset.release_tag !== 'article-originals-' + match[2][0] || !positive(asset.id) || !positive(asset.size) ||
        asset.state !== 'uploaded' || (asset.digest && asset.digest !== 'sha256:' + match[2])) throw new Error('Unexpected original release asset');
    if (directLinks.has(asset.browser_download_url)) {retained.push({kind: 'release-asset', id: asset.id, reason: 'direct-current-link'}); continue;}
    const migration = migrations.get(asset.id);
    if (migration && (migration.external.url !== asset.browser_download_url || migration.external.bytes !== asset.size || migration.external.sha256 !== match[2])) throw new Error('Changed release migration identity');
    if (!migration && !retiredAssetIds.has(asset.id)) {retained.push({kind: 'release-asset', id: asset.id, reason: 'unclassified-staging-upload'}); continue;}
    actions.push({kind: 'release-asset', id: asset.id, bytes: asset.size, name: asset.name,
      replica: migration ? validateObject(migration.object) : null, reason: migration ? 'verified-s3-copy' : 'unreferenced-original'});
  }
  const draftHeads = new Set(references.pulls.map(pr => pr.sha));
  const activeHeads = new Set([master, ...draftHeads]), newest = new Map(), running = new Set([...inventory.running, runId]);
  const group = item => JSON.stringify([item.workflow_run?.head_sha, item.name?.replace(/-[a-f0-9]{40}(?:-.*)?$/, '')]);
  for (const item of inventory.artifacts) {
    if (!positive(item.id) || !Number.isSafeInteger(item.size_in_bytes) || item.size_in_bytes < 0 || !stamp(item.created_at)) throw new Error('Invalid artifact identity');
    const key = group(item), prior = newest.get(key);
    if (!prior || item.created_at > prior.created_at || (item.created_at === prior.created_at && item.id > prior.id)) newest.set(key, item);
  }
  for (const item of inventory.artifacts) {
    const run = item.workflow_run;
    if (!run || running.has(run.id)) {retained.push({kind: 'artifact', id: item.id, reason: 'active-or-unclassified-run'}); continue;}
    const oldMedia = /^(?:article-(?:pdfs|preview|screenshots)|browser-site|site-build)(?:-|$)/.test(item.name);
    if ((oldMedia && !draftHeads.has(run.head_sha)) || !activeHeads.has(run.head_sha) || newest.get(group(item)).id !== item.id) actions.push({kind: 'artifact', id: item.id, bytes: item.size_in_bytes, name: item.name});
    else retained.push({kind: 'artifact', id: item.id, reason: 'current-report-or-pages-transfer'});
  }
  const pdfCaches = inventory.caches.filter(item => item.ref === 'refs/heads/master' && /^pdf-v1-[A-Za-z0-9_]+-[a-f0-9]{40}-/.test(item.key));
  const cacheGroups = new Map();
  for (const item of pdfCaches) {
    if (!positive(item.id) || !stamp(item.created_at) || !Number.isSafeInteger(item.size_in_bytes) || item.size_in_bytes < 0) throw new Error('Invalid PDF cache identity');
    const key = item.key.split('-')[2], prior = cacheGroups.get(key);
    if (!prior || item.created_at > prior.created_at || (item.created_at === prior.created_at && item.id > prior.id)) cacheGroups.set(key, item);
  }
  for (const item of pdfCaches) {
    if ([...cacheGroups.values()].some(value => value.id === item.id)) retained.push({kind: 'cache', id: item.id, reason: 'current-pdf-render-cache'});
    else actions.push({kind: 'cache', id: item.id, bytes: item.size_in_bytes, name: item.key});
  }
  return {version: 1, policy: 'current-only-v1', actions: actions.sort((a, b) => b.bytes - a.bytes), retained,
    summary: {release_assets: actions.filter(a => a.kind === 'release-asset').length,
      artifacts: actions.filter(a => a.kind === 'artifact').length, caches: actions.filter(a => a.kind === 'cache').length,
      candidate_bytes: actions.reduce((sum, a) => sum + a.bytes, 0)}};
}

export async function applyGithubCleanup(plan, {api = storageRequest, guard, verify = verifyPublic, quota = () => remaining,
  maxDeletes = 800, journal = async () => {}}) {
  if (plan?.version !== 1 || plan.policy !== 'current-only-v1' || !Array.isArray(plan.actions) || !Array.isArray(plan.retained) || typeof guard !== 'function' || !positive(maxDeletes)) throw new Error('Invalid GitHub cleanup plan');
  const seen = new Set();
  for (const action of plan.actions) {
    const id = `${action.kind}:${action.id}`;
    if (!['release-asset', 'artifact', 'cache'].includes(action.kind) || !positive(action.id) || seen.has(id) ||
        plan.retained.some(item => `${item.kind}:${item.id}` === id) ||
        (action.kind === 'release-asset' && !action.replica && !retiredAssetIds.has(action.id))) throw new Error('Invalid GitHub deletion identity');
    seen.add(id); if (action.replica) validateObject(action.replica);
  }
  const batch = plan.actions.slice(0, Math.min(maxDeletes, Math.max(0, quota() - 120))), replicas = [...new Map(batch.filter(action => action.replica).map(action => [action.replica.key, action.replica])).values()];
  // Full-byte verification is mandatory before deleting the first GitHub copy.
  let cursor = 0;
  const checks = await Promise.allSettled(Array.from({length: Math.min(3, replicas.length)}, async () => {
    while (cursor < replicas.length) await verify(replicas[cursor++]);
  }));
  const failed = checks.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
  const result = {version: 1, deleted: [], already_absent: [], remaining: plan.actions.length, complete: false}; await journal(result);
  for (const action of batch) {
    if (quota() <= 100) break; // Leave room for reports; the next maintenance run resumes from a fresh inventory.
    await guard();
    const prefix = {artifact: 'actions/artifacts', cache: 'actions/caches', 'release-asset': 'releases/assets'}[action.kind];
    let response;
    try { response = await api(`/${prefix}/${action.id}`, {method: 'DELETE'}); }
    catch (error) { result.failure = {kind: action.kind, id: action.id, http_status: error.status || null}; await journal(result); throw new Error(`GitHub cleanup stopped (HTTP ${result.failure.http_status || 'unknown'})`); }
    (response.already_absent ? result.already_absent : result.deleted).push({kind: action.kind, id: action.id, bytes: action.bytes});
    result.remaining--; await journal(result);
  }
  result.complete = result.remaining === 0; await journal(result); return result;
}

async function main() {
  if (process.argv.slice(2).join(' ') !== '--apply' || process.env.GITHUB_REF !== 'refs/heads/master' ||
      !['schedule', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME) || process.env.GITHUB_STORAGE_AFTER_AUDIT !== 'true') throw new Error('GitHub cleanup requires the trusted master maintenance job');
  const references = await currentReferences({root: process.cwd(), readBlob: rawReferenceBlob});
  if (references.master_sha !== process.env.GITHUB_SHA) throw new Error('Maintenance job no longer matches master');
  const live = await currentPublication({pages: false}), expected = referenceIdentity(references);
  const guard = async () => {
    if (referenceIdentity(await guardedHeads()) !== expected || (await currentPublication({pages: false})).digest !== live.digest) throw new Error('References changed; GitHub cleanup stopped');
  };
  await guard();
  const plan = githubCleanupPlan(await githubInventory(), references, {master: references.master_sha, runId: Number(process.env.GITHUB_RUN_ID)});
  const output = resolve('test-results/media-cleanup'); await mkdir(output, {recursive: true});
  await writeFile(resolve(output, 'github-plan.json'), JSON.stringify(plan, null, 2) + '\n');
  const result = await applyGithubCleanup(plan, {guard, journal: value => writeFile(resolve(output, 'github-retirement.json'), JSON.stringify(value, null, 2) + '\n')});
  console.log(JSON.stringify({deleted: result.deleted.length, remaining: result.remaining, complete: result.complete}));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {console.error(error.message); process.exitCode = 1;});
