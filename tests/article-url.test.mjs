import {test} from 'node:test';
import assert from 'node:assert/strict';
import {articleUrl} from '../scripts/article-url.mjs';
import {checkSources} from '../scripts/article-checks.mjs';
import {validateManifest} from '../scripts/article-pdf.mjs';

test('article routes include language, are idempotent and preserve fixture routes', () => {
  for (const lang of ['ru', 'en']) {
    const prefix = lang === 'ru' ? '/ru' : '';
    const legacy = `${prefix}/articles/hm-99120459b820/`;
    const canonical = `${prefix}/articles/hm-99120459b820-${lang}/`;
    assert.equal(articleUrl(legacy, lang), canonical);
    assert.equal(articleUrl(canonical, lang), canonical);
    const article = {url: canonical, lang, title: 'Fixture', pdf_url: `/assets/pdf/${lang}/hm-99120459b820.pdf`};
    const manifest = {version: 1, baseurl: '/history_math', origin: 'https://example.org', articles: [article]};
    assert.doesNotThrow(() => validateManifest(manifest));
    for (const pdf_url of ['/assets/pdf/en/other.pdf', '/assets/pdf/ru/../private.pdf']) {
      assert.throws(() => validateManifest({...manifest, articles: [{...article, pdf_url}]}));
    }
    assert.equal(articleUrl(`${prefix}/articles/example/`, lang), `${prefix}/articles/example/`);
  }
  const {articles, findings} = checkSources(process.cwd());
  assert.equal(findings.filter(item => item.severity === 'error').length, 0);
  assert.equal(articles.length, 10);
  assert.equal(new Set(articles.map(article => article.url)).size, 10);
  for (const article of articles) assert.match(article.url, /\/hm-[0-9a-f]{12}-(?:ru|en)\/$/);
});
