import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateManifest, printImageSources} from '../scripts/article-pdf.mjs';

test('PDF manifest binds language, URL and output filename without traversal or duplicates', () => {
  const article = {url: '/ru/articles/example/', pdf_url: '/assets/pdf/ru/example.pdf', lang: 'ru', title: 'Пример'};
  const manifest = {version: 1, baseurl: '/history_math', origin: 'https://fuzzy-technologies.github.io', articles: [article]};
  assert.equal(validateManifest(manifest), manifest);
  assert.doesNotThrow(() => validateManifest({...manifest, baseurl: '', articles: [{...article, lang: 'en', url: '/articles/example/', pdf_url: '/assets/pdf/en/example.pdf'}]}));
  for (const change of [{lang: 'en'}, {url: '/ru/articles/../secret/'}, {pdf_url: '/assets/pdf/../../secret'}, {title: ''}]) {
    assert.throws(() => validateManifest({...manifest, articles: [{...article, ...change}]}));
  }
  assert.throws(() => validateManifest({...manifest, articles: [article, article]}));
  assert.throws(() => validateManifest({...manifest, baseurl: '/../../tmp'}));
  assert.throws(() => validateManifest({...manifest, origin: 'javascript:alert(1)'}));
});


test('PDF responses use original images before preload without changing public markup', () => {
  const html = '<img src="/base/preview.webp" srcset="/base/small.webp 480w, /base/large.webp 960w" sizes="90vw" data-original="/base/original.png" alt="A &gt; B">';
  const output = printImageSources(html);
  assert.match(output, /src="\/base\/original.png"/);
  assert.doesNotMatch(output, /srcset=|sizes=|preview.webp|small.webp|large.webp/);
  assert.match(output, /alt="A &gt; B"/);
  assert.match(html, /src="\/base\/preview.webp"/);
  const vector = '<img src="/native.svg" alt="A diagram">';
  assert.equal(printImageSources(vector), vector);
});

import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {digest, printDocument, dependencyReader, readCachedPdf, writeCachedPdf, pruneCache, assetPath} from '../scripts/pdf-cache.mjs';

const regions = '<!-- pdf:heading:start --><header>Title<!-- pdf:heading:end --><!-- pdf:notice:start --></header><!-- pdf:notice:end --><!-- pdf:body:start --><p>Article</p><!-- pdf:body:end -->';
test('print input excludes site chrome but retains article changes and fails closed on broken markers', () => {
  const article = {lang: 'en', title: 'A & B'};
  const html = printDocument(`<nav>Old menu</nav>${regions}<footer>Other article</footer>`, article, '/base');
  assert.equal(html, printDocument(`<nav>New menu</nav>${regions}<footer>New article</footer>`, article, '/base'));
  assert.notEqual(html, printDocument(regions.replace('Article', 'Revised article'), article, '/base'));
  assert.match(html, /A &amp; B/);
  assert.doesNotMatch(html, /Old menu|Other article/);
  assert.throws(() => printDocument(regions.replace('pdf:body:end', 'missing'), article, ''), /PDF region/);
  assert.throws(() => printDocument(regions + regions, article, ''), /PDF region/);
});

test('dependency graph hashes transitive CSS, fonts and image bytes, rejects missing and external assets', async t => {
  const root = await mkdtemp(join(tmpdir(), 'pdf-deps-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'assets/main.css'), '@import "other.css"; body { background: url(image.svg); }');
  await writeFile(join(root, 'assets/other.css'), '@font-face { src: url(font.woff2); } @import "main.css";');
  await writeFile(join(root, 'assets/font.woff2'), 'font-a');
  await writeFile(join(root, 'assets/image.svg'), '<svg/>');
  const html = '<link href="/base/assets/main.css" rel="stylesheet"><img src="/base/assets/image.svg">';
  const initial = await dependencyReader(root, '/base')(html);
  assert.equal(initial.length, 4);
  await writeFile(join(root, 'assets/font.woff2'), 'font-b');
  const changed = await dependencyReader(root, '/base')(html);
  assert.notDeepEqual(initial, changed);
  assert.equal(initial.filter(([url, hash]) => changed.find(([u]) => u === url)[1] !== hash).length, 1);
  await rm(join(root, 'assets/image.svg'));
  await assert.rejects(dependencyReader(root, '/base')(html), /ENOENT/);
  assert.throws(() => assetPath(root, '/base', 'https://outside.test/a.png'), /Nonlocal/);
  assert.throws(() => assetPath(root, '/base', '/base/%2e%2e%2fsecret'), /Invalid/);
});

test('cache detects damaged or incomplete PDFs and prunes superseded entries', async t => {
  const cache = await mkdtemp(join(tmpdir(), 'pdf-cache-'));
  t.after(() => rm(cache, {recursive: true, force: true}));
  const key = digest('article'), old = digest('withdrawn');
  const bytes = Buffer.from('%PDF-' + 'x'.repeat(1200));
  await writeCachedPdf(cache, key, bytes);
  await writeCachedPdf(cache, old, bytes);
  assert.deepEqual(await readCachedPdf(cache, key), bytes);
  await writeFile(join(cache, `${key}.pdf`), Buffer.from('%PDF-' + 'y'.repeat(1200)));
  assert.equal(await readCachedPdf(cache, key), null);
  await writeCachedPdf(cache, key, bytes);
  await rm(join(cache, `${key}.json`));
  assert.equal(await readCachedPdf(cache, key), null);
  await pruneCache(cache, new Set([key]));
  await assert.rejects(readFile(join(cache, `${old}.pdf`)), /ENOENT/);
});
