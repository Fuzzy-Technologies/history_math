import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {externalAssetName, validateExternalOriginal, validateExternalPreviews, externalEntry} from '../scripts/external-originals.mjs';
import {packageDigest} from '../scripts/article-review.mjs';
import {checkArticle} from '../scripts/article-checks.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const path = '/assets/images/hm-tt-example/diagram.png';
const previewPath = '/assets/images/previews/hm-tt-example/diagram.png-20.webp';

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'history-math-external-'));
  const preview = Buffer.from('verified reading preview');
  const original = Buffer.from('exact archival original');
  const hash = sha(original);
  const tag = `article-originals-${hash[0]}`;
  mkdirSync(resolve(root, 'site/_data/article_image_assets'), {recursive: true});
  mkdirSync(resolve(root, 'site/assets/images/previews/hm-tt-example'), {recursive: true});
  writeFileSync(resolve(root, 'site', '.' + previewPath), preview);
  writeFileSync(resolve(root, 'site/_data/image_assets.json'), '{}');
  const entry = {sha256: hash, bytes: original.length, width: 40, height: 20, logo: false,
    variants: [{path: previewPath, width: 20, height: 10, sha256: sha(preview), bytes: preview.length}],
    external_original: {storage: 'github-release', release_tag: tag, asset_id: 123,
      url: `https://github.com/Fuzzy-Technologies/history_math/releases/download/${tag}/hm-tt-example-diagram-${hash}.png`,
      api_url: 'https://api.github.com/repos/Fuzzy-Technologies/history_math/releases/assets/123', sha256: hash, bytes: original.length}};
  const save = () => writeFileSync(resolve(root, 'site/_data/article_image_assets/hm-tt-example.json'), JSON.stringify({[path]: entry}));
  save();
  return {root, entry, save, preview, original, dispose: () => rmSync(root, {recursive: true, force: true})};
}

test('missing originals require a content-addressed descriptor and complete verified local previews', () => {
  const f = fixture();
  try {
    assert.equal(externalAssetName(path, f.entry.sha256), `hm-tt-example-diagram-${f.entry.sha256}.png`);
    assert.equal(externalEntry(f.root, path).sha256, f.entry.sha256);
    assert.doesNotThrow(() => validateExternalPreviews(f.root, f.entry));
    const text = readFileSync('templates/article.md', 'utf8').replaceAll('/assets/images/example/triangle.svg', path);
    assert.deepEqual(checkArticle(text, 'article.md', f.root).findings.filter(x => x.severity === 'error'), []);
    delete f.entry.external_original; f.save();
    assert.throws(() => externalEntry(f.root, path), /Missing original/);
    assert.ok(checkArticle(text, 'article.md', f.root).findings.some(x => x.code === 'HM_IMAGE'));
  } finally { f.dispose(); }
});

test('release descriptors reject untrusted URLs, mismatched identity, absent hashes and unsafe numeric fields', () => {
  const f = fixture();
  try {
    for (const change of [
      {storage: 'raw-git'}, {asset_id: 0}, {asset_id: 9007199254740992},
      {sha256: 'a'.repeat(64)}, {bytes: f.entry.bytes + 1}, {release_tag: 'article-originals-wrong'},
      {url: f.entry.external_original.url.replace('https:', 'http:')},
      {url: f.entry.external_original.url.replace('Fuzzy-Technologies', 'someone')},
      {url: f.entry.external_original.url + '?download=1'},
      {url: f.entry.external_original.url + '#original'},
      {url: f.entry.external_original.url.replace('github.com/', 'user:secret@github.com/')},
      {api_url: f.entry.external_original.api_url.replace('/123', '/124')},
      {api_url: f.entry.external_original.api_url + '?raw=true'},
      {private_source_path: '/private/archive'}
    ]) {
      const entry = {...f.entry, external_original: {...f.entry.external_original, ...change}};
      assert.throws(() => validateExternalOriginal(path, entry), /Invalid external original/, JSON.stringify(change));
    }
    for (const change of [{width: 0}, {height: -1}, {bytes: true}, {logo: 'false'}, {sha256: ['a'.repeat(64)]}]) {
      assert.throws(() => validateExternalOriginal(path, {...f.entry, ...change}));
    }
    for (const unsafe of ['/assets/images/hm-tt-example/../diagram.png', '/assets/images/hm-tt-example/Diagram.png', '/assets/images/hm-tt-example/diagram.exe']) {
      assert.throws(() => validateExternalOriginal(unsafe, f.entry), /Invalid external original/);
    }
  } finally { f.dispose(); }
});

test('external preview tampering, upscaling, duplicate paths, traversal and escaped symlinks fail closed', () => {
  const f = fixture();
  try {
    const originalVariant = f.entry.variants[0];
    for (const change of [{bytes: originalVariant.bytes + 1}, {sha256: 'a'.repeat(64)}, {width: 41}, {height: 21}, {height: 0}, {path: '/assets/images/previews/hm-tt-example/../diagram.webp'}]) {
      assert.throws(() => validateExternalPreviews(f.root, {...f.entry, variants: [{...originalVariant, ...change}]}));
    }
    assert.throws(() => validateExternalPreviews(f.root, {...f.entry, variants: []}), /Missing/);
    assert.throws(() => validateExternalPreviews(f.root, {...f.entry, variants: [originalVariant, originalVariant]}), /Invalid/);
    writeFileSync(resolve(f.root, 'site', '.' + previewPath), 'changed preview');
    assert.throws(() => externalEntry(f.root, path), /Changed external original preview/);
    const preview = resolve(f.root, 'site', '.' + previewPath);
    rmSync(preview);
    writeFileSync(resolve(f.root, 'outside-site.webp'), f.preview);
    symlinkSync(resolve(f.root, 'outside-site.webp'), preview);
    assert.throws(() => externalEntry(f.root, path), /Unsafe image asset/);
  } finally { f.dispose(); }
});

test('legacy review digests stay unchanged; external approval binds descriptors and preview bytes', () => {
  const f = fixture();
  try {
    const data = {figures: [{path}], preview_image: path};
    const text = 'Public text\r\n';
    mkdirSync(resolve(f.root, 'site/assets/images/hm-tt-example'));
    writeFileSync(resolve(f.root, 'site', '.' + path), f.original);
    const legacy = sha(Buffer.concat([Buffer.from('Public text\n\0' + path + '\0'), f.original]));
    assert.equal(packageDigest(text, data, f.root), legacy);
    rmSync(resolve(f.root, 'site', '.' + path));
    const external = packageDigest(text, data, f.root);
    assert.notEqual(external, legacy);
    f.entry.external_original.asset_id = 124;
    f.entry.external_original.api_url = f.entry.external_original.api_url.replace('/123', '/124'); f.save();
    assert.notEqual(packageDigest(text, data, f.root), external);
    f.entry.variants[0].width = 19; f.save();
    const metadataChanged = packageDigest(text, data, f.root);
    assert.notEqual(metadataChanged, external);
    writeFileSync(resolve(f.root, 'site', '.' + previewPath), 'changed preview');
    assert.throws(() => packageDigest(text, data, f.root), /Changed external original preview/);
  } finally { f.dispose(); }
});
