import {test} from 'node:test';
import assert from 'node:assert/strict';
import {search} from '../site/assets/search.js';

function publication(title, fields = {}) {
  return {title, language: 'ru', tags: [], description: '', text: '', ...fields};
}

test('inflected topic tags rank above titles, summaries and body mentions', async () => {
  const records = [
    publication('Body', {text: 'Здесь о геометрии.'}),
    publication('Summary', {description: 'Задачи по геометрии'}),
    publication('Геометрия в стихах'),
    publication('Composite tag', {tags: ['Начала геометрии']}),
    publication('Exact tag', {tags: ['геометрия']})
  ];
  for (const query of ['ГЕОМЕТРИЯ', 'геометрии', 'геометрией']) {
    assert.deepEqual(await search(records, query, 'ru'), [...records].reverse());
  }
});

test('remembered quotations allow omissions, word endings, punctuation and reordered clues', async () => {
  const records = [
    publication('Reversed', {text: 'Змея заметила павлина.'}),
    publication('Further apart', {text: 'Павлин слетел с дерева сразу после того, как увидел змею.'}),
    publication('Close together', {text: 'Павлин и змея.'}),
    publication('Missing clue', {text: 'Павлин расправил хвост.'})
  ];
  assert.deepEqual(await search(records, '«павлина со змеёй»', 'ru'), [records[2], records[1], records[0]]);
  const astrolabe = publication('Было бы что мерить', {text: 'Остап продавал астролябию слесарю за три рубля.'});
  assert.deepEqual(await search([astrolabe], 'слесарь астролябия', 'ru'), [astrolabe]);
});

test('English inflections and punctuation rank relevant tags first', async () => {
  const records = [
    publication('A calculating instrument', {language: 'en', text: 'A machine can calculate.'}),
    publication('The catalogue', {language: 'en', tags: ['Calculating_Machines']}),
    publication('Other language', {text: 'calculating machines'})
  ];
  assert.deepEqual(await search(records, 'the calculated machines', 'en'), [records[1], records[0]]);
});

test('math symbols and numbers remain searchable as tokens, ties keep their input order', async () => {
  const records = [
    publication('A', {text: '2 + π'}),
    publication('B', {text: '2 + π'}),
    publication('C', {text: '12 + π и каталог'}),
    publication('Untranslated', {translation_notice: true, text: '2 + π'})
  ];
  assert.deepEqual(await search(records, '2 + π', 'ru'), records.slice(0, 2));
  assert.deepEqual(await search(records, 'лог', 'ru'), []);
  assert.deepEqual(await search(records, 'из и на', 'ru'), []);
});

test('Unicode normalization matches journal typography and a second query reuses indexed records', async () => {
  const records = [publication('Ｃａｌｃｕｌａｔｉｎｇ', {language: 'en', text: 'A machine.'})];
  assert.deepEqual(await search(records, 'calculates', 'en'), records);
  assert.deepEqual(await search([...records], 'machines', 'en'), records);
});
