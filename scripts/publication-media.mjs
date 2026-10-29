import {readFile, writeFile, readdir, realpath, unlink, stat} from 'node:fs/promises';
import {resolve, relative, sep, basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {imageInventory, validateExternalOriginal} from './external-originals.mjs';
import {storage, mediaObject, validateObject, assertBytes, sha256, configuredClient, responseBytes, transfer, readWithRetries} from './s3-media.mjs';

export async function filesUnder(directory) {
  const files = [];
  async function visit(path) {
    for (const entry of await readdir(path, {withFileTypes: true})) {
      if (entry.isSymbolicLink()) throw new Error('Symlink in media input');
      const target = resolve(path, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  await visit(directory);
  return files.sort();
}

export async function localBytes(directory, path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.includes('..') || path.includes('\\')) throw new Error('Unsafe local media path');
  const root = await realpath(directory), target = await realpath(resolve(root, '.' + path));
  if (!target.startsWith(root + sep) || !(await stat(target)).isFile()) throw new Error('Unsafe local media source');
  return readFile(target);
}

export function imageObjects(inventory, localSource) {
  return Object.entries(inventory).map(([path, entry]) => {
    if (!/^\/assets\/images\/[a-z0-9._/-]+$/i.test(path) || path.includes('..') ||
        !Array.isArray(entry.variants) || !entry.variants.length) throw new Error('Invalid original image manifest');
    const external = validateExternalOriginal(path, entry);
    const preview = [...entry.variants].sort((a, b) => b.width - a.width)[0];
    if (!preview || preview.path === path || !preview.path.startsWith('/assets/images/') || preview.path.includes('..')) {
      throw new Error('Original requires a separate reading preview');
    }
    return {path, preview, external_url: external?.url,
      object: {...mediaObject('originals', basename(path), entry.sha256, entry.bytes),
        source: external ? {url: external.url} : localSource(path)}};
  });
}

export function uniqueObjects(objects) {
  const unique = new Map();
  for (const object of objects) {
    validateObject(object);
    if (unique.has(object.key) && JSON.stringify(validateObject(unique.get(object.key))) !== JSON.stringify(validateObject(object))) {
      throw new Error('Conflicting media identity');
    }
    if (!unique.has(object.key)) unique.set(object.key, object);
  }
  return [...unique.values()];
}

export async function publicationPlan(root, siteDirectory) {
  const site = await realpath(siteDirectory), source = await realpath(resolve(root, 'site'));
  if (site === source || site.startsWith(source + sep)) throw new Error('Publication output must be separate from source files');
  const files = await filesUnder(site);
  const manifest = JSON.parse(await readFile(resolve(site, 'assets/article-pdfs.json'), 'utf8'));
  if (manifest.version !== 2 || !Array.isArray(manifest.articles) ||
      !/^(?:\/[a-zA-Z0-9_-]+)*$/.test(manifest.baseurl) || !/^https:\/\/[^/@?#]+$/.test(manifest.origin)) throw new Error('Invalid publication manifest');
  const images = imageObjects(imageInventory(root), path => ({file: resolve(root, 'site', '.' + path)}));
  for (const image of images) {
    if (!image.external_url) assertBytes(image.object, await localBytes(source, image.path));
    const bytes = await localBytes(site, image.preview.path);
    if (sha256(bytes) !== image.preview.sha256 || bytes.length !== image.preview.bytes) throw new Error('Changed reading preview');
  }
  const pdfs = [];
  for (const file of files.filter(file => /\.pdf$/i.test(file))) {
    const bytes = await readFile(file), path = '/' + relative(site, file).split(sep).join('/');
    const object = {...mediaObject('pdf', basename(file), sha256(bytes), bytes.length), source: {file}};
    assertBytes(object, bytes);
    pdfs.push({path, object});
  }
  for (const article of manifest.articles) if (!pdfs.some(pdf => pdf.path === article.pdf_url)) throw new Error('Missing publication PDF');
  return {version: 1, output_directory: site, source_directory: source, origin: manifest.origin, baseurl: manifest.baseurl, images, pdfs,
    objects: uniqueObjects([...images.map(image => image.object), ...pdfs.map(pdf => pdf.object)])};
}

export async function sourceBytes(object, request = fetch, retryOptions) {
  if (object.source.file) {
    const bytes = await readFile(object.source.file);
    assertBytes(object, bytes);
    return bytes;
  }
  const source = new URL(object.source.url);
  // Never forward storage credentials to a source host or accept arbitrary URLs
  // from a pull request. Only the project's existing release objects are valid.
  if (!source.href.startsWith('https://github.com/Fuzzy-Technologies/history_math/releases/download/article-originals-') ||
      source.search || source.hash || source.username || source.password) throw new Error('Untrusted original source');
  return readWithRetries(object.key, async () => {
    const bytes = await responseBytes(await request(source, {credentials: 'omit', redirect: 'follow', signal: AbortSignal.timeout(120_000)}), object.bytes);
    assertBytes(object, bytes);
    return bytes;
  }, retryOptions);
}

const tagPattern = /<[a-z][a-z0-9:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const attributePattern = /\s([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(attributePattern)].map(match => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4]]));
}
function setAttribute(tag, name, value) {
  let found = false;
  const changed = tag.replace(attributePattern, (all, key) => {
    if (key.toLowerCase() !== name) return all;
    found = true;
    return value === null ? '' : ` ${name}="${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`;
  });
  return found || value === null ? changed : changed.replace(/\s*\/?>$/, ending => ` ${name}="${value}"${ending}`);
}

export function rewriteMedia(text, filename, plan) {
  const objects = new Map([...plan.images, ...plan.pdfs].map(item => [item.path, item]));
  const external = new Map(plan.images.filter(item => item.external_url).map(item => [item.external_url, item]));
  function match(value) {
    if (!value || value.startsWith('#') || value.startsWith('data:')) return null;
    let url;
    try { url = new URL(value.replaceAll('&amp;', '&'), plan.origin + plan.baseurl + '/' + filename); } catch { return null; }
    const release = external.get(url.origin + url.pathname);
    if (release) return {item: release, suffix: url.search + url.hash};
    if (![plan.origin, 'https://history-math.org', 'https://fuzzy-technologies.github.io'].includes(url.origin)) return null;
    let path = decodeURIComponent(url.pathname);
    for (const base of [plan.baseurl, '/history_math'].filter(Boolean)) if (path.startsWith(base + '/')) { path = path.slice(base.length); break; }
    const item = objects.get(path);
    return item ? {item, suffix: url.search + url.hash} : null;
  }
  const replaceUrl = (value, preview = false) => {
    const found = match(value);
    return found ? (preview && found.item.preview ? plan.baseurl + found.item.preview.path : found.item.object.url) + found.suffix : value;
  };
  if (/\.html$/i.test(filename)) return text.replace(tagPattern, tag => {
    const attrs = attributes(tag);
    if (/^<img\b/i.test(tag)) {
      const image = plan.images.find(image => image.path === attrs['data-original-path']) ||
        match(attrs['data-original'])?.item || match(attrs.src)?.item;
      if (image?.preview) {
        if (match(attrs.src)) tag = setAttribute(tag, 'src', plan.baseurl + image.preview.path);
        tag = setAttribute(tag, 'data-original', image.object.url);
        tag = setAttribute(tag, 'data-original-storage', 's3');
        tag = setAttribute(tag, 'data-original-sha256', image.object.sha256);
        tag = setAttribute(tag, 'data-original-bytes', String(image.object.bytes));
        tag = setAttribute(tag, 'data-original-name', image.object.filename);
        tag = setAttribute(tag, 'data-original-api', null);
      }
      if (attrs.srcset?.split(',').some(item => match(item.trim().split(/\s+/)[0]))) tag = setAttribute(tag, 'srcset', null);
    }
    return tag.replace(attributePattern, (all, key, double, single, bare) => {
      if (!['href', 'src', 'poster', 'content', 'data-original'].includes(key.toLowerCase())) return all;
      const value = double ?? single ?? bare, replacement = replaceUrl(value, ['src', 'poster', 'content'].includes(key.toLowerCase()));
      return replacement === value ? all : ` ${key}="${replacement.replaceAll('&', '&amp;')}"`;
    });
  });
  if (/\.css$/i.test(filename)) return text.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,
    (all, quote, url) => `url(${quote}${replaceUrl(url, true)}${quote})`);
  if (/\.json$/i.test(filename)) {
    const visit = (value, key) => Array.isArray(value) ? value.map(item => visit(item, key)) : value && typeof value === 'object' ?
      Object.fromEntries(Object.entries(value).map(([name, item]) => [name, visit(item, name)])) :
      typeof value === 'string' && ['url', 'pdf_url', 'href', 'download_url', 'contentUrl', 'image'].includes(key) ? replaceUrl(value, key === 'image') : value;
    return JSON.stringify(visit(JSON.parse(text), '')) + '\n';
  }
  return text;
}

export function requireReceipt(plan, receipt) {
  const expected = new Map(plan.objects.map(object => [object.key, JSON.stringify(validateObject(object))]));
  for (const object of receipt) {
    if (object.verified !== true || Object.hasOwn(object, 'source') ||
        expected.get(object.key) !== JSON.stringify(validateObject(object))) throw new Error('Incomplete or changed public verification receipt');
    expected.delete(object.key);
  }
  if (expected.size || receipt.length !== plan.objects.length) throw new Error('Incomplete public verification receipt');
}

export async function finalizePublication(siteDirectory, plan, receipt, {pruneOutput = false} = {}) {
  requireReceipt(plan, receipt);
  const site = await realpath(siteDirectory);
  if (site !== plan.output_directory || site === plan.source_directory || site.startsWith(plan.source_directory + sep)) {
    throw new Error('Publication output changed or overlaps source files');
  }
  const files = await filesUnder(site), edits = [], removed = [];
  for (const item of [...plan.images, ...plan.pdfs]) {
    const file = resolve(site, '.' + item.path);
    if (!files.includes(file)) continue;
    assertBytes(item.object, await localBytes(site, item.path));
    removed.push(file);
  }
  for (const file of files.filter(file => /\.(html|css|json)$/i.test(file))) {
    const before = await readFile(file, 'utf8'), after = rewriteMedia(before, relative(site, file).split(sep).join('/'), plan);
    if (after !== before) edits.push([file, after]);
  }
  // The entire transfer is verified before any links change. Only disposable
  // Pages output is pruned; Git, Releases and editorial sources remain intact.
  for (const [file, text] of edits) await writeFile(file, text);
  await writeFile(resolve(site, 'assets/publication-media.json'), JSON.stringify({version: 1, objects: receipt}, null, 2) + '\n');
  if (pruneOutput) for (const file of removed) await unlink(file);
  return {objects: receipt.length, rewritten: edits.length, removed: pruneOutput ? removed.length : 0};
}

async function main() {
  const args = process.argv.slice(2), index = args.indexOf('--site-dir');
  if (index < 0 || !args[index + 1] || !args.includes('--publish')) throw new Error('Expected --site-dir DIRECTORY --publish');
  const client = configuredClient();
  try {
    const plan = await publicationPlan(process.cwd(), args[index + 1]);
    const receipt = await transfer(plan.objects, client, sourceBytes, {progress: (done, total) => {
      if (done % 25 === 0 || done === total) console.log(`Publicly verified ${done}/${total} publication objects`);
    }});
    console.log(JSON.stringify(await finalizePublication(args[index + 1], plan, receipt, {pruneOutput: args.includes('--prune-output')})));
  } finally { client.destroy(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
