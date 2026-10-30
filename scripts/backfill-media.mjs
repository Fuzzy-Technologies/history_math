import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname, basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {imageInventory} from './external-originals.mjs';
import {imageObjects, uniqueObjects, sourceBytes, localBytes} from './publication-media.mjs';
import {mediaObject, assertBytes, sha256, configuredClient, responseBytes, transfer, readWithRetries} from './s3-media.mjs';
import {publicationReplacements} from './image-publication.mjs';

const repository = 'Fuzzy-Technologies/history_math';
const apiRoot = `https://api.github.com/repos/${repository}`;
const revisionPattern = /^[a-f0-9]{40}$/;
const sourcePdfLimit = 512 * 1024 * 1024;

export async function githubData(path, {request = fetch, token = process.env.GITHUB_TOKEN} = {}) {
  if (!path.startsWith('/') || path.includes('..')) throw new Error('Invalid GitHub API path');
  const response = await request(apiRoot + path, {redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: {Accept: 'application/vnd.github+json', ...(token ? {Authorization: `Bearer ${token}`} : {})}});
  if (!response.ok) throw new Error(`GitHub data request failed: HTTP ${response.status}`);
  return response.json();
}

async function pages(api, path) {
  const records = [];
  for (let page = 1; ; page++) {
    const result = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(result)) throw new Error('Invalid paginated GitHub response');
    records.push(...result);
    if (result.length < 100) return records;
    if (page >= 100) throw new Error('Incomplete GitHub pagination');
  }
}

export function eligiblePR(pr) {
  return pr.state === 'open' && pr.base?.ref === 'master' &&
    pr.head?.repo?.full_name === repository && /^feature\/article-/.test(pr.head.ref) && revisionPattern.test(pr.head.sha);
}

export async function pullRequestObjects(api = githubData, request = fetch, replacements = {}, root = '.') {
  const pulls = (await pages(api, '/pulls?state=open&sort=created&direction=asc')).filter(eligiblePR), objects = [], evidence = [];
  for (const pr of pulls) {
    const revision = pr.head.sha, tree = await api(`/git/trees/${revision}?recursive=1`);
    if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Incomplete pull request media tree');
    const changed = await pages(api, `/pulls/${pr.number}/files`);
    if (changed.length >= 3000) throw new Error('Pull request file list may be incomplete');
    const manifests = changed.filter(file => file.status !== 'removed' &&
      /^site\/_data\/article_image_assets\/[a-z0-9-]+\.json$/.test(file.filename));
    for (const file of manifests) {
      const content = await api(`/contents/${file.filename}?ref=${revision}`);
      if (content.encoding !== 'base64' || !content.content) throw new Error('Unavailable pull request media manifest');
      const inventory = JSON.parse(Buffer.from(content.content, 'base64').toString('utf8'));
      objects.push(...imageObjects(inventory, path => ({revision, path: 'site' + path}), replacements, root).map(image => image.object));
    }
    let pdfs = 0;
    for (const file of tree.tree.filter(file => file.type === 'blob' && /\.pdf$/i.test(file.path))) {
      if (!/^site\/[a-z0-9._/-]+\.pdf$/i.test(file.path) || file.path.includes('..')) throw new Error('Unsafe pull request PDF path');
      const bytes = await revisionBytes(revision, file.path, request);
      const object = {...mediaObject('pdf', basename(file.path), sha256(bytes), bytes.length), source: {revision, path: file.path}};
      assertBytes(object, bytes); objects.push(object); pdfs++;
    }
    // Re-read the live head after collecting data; publication status is never
    // changed, and unreviewed PR code is never checked out or executed.
    const current = await api(`/pulls/${pr.number}`);
    if (!eligiblePR(current) || current.head.sha !== revision) throw new Error(`Pull request #${pr.number} changed during inventory`);
    evidence.push({number: pr.number, sha: revision, image_manifests: manifests.length, pdfs});
  }
  const final = (await pages(api, '/pulls?state=open&sort=created&direction=asc')).filter(eligiblePR);
  const identity = values => values.map(pr => `${pr.number}:${pr.head.sha}`).sort().join('\n');
  if (identity(final) !== identity(pulls)) throw new Error('Open article pull request inventory changed');
  return {objects, pulls: evidence};
}

export async function revisionBytes(revision, path, request = fetch, limit = sourcePdfLimit) {
  if (!revisionPattern.test(revision) || !/^site\/assets\/[a-z0-9._/-]+$/i.test(path) || path.includes('..')) throw new Error('Unsafe revision media source');
  return readWithRetries(`${revision}/${basename(path)}`, async () => responseBytes(await request(`https://raw.githubusercontent.com/${repository}/${revision}/${path}`,
    {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(120_000)}), limit));
}

