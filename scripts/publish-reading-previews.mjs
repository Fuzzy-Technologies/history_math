import {readFile, writeFile, unlink, realpath} from 'node:fs/promises';
import {basename, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {filesUnder, requireReceipt} from './publication-media.mjs';
import {configuredClient, mediaObject, sha256, storage, transfer} from './s3-media.mjs';

const localPreview = /(?<![\w.:/%-])(?:https:\/\/(?:history-math\.org|fuzzy-technologies\.github\.io)|https:\/\/fuzzy-technologies\.com(?=\/history_math\/))?(?:\/history_math)?(\/assets\/images\/previews\/[a-z0-9._/-]+\.(?:webp|jpe?g))(?![\w./%-])/gi;

export function rewritePreviewUrls(text, previews) {
  return text.replace(localPreview, (_url, path) => {
    if (!previews.has(path)) throw new Error(`Missing reading preview: ${path}`);
    return previews.get(path);
  });
}

export async function publishPreviews(directory, client, {baseUrl, upload = transfer, sourceDirectory = resolve('site'), progress} = {}) {
  if (baseUrl !== storage.base) throw new Error('Unexpected preview delivery base URL');
  const site = await realpath(directory), source = await realpath(sourceDirectory);
  if (site === source || site.startsWith(source + sep) || source.startsWith(site + sep)) throw new Error('Expected disposable Pages output');
  const allFiles = await filesUnder(site), images = new Map(), paths = new Map();
  let pagesBytes = 0;
  for (const file of allFiles) {
    const path = '/' + relative(site, file).split(sep).join('/');
    if (!path.startsWith('/assets/images/previews/') || !/\.(?:webp|jpe?g)$/i.test(path)) continue;
    if (!/^\/assets\/images\/previews\/[a-z0-9._/-]+\.(?:webp|jpe?g)$/i.test(path) || path.includes('..')) throw new Error('Unsafe preview path');
    const bytes = await readFile(file);
    if (/\.webp$/i.test(path)) {
      if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Invalid WebP preview');
    } else if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      throw new Error('Invalid JPEG preview');
    }
    const object = mediaObject('previews', basename(file), sha256(bytes), bytes.length);
    images.set(object.key, {...object, file});
    paths.set(path, `${baseUrl}/${object.key}`);
    pagesBytes += bytes.length;
  }
  if (!images.size) throw new Error('Pages output contains no raster reading previews');
  const edits = [];
  for (const file of allFiles.filter(path => /\.(html|css|json|xml|js)$/i.test(path))) {
    const before = await readFile(file, 'utf8'), after = rewritePreviewUrls(before, paths);
    if (before !== after) edits.push([file, after]);
  }
  if (!edits.length) throw new Error('Pages output contains no references to raster reading previews');
  const objects = [...images.values()];
  const receipt = await upload(objects, client, object => readFile(object.file), {inventoryPrefix: 'previews/', progress});
  requireReceipt({objects}, receipt);
  for (const [file, after] of edits) await writeFile(file, after);
  for (const path of paths.keys()) await unlink(resolve(site, '.' + path));
  return {base_url: baseUrl, previews: paths.size, objects: images.size, rewritten: edits.length,
    pages_bytes_removed: pagesBytes, origin_bytes: objects.reduce((sum, object) => sum + object.bytes, 0)};
}

async function main() {
  const client = configuredClient();
  try {
    const result = await publishPreviews(process.argv[2], client, {baseUrl: process.env.PREVIEW_DELIVERY_BASE_URL,
      progress(done, total) { if (done % 100 === 0 || done === total) console.log(`Verified ${done}/${total} preview objects`); }});
    console.log(JSON.stringify(result));
  } finally { client.destroy(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
