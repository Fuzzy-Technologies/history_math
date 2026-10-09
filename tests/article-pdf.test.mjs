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
