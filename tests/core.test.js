import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize, search, searchByTag, selection, anniversaries} from '../site/assets/core.js';

const records = [
  {title: 'Счёт и геометрия', description: '', text: 'Чертёж', tags: ['идеи'], type: 'essay', language: 'ru', date: '2025-10-01', url: '/a/'},
  {title: 'English', description: '', text: 'geometry', tags: [], type: 'note', language: 'en', date: '2024-10-01', url: '/b/'}
];
test('Cyrillic search folds case, ё/е, whitespace and separates languages', () => {
  assert.equal(normalize('  СЧЁТ  '), 'счет');
  assert.equal(search(records, 'СЧЕТ', 'ru').length, 1);
  assert.equal(search(records, 'чертеж идеи', 'ru').length, 1);
  assert.equal(search(records, '', 'ru').length, 0);
  assert.equal(search(records, 'несуществующее', 'ru').length, 0);
  assert.equal(search(records, 'geometry', 'ru').length, 0);
});
test('Exact tag search folds Cyrillic case and ё/е without matching article text or tag fragments', () => {
  const tagged = [
    {...records[0], tags: ['счёт', 'идеи']},
    {...records[0], url: '/text-only/', title: 'Счёт', text: 'счёт', tags: ['источники']},
    {...records[0], url: '/partial/', tags: ['устный счёт']},
    {...records[1], tags: ['счёт']}
  ];
  assert.deepEqual(searchByTag(tagged, ' СЧЕТ ', 'ru').map(record => record.url), ['/a/']);
  assert.deepEqual(searchByTag(tagged, 'сч', 'ru'), []);
  assert.deepEqual(searchByTag(tagged, '', 'ru'), []);
  assert.deepEqual(searchByTag(tagged, 'нет темы', 'ru'), []);
  assert.equal(search(tagged, 'чертеж', 'ru').length, 2);
});
test('archive selection has no duplicate URLs and changes a repeated subset', () => {
  const pool = Array.from({length: 6}, (_, index) => ({url: `/${index}/`}));
  let previous = [];
  for (let index = 0; index < 100; index += 1) {
    const picked = selection([...pool, pool[0]], 3, previous);
    const urls = picked.map(record => record.url);
    assert.equal(new Set(urls).size, 3);
    assert.ok(!urls.every(url => previous.includes(url)));
    previous = urls;
  }
  assert.deepEqual(selection([], 3), []);
  assert.equal(selection(pool.slice(0, 1), 3).length, 1);
});
test('anniversaries use publication month/day, prior years and current locale', () => {
  assert.equal(anniversaries(records, new Date(2026, 9, 1), 'ru').length, 1);
  assert.equal(anniversaries(records, new Date(2025, 9, 1), 'ru').length, 0);
  assert.equal(anniversaries(records, new Date(2026, 9, 2), 'ru').length, 0);
  assert.equal(anniversaries([{...records[0], date: '2024-02-29'}], new Date(2026, 1, 28), 'ru').length, 0);
});
test('a saved archive subset is replaced even when the random sequence repeats', () => {
  const pool = Array.from({length: 5}, (_, index) => ({url: `/${index}/`}));
  const first = selection(pool, 3, [], () => 0.4);
  const next = selection(pool, 3, first.map(record => record.url), () => 0.4);
  assert.notDeepEqual(next.map(record => record.url).sort(), first.map(record => record.url).sort());
  assert.equal(new Set(next.map(record => record.url)).size, 3);
});
