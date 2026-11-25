import {previousPublication, publicationIndex, receiptDigest} from './publication-state.mjs';
import {readFile, writeFile, unlink, realpath} from 'node:fs/promises';
import {basename, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {filesUnder, requireReceipt} from './publication-media.mjs';
import {configuredClient, mediaObject, sha256, storage, publishChanges} from './s3-media.mjs';

const localPreview = /(?<![\w.:/%-])(?:https:\/\/(?:history-math\.org|fuzzy-technologies\.github\.io)|https:\/\/fuzzy-technologies\.com(?=\/history_math\/))?(?:\/history_math)?(\/assets\/images\/previews\/[a-z0-9._/-]+\.(?:webp|jpe?g))(?![\w./%-])/gi;

export function rewritePreviewUrls(text, previews) {
  return text.replace(localPreview, (_url, path) => {
    if (!previews.has(path)) throw new Error(`Missing reading preview: ${path}`);
    return previews.get(path);
  });
}

export async function publishPreviews(directory, client, {baseUrl, upload = publishChanges, sourceDirectory = resolve('site'), known, record, changedPaths} = {}) {
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
    if (changedPaths && !known.has(object.key) && !changedPaths.has(path)) {
      throw new Error('Unchanged preview has no matching published receipt: ' + path);
    }
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
  const receipt = await upload(objects, client, object => readFile(object.file), {known});
  requireReceipt({objects}, receipt);
  for (const [file, after] of edits) await writeFile(file, after);
  for (const path of paths.keys()) await unlink(resolve(site, '.' + path));
  if (record) await record(receipt);
  return {base_url: baseUrl, previews: paths.size, objects: images.size, rewritten: edits.length,
    pages_bytes_removed: pagesBytes, origin_bytes: objects.reduce((sum, object) => sum + object.bytes, 0)};
}

async function main() {
  const client = configuredClient();
  try {
    const previous = await previousPublication();
    const path = resolve(process.argv[2], 'assets/publication-media.json');
    const result = await publishPreviews(process.argv[2], client, {baseUrl: process.env.PREVIEW_DELIVERY_BASE_URL,
      known: publicationIndex(previous.objects), changedPaths: new Set(previous.changedPreviews), record: async receipt => {
        const manifest = JSON.parse(await readFile(path, 'utf8'));
        manifest.incremental.preview_revision = manifest.incremental.revision;
        manifest.incremental.previews = receipt.map(({key, bytes}) => [key, bytes]);
        manifest.incremental.digest = receiptDigest(manifest.objects, manifest.incremental.previews);
        await writeFile(path, JSON.stringify(manifest) + '\n');
      }});
    console.log(JSON.stringify(result));
  } finally { client.destroy(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
