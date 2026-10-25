import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';

const source = new URL('../site/', import.meta.url);
const read = path => readFileSync(new URL(path, source), 'utf8');

test('real bilingual catalog pages use publications routes and keep their translation identity', () => {
  for (const [path, language, permalink, title] of [
    ['publications.html', 'en', '/publications/', 'Reading room'],
    ['ru/publications.html', 'ru', '/ru/publications/', 'Публикации']
  ]) {
    const page = read(path);
    const metadata = parse(page.match(/^---\n([\s\S]*?)\n---\n/)[1]);
    assert.equal(metadata.lang, language);
    assert.equal(metadata.permalink, permalink);
    assert.equal(metadata.title, title);
    assert.equal(metadata.translation_key, 'catalog');
    assert.equal(metadata.status, 'published');
    assert.match(page, /include journal-catalog\.html/);
    if (language === 'ru') assert.equal(metadata.description,
      'Статьи, задачи и заметки о математике. Можно выбрать тему или тип публикации.');
  }
  for (const path of ['materials.html', 'ru/materials.html']) assert.equal(existsSync(new URL(path, source)), false);
});

test('shared navigation, discovery, article and error templates have no stale catalog routes', () => {
  const templates = [];
  const collect = directory => {
    for (const entry of readdirSync(new URL(directory, source), {withFileTypes: true})) {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && ['_includes', '_layouts', 'ru'].includes(entry.name)) collect(path);
      else if (entry.isFile() && entry.name.endsWith('.html')) templates.push(path);
    }
  };
  collect('');
  assert.ok(templates.length > 20);
  for (const path of templates) assert.doesNotMatch(read(path), /(?:[/'"])materials\//, path);
  for (const path of ['_includes/page-shell.html', '_includes/journal-home.html',
    '_includes/journal-search.html', '_includes/error-content.html', '_layouts/article.html']) {
    assert.match(read(path), /publications\//, path);
    assert.match(read(path), /relative_url/, path);
  }
});

test('Russian discovery labels consistently describe publications while English stays Reading room', () => {
  const ui = JSON.parse(read('_data/interface.json'));
  assert.equal(ui.ru.reading, 'Публикации');
  assert.equal(ui.ru.read, 'Смотреть публикации');
  assert.equal(ui.ru.all, 'Все публикации');
  assert.equal(ui.ru.type, 'Тип публикации');
  assert.equal(ui.ru.materials_label, 'Публикации журнала');
  for (const value of Object.values(ui.ru)) assert.doesNotMatch(value, /материал|читальн/iu);
  assert.equal(ui.en.reading, 'Reading room');
  assert.equal(ui.en.read, 'Explore the articles');
  assert.equal(ui.en.type, 'Article type');
  assert.equal(ui.en.materials_label, 'Journal articles');
  assert.doesNotMatch(read('assets/app.js'), /читальн/iu);
  assert.doesNotMatch(read('ru/404.html'), /читальн/iu);
});
