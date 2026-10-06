import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {checkArticle, checkContract} from '../scripts/article-checks.mjs';
import {reportLanguage, overall, humanReport} from '../scripts/article-messages.mjs';
import {updateReportComment} from '../scripts/article-comment.mjs';

const root = resolve('.');
const text = readFileSync('templates/article.md', 'utf8');
const errors = input => checkArticle(input, 'article.md', root).findings.filter(x => x.severity === 'error');
test('filled template and minimal example satisfy the pinned contract', () => {
  assert.deepEqual(errors(text), []);
  assert.deepEqual(errors(readFileSync('templates/minimal-article.md', 'utf8')), []);
  assert.deepEqual(checkContract(root), []);
});
test('missing metadata, asset, caption, reference and malformed formula block validation', () => {
  for (const [input, code] of [
    [text.replace('title: Article preparation example\n', ''), 'HM_METADATA'],
    [text.replace('/example/triangle.svg', '/example/missing.png'), 'HM_IMAGE'],
    [text.replace('alt: A triangle with a marked base and height.', 'alt: ""'), 'HM_FIGURE'],
    [text.replace('](#formula)', '](#missing)'), 'HM_LINK'],
    [text.replace('a^2+b^2=c^2', '\\unknowncommand{x}'), 'HM_MATH'],
    [text.replace('$a^2+b^2=c^2$', '$a^2+b^2=c^2'), 'HM_MATH'],
    [text.replace('[^example-note]:', '[^other-note]:'), 'HM_LINK'],
    [text.replace('/example/triangle.svg', '/example/../triangle.svg'), 'HM_PATH']
  ]) assert.ok(errors(input).some(x => x.code === code), `Expected ${code}`);
});
test('date validation and publication date requirement reject invalid metadata', () => {
  assert.ok(errors(text.replace('status: draft', 'status: published')).some(x => x.code === 'HM_METADATA'));
  assert.ok(errors(text.replace('status: draft', 'status: draft\ndate: 2026-02-30')).some(x => x.code === 'HM_METADATA'));
});
test('stable identity and content language are independent of automation language', () => {
  const identities = new Set();
  checkArticle(text, 'a.md', root, identities);
  assert.ok(checkArticle(text, 'b.md', root, identities).findings.some(x => x.code === 'HM_IDENTIFIER'));
  for (const [branch, language] of [
    ['feature/article-0123-ru', 'ru'], ['feature/article-0123-en', 'en'],
    ['feature/article-0123', 'en'], ['feature/ru-article-0123', 'en'],
    ['feature/article-0123-ru-fix', 'en'], ['feature/article-0123-RU', 'en']
  ]) assert.equal(reportLanguage(branch), language);
  const russian = text.replace('lang: en', 'lang: ru').replace('/articles/example-article/', '/ru/articles/example-article/');
  assert.deepEqual(errors(russian), []);
  assert.match(humanReport({language: reportLanguage('feature/article-en'), commit: 'abc', checks: {source: 'pass', build: 'pass', output: 'pass', browser: 'pass'}, findings: []}), /Technical checks passed/);
});
test('required checks never pass when absent, skipped or unavailable', () => {
  assert.equal(overall({checks: {source: 'pass'}, findings: []}), 'incomplete');
  assert.equal(overall({checks: {source: 'pass', build: 'pass', output: 'pass', browser: 'not_run'}, findings: []}), 'incomplete');
  assert.equal(overall({checks: {source: 'pass', build: 'pass', output: 'pass', browser: 'pass'}, findings: [{severity: 'editor'}]}), 'pass');
});
test('one bot comment is updated and stale runs cannot replace newer fork heads', async () => {
  const comments = []; let created = 0; let updated = 0; let head = 'sha1';
  const github = {rest: {pulls: {get: async () => ({data: {head: {sha: head, ref: 'feature/article-ru', repo: {full_name: 'someone/fork'}}}})}, issues: {
    listComments: {}, createComment: async args => { created++; comments.push({id: 1, user: {type: 'Bot'}, body: args.body}); },
    updateComment: async args => { updated++; comments[0].body = args.body; }
  }}, paginate: async () => comments};
  const args = {github, repo: {owner: 'owner', repo: 'repo'}, number: 1, commit: 'sha1', result: 'pass', runUrl: 'https://github.com/owner/repo/actions/runs/1'};
  assert.equal(await updateReportComment(args), true);
  assert.match(comments[0].body, /Технические проверки пройдены/);
  assert.equal(await updateReportComment(args), true);
  assert.equal(created, 1); assert.equal(updated, 1);
  head = 'sha2'; assert.equal(await updateReportComment(args), false);
  assert.equal(updated, 1);
});
