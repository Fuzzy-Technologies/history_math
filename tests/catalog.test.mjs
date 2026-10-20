import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogPageSizes, catalogState, catalogPage, catalogPageNumbers, catalogUrl} from '../site/assets/catalog.js';

const options = {types: ['essay', 'problem', 'instrument', 'note'], tags: ['история', 'счёт', 'geometry']};
const items = Array.from({length: 107}, (_, index) => ({id: index + 1,
  type: index % 2 ? 'problem' : 'instrument', tags: index % 3 ? ['geometry'] : ['история', 'счёт']}));

test('catalog defaults, URL validation and supported page sizes are stable', () => {
  assert.deepEqual(catalogPageSizes, [5, 10, 20, 50, 100]);
  assert.deepEqual(catalogState(new URLSearchParams(), options), {type: '', tag: '', page: 1, perPage: 10});
  assert.deepEqual(catalogState(new URLSearchParams('type=problem&tag=%D1%81%D1%87%D1%91%D1%82&page=3&per_page=50'), options),
    {type: 'problem', tag: 'счёт', page: 3, perPage: 50});
  for (const value of ['0', '-1', '1.5', 'Infinity', 'NaN', '9007199254740992', '1e3', '1e2', '0x32', ' 50 ', '100.0', '+20', '<script>']) {
    const state = catalogState(new URLSearchParams({page: value, per_page: value, type: value, tag: value}), options);
    assert.deepEqual(state, {type: '', tag: '', page: 1, perPage: 10});
  }
});

test('pagination covers a large archive exactly once with bounded visible pages', () => {
  for (const perPage of catalogPageSizes) {
    const state = {type: '', tag: '', perPage, page: 1};
    const first = catalogPage(items, state);
    assert.equal(first.total, 107);
    assert.equal(first.pageCount, Math.ceil(107 / perPage));
    const visited = [];
    for (let page = 1; page <= first.pageCount; page++) {
      const result = catalogPage(items, {...state, page});
      assert.ok(result.items.length <= perPage);
      assert.equal(result.start, (page - 1) * perPage + 1);
      assert.equal(result.end, Math.min(page * perPage, 107));
      visited.push(...result.items.map(item => item.id));
    }
    assert.deepEqual(visited, items.map(item => item.id));
  }
});

test('filters apply to the whole archive before slicing and clamp a stale page', () => {
  const result = catalogPage(items, {type: 'problem', tag: 'счёт', perPage: 5, page: 99});
  const matching = items.filter(item => item.type === 'problem' && item.tags.includes('счёт'));
  assert.equal(result.total, matching.length);
  assert.equal(result.page, Math.ceil(matching.length / 5));
  assert.deepEqual(result.items, matching.slice((result.page - 1) * 5));
  const empty = catalogPage(items, {type: 'essay', tag: '', perPage: 10, page: 20});
  assert.deepEqual(empty, {items: [], total: 0, pageCount: 0, page: 1, perPage: 10, start: 0, end: 0});
  assert.equal(catalogPage(items, {type: '', tag: '', perPage: 7, page: -2}).items.length, 10);
});

test('numbered navigation remains bounded and keeps edges/current neighbours for thousands of pages', () => {
  for (const total of [1, 2, 5, 10, 1000, 100000]) for (const page of [1, 2, 4, Math.ceil(total / 2), total - 1, total].filter(n => n > 0 && n <= total)) {
    const tokens = catalogPageNumbers(page, total);
    const pages = tokens.filter(token => typeof token === 'number');
    assert.ok(tokens.length <= 9);
    assert.equal(pages[0], 1);
    assert.equal(pages.at(-1), total);
    assert.ok(pages.includes(page));
    assert.equal(new Set(pages).size, pages.length);
    assert.deepEqual([...pages].sort((a, b) => a - b), pages);
    if (page > 1) assert.ok(pages.includes(page - 1));
    if (page < total) assert.ok(pages.includes(page + 1));
    assert.ok(!tokens.includes('ellipsis') || total > pages.length);
  }
  assert.deepEqual(catalogPageNumbers(1, 0), []);
});

test('catalog URLs round-trip Unicode filters, preserve unrelated state and omit defaults', () => {
  const current = new URL('https://example.invalid/history_math/ru/materials/?from=menu#catalog');
  const state = {type: 'instrument', tag: 'счёт', perPage: 20, page: 4};
  const url = catalogUrl(current, state);
  assert.equal(url.origin, current.origin);
  assert.equal(url.pathname, current.pathname);
  assert.equal(url.hash, current.hash);
  assert.equal(url.searchParams.get('from'), 'menu');
  assert.deepEqual(catalogState(url.searchParams, options), state);
  const reset = catalogUrl(url, {type: '', tag: '', perPage: 10, page: 1});
  assert.equal(reset.search, '?from=menu');
});
