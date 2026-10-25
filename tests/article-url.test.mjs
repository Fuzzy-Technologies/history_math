import {test} from 'node:test';
import assert from 'node:assert/strict';
import {articleUrl} from '../scripts/article-url.mjs';
import {checkSources} from '../scripts/article-checks.mjs';
import {validateManifest} from '../scripts/article-pdf.mjs';

test('old and new publication routes share one localized canonical and PDF identity', () => {
  for (const id of ['hm-99120459b820', 'hm-tt-99120459b820']) for (const lang of ['ru', 'en']) {
    const prefix = lang === 'ru' ? '/ru' : '';
    const canonical = `${prefix}/publications/${id}-${lang}/`;
    for (const section of ['articles', 'publications']) for (const suffix of ['', `-${lang}`]) {
      assert.equal(articleUrl(`${prefix}/${section}/${id}${suffix}/`, lang), canonical);
    }
    assert.equal(articleUrl(canonical, lang), canonical);
    const article = {url: canonical, lang, title: 'Fixture', pdf_url: `/assets/pdf/${lang}/${id}-${lang}.pdf`};
    const manifest = {version: 2, baseurl: '/history_math', origin: 'https://example.org', articles: [article]};
    assert.doesNotThrow(() => validateManifest(manifest));
    for (const pdf_url of ['/assets/pdf/en/other.pdf', '/assets/pdf/ru/../private.pdf']) {
      assert.throws(() => validateManifest({...manifest, articles: [{...article, pdf_url}]}));
    }
    assert.equal(articleUrl(`${prefix}/publications/example/`, lang), `${prefix}/publications/example/`);
    assert.equal(articleUrl(`${prefix}/articles/example/`, lang), `${prefix}/publications/example/`);
    assert.throws(() => validateManifest({...manifest, articles: [{...article, url: canonical.replace('/publications/', '/articles/')}]}));
  }
  const {articles, findings} = checkSources(process.cwd());
  assert.equal(findings.filter(item => item.severity === 'error').length, 0);
  assert.ok(articles.length >= 10);
  assert.equal(new Set(articles.map(article => article.url)).size, articles.length);
  for (const article of articles) assert.match(article.url, /^\/(?:ru\/)?publications\/hm-(?:tt-)?[0-9a-f]{12}-(?:ru|en)\/$/);
});

test('route normalization never rewrites external links, unrelated sections or malformed paths', () => {
  for (const path of [null, '/publications/', '/publications/page/2/', '/other/hm-012345abcdef/',
    'https://www.nature.com/articles/1371021a0', '/articles/../private/', '/articles/example/?q=1',
    '/articles/example/#heading', '/ru/articles/%2e%2e/', '/articles/Example/']) {
    assert.equal(articleUrl(path, 'en'), path);
  }
});
