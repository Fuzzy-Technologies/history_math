import {readFile} from 'node:fs/promises';
import {resolve, basename} from 'node:path';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {githubData} from './backfill-media.mjs';
import {storage, validateObject, mediaObject, responseBytes, sha256} from './s3-media.mjs';

const repository = 'Fuzzy-Technologies/history_math';
const origin = 'https://history-math.org';
const revisionPattern = /^[a-f0-9]{40}$/;
const binary = /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|eot|zip|gz|7z|mp[34]|avi|mov)$/i;
const keyExpression = /\bpdf\/[a-f0-9]{64}\/[a-z0-9][a-z0-9._-]*\.pdf\b/g;

export function sourcePdfReferences(text) {
  if (typeof text !== 'string') throw new Error('Missing source reference text');
  const normalized = text.replaceAll('\\/', '/').replace(/\\([_-])/g, '$1');
  const keys = [...new Set(normalized.match(keyExpression) || [])];
  // Stable local PDF aliases do not identify a historical content hash.
  // Conservatively pin all versions of that filename.
  const names = [...new Set([...normalized.matchAll(/\/assets\/pdf\/(?:en|ru)\/([a-z0-9][a-z0-9._-]*\.pdf)\b/g)].map(match => match[1]))];
  for (const match of normalized.matchAll(/https?:\/\/storage\.yandexcloud\.kz\/history-math-media-kz\/pdf\/[^\s"'<>\])}]+/g)) {
    let url;
    try {
      url = new URL(match[0].replaceAll('&amp;', '&'));
      const key = decodeURIComponent(url.pathname.slice('/history-math-media-kz/'.length));
      if (/^pdf\/[a-f0-9]{64}\/[a-z0-9][a-z0-9._-]*\.pdf$/.test(key) && !key.includes('..')) keys.push(key);
    } catch { /* Code, tests and documentation may contain non-URL templates. */ }
  }
  return {keys: [...new Set(keys)], names};
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
      throw new Error('An open PR cannot be fully inventoried; retention is blocked');
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

export async function retentionReferences({api = githubData, root, localRead = readFile} = {}) {
  const heads = await referenceHeads(api), keys = new Set(), names = new Set(), cache = new Map();
  const add = text => {
    const found = sourcePdfReferences(text);
    for (const key of found.keys) keys.add(key);
    for (const name of found.names) names.add(name);
  };
  for (const pr of heads.pulls) add(pr.body);
  for (const revision of [...new Set([heads.master_sha, ...heads.pulls.map(pr => pr.sha)])]) {
    const tree = await api(`/git/trees/${revision}?recursive=1`);
    if (tree.truncated !== false || !Array.isArray(tree.tree) || !tree.tree.length) throw new Error('Incomplete source reference tree');
    if (tree.tree.some(item => item.type === 'commit')) throw new Error('Submodule references require explicit review');
    for (const item of tree.tree.filter(item => item.type === 'blob' && !binary.test(item.path))) {
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
        const blob = await api(`/git/blobs/${item.sha}`);
        if (blob.encoding !== 'base64' || typeof blob.content !== 'string' || blob.size !== item.size) throw new Error('Unavailable source reference bytes');
        bytes = Buffer.from(blob.content, 'base64');
        if (bytes.length !== item.size || blobHash(bytes) !== item.sha) throw new Error('Changed source reference blob');
      }
      cache.set(item.sha, bytes);
      if (/\.pdf$/i.test(item.path)) {
        if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Tracked PDF signature mismatch');
        keys.add(mediaObject('pdf', basename(item.path), sha256(bytes), bytes.length).key);
      } else add(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    }
  }
  const after = await referenceHeads(api);
  if (referenceIdentity(heads) !== referenceIdentity(after)) throw new Error('Master or open PR references changed during collection');
  return {master_sha: heads.master_sha, pulls: heads.pulls.map(({body, ...pr}) => pr), keys: [...keys], names: [...names]};
}

async function publicJson(path, request) {
  const response = await request(origin + path, {redirect: 'error', cache: 'no-store',
    headers: {'Cache-Control': 'no-cache'}, signal: AbortSignal.timeout(60_000)});
  if (response.status !== 200) throw new Error('Unavailable public publication manifest');
  const bytes = await responseBytes(response, 10_000_000);
  return {data: JSON.parse(bytes.toString('utf8')), digest: sha256(bytes)};
}

export async function liveRetentionReferences({request = fetch, pages: checkPages = true} = {}) {
  const media = await publicJson('/assets/publication-media.json', request);
  const pdfs = await publicJson('/assets/article-pdfs.json', request);
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
      const response = await request(origin + article.url, {redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60_000)});
      if (response.status !== 200) throw new Error('Published article is unavailable');
      const text = (await responseBytes(response, 5_000_000)).toString('utf8');
      const found = sourcePdfReferences(text);
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
  return {objects, protectedKeys: [...protectedKeys], digest: sha256(Buffer.from(media.digest + pdfs.digest))};
}
