import {readFile, writeFile, unlink, realpath} from 'node:fs/promises';
import {basename, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {filesUnder} from './publication-media.mjs';
import {assertBytes, configuredClient, mediaObject, readWithRetries, responseBytes, sha256, transfer} from './s3-media.mjs';

const cdn = 'https://media.history-math.org';
const localPreview = /(?<![\w.:/%-])(?:(?:https:\/\/history-math\.org|https:\/\/fuzzy-technologies\.github\.io)?(?:\/history_math)?)?(\/assets\/images\/previews\/[a-z0-9._/-]+\.webp)(?![\w./%-])/gi;

export function rewritePreviewUrls(text, previews) {
  return text.replace(localPreview, (url, path) => previews.get(path) ?? url);
}

async function checkCdn(object, request, warm = false) {
  return readWithRetries(`CDN verification ${object.key}`, async () => {
    const response = await request(cdn + '/' + object.key, {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(45_000)});
    if (!response.ok) await responseBytes(response, object.bytes);
    if (response.headers.get('content-type')?.split(';')[0] !== 'image/webp') throw new Error('Invalid CDN preview content type');
    assertBytes(object, await responseBytes(response, object.bytes));
    if (warm) {
      const hit = Number(response.headers.get('age')) > 0 || /\bHIT\b/i.test(response.headers.get('x-cache') || '');
      if (!hit) throw Object.assign(new Error('No cache hit for warmed CDN preview'), {status: 503});
    }
  });
}

export async function publishPreviews(directory, client, {
  request = fetch, upload = transfer, sourceDirectory = resolve('site'),
} = {}) {
  const site = await realpath(directory), source = await realpath(sourceDirectory);
  if (site === source || site.startsWith(source + sep)) throw new Error('Expected disposable Pages output');
  const allFiles = await filesUnder(site), images = new Map(), paths = new Map();
  for (const file of allFiles.filter(path => /\/assets\/images\/previews\/[^]+\.webp$/.test(path))) {
    const path = '/' + relative(site, file).split(sep).join('/');
    if (!/^\/assets\/images\/previews\/[a-z0-9._/-]+\.webp$/i.test(path) || path.includes('..')) throw new Error('Unsafe preview path');
    const bytes = await readFile(file);
    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Invalid WebP preview');
    const object = mediaObject('previews', basename(file), sha256(bytes), bytes.length);
    images.set(object.key, {...object, file});
    paths.set(path, cdn + '/' + object.key);
  }
  if (!images.size) throw new Error('Pages output contains no WebP previews');
  const edits = [];
  for (const file of allFiles.filter(path => /\.(html|css|json|xml|js)$/i.test(path))) {
    const before = await readFile(file, 'utf8'), after = rewritePreviewUrls(before, paths);
    if (before !== after) edits.push([file, after]);
  }
  if (!edits.length) throw new Error('Pages output contains no references to WebP previews');
  const objects = [...images.values()];
  await upload(objects, client, object => readFile(object.file));
  for (let i = 0; i < objects.length; i += 6) {
    const results = await Promise.allSettled(objects.slice(i, i + 6).map(object => checkCdn(object, request)));
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
  await checkCdn(objects[0], request, true);
  for (const [file, after] of edits) await writeFile(file, after);
  for (const path of paths.keys()) await unlink(resolve(site, '.' + path));
  return {previews: paths.size, objects: images.size, rewritten: edits.length,
    origin_bytes: objects.reduce((sum, object) => sum + object.bytes, 0), warm_cache_verified: true};
}

async function main() {
  const setting = process.env.PREVIEW_CDN_BASE_URL;
  if (!setting) { console.log('CDN previews are disabled'); return; }
  if (setting !== cdn) throw new Error('Unexpected preview CDN base URL');
  const client = configuredClient();
  try { console.log(JSON.stringify(await publishPreviews(process.argv[2], client))); }
  finally { client.destroy(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