export async function deployedPdfObjects(origin, baseurl, request = fetch, {legacyOnly = false} = {}) {
  if (!['https://history-math.org', 'https://fuzzy-technologies.github.io'].includes(origin) ||
      !['', '/history_math'].includes(baseurl)) throw new Error('Untrusted publication origin');
  const manifest = await readWithRetries('published PDF manifest', async () => {
    const response = await request(origin + baseurl + '/assets/article-pdfs.json',
      {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(120_000)});
    if (!response.ok) await responseBytes(response, 0);
    return response.json();
  });
  if (manifest.version !== 2 || !Array.isArray(manifest.articles) || !manifest.articles.length || manifest.origin !== origin || manifest.baseurl !== baseurl) {
    throw new Error('Invalid current publication PDF manifest');
  }
  const objects = [];
  for (const article of manifest.articles) {
    const migrated = /^https:\/\/storage\.yandexcloud\.kz\/history-math-media-kz\/pdf\/([a-f0-9]{64})\/([a-z0-9-]+\.pdf)$/.exec(article.pdf_url);
    if (!migrated && !/^\/assets\/pdf\/(en|ru)\/[a-z0-9-]+\.pdf$/.test(article.pdf_url)) throw new Error('Unsafe deployed PDF URL');
    if (migrated && legacyOnly) continue;
    const url = migrated ? article.pdf_url : origin + baseurl + article.pdf_url;
    objects.push(await readWithRetries(basename(article.pdf_url), async () => {
      const response = await request(url, {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(120_000)});
      if (!response.ok) await responseBytes(response, sourcePdfLimit);
      if (response.headers.get('content-type')?.split(';')[0] !== 'application/pdf') throw new Error('Deployed PDF is not a PDF');
      const bytes = await responseBytes(response, sourcePdfLimit);
      const object = {...mediaObject('pdf', basename(article.pdf_url), sha256(bytes), bytes.length), source: {deployed_url: url}};
      if (migrated && object.url !== url) throw new Error('Changed migrated PDF identity');
      assertBytes(object, bytes); return object;
    }));
  }
  return objects;
}

export async function copyPublishedPdfs({origin, baseurl, client, request = fetch, progress} = {}) {
  const objects = uniqueObjects(await deployedPdfObjects(origin, baseurl, request, {legacyOnly: true}));
  const receipt = await transfer(objects, client, object => readWithRetries(object.key, async () => {
    const bytes = await responseBytes(await request(object.source.deployed_url,
      {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(120_000)}), object.bytes);
    assertBytes(object, bytes); return bytes;
  }), {request, progress});
  return {version: 1, objects: receipt, summary: {existing_pdfs: objects.length,
    bytes: objects.reduce((sum, object) => sum + object.bytes, 0), deleted: 0}};
}

// Upload-only migration runs before expensive rendering. A deployed S3 PDF
// manifest makes this a cheap no-op on subsequent publications.
export async function preflightMedia({root, origin, baseurl, client, request = fetch, progress} = {}) {
  const copied = await copyPublishedPdfs({origin, baseurl, client, request, progress});
  if (!copied.summary.existing_pdfs) return copied;
  const images = imageObjects(imageInventory(root), path => ({file: resolve(root, 'site', '.' + path)}), publicationReplacements(root), root);
  for (const image of images.filter(image => !image.external_url)) assertBytes(image.original_object, await localBytes(resolve(root, 'site'), image.path));
  const originals = await transfer(uniqueObjects(images.map(image => image.object)), client,
    object => sourceBytes(object, request), {request, progress});
  return {version: 1, objects: [...copied.objects, ...originals], summary: {...copied.summary,
    originals: originals.length, bytes: copied.summary.bytes + originals.reduce((sum, object) => sum + object.bytes, 0)}};
}

export async function backfill({root, origin, baseurl, includeOpenPRs, client, api = githubData, request = fetch, progress} = {}) {
  const replacements = publicationReplacements(root);
  const images = imageObjects(imageInventory(root), path => ({file: resolve(root, 'site', '.' + path)}), replacements, root);
  // Verify local master sources before the first upload, including symlink guards.
  for (const image of images.filter(image => !image.external_url)) assertBytes(image.original_object, await localBytes(resolve(root, 'site'), image.path));
  const deployed = await deployedPdfObjects(origin, baseurl, request);
  const pending = includeOpenPRs ? await pullRequestObjects(api, request, replacements, root) : {objects: [], pulls: []};
  const objects = uniqueObjects([...images.map(image => image.object), ...deployed, ...pending.objects]);
  const receipt = await transfer(objects, client, async object => {
    if (object.source.revision) {
      const bytes = await revisionBytes(object.source.revision, object.source.path, request, object.bytes);
      assertBytes(object, bytes); return bytes;
    }
    if (object.source.deployed_url) {
      return readWithRetries(object.key, async () => {
        const bytes = await responseBytes(await request(object.source.deployed_url,
          {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(120_000)}), object.bytes);
        assertBytes(object, bytes); return bytes;
      });
    }
    return sourceBytes(object, request);
  }, {request, progress});
  return {version: 1, source_commit: process.env.GITHUB_SHA, objects: receipt, pulls: pending.pulls,
    summary: {objects: receipt.length, bytes: objects.reduce((sum, object) => sum + object.bytes, 0),
      existing_pdfs: deployed.length, open_article_prs: pending.pulls.length, deleted: 0, changed_branches: 0}};
}

async function main() {
  const publishedOnly = process.argv.includes('--published-only');
  const preflight = process.argv.includes('--preflight');
  if (process.env.GITHUB_REF !== 'refs/heads/master' ||
      !(publishedOnly || preflight ? ['push', 'workflow_dispatch'] : ['workflow_dispatch']).includes(process.env.GITHUB_EVENT_NAME)) {
    throw new Error('Backfill runs only through trusted GitHub Actions on master');
  }
  const client = configuredClient(), output = resolve('test-results/media-backfill/receipt.json');
  try {
    const options = {root: process.cwd(), origin: process.env.PAGES_ORIGIN, baseurl: process.env.PAGES_BASE_PATH || '',
      includeOpenPRs: true, client, progress: (done, total) => { if (done % 25 === 0 || done === total) console.log(`Publicly verified ${done}/${total} objects`); }};
    const receipt = await (preflight ? preflightMedia(options) : publishedOnly ? copyPublishedPdfs(options) : backfill(options));
    await mkdir(dirname(output), {recursive: true});
    await writeFile(output, JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify(receipt.summary));
  } finally { client.destroy(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
