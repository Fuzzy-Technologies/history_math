import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {checkReview, packageDigest} from '../scripts/article-review.mjs';
import {checkArticle} from '../scripts/article-checks.mjs';

test('short biographies need no artificial heading and retain the Personalia tag', () => {
  const text = readFileSync('templates/minimal-article.md', 'utf8').replace('## First section {#first-section}\n\n', '').replace('lang: en', 'lang: ru').replace('/articles/', '/ru/articles/').replace('tags: [example]', 'series: Персоналии\ntags: [Персоналии]');
  assert.deepEqual(checkArticle(text, 'short.md', resolve('.')).findings.filter(x => x.severity === 'error'), []);
  assert.ok(checkArticle(text.replace('tags: [Персоналии]', 'tags: [историяматематики]'), 'short.md', resolve('.')).findings.some(x => x.code === 'HM_METADATA'));
});

test('publication approval covers text, images and resolved blocking questions', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'history-math-review-'));
  try {
    mkdirSync(resolve(root, 'reviews'));
    mkdirSync(resolve(root, 'site/assets/images/example'), {recursive: true});
    const image = resolve(root, 'site/assets/images/example/portrait.png');
    writeFileSync(image, 'original public image');
    const data = {article_id: 'example', status: 'draft', figures: [{path: '/assets/images/example/portrait.png'}]};
    const text = 'Public article\n';
    const review = {review_version: 1, article_id: 'example', questions: [{id: 'source', question: 'Confirm the source', blocking: true, state: 'open'}], approval: {status: 'pending'}};
    const save = () => writeFileSync(resolve(root, 'reviews/example.json'), JSON.stringify(review));
    const errors = (content = text) => checkReview(content, data, root).filter(x => x.severity === 'error');
    assert.equal(errors()[0].code, 'HM_REVIEW');
    save(); assert.deepEqual(errors(), []);
    data.status = 'published'; assert.ok(errors().length);
    review.approval = {status: 'approved', reviewed_by: 'Test editor', date: '2026-10-08', package_sha256: packageDigest(text, data, root)};
    save(); assert.ok(errors().some(x => /blocking/.test(x.detail)));
    review.questions[0].state = 'resolved'; save(); assert.ok(errors().some(x => /resolution/.test(x.detail)));
    review.questions[0].resolution = 'Verified in the cited source'; save(); assert.deepEqual(errors(), []);
    assert.ok(errors(text + 'changed').some(x => /does not match/.test(x.detail)));
    writeFileSync(image, 'changed public image'); assert.ok(errors().some(x => /does not match/.test(x.detail)));
    review.questions.push({...review.questions[0]}); save(); assert.ok(errors().some(x => /duplicate/.test(x.detail)));
    review.questions.pop(); review.approval.date = '2026-02-30'; save(); assert.ok(errors().some(x => /valid date/.test(x.detail)));
  } finally { rmSync(root, {recursive: true}); }
});
