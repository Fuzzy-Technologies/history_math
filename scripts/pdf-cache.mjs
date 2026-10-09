import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, rename, readdir, rm} from 'node:fs/promises';
import {resolve, sep} from 'node:path';

export const digest = value => createHash('sha256').update(value).digest('hex');
export async function fileDigest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
const escape = value => value.replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// Explicit regions keep print input independent of menus, related articles and build timestamps.
export function printDocument(html, article, baseurl) {
  const region = name => {
    const start = `<!-- pdf:${name}:start -->`, end = `<!-- pdf:${name}:end -->`;
    const parts = html.split(start);
    if (parts.length !== 2 || parts[1].split(end).length !== 2) throw new Error(`Missing or duplicate PDF region: ${name}`);
    return parts[1].split(end)[0];
  };
  const styles = ['style.css', 'article-print.css', 'vendor/katex/katex.min.css'];
  const scripts = ['vendor/katex/katex.min.js', 'math.js'];
  return `<!doctype html><html lang="${article.lang}" data-theme="light"><head><meta charset="utf-8"><title>${escape(article.title)}</title>${styles.map(path => `<link rel="stylesheet" href="${baseurl}/assets/${path}">`).join('')}${scripts.map(path => `<script defer src="${baseurl}/assets/${path}"></script>`).join('')}</head><body><main id="main"><article class="reading-layout">${region('heading')}${region('notice')}<div class="article-spread"><div class="prose article-body">${region('body')}</div></div></article></main></body></html>`;
}

export function assetPath(root, baseurl, url, parent = `${baseurl}/`) {
  const parsed = new URL(url.replaceAll('&amp;', '&'), `http://pdf.local${parent}`);
  if (parsed.origin !== 'http://pdf.local' || !parsed.pathname.startsWith(baseurl + '/')) throw new Error(`Nonlocal PDF asset: ${url}`);
  const path = resolve(root, '.' + decodeURIComponent(parsed.pathname.slice(baseurl.length)));
  if (!path.startsWith(root + sep)) throw new Error(`Invalid PDF asset: ${url}`);
  return {path, url: parsed.pathname};
}

// Memoized per build: shared styles, fonts and images are read/hash-checked only once.
export function dependencyReader(root, baseurl) {
  const files = new Map();
  async function visit(url, parent, visiting = new Set()) {
    const asset = assetPath(root, baseurl, url, parent);
    if (visiting.has(asset.path)) return [];
    if (!files.has(asset.path)) files.set(asset.path, (async () => {
      const bytes = await readFile(asset.path);
      return {hash: digest(bytes), text: /\.(css|svg)$/.test(asset.path) ? bytes.toString('utf8') : ''};
    })());
    const file = await files.get(asset.path);
    const dependencies = [[asset.url, file.hash]];
    const next = new Set([...visiting, asset.path]);
    const refs = [...file.text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)|(?:href|src)=["']([^"']+)["']|@import\s+["']([^"']+)["']/g)];
    for (const match of refs) {
      const ref = match[1] ?? match[2] ?? match[3];
      if (!ref.startsWith('data:') && !ref.startsWith('#')) dependencies.push(...await visit(ref, asset.url, next));
    }
    return dependencies;
  }
  return async (html, parent) => {
    const entries = new Map();
    for (const tag of html.matchAll(/<(?:img|script|link|source|image|use)\b[^>]*>/gi)) {
      const ref = tag[0].match(/\s(?:src|href|xlink:href)=["']([^"']+)["']/)?.[1];
      if (ref && !ref.startsWith('data:') && !ref.startsWith('#')) for (const [url, hash] of await visit(ref, parent)) entries.set(url, hash);
    }
    return [...entries].sort(([a], [b]) => a.localeCompare(b));
  };
}

export function validPdf(bytes) { return bytes.length >= 1000 && bytes.subarray(0, 5).toString() === '%PDF-'; }
export async function readCachedPdf(directory, key) {
  try {
    const record = JSON.parse(await readFile(resolve(directory, `${key}.json`), 'utf8'));
    const bytes = await readFile(resolve(directory, `${key}.pdf`));
    return record.key === key && record.sha256 === digest(bytes) && validPdf(bytes) ? bytes : null;
  } catch { return null; }
}
export async function writeCachedPdf(directory, key, bytes) {
  await mkdir(directory, {recursive: true});
  for (const [suffix, content] of [['pdf', bytes], ['json', JSON.stringify({key, sha256: digest(bytes)})]]) {
    const target = resolve(directory, `${key}.${suffix}`), temp = `${target}.${process.pid}.tmp`;
    await writeFile(temp, content);
    await rename(temp, target);
  }
}

// Per-output namespace retains only the current generation, including on article withdrawal.
export async function pruneCache(directory, keys) {
  await mkdir(directory, {recursive: true});
  for (const name of await readdir(directory)) {
    const key = /^([a-f0-9]{64})\.(?:pdf|json)$/.exec(name)?.[1];
    if (key && !keys.has(key)) await rm(resolve(directory, name));
  }
}
