import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseArticle} from '../scripts/article-checks.mjs';

const ids = ['hm-0b1ea17c8b02', 'hm-15a0b4f1d18b', 'hm-19a5d93e33c1', 'hm-56520386b771', 'hm-99120459b820'];
const article = (id, lang) => parseArticle(readFileSync(`site/_articles/${id}.${lang}.md`, 'utf8'));
const formulas = body => [...body.matchAll(/\$\$([\s\S]+?)\$\$|(?<![\\$])\$(?!\$)([^\n$]+?)\$(?!\$)/g)].map(match => (match[1] ?? match[2]).trim());
const anchors = body => [...body.matchAll(/\{#([^}]+)\}/g)].map(match => match[1]);
const links = body => [...body.matchAll(/https:\/\/[^\s)]+/g)].map(match => match[0]);

test('five English adaptations preserve mathematical and archival content', () => {
  for (const id of ids) {
    const ru = article(id, 'ru'), en = article(id, 'en');
    assert.equal(en.data.lang, 'en');
    assert.equal(en.data.layout, ru.data.layout);
    assert.equal(en.data.translation_key, ru.data.translation_key);
    assert.equal(en.data.source_work_id, ru.data.source_work_id);
    assert.notEqual(en.data.article_id, ru.data.article_id, 'each language has its own editorial decision');
    assert.equal(en.data.permalink, ru.data.permalink.replace(/^\/ru/, ''));
    assert.deepEqual(formulas(en.body), formulas(ru.body), `${id}: every TeX expression in order`);
    assert.deepEqual(anchors(en.body), anchors(ru.body));
    for (const link of links(ru.body)) assert.ok(links(en.body).includes(link), `${id}: missing original reference ${link}`);
    assert.deepEqual(en.data.original_publication, ru.data.original_publication);
    assert.deepEqual(en.body.match(/\{% include article-figure[^%]+%\}/g), ru.body.match(/\{% include article-figure[^%]+%\}/g));
    assert.equal(en.data.figures.length, ru.data.figures.length);
    en.data.figures.forEach((figure, i) => {
      for (const key of ['id', 'path', 'rights_basis', 'source_url', 'license', 'license_url']) {
        assert.equal(figure[key], ru.data.figures[i][key], `${id}: figure ${i} ${key}`);
      }
      for (const key of ['alt', 'caption', 'source', 'credit']) assert.doesNotMatch(figure[key] ?? '', /[А-Яа-яЁё]/u);
    });
    for (const key of ['title', 'description', 'author', 'series']) assert.doesNotMatch(en.data[key] ?? '', /[А-Яа-яЁё]/u);
    assert.doesNotMatch(en.data.tags.join(' '), /[А-Яа-яЁё]/u);
    assert.doesNotMatch(en.body, /[А-Яа-яЁё]/u);
  }
});

test('Gardner grid keeps all 25 numbers and predicts 57 for all 120 selections', () => {
  const rows = body => body.split('\n').filter(line => /^\|\s*\d/.test(line)).map(line => line.split('|').slice(1, -1).map(Number));
  const ru = rows(article(ids[1], 'ru').body), en = rows(article(ids[1], 'en').body);
  assert.deepEqual(en, ru);
  const grid = en.slice(1);
  const sums = [];
  function choose(columns = [], sum = 0) {
    if (columns.length === 5) { sums.push(sum); return; }
    for (let column = 0; column < 5; column++) if (!columns.includes(column)) choose([...columns, column], sum + grid[columns.length][column]);
  }
  choose();
  assert.equal(sums.length, 120);
  assert.ok(sums.every(sum => sum === 57));
});

test('three brothers arithmetic, number-circle identity and divisor examples agree', () => {
  let money = [13, 7, 4];
  for (let giver = 0; giver < 3; giver++) {
    const before = [...money];
    money = before.map((amount, i) => i === giver ? amount - before.reduce((sum, n, j) => sum + (j === giver ? 0 : n), 0) : amount * 2);
    assert.deepEqual(money, [[2, 14, 8], [4, 4, 16], [8, 8, 8]][giver]);
  }
  for (let n = 1; n <= 100; n++) assert.equal(Array.from({length: n - 1}, (_, i) => i + 1).reduce((a, b) => a + b, 0) * 2 + n, n * n);
  for (const [n, expected] of [[10, 8], [12, 16], [6, 6]]) {
    assert.equal(Array.from({length: n - 1}, (_, i) => i + 1).filter(d => n % d === 0).reduce((a, b) => a + b, 0), expected);
  }
});
