import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesArticleUrl} from './published-articles.mjs';

test('article-specific checks match the full localized route on project and custom-domain builds', () => {
  for (const id of ['hm-19a5d93e33c1', 'hm-56520386b771', 'hm-0b1ea17c8b02']) {
    for (const language of ['ru', 'en']) {
      const prefix = language === 'ru' ? '/ru' : '';
      for (const base of ['', '/history_math']) {
        const route = `${base}${prefix}/publications/${id}-${language}/`;
        assert.equal(matchesArticleUrl(route, id, language, base), true);
        assert.equal(matchesArticleUrl(`https://history-math.org${route}?from=catalog#heading`, id, language, base), true);
        assert.equal(matchesArticleUrl(route, id, language === 'ru' ? 'en' : 'ru', base), false);
        assert.equal(matchesArticleUrl(route.replace('/publications/', '/other/'), id, language, base), false);
        assert.equal(matchesArticleUrl(route.replace(`${id}-`, `${id}0-`), id, language, base), false);
      }
    }
  }
});

test('the Conway article containing 0b1 never receives Rumovsky-specific title checks', () => {
  const conway = '/history_math/ru/publications/hm-tt-4f0c3d2d0b18-ru/';
  assert.equal(conway.includes('0b1'), true);
  assert.equal(matchesArticleUrl(conway, 'hm-0b1ea17c8b02', 'ru'), false);
  assert.equal(matchesArticleUrl(conway, 'hm-tt-4f0c3d2d0b18', 'ru'), true);
  assert.equal(matchesArticleUrl('/history_math/ru/publications/hm-19a5d93e33c1-ru/?ref=5652#0b1', 'hm-56520386b771', 'ru'), false);
});
