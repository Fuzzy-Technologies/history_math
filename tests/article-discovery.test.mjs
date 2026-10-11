import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {articleFiles, checkSources} from '../scripts/article-checks.mjs';

test('source gates discover both nested migrated editions and existing flat article files', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'history-math-discovery-'));
  try {
    for (const folder of ['site/_articles/ru', 'site/_articles/en', 'reviews', 'schemas']) mkdirSync(resolve(root, folder), {recursive: true});
    for (const file of ['article-v1.schema.json', 'contract-lock.json']) copyFileSync('schemas/' + file, resolve(root, 'schemas', file));
    const template = readFileSync('templates/minimal-article.md', 'utf8').replaceAll('example-minimal', 'hm-test');
    const ru = template.replace('lang: en', 'lang: ru').replace('/articles/hm-test/', '/ru/articles/hm-test/');
    const en = template.replace('article_id: hm-test\n', 'article_id: hm-test-en\n');
    writeFileSync(resolve(root, 'site/_articles/ru/hm-test.md'), ru);
    writeFileSync(resolve(root, 'site/_articles/en/hm-test-en.md'), en);
    for (const id of ['hm-test', 'hm-test-en']) {
      writeFileSync(resolve(root, 'reviews', id + '.json'), JSON.stringify({review_version: 1, article_id: id, approval: {status: 'pending'}, questions: []}));
    }
    assert.deepEqual(articleFiles(root), ['site/_articles/en/hm-test-en.md', 'site/_articles/ru/hm-test.md']);
    const result = checkSources(root);
    assert.deepEqual(result.findings.filter(finding => finding.severity === 'error'), []);
    assert.deepEqual(result.articles.map(article => article.id).sort(), ['hm-test', 'hm-test-en']);
    const flat = template.replaceAll('hm-test', 'hm-other');
    writeFileSync(resolve(root, 'site/_articles/hm-other.en.md'), flat);
    assert.equal(articleFiles(root).length, 3);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('recursive source discovery rejects symbolic links before reading article data', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'history-math-discovery-'));
  try {
    mkdirSync(resolve(root, 'site/_articles/ru'), {recursive: true});
    writeFileSync(resolve(root, 'outside.md'), 'outside article source');
    symlinkSync(resolve(root, 'outside.md'), resolve(root, 'site/_articles/ru/unsafe.md'));
    assert.throws(() => articleFiles(root), /symbolic links/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
