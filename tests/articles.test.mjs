import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import {checkArticle, checkContract} from '../scripts/article-checks.mjs';
import {reportLanguage, overall, humanReport} from '../scripts/article-messages.mjs';
import {updateReportComment} from '../scripts/article-comment.mjs';
import {articlePrBody} from '../scripts/article-pr.mjs';

const root = resolve('.');
const text = readFileSync('templates/article.md', 'utf8').replace(/\r\n/g, '\n');
const errors = input => checkArticle(input, 'article.md', root).findings.filter(x => x.severity === 'error');
test('filled template and minimal example satisfy the canonical site contract', () => {
  assert.deepEqual(errors(text), []);
  assert.deepEqual(errors(readFileSync('templates/minimal-article.md', 'utf8')), []);
  assert.deepEqual(checkContract(root), []);
});
test('the site contract rejects external ownership, changed schema bytes and missing locks', () => {
  mkdirSync(resolve(root, 'test-results'), {recursive: true});
  const scratch = mkdtempSync(resolve(root, 'test-results/contract-'));
  assert.ok(scratch.startsWith(resolve(root, 'test-results') + sep));
  try {
    mkdirSync(resolve(scratch, 'schemas'));
    const schemaFile = resolve(scratch, 'schemas/article-v1.schema.json');
    const lockFile = resolve(scratch, 'schemas/contract-lock.json');
    const original = readFileSync(resolve(root, 'schemas/article-v1.schema.json'));
    const lock = JSON.parse(readFileSync(resolve(root, 'schemas/contract-lock.json')));
    writeFileSync(schemaFile, original);
    writeFileSync(lockFile, JSON.stringify(lock));
    assert.deepEqual(checkContract(scratch), []);
    writeFileSync(lockFile, JSON.stringify({...lock, repository: 'FELab'}));
    assert.equal(checkContract(scratch)[0].code, 'HM_CONTRACT');
    writeFileSync(lockFile, JSON.stringify(lock));
    writeFileSync(schemaFile, Buffer.concat([original, Buffer.from('\n')]));
    assert.equal(checkContract(scratch)[0].code, 'HM_CONTRACT');
    writeFileSync(schemaFile, original);
    rmSync(lockFile);
    assert.equal(checkContract(scratch)[0].code, 'HM_CONTRACT');
  } finally {
    assert.ok(scratch.startsWith(resolve(root, 'test-results') + sep));
    rmSync(scratch, {recursive: true});
  }
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

test('external links require descriptive text while destinations and code remain intact', () => {
  for (const body of [
    '\nSource: https://example.org/article',
    '\n<https://example.org/article>',
    '\n[https://example.org/article](https://example.org/article)',
    '\n[^source]: https://example.org/article',
    '\nSource: www.example.org/article'
  ]) assert.ok(errors(text + body).some(x => x.code === 'HM_LINK'), body);
  for (const body of [
    '\n[Original publication](https://example.org/article)',
    '\n[Original publication][source]\n\n[source]: https://example.org/article',
    '\n[^example-note]: [Original publication](https://example.org/article)',
    '\n`https://example.org/article`',
    '\n```text\nhttps://example.org/article\n```'
  ]) assert.deepEqual(errors(text + body), [], body);
  const findings = checkArticle(text + '\nSource: https://example.org/article', 'article.md', root).findings;
  assert.match(humanReport({language: 'ru', commit: 'sha', checks: {source: 'fail'}, findings}), /Используйте содержательный текст ссылки/);
});

test('preview, social and hero roles retain provenance and count only displayed figures', () => {
  const hero = text.replace('status: draft', 'status: draft\nhero_image: /assets/images/example/triangle.svg\nhero_alt: A triangle with a marked base and height.\nhero_caption: Figure 1. Base and height of a triangle.').replace('{% include article-figure.html id="fig-example" %}', '');
  assert.deepEqual(errors(hero), []);
  assert.equal(checkArticle(hero, 'article.md', root).figureCount, 1);
  assert.ok(errors(hero.replace('hero_alt: A triangle with a marked base and height.', 'hero_alt: Different context')).some(x => x.code === 'HM_FIGURE'));
  assert.ok(errors(text + '\n{% include article-figure.html id="fig-example" %}').some(x => x.code === 'HM_IDENTIFIER'));
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

test('own diagnostic actions use local dictionaries while codes and tool output stay stable', () => {
  const report = {language: 'ru', commit: 'sha', checks: {source: 'fail'}, findings: [{code: 'HM_METADATA', severity: 'error', detail: 'author must display the authors array'}, {code: 'HM_REQUIRED', severity: 'warning', detail: 'browser'}]};
  assert.match(humanReport(report), /Поле author должно отображать список authors/);
  assert.match(humanReport(report), /HM_METADATA/);
  assert.ok(!humanReport(report).includes('author must display'));
  assert.match(humanReport({...report, language: 'en'}), /author must display/);
  assert.ok(Buffer.byteLength(readFileSync('schemas/messages.json')) < 24000);
  const dictionary = readFileSync('schemas/messages.json', 'utf8');
  assert.ok(!/\?{3,}|\uFFFD/.test(dictionary), 'Localized messages must retain Unicode text');
  assert.match(JSON.parse(dictionary).ru.pr.preview, /Отчёт/);
});

test('automated descriptions use the head suffix while preserving article content language', () => {
  const input = {article: {title: 'Русская статья', lang: 'ru', permalink: '/ru/articles/example/'}, review: {}, report: {checks: {source: 'pass'}, findings: []}, commit: 'sha', runUrl: 'https://github.com/example/repo/actions', infrastructureUrl: 'https://github.com/example/repo/pull/1'};
  assert.match(articlePrBody({...input, branch: 'feature/article-ru'}), /Обязательные технические проверки не выполнены/);
  for (const branch of ['feature/article-en', 'feature/ru-article', 'feature/article-ru-fix']) {
    const body = articlePrBody({...input, branch});
    assert.match(body, /Required technical checks were not completed/);
    assert.match(body, /Русская статья/);
  }
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
