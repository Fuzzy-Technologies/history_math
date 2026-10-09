import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateManifest} from '../scripts/article-pdf.mjs';

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
