import assert from 'node:assert/strict';
import test from 'node:test';
import {articleCandidates, heroWindow, rubricArticles} from '../site/assets/core.js';

for (const language of ['ru', 'en']) {
  test(`the ${language} hero uses one newest quarter before matching rubrics`, () => {
    const tag = language === 'ru' ? 'Персоналии' : 'People';
    const make = (day, overrides = {}) => ({url: `/${day}`, language, date: `2026-01-${String(day).padStart(2, '0')}`,
      status: 'published', tags: [], ...overrides});
    const records = [
      ...Array.from({length: 9}, (_, i) => make(i + 1, {tags: i === 7 ? [tag] : []})),
      make(22, {translation_notice: true}), make(21, {status: 'draft'}), make(20, {language: 'other'})
    ];
    const window = heroWindow(records, language);
    assert.deepEqual(window.map(r => r.url), ['/9', '/8', '/7']);
    assert.deepEqual(rubricArticles(window, language, [tag]).map(r => r.url), ['/8']);
    assert.deepEqual(articleCandidates(window, language, [tag]).map(r => r.url), ['/9', '/7']);
    assert.deepEqual(heroWindow([], language), []);
    assert.equal(heroWindow([make(1)], language).length, 1);
    const tied = [make(9, {url: '/b'}), make(9, {url: '/a'})];
    assert.equal(heroWindow(tied.reverse(), language)[0].url, '/b');
  });
}
