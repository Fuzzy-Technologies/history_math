import {readFile} from 'node:fs/promises';
import {resolve, basename} from 'node:path';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {githubData} from './backfill-media.mjs';
import {storage, validateObject, mediaObject, responseBytes, sha256, readWithRetries} from './s3-media.mjs';
import {imageObjects, uniqueObjects} from './publication-media.mjs';
import {publicationReplacements} from './image-publication.mjs';

const repository = 'Fuzzy-Technologies/history_math';
const origin = 'https://history-math.org';
const revisionPattern = /^[a-f0-9]{40}$/;
const binary = /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|eot|zip|gz|7z|mp[34]|avi|mov)$/i;
const keyExpression = /\b(?:pdf|originals)\/[a-f0-9]{64}\/[a-z0-9][a-z0-9._-]*\.(?:pdf|png|jpe?g|webp|gif|svg)\b/gi;

export function sourceMediaReferences(text) {
  if (typeof text !== 'string') throw new Error('Missing source reference text');
  const normalized = text.replaceAll('\\/', '/').replace(/\\([_-])/g, '$1');
  const keys = [...new Set(normalized.match(keyExpression) || [])];
  // Stable aliases are resolved to current objects by the cleanup planner.
  const names = [...new Set([...normalized.matchAll(/\/assets\/pdf\/(?:en|ru)\/([a-z0-9][a-z0-9._-]*\.pdf)\b/g)].map(match => match[1]))], versions = [];
  for (const match of normalized.matchAll(/https?:\/\/storage\.yandexcloud\.kz\/history-math-media-kz\/(?:pdf|originals)\/[^\s"'<>\])}]+/g)) {
    let url;
    try {
      url = new URL(match[0].replaceAll('&amp;', '&'));
      const key = decodeURIComponent(url.pathname.slice('/history-math-media-kz/'.length));
      if (/^(?:pdf|originals)\/[a-f0-9]{64}\/[a-z0-9][a-z0-9._-]*\.(?:pdf|png|jpe?g|webp|gif|svg)$/i.test(key) && !key.includes('..')) {
        keys.push(key);
        if (url.searchParams.has('versionId')) versions.push({key, version_id: url.searchParams.get('versionId')});
      }
    } catch { /* Code, tests and documentation may contain non-URL templates. */ }
  }
  return {keys: [...new Set(keys)], names, versions};
}

async function pages(api, path) {
  const records = [];
  for (let page = 1; page <= 100; page++) {
    const data = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(data)) throw new Error('Invalid reference pagination');
    records.push(...data);
    if (data.length < 100) return records;
  }
  throw new Error('Incomplete reference pagination');
}

export async function referenceHeads(api = githubData) {
  const master = await api('/branches/master');
  const masterSha = master.commit?.sha;
  if (!revisionPattern.test(masterSha || '')) throw new Error('Unavailable master reference');
  const pulls = await pages(api, '/pulls?state=open&sort=created&direction=asc');
  const seen = new Set();
  for (const pr of pulls) {
    if (pr.state !== 'open' || pr.head?.repo?.full_name !== repository || !revisionPattern.test(pr.head.sha || '') ||
        !Number.isSafeInteger(pr.number) || pr.number < 1 || seen.has(pr.number) || typeof (pr.body ?? '') !== 'string') {
      throw new Error('An open PR cannot be fully inventoried; cleanup is blocked');
    }
    seen.add(pr.number);
  }
  return {master_sha: masterSha, pulls: pulls.map(pr => ({number: pr.number, sha: pr.head.sha,
    body: pr.body || '', body_sha256: sha256(Buffer.from(pr.body || ''))})).sort((a, b) => a.number - b.number)};
}

export function referenceIdentity(snapshot) {
  return JSON.stringify({master_sha: snapshot.master_sha,
    pulls: snapshot.pulls.map(pr => [pr.number, pr.sha, pr.body_sha256]).sort((a, b) => a[0] - b[0])});
}

export async function currentReferences({api = githubData, root, localRead = readFile, replacements = root ? publicationReplacements(root) : {}, readBlob} = {}) {
  const heads = await referenceHeads(api), keys = new Set(), names = new Set(), cache = new Map(), objects = [], migrations = [], versions = [], releaseUrls = new Set();
  const add = (text, aliases = true) => {
    const found = sourceMediaReferences(text);
    for (const key of found.keys) keys.add(key);
    if (aliases) for (const name of found.names) names.add(name);
    versions.push(...found.versions);
    if (aliases) for (const match of text.matchAll(/https:\/\/github\.com\/Fuzzy-Technologies\/history_math\/releases\/download\/article-originals-[a-f0-9]\/[^\s"'<>\])}]+/g)) { const url = new URL(match[0]); releaseUrls.add(url.origin + url.pathname); }
  };
  for (const pr of heads.pulls) add(pr.body);
  for (const revision of [...new Set([heads.master_sha, ...heads.pulls.map(pr => pr.sha)])]) {
    const changed = new Set();
    if (revision !== heads.master_sha) for (const pr of heads.pulls.filter(pr => pr.sha === revision)) {
      const files = await pages(api, `/pulls/${pr.number}/files`);
      if (files.length >= 3000) throw new Error('Incomplete PR changed-file inventory');
      for (const file of files) if (file.status !== 'removed') changed.add(file.filename);
    }
    const tree = await api(`/git/trees/${revision}?recursive=1`);
    if (tree.truncated !== false || !Array.isArray(tree.tree) || !tree.tree.length) throw new Error('Incomplete source reference tree');
    if (tree.tree.some(item => item.type === 'commit')) throw new Error('Submodule references require explicit review');
    for (const item of tree.tree.filter(item => item.type === 'blob' && !binary.test(item.path) &&
      (revision === heads.master_sha || changed.has(item.path)))) {
      if (typeof item.path !== 'string' || item.path.startsWith('/') || item.path.split('/').includes('..') ||
          !revisionPattern.test(item.sha || '') || !['100644', '100755'].includes(item.mode) ||
          !Number.isSafeInteger(item.size) || item.size < 0 || item.size > (/\.(?:pdf|svg)$/i.test(item.path) ? 15_000_000 : 2_000_000)) {
        throw new Error('Unsafe, oversized or unavailable source reference blob');
      }
      let bytes = cache.get(item.sha);
      const blobHash = value => createHash('sha1').update(Buffer.from(`blob ${value.length}\0`)).update(value).digest('hex');
      if (!bytes && root && revision === heads.master_sha) {
        // Only seed the cache with bytes whose Git identity matches the pinned
        // master tree. PR content is read as bounded data, never executed.
        try {
          const candidate = await localRead(resolve(root, item.path));
          if (candidate.length === item.size && blobHash(candidate) === item.sha) bytes = candidate;
        } catch { /* Missing sparse files are obtained through the fixed API. */ }
      }
      if (!bytes) {
        const blob = readBlob ? await readBlob(revision, item) : await api(`/git/blobs/${item.sha}`);
        if (blob.encoding !== 'base64' || typeof blob.content !== 'string' || blob.size !== item.size) throw new Error('Unavailable source reference bytes');
        bytes = Buffer.from(blob.content, 'base64');
        if (bytes.length !== item.size || blobHash(bytes) !== item.sha) throw new Error('Changed source reference blob');
      }
      cache.set(item.sha, bytes);
      if (/\.pdf$/i.test(item.path)) {
        if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Tracked PDF signature mismatch');
        const object = {...mediaObject('pdf', basename(item.path), sha256(bytes), bytes.length), source: {revision, path: item.path}};
        keys.add(object.key); objects.push(object);
      } else {
        const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
        const imageManifest = item.path === 'site/_data/image_assets.json' || /^site\/_data\/article_image_assets\/[^/]+\.json$/.test(item.path);
        add(text, item.path.startsWith('site/') && !imageManifest && item.path !== 'site/_data/image_publication.json');
        if (item.path === 'site/_data/image_assets.json' || /^site\/_data\/article_image_assets\/[^/]+\.json$/.test(item.path)) {
          const inventory = JSON.parse(text);
          if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) throw new Error('Invalid current image inventory');
          for (const image of imageObjects(inventory, path => ({revision, path: 'site' + path}), replacements, root || '.')) {
            keys.add(image.object.key); objects.push(image.object);
            if (inventory[image.path].external_original) migrations.push({external: inventory[image.path].external_original,
              source_path: image.path, object: image.object});
          }
        }
      }
    }
  }
  const after = await referenceHeads(api);
  if (referenceIdentity(heads) !== referenceIdentity(after)) throw new Error('Master or open PR references changed during collection');
  return {master_sha: heads.master_sha, pulls: heads.pulls.map(({body, ...pr}) => pr), keys: [...keys], names: [...names],
    objects: uniqueObjects(objects), migrations, versions, releaseUrls: [...releaseUrls]};
}

// Fixed public repository, pinned commit and Git-verified bytes; no PR code runs.
export async function rawReferenceBlob(revision, item, request = fetch, retryOptions) {
  if (!revisionPattern.test(revision) || item.path.startsWith('/') || item.path.split('/').includes('..')) throw new Error('Unsafe raw source path');
  const url = `https://raw.githubusercontent.com/${repository}/${revision}/${item.path.split('/').map(encodeURIComponent).join('/')}`;
  return readWithRetries(`source ${revision}/${item.path}`, async () => {
    const response = await request(url, {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(60_000)});
    const bytes = await responseBytes(response, item.size);
    return {encoding: 'base64', content: bytes.toString('base64'), size: bytes.length};
  }, retryOptions);
}

// GraphQL has a separate point budget: checking references before every S3
// deletion must not exhaust the REST quota used to inventory source trees.
export async function guardedHeads({request = fetch, token = process.env.GITHUB_TOKEN, retryOptions} = {}) {
  if (!token) throw new Error('A read token is required for reference guards');
  const query = `query($cursor:String){repository(owner:"Fuzzy-Technologies",name:"history_math"){
    ref(qualifiedName:"refs/heads/master"){target{oid}}
    pullRequests(states:OPEN,first:100,after:$cursor){nodes{number body state headRefOid headRepository{nameWithOwner}}
    pageInfo{hasNextPage endCursor}}}}`;
  const pulls = [], cursors = new Set(); let cursor = null, master;
  for (let page = 0; page < 100; page++) {
    const result = await readWithRetries('GitHub reference guard', async () => {
      const response = await request('https://api.github.com/graphql', {method: 'POST', redirect: 'error',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, body: JSON.stringify({query, variables: {cursor}}), signal: AbortSignal.timeout(60_000)});
      if (!response.ok) await responseBytes(response, 0);
      return response.json();
    }, retryOptions), repo = result.data?.repository;
    if (result.errors?.length || !revisionPattern.test(repo?.ref?.target?.oid || '') ||
        !Array.isArray(repo.pullRequests?.nodes) || typeof repo.pullRequests?.pageInfo?.hasNextPage !== 'boolean') throw new Error('Incomplete reference guard');
    if (master && master !== repo.ref.target.oid) throw new Error('Master changed during reference guard');
    master = repo.ref.target.oid;
    for (const pr of repo.pullRequests.nodes) {
      if (pr.state !== 'OPEN' || pr.headRepository?.nameWithOwner !== repository || !revisionPattern.test(pr.headRefOid || '') ||
          !Number.isSafeInteger(pr.number) || pr.number < 1 || typeof pr.body !== 'string' || pulls.some(old => old.number === pr.number)) throw new Error('Unsafe open PR reference guard');
      pulls.push({number: pr.number, sha: pr.headRefOid, body_sha256: sha256(Buffer.from(pr.body))});
    }
    if (!repo.pullRequests.pageInfo.hasNextPage) return {master_sha: master, pulls};
    cursor = repo.pullRequests.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor)) throw new Error('Reference guard pagination did not advance');
    cursors.add(cursor);
  }
  throw new Error('Incomplete reference guard pagination');
}

async function publicJson(path, request, retryOptions) {
  return readWithRetries(`publication ${path}`, async () => {
    const response = await request(origin + path, {redirect: 'error', cache: 'no-store',
      headers: {'Cache-Control': 'no-cache'}, signal: AbortSignal.timeout(60_000)});
    if (response.status !== 200) {
      try { await response.body?.cancel(); } catch { /* Preserve the HTTP failure. */ }
      throw Object.assign(new Error('Unavailable publication manifest'), {status: response.status});
    }
    const bytes = await responseBytes(response, 10_000_000);
    return {data: JSON.parse(bytes.toString('utf8')), digest: sha256(bytes)};
  }, retryOptions);
}

export async function currentPublication({request = fetch, pages: checkPages = true, retryOptions} = {}) {
  const media = await publicJson('/assets/publication-media.json', request, retryOptions);
  const pdfs = await publicJson('/assets/article-pdfs.json', request, retryOptions);
  if (media.data.version !== 1 || !Array.isArray(media.data.objects) || pdfs.data.version !== 2 ||
      pdfs.data.origin !== origin || pdfs.data.baseurl !== '' || !Array.isArray(pdfs.data.articles) || !pdfs.data.articles.length) {
    throw new Error('Invalid current publication manifests');
  }
  const all = media.data.objects.map(object => {
    validateObject(object);
    if (object.verified !== true) throw new Error('Unverified current media identity');
    return object;
  });
  if (new Set(all.map(object => object.key)).size !== all.length) throw new Error('Duplicate current media object');
  const objects = all.filter(object => object.key.startsWith('pdf/'));
  const byUrl = new Map(objects.map(object => [object.url, object]));
  const used = new Set(), protectedKeys = new Set(objects.map(object => object.key));
  let cursor = 0;
  async function worker() {
    while (cursor < pdfs.data.articles.length) {
      const article = pdfs.data.articles[cursor++];
      if (!['en', 'ru'].includes(article.lang) || typeof article.url !== 'string' ||
          !/^\/(?:ru\/)?publications\/[a-z0-9-]+\/$/.test(article.url) || !byUrl.has(article.pdf_url) || used.has(article.pdf_url)) {
        throw new Error('Unclassified or duplicate published PDF link');
      }
      used.add(article.pdf_url);
      if (!checkPages) continue;
      const text = await readWithRetries(`published article ${article.url}`, async () => {
        const response = await request(origin + article.url, {redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60_000)});
        if (response.status !== 200) {
          try { await response.body?.cancel(); } catch { /* Preserve the HTTP failure. */ }
          throw Object.assign(new Error('Published article is unavailable'), {status: response.status});
        }
        return (await responseBytes(response, 5_000_000)).toString('utf8');
      }, retryOptions);
      const found = sourceMediaReferences(text);
      if (!found.keys.includes(byUrl.get(article.pdf_url).key)) throw new Error('Article PDF link disagrees with publication manifest');
      for (const key of found.keys) protectedKeys.add(key);
      // Reading previews stay on Pages; full-view/download originals must use
      // the configured S3 bucket and a verified receipt identity.
      const expected = new Map(all.map(object => [object.url, object]));
      for (const match of text.matchAll(/\bdata-original="([^"]+)"/g)) {
        if (!match[1].startsWith(storage.base + '/originals/') || !expected.has(match[1])) throw new Error('Published original link disagrees with S3 receipt');
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(4, pdfs.data.articles.length)}, worker));
  if (used.size !== objects.length) throw new Error('Publication PDF coverage mismatch');
  return {objects: all, pdfObjects: objects, protectedKeys: [...new Set([...protectedKeys, ...all.map(object => object.key)])], digest: sha256(Buffer.from(media.digest + pdfs.digest))};
}
