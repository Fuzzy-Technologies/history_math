import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {basename, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArticle} from './article-frontmatter.mjs';
import {articleUrl} from './article-url.mjs';
import {deployedRevision} from './publication-plan.mjs';
import {mediaObject, sha256, storage, validateObject} from './s3-media.mjs';

export const stateDirectory = 'test-results/publication-state';
const repository = 'Fuzzy-Technologies/history_math';
const legacyRevision = '7ff781883ce60770e4f1b70267971864445439a2';
const legacyRun = '45524482515';
const sha = /^[a-f0-9]{40}$/;
const receiptUrl = 'https://history-math.org/assets/publication-media.json';

export function previewReceipt(key, bytes) {
  const [kind, hash, filename] = String(key).split('/');
  const object = mediaObject(kind, filename, hash, bytes);
  if (kind !== 'previews' || object.key !== key) throw new Error('Invalid published preview key');
  return {...object, verified: true};
}

export function publicationIndex(objects) {
  const index = new Map();
  for (const proof of objects) {
    const object = validateObject(proof);
    if (proof.verified !== true || index.has(object.key)) throw new Error('Invalid or duplicate publication receipt');
    index.set(object.key, {...object, verified: true});
  }
  return index;
}

export function legacyPreviews(inventory) {
  if (inventory.version !== 1 || inventory.complete !== true || inventory.bucket !== storage.bucket ||
      inventory.endpoint !== storage.endpoint) throw new Error('Invalid cutover inventory');
  const previews = inventory.objects.filter(object => object.key.startsWith('previews/'));
  // These are the distinct objects publicly verified by the deployed run #677.
  if (previews.length !== 2545 || previews.reduce((sum, object) => sum + object.bytes, 0) !== 539349046) {
    throw new Error('Incomplete cutover preview receipt');
  }
  return previews.map(({key, bytes}) => [key, bytes]);
}

export function receiptDigest(objects, previews) {
  return sha256(JSON.stringify([objects.map(({key, bytes}) => [key, bytes]), previews]));
}

export function restoreState(manifest, revision, legacyInventory) {
  if (!sha.test(revision) || manifest.version !== 1 || !Array.isArray(manifest.objects) || !manifest.objects.length) {
    throw new Error('Missing published media receipt');
  }
  const incremental = manifest.incremental;
  let previews;
  if (incremental === undefined && revision === legacyRevision && manifest.objects.length === 2933) {
    previews = legacyPreviews(legacyInventory);
  } else {
    if (incremental?.version !== 1 || incremental.revision !== revision || !Array.isArray(incremental.previews)) {
      throw new Error('Pages receipt does not match the deployed revision');
    }
    previews = incremental.previews;
    if (incremental.digest !== receiptDigest(manifest.objects, previews)) throw new Error('Incomplete published media receipt');
  }
  const objects = [...manifest.objects, ...previews.map(([key, bytes]) => previewReceipt(key, bytes))];
  publicationIndex(objects);
  return {revision, objects};
}

export function editionChanges(root, revision, head) {
  if (!sha.test(revision) || !sha.test(head)) throw new Error('Missing publication revision');
  const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
  git(['merge-base', '--is-ancestor', revision, head]);
  const paths = git(['diff', '--name-only', '--no-renames', '-z', revision, head, '--', 'site']).split('\0').filter(Boolean);
  const articles = new Set(), images = new Set();
  for (const path of paths) {
    if (path.startsWith('site/_articles/') && path.endsWith('.md') && existsSync(resolve(root, path))) {
      const {data} = parseArticle(readFileSync(resolve(root, path), 'utf8'));
      articles.add(articleUrl(data.permalink, data.lang));
    } else if (path.startsWith('site/assets/images/')) {
      images.add(path.slice('site'.length));
    } else if (/^site\/_data\/(?:article_image_assets\/[^/]+|image_assets|image_publication)\.json$/.test(path)) {
      const before = git(['ls-tree', revision, '--', path]) ? JSON.parse(git(['show', revision + ':' + path])) : {};
      const after = existsSync(resolve(root, path)) ? JSON.parse(readFileSync(resolve(root, path), 'utf8')) : {};
      const entries = data => path.endsWith('/image_publication.json') ? (data.replacements || {}) : data;
      const old = entries(before), current = entries(after);
      for (const name of new Set([...Object.keys(old), ...Object.keys(current)])) {
        if (JSON.stringify(old[name]) !== JSON.stringify(current[name])) images.add(name);
      }
    }
  }
  return {articles: [...articles], images: [...images]};
}

export function publishedPdfs(previous) {
  const pdfs = new Map();
  for (const object of previous.objects) if (object.key.startsWith('pdf/')) {
    if (pdfs.has(object.filename)) throw new Error('Ambiguous published PDF name');
    pdfs.set(object.filename, object);
  }
  return pdfs;
}

export function reusablePdf(article, html, pdfs, changedArticles, changedImages) {
  const proof = pdfs.get(basename(article.pdf_url));
  if (!proof || changedArticles.has(article.url)) return undefined;
  for (const match of html.matchAll(/\/assets\/images\/[a-zA-Z0-9._/-]+/g)) {
    if (changedImages.has(match[0])) return undefined;
  }
  return proof;
}

export async function previousPublication() {
  return JSON.parse(await readFile(resolve(stateDirectory, 'previous.json'), 'utf8'));
}

async function restore() {
  const revision = await deployedRevision(repository, process.env.GH_TOKEN);
  if (!revision) throw new Error('Cannot identify the last successful Pages deployment; no storage requests made');
  await mkdir(stateDirectory, {recursive: true});
  const response = await fetch(receiptUrl + '?revision=' + revision, {redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error('Cannot restore published media receipt: HTTP ' + response.status);
  const manifest = await response.json();
  let inventory;
  if (manifest.incremental === undefined && revision === legacyRevision) {
    const directory = resolve(stateDirectory, 'cutover');
    execFileSync('gh', ['run', 'download', legacyRun, '--repo', repository, '--name',
      'bucket-budget-' + legacyRevision + '-' + legacyRun, '--dir', directory], {stdio: 'inherit'});
    inventory = JSON.parse(await readFile(resolve(directory, 'receipt.json'), 'utf8'));
  }
  const previous = restoreState(manifest, revision, inventory);
  previous.changes = editionChanges(process.cwd(), revision, process.env.GITHUB_SHA);
  await writeFile(resolve(stateDirectory, 'previous.json'), JSON.stringify(previous));
  console.log('Restored %d media identities from deployed revision %s', previous.objects.length, revision);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await restore();
