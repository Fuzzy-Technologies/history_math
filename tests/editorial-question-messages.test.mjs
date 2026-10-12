import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {importedQuestionMessages, editorialQuestionText, hasQuestionTranslation, validQuestionLocalizations} from '../scripts/editorial-question-messages.mjs';
import {humanReport} from '../scripts/article-messages.mjs';
import {articlePrBody} from '../scripts/article-pr.mjs';
import {checkReview} from '../scripts/article-review.mjs';

test('all imported editorial questions have source-bound Russian text and unchanged evidence links', () => {
  assert.equal(importedQuestionMessages.length, 213);
  for (const entry of importedQuestionMessages) {
    const question = {question: entry.source};
    assert.ok(/[А-Яа-яЁё]/u.test(entry.ru));
    assert.equal(editorialQuestionText(question, 'ru'), entry.ru);
    assert.equal(editorialQuestionText(question, 'en'), entry.source);
    assert.equal(hasQuestionTranslation(question, 'ru', 'en'), true);
    assert.deepEqual(entry.ru.match(/https?:\/\/\S+/g) ?? [], entry.source.match(/https?:\/\/\S+/g) ?? []);
    assert.equal(hasQuestionTranslation({question: entry.source + ' Changed.'}, 'ru', 'en'), false);
  }
});

test('Russian reports and PR descriptions translate the question as well as its heading', () => {
  const entry = importedQuestionMessages.find(x => x.source.includes('omitting 23'));
  const review = {questions: [{id: 'sequence', question: entry.source, blocking: true, state: 'open'}], approval: {status: 'pending'}};
  const before = structuredClone(review);
  const report = {profile: 'source', language: 'ru', commit: 'sha', checks: {source: 'pass'}, findings: [{code: 'HM_EDITOR', severity: 'editor', file: 'reviews/example-en.json', detail: entry.source}]};
  assert.match(humanReport(report), /число 23 пропущено/);
  assert.ok(!humanReport(report).includes(entry.source));
  assert.ok(humanReport({...report, language: 'en'}).includes(entry.source));
  const input = {article: {title: 'English edition', lang: 'en'}, review, report, runUrl: 'https://github.com/example/repo/actions'};
  assert.ok(articlePrBody({...input, branch: 'feature/article-ru'}).includes(entry.ru));
  assert.ok(articlePrBody({...input, branch: 'feature/article-en'}).includes(entry.source));
  assert.deepEqual(review, before);
});

test('new questions use explicit source-bound localizations and reject stale or malformed data', () => {
  const question = {question: 'Verify this new statement.', localizations: {source: 'Verify this new statement.', ru: 'Проверьте новое утверждение.'}};
  assert.equal(validQuestionLocalizations(question), true);
  assert.equal(editorialQuestionText(question, 'ru'), 'Проверьте новое утверждение.');
  for (const localizations of [null, [], {}, {source: question.question, ru: ''}, {source: 'Older wording', ru: 'Старый перевод'}, {source: question.question, ru: 1}, {source: question.question, de: 'Andere Sprache'}]) {
    const invalid = {...question, localizations};
    assert.equal(validQuestionLocalizations(invalid), false);
    assert.equal(hasQuestionTranslation(invalid, 'ru', 'en'), false);
  }
  const input = {article: {title: 'English edition', lang: 'en'}, review: {questions: [{id: 'new', question: 'Untranslated new question', state: 'open'}]}, report: {profile: 'source', checks: {source: 'pass'}, findings: []}, branch: 'feature/article-ru', runUrl: 'https://github.com/example/repo/actions'};
  assert.throws(() => articlePrBody(input), /Russian editorial question translation required/);
});

test('Russian source checks reject missing or stale translations without closing editorial questions', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'history-math-question-'));
  try {
    mkdirSync(resolve(root, 'reviews'));
    const data = {article_id: 'example-en', lang: 'en', status: 'draft'};
    const question = {id: 'new', question: 'Verify this new statement.', blocking: true, state: 'open'};
    const review = {review_version: 1, article_id: data.article_id, questions: [question], approval: {status: 'pending'}};
    const save = () => writeFileSync(resolve(root, 'reviews/example-en.json'), JSON.stringify(review));
    save();
    assert.ok(checkReview('Text', data, root, 'ru').some(x => x.code === 'HM_REVIEW' && /translation required/.test(x.detail)));
    assert.equal(checkReview('Text', data, root, 'en').filter(x => x.severity === 'error').length, 0);
    question.localizations = {source: question.question, ru: 'Проверьте новое утверждение.'};
    save();
    const findings = checkReview('Text', data, root, 'ru');
    assert.equal(findings.filter(x => x.severity === 'error').length, 0);
    assert.equal(findings[0].code, 'HM_EDITOR');
    assert.equal(findings[0].detail, question.question);
    assert.match(humanReport({profile: 'source', language: 'ru', commit: 'sha', checks: {source: 'pass'}, findings}), /Проверьте новое утверждение/);
    question.question += ' Changed.';
    save();
    assert.ok(checkReview('Text', data, root, 'ru').some(x => /stale/.test(x.detail)));
    assert.equal(review.approval.status, 'pending');
    assert.equal(question.state, 'open');
  } finally { rmSync(root, {recursive: true}); }
});
