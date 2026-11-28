import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {catalogState, catalogPage, catalogUrl} from '../site/assets/catalog.js';
import {topicKey} from '../site/assets/core.js';

test('bilingual topic groups filter the full catalog while exact tag URLs keep their original scope', async () => {
  const groups = JSON.parse(await readFile(new URL('../site/_data/catalog_topics.json', import.meta.url)));
  const topics = new Map(groups.map(group => [group.id, new Set(group.tags.map(topicKey))]));
  assert.equal(groups.length, topics.size);
  for (const group of groups) {
    assert.match(group.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(group.ru && group.en && group.tags.length);
  }

  for (const [geometry, trigonometry] of [['геометрия', 'тригонометрия'], ['geometry', 'trigonometry']]) {
    const records = [
      {type: 'essay', tags: [geometry]}, {type: 'essay', tags: [trigonometry]},
      {type: 'instrument', tags: [geometry]}, {type: 'essay', tags: ['Euclid']}
    ];
    const filters = {types: ['essay'], tags: [geometry, trigonometry, 'Euclid'], topics};
    const url = new URL('https://example.invalid/publications/?type=essay&topic=geometry');
    const grouped = catalogState(url.searchParams, filters);
    assert.equal(grouped.topic, 'geometry');
    assert.deepEqual(catalogPage(records, grouped, topics).items, records.slice(0, 2));
    assert.equal(catalogUrl(url, grouped).search, url.search);
    const exact = catalogState(new URLSearchParams({type: 'essay', tag: geometry}), filters);
    assert.deepEqual(catalogPage(records, exact, topics).items, [records[0]]);
    assert.equal(catalogUrl(url, exact).searchParams.has('topic'), false);
    assert.equal(catalogUrl(catalogUrl(url, exact), grouped).searchParams.has('tag'), false);
    const fallback = catalogState(new URLSearchParams('topic=unknown&tag=Euclid'), filters);
    assert.equal(fallback.tag, 'Euclid');
    assert.deepEqual(catalogPage(records, fallback, topics).items, [records[3]]);
  }
});
