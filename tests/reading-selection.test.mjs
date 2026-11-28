import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {journalGroups, newestFirst} from '../site/assets/core.js';

const config = name => JSON.parse(readFileSync(new URL(`../site/_data/${name}.json`, import.meta.url)));
const rubrics = config('home_rubrics');
const limits = config('reading_selection');
const groups = ['humor', 'people', 'instruments', 'other'];
for (const language of ['ru', 'en']) {
  const rules = {...limits, rubric_tags: Object.fromEntries(rubrics.map(r => [r.id, r[language].tags]))};
  const articles = Array.from({length: 65}, (_, i) => {
    const group = groups[i % 4];
    return {url: `/${language}/${String(i).padStart(2, '0')}`, language, date: `2025-01-${String(i % 23 + 1).padStart(2, '0')}`,
      group, type: group === 'instruments' ? 'instrument' : 'essay', tags: rules.rubric_tags[group]?.slice(-1) || [], status: 'published'};
  });
  const ordered = [...articles].sort(newestFirst);
  test(`${language}: random recommendations obey half-window, hard quotas, hero exclusion and descending dates`, () => {
    const recent = ordered.slice(0, 33);
    const excluded = recent.slice(0, 5).map(r => r.url);
    const notice = {...ordered[0], url: '/notice', translation_notice: true};
    const draft = {...ordered[0], url: '/draft', status: 'draft'};
    const wrongLanguage = {...ordered[0], url: '/wrong', language: 'other'};
    const records = [...articles, notice, draft, wrongLanguage, ...articles];
    for (const random of [() => 0, () => 0.4, () => 0.9999]) {
      const {reading, archive} = journalGroups(records, language, rules, {excluded, random});
      assert.deepEqual(reading, [...reading].sort(newestFirst));
      assert.ok(reading.every(r => recent.includes(r) && !excluded.includes(r.url)));
      for (const group of groups) assert.equal(reading.filter(r => r.group === group).length, rules.group_limits[group]);
      assert.equal(archive.length, articles.length + 1 - 10);
      assert.ok(archive.includes(notice));
      assert.equal(new Set([...reading, ...archive].map(r => r.url)).size, 66);
      const next = journalGroups(records, language, rules, {excluded, previous: reading.map(r => r.url), random});
      assert.notDeepEqual(reading, next.reading);
    }
  });
  test(`${language}: sparse groups stay short and exclusions never expand the window`, () => {
    const onlyHumor = ordered.map(r => ({...r, tags: [rules.rubric_tags.humor[0]]}));
    const get = (records, options) => journalGroups(records, language, rules, options).reading;
    assert.equal(get(onlyHumor).length, 2);
    assert.equal(get(onlyHumor.slice(0, 1)).length, 1);
    assert.deepEqual(get(onlyHumor, {excluded: onlyHumor.slice(0, 33).map(r => r.url)}), []);
    assert.deepEqual(get([]), []);
    const pair = onlyHumor.slice(0, 2);
    assert.deepEqual(get(pair), pair.slice(0, 1));
    assert.deepEqual(get(pair, {excluded: [pair[0].url]}), []);
  });
}
