import {test} from 'node:test';
import assert from 'node:assert/strict';
import {digestProblems} from '../scripts/article-digest.mjs';
import {digest, printDocument} from '../scripts/pdf-cache.mjs';

test('digests accept complete bilingual summaries and reject clipped or overlong prose', () => {
  for (const [lang, text] of [
    ['ru', 'Кипу хранили числа с помощью узлов. Цвета и положение шнуров помогали различать записи.'],
    ['en', 'Knots and their positions encoded numbers in Inca khipu.'],
    ['ru', 'Е. И. Игнатьев предложил задачу о числах. Её решение использует сумму ряда.'],
  ]) assert.deepEqual(digestProblems(text, lang), []);
  for (const text of ['', 'Но в Андах существовал иной...', 'An alternative system…',
    'An unfinished introduction', 'First sentence. Second sentence. Third sentence.', 'One sentence.\nAnother sentence.']) {
    assert.ok(digestProblems(text, 'en').length, text);
  }
});

test('a digest revision changes the actual PDF input and invalidates its cache', () => {
  const article = {lang: 'en', title: 'Khipu'};
  const page = description => '<!-- pdf:heading:start --><h1>Khipu</h1><p class="lead">' + description + '</p><!-- pdf:heading:end -->' +
    '<!-- pdf:notice:start --><p>Source</p><!-- pdf:notice:end --><!-- pdf:body:start --><p>Unchanged article.</p><!-- pdf:body:end -->';
  const before = printDocument(page('When we think of writing...'), article, '');
  const after = printDocument(page('Knots and their positions encoded numbers in Inca khipu.'), article, '');
  assert.notEqual(digest(before), digest(after));
  assert.ok(after.includes('Knots and their positions encoded numbers'));
  assert.ok(!after.includes('When we think'));
});
