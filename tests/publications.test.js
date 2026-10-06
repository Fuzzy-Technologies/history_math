import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import test from 'node:test';

const catalog = JSON.parse(readFileSync('site/_data/publications.json', 'utf8'));
const items = catalog.items;

test('Published works have distinct identities, real local images and bilingual copy', () => {
  assert.deepEqual(items.map(item => item.id), ['algebra', 'history', 'equations', 'calendar-2026', 'road-of-life']);
  for (const item of items) {
    for (const field of ['title', 'subtitle', 'author', 'kind', 'description']) {
      for (const language of ['en', 'ru']) assert.ok(item[field][language].trim());
    }
    for (const filename of [item.cover, ...(item.gallery ?? []).map(image => image.image)]) {
      assert.match(filename, /^[a-z0-9-]+\.(png|jpg)$/);
      assert.ok(existsSync('site/assets/images/publications/' + filename));
    }
    assert.ok(item.cover_width > 0 && item.cover_height > 0);
  }
});

test('Edition-specific purchases preserve author shop priority and exact destinations', () => {
  const editions = items[0].offers;
  assert.deepEqual(editions.map(offer => offer.id), ['ebook', 'paperback', 'gift']);
  assert.equal(editions[0].links[0].url, 'https://web.tribute.tg/p/byD');
  assert.equal(editions[1].links[0].url, 'https://ridero.ru/books/bibliya_matematika/');
  assert.equal(editions[2].links[0].url, 'https://www.avito.ru/moskva/knigi_i_zhurnaly/kniga_bibliya_matematika_ot_mansura_gilmullina_8302534325');
  assert.equal(editions[2].links[1].url, 'https://t.me/tribute/app?startapp=hbuz');
  const pdfIds = ['byD', 'bv1', 'byM', 'zvp', 'byU'];
  items.forEach((item, index) => assert.equal(item.offers[0].links[0].url, 'https://web.tribute.tg/p/' + pdfIds[index]));
  assert.equal(items[3].offers.length, 1, 'Calendar must remain shop-only');
  for (const item of items) for (const offer of item.offers) for (const link of offer.links) {
    const url = new URL(link.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(['web.tribute.tg', 't.me', 'ridero.ru', 'www.avito.ru'].includes(url.hostname));
  }
});

test('Showcase omits prices and can retire the limited gift purchase option', () => {
  assert.doesNotMatch(JSON.stringify(catalog), /₽|руб(?:лей|ля|ль)|\b(?:price|rubles)\b/i);
  const copy = structuredClone(items[0]);
  copy.offers.find(offer => offer.id === 'gift').enabled = false;
  assert.deepEqual(copy.offers.filter(offer => offer.enabled).map(offer => offer.id), ['ebook', 'paperback']);
  assert.match(readFileSync('site/_includes/publications.html', 'utf8'), /where: 'enabled', true/);
});
