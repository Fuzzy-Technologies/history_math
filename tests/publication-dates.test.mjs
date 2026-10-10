import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {publicationDates} from '../scripts/publication-dates.mjs';

function repository(t) {
  const root = mkdtempSync(join(tmpdir(), 'publication-dates-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  git('init', '-b', 'master');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.invalid');
  mkdirSync(join(root, 'site/_articles'), {recursive: true});
  const article = (status, name = 'one', lang = 'ru') => writeFileSync(join(root, `site/_articles/${name}.md`),
    `---\narticle_id: ${name}\nlang: ${lang}\nstatus: ${status}\n---\nText\n`);
  const commit = (date, ...args) => execFileSync('git', args.length ? args : ['commit', '-am', date], {
    cwd: root, encoding: 'utf8', env: {...process.env, GIT_AUTHOR_DATE: '2020-01-01T00:00:00Z', GIT_COMMITTER_DATE: date},
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return {root, git, article, commit};
}

test('first public merge wins over draft, author and feature dates; edits and moves preserve it', t => {
  const {root, git, article, commit} = repository(t);
  article('draft'); git('add', '.'); commit('2026-10-01T12:00:00Z');
  assert.deepEqual({...publicationDates(root, 'master').articles}, {});
  git('switch', '-c', 'feature/article');
  article('published'); commit('2026-10-02T12:00:00Z');
  assert.deepEqual({...publicationDates(root, 'master').articles}, {});
  git('switch', 'master');
  commit('2026-10-09T21:01:00Z', 'merge', '--no-ff', 'feature/article', '-m', 'Publish');
  const expected = publicationDates(root, 'master').articles['one:ru'];
  assert.equal(expected.date, '2026-10-10');
  assert.equal(expected.commit, git('rev-parse', 'HEAD'));
  assert.equal(new Date(expected.published_at).toISOString(), '2026-10-09T21:01:00.000Z');
  renameSync(join(root, 'site/_articles/one.md'), join(root, 'site/_articles/renamed.md'));
  git('add', '-A'); commit('2026-10-11T12:00:00Z');
  writeFileSync(join(root, 'site/_articles/renamed.md'), '---\narticle_id: one\nlang: ru\nstatus: draft\n---\nUnpublish\n');
  commit('2026-10-12T12:00:00Z');
  article('published'); git('add', '-A'); commit('2026-10-13T12:00:00Z');
  assert.deepEqual(publicationDates(root, 'master').articles['one:ru'], expected);
  assert.deepEqual(publicationDates(root, 'master').articles['one:ru'], expected);
});

test('squash batches share a date; translations publish independently; demo is not publication', t => {
  const {root, git, article, commit} = repository(t);
  article('demo'); git('add', '.'); commit('2026-10-01T12:00:00Z');
  git('switch', '-c', 'feature/batch');
  article('published'); article('published', 'two'); git('add', '.'); commit('2026-10-02T12:00:00Z');
  git('switch', 'master'); git('merge', '--squash', 'feature/batch'); commit('2026-10-09T20:59:00Z');
  const batch = publicationDates(root, 'master').articles;
  assert.equal(batch['one:ru'].date, '2026-10-09');
  assert.equal(batch['two:ru'].date, '2026-10-09');
  article('published', 'one', 'en'); commit('2026-10-10T22:00:00Z');
  const later = publicationDates(root, 'master').articles;
  assert.equal(later['one:en'].date, '2026-10-11');
  assert.equal(later['one:ru'].date, '2026-10-09');
});

test('missing refs and shallow history fail instead of inventing a publication date', t => {
  const {root, git, article, commit} = repository(t);
  article('published'); git('add', '.'); commit('2026-10-01T12:00:00Z');
  assert.throws(() => publicationDates(root, 'missing'));
  assert.throws(() => publicationDates(root, '--all'));
  writeFileSync(join(root, '.git/shallow'), git('rev-parse', 'HEAD') + '\n');
  assert.throws(() => publicationDates(root, 'master'), /full Git history/);
});
