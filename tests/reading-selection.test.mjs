import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {journalGroups, newestFirst, seriesKey} from '../site/assets/core.js';

const rules = JSON.parse(readFileSync(new URL('../site/_data/reading_selection.json', import.meta.url)));
const noShuffle = () => 1 - Number.EPSILON;
const articles = (count, glossary = 0, language = 'ru') => Array.from({length: count}, (_, index) => ({
  url: `/${language}/article-${String(index).padStart(3, '0')}/`, date: '2026-10-21', status: 'published', language,
  tags: index >= count - glossary ? ['Глоссарий'] : ['History of Mathematics']
}));

test('recommendations sample the newest fifty and partition all published articles without duplicates', () => {
  for (const language of ['ru', 'en']) for (const count of [0, 5, 10, 11, 16, 43, 50, 51, 210]) {
    const input = articles(count, 0, language);
    const excluded = [{...input[0], url: '/demo/', status: 'demo'}, {...input[0], url: '/draft/', status: 'draft'},
      {...input[0], url: '/other/', language: language === 'ru' ? 'en' : 'ru', status: 'published'}];
    const groups = journalGroups([...input, ...excluded, ...input], language, rules, {random: () => 0.4});
    assert.equal(groups.reading.length, Math.min(10, count));
    assert.equal(groups.archive.length, Math.max(0, count - 10));
    assert.equal(new Set([...groups.reading, ...groups.archive].map(record => record.url)).size, count);
    const window = [...input].sort(newestFirst).slice(0, 50);
    assert.ok(groups.reading.every(record => window.includes(record)));
    assert.deepEqual(groups.reading, [...groups.reading].sort(newestFirst));
    assert.deepEqual(journalGroups([...input].reverse(), language, rules, {random: () => 0.4}), groups);
  }
});

test('a batch of twenty-seven glossary entries cannot fill a mixed ten-card selection', () => {
  const input = articles(43, 27);
  for (const random of [() => 0, () => 0.4, noShuffle, Math.random]) {
    const {reading} = journalGroups(input, 'ru', rules, {random});
    assert.equal(reading.length, 10);
    assert.ok(reading.filter(record => seriesKey(record, rules) === 'glossary').length <= 3);
    assert.deepEqual(reading, [...reading].sort(newestFirst));
  }
});

test('series limits soften only when alternatives cannot fill ten cards', () => {
  for (const count of [1, 5, 10, 27]) {
    assert.equal(journalGroups(articles(count, count), 'ru', rules).reading.length, Math.min(10, count));
  }
  const mixed = journalGroups(articles(12, 10), 'ru', rules).reading;
  assert.equal(mixed.length, 10);
  assert.equal(mixed.filter(record => !seriesKey(record, rules)).length, 2);
  const explicit = articles(30).map((record, index) => ({...record, series: `Series_${index % 4}`}));
  const counts = new Map();
  for (const record of journalGroups(explicit, 'ru', rules).reading) {
    const key = seriesKey(record, rules);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  assert.ok([...counts.values()].every(count => count <= 3));
});

test('series keys ignore broad topics and fold explicit series and glossary aliases', () => {
  assert.equal(seriesKey({tags: ['History of Mathematics', 'Персоналии']}, rules), '');
  assert.equal(seriesKey({series: ' Series_ONE ', tags: []}, rules), 'series one');
  for (const tag of ['ГЛОССАРИЙ', 'Mathematical_Glossary']) assert.equal(seriesKey({tags: [tag]}, rules), 'glossary');
  assert.equal(seriesKey({series: 'Glossary', tags: []}, rules), 'glossary');
});

test('a repeated random sequence still changes the selection without weakening its series limit', () => {
  const input = articles(43, 27);
  let previous = [];
  for (let turn = 0; turn < 25; turn++) {
    const {reading, archive} = journalGroups(input, 'ru', rules, {previous, random: () => 0.4});
    const urls = reading.map(record => record.url);
    assert.notDeepEqual(urls, previous);
    assert.ok(reading.filter(record => seriesKey(record, rules) === 'glossary').length <= 3);
    assert.ok(archive.every(record => !urls.includes(record.url)));
    previous = urls;
  }
});

test('dates order the chosen subset rather than forcing the newest ten, including historical dates', () => {
  const input = articles(70).map((record, index) => ({...record, date: new Date(Date.UTC(1990, 0, index + 1)).toISOString().slice(0, 10)}));
  const selected = journalGroups(input, 'ru', rules, {random: () => 0}).reading;
  assert.notDeepEqual(selected, [...input].sort(newestFirst).slice(0, 10));
  assert.deepEqual(selected, [...selected].sort(newestFirst));
  assert.deepEqual(input.map(record => record.url), articles(70).map(record => record.url));
});
