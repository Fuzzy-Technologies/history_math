import {existsSync, readFileSync, readdirSync, realpathSync, statSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import {createHash} from 'node:crypto';

const repository = 'Fuzzy-Technologies/history_math';
const shaPattern = /^[a-f0-9]{64}$/;
const originalPattern = /^\/assets\/images\/([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9.-]*)\.(png|jpg|jpeg|webp|gif|svg)$/;
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
const descriptorKeys = ['api_url', 'asset_id', 'bytes', 'release_tag', 'sha256', 'storage', 'url'];

// Public asset names bind the original path to its exact bytes.
export function externalAssetName(path, sha256) {
  const match = originalPattern.exec(path);
  if (!match || path.includes('..') || typeof sha256 !== 'string' || !shaPattern.test(sha256)) throw new Error('Invalid external original identity');
  return `${match[1]}-${match[2]}-${sha256}.${match[3]}`;
}

export function validateExternalOriginal(path, entry) {
  if (!entry || !Object.hasOwn(entry, 'external_original')) return null;
  const external = entry.external_original;
  const name = externalAssetName(path, entry.sha256);
  const tag = `article-originals-${entry.sha256[0]}`;
  if (!external || typeof external !== 'object' || Array.isArray(external) ||
      Object.keys(external).sort().join('\0') !== descriptorKeys.join('\0') ||
      external.storage !== 'github-release' || !positiveInteger(external.asset_id) ||
      !positiveInteger(entry.bytes) || !positiveInteger(entry.width) || !positiveInteger(entry.height) ||
      typeof entry.logo !== 'boolean' || external.sha256 !== entry.sha256 || external.bytes !== entry.bytes ||
      external.release_tag !== tag ||
      external.url !== `https://github.com/${repository}/releases/download/${tag}/${name}` ||
      external.api_url !== `https://api.github.com/repos/${repository}/releases/assets/${external.asset_id}`) {
    throw new Error(`Invalid external original descriptor: ${path}`);
  }
  return external;
}

export function imageInventory(root) {
  const directory = resolve(root, 'site/_data');
  const manifest = resolve(directory, 'image_assets.json');
  const inventory = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : {};
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) throw new Error('Invalid image inventory');
  const fragments = resolve(directory, 'article_image_assets');
  if (existsSync(fragments)) for (const name of readdirSync(fragments).filter(name => name.endsWith('.json')).sort()) {
    const entries = JSON.parse(readFileSync(resolve(fragments, name), 'utf8'));
    if (!entries || typeof entries !== 'object' || Array.isArray(entries)) throw new Error('Invalid image manifest fragment');
    for (const [path, entry] of Object.entries(entries)) {
      if (Object.hasOwn(inventory, path)) throw new Error('Duplicate image manifest entry');
      inventory[path] = entry;
    }
  }
  return inventory;
}

function localFile(root, path) {
  const site = realpathSync(resolve(root, 'site'));
  const target = resolve(site, '.' + path);
  if (!realpathSync(target).startsWith(site + sep) || !statSync(target).isFile()) throw new Error(`Unsafe image asset: ${path}`);
  return target;
}

export function validateExternalPreviews(root, entry) {
  if (!Array.isArray(entry.variants) || !entry.variants.length) throw new Error('Missing external original preview');
  const paths = new Set();
  for (const variant of entry.variants) {
    if (!variant || typeof variant.path !== 'string' ||
        !/^\/assets\/images\/previews\/[a-z0-9-]+\/[a-z0-9][a-z0-9._-]*$/.test(variant.path) ||
        variant.path.includes('..') || paths.has(variant.path) || !shaPattern.test(variant.sha256) ||
        !positiveInteger(variant.bytes) || !positiveInteger(variant.width) || !positiveInteger(variant.height) ||
        variant.width > entry.width || variant.height > entry.height) throw new Error('Invalid external original preview');
    paths.add(variant.path);
    const bytes = readFileSync(localFile(root, variant.path));
    if (bytes.length !== variant.bytes || createHash('sha256').update(bytes).digest('hex') !== variant.sha256) {
      throw new Error(`Changed external original preview: ${variant.path}`);
    }
  }
  return entry.variants;
}

export function externalEntry(root, path, inventory = imageInventory(root)) {
  const entry = inventory[path];
  if (!validateExternalOriginal(path, entry)) throw new Error(`Missing original image: ${path}`);
  validateExternalPreviews(root, entry);
  return entry;
}

// Local originals retain the historical approval digest byte for byte. An absent
// original binds its immutable download descriptor and all reading derivatives.
export function updateAssetDigest(hash, root, path, inventory) {
  if (typeof path !== 'string' || !/^\/assets\/images\/[a-z0-9-]+\/[A-Za-z0-9._-]+$/.test(path) || path.includes('..')) throw new Error('Invalid review asset path');
  hash.update('\0' + path + '\0');
  if (existsSync(resolve(root, 'site', '.' + path))) {
    hash.update(readFileSync(localFile(root, path)));
    return hash;
  }
  const entry = externalEntry(root, path, inventory);
  const external = entry.external_original;
  hash.update(`external-original-v1\0${entry.sha256}\0${entry.bytes}\0${entry.width}\0${entry.height}\0${entry.logo}\0${external.storage}\0${external.url}\0${external.api_url}\0${external.asset_id}\0${external.release_tag}\0`);
  for (const variant of [...entry.variants].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) {
    hash.update(`\0${variant.path}\0${variant.width}\0${variant.height}\0${variant.sha256}\0${variant.bytes}\0`);
    hash.update(readFileSync(localFile(root, variant.path)));
  }
  return hash;
}
