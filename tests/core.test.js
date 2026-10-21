import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize, search, searchByTag, selection, anniversaries, topicKey, rubricArticles, articleCandidates, archiveMeasurementBatches} from '../site/assets/core.js';

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

test('topic keys and legacy exact-tag URLs fold spaces, underscores and case', () => {
  assert.equal(topicKey('  History_of_Mathematics '), 'history of mathematics');
  const tagged = ['History of Mathematics', 'History of mathematics', 'history_of_mathematics'].map((tag, index) =>
    ({...records[1], url: `/legacy-${index}/`, tags: [tag]}));
  assert.equal(searchByTag(tagged, 'HISTORY_OF_MATHEMATICS', 'en').length, 3);
  assert.equal(searchByTag(tagged, 'History', 'en').length, 0);
});

test('rubrics match explicit whole tags across case and exclude drafts, demos, notices and the other locale', () => {
  const base = {...records[0], status: 'published'};
  const candidates = [
    {...base, url: '/people/', tags: ['персоналии']},
    {...base, url: '/biography/', tags: ['ЖЗЛ']},
    {...base, url: '/fragment/', tags: ['персоналии ученых']},
    {...base, url: '/draft/', tags: ['Персоналии'], status: 'draft'},
    {...base, url: '/demo/', tags: ['Персоналии'], status: 'demo'},
    {...base, url: '/notice/', tags: ['Персоналии'], translation_notice: true},
    {...base, url: '/english/', tags: ['People'], language: 'en'},
    ...['математики шутят', 'Анекдоты', 'цитаты'].map((tag, index) => ({...base, url: `/joke-${index}/`, tags: [tag]}))
  ];
  assert.deepEqual(rubricArticles(candidates, 'ru', ['Персоналии']).map(record => record.url), ['/people/']);
  assert.deepEqual(rubricArticles(candidates, 'en', ['People']).map(record => record.url), ['/english/']);
  assert.deepEqual(rubricArticles(candidates, 'ru', ['Математики шутят', 'анекдоты', 'Цитаты']).map(record => record.url), ['/joke-0/', '/joke-1/', '/joke-2/']);
  assert.deepEqual(rubricArticles([], 'ru', ['Персоналии']), []);
  const pool = candidates.filter(record => record.url.startsWith('/joke-'));
  const first = selection(pool, 1, [], () => 0.5);
  assert.notDeepEqual(selection(pool, 1, [first[0].url], () => 0.5), first);
  assert.deepEqual(selection([pool[0]], 1, [pool[0].url]), [pool[0]]);
});


test('ordinary hero articles exclude every humor/personality alias, drafts, demos, notices and other languages', () => {
  const base = {...records[0], status: 'published'};
  const excluded = ['Математики шутят', 'Анекдоты', 'Цитаты', 'People', 'Персоналии'];
  const ordinary = Array.from({length: 5}, (_, index) => ({...base, url: `/ordinary-${index}/`, tags: index ? ['История математики'] : ['Глоссарий']}));
  const input = [...ordinary, ...['математики_шутят', 'анекдоты', 'цитаты', 'people', 'персоналии'].map((tag, index) => ({...base, url: `/excluded-${index}/`, tags: [tag]})),
    {...base, url: '/draft/', status: 'draft'}, {...base, url: '/demo/', status: 'demo'},
    {...base, url: '/notice/', translation_notice: true}, {...base, url: '/en/', language: 'en'}];
  assert.deepEqual(articleCandidates(input, 'ru', excluded), ordinary);
  assert.deepEqual(articleCandidates(input, 'en', excluded).map(record => record.url), ['/en/']);
  assert.deepEqual(articleCandidates([], 'ru', excluded), []);
  const first = selection(ordinary, 3, [], () => 0.4);
  const next = selection(ordinary, 3, first.map(record => record.url), () => 0.4);
  assert.equal(next.length, 3);
  assert.equal(new Set(next.map(record => record.url)).size, 3);
  assert.notDeepEqual(next.map(record => record.url).sort(), first.map(record => record.url).sort());
  assert.deepEqual(selection(ordinary.slice(0, 1), 3), ordinary.slice(0, 1));
});


test('archive measurement covers every candidate once with at most sixteen cards in each batch', () => {
  const input = Array.from({length: 1000}, (_, index) => ({...records[0], url: `/archive-${index}/`}));
  input[701] = {...input[701], title: 'Title '.repeat(200)};
  input[702] = {...input[702], description: 'Summary '.repeat(200)};
  input[703] = {...input[703], tags: Array(100).fill('Long tag')};
  const before = structuredClone(input);
  const batches = [...archiveMeasurementBatches(input)];
  assert.ok(batches.every(batch => batch.length > 0 && batch.length <= 16));
  assert.deepEqual(batches.flat(), input);
  assert.deepEqual(input, before);
  assert.equal(selection(input, 1000).length, 1000);
  assert.deepEqual([...archiveMeasurementBatches(input.slice(0, 6))], [input.slice(0, 6)]);
  assert.deepEqual([...archiveMeasurementBatches([])], []);
});
