import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {publicationPlan, latestPublishedRevision, deployedRevision, planRevision} from '../scripts/publication-plan.mjs';

test('only article sources, owned assets and documentation take the light path', () => {
  const id = 'hm-012345abcdef';
  for (const path of [`site/_articles/${id}-ru.md`, `site/assets/images/${id}/figure-01.png`,
    `site/assets/images/previews/${id}/preview-320.webp`, `reviews/${id}.json`,
    `site/_data/article_image_assets/${id}.json`, 'docs/publication.md']) {
    assert.equal(publicationPlan([path], [id]).fullChecks, false, path);
  }
  for (const path of ['site/_plugins/publication.rb', 'site/assets/app.js', 'site/assets/site.css',
    'site/new-page.md', 'site/_includes/card.html', '.github/workflows/deploy.yml',
    'site/assets/images/logo.png', 'site/assets/images/unknown/figure.png', 'scripts/check_site.py']) {
    assert.equal(publicationPlan(['site/_articles/new.md', path], [id]).fullChecks, true, path);
  }
});

test('deployment baseline requires a successful master publication and API errors fail closed', async () => {
  const valid = {head_sha: 'a'.repeat(40), status: 'completed', conclusion: 'success', head_branch: 'master',
    event: 'push', path: '.github/workflows/deploy.yml', created_at: '2026-10-20T00:00:00Z'};
  const invalid = [{conclusion: 'failure'}, {status: 'in_progress'}, {head_branch: 'feature/test'},
    {path: '.github/workflows/ci.yml'}, {event: 'pull_request'}, {head_sha: 'invalid'}]
    .map(values => ({...valid, ...values, created_at: '2026-10-21T00:00:00Z'}));
  assert.equal(latestPublishedRevision([...invalid, valid]), valid.head_sha);
  assert.equal(latestPublishedRevision(invalid), undefined);
  assert.equal(await deployedRevision('owner/repo', 'token', async (url, options) => {
    assert.match(url, /workflows\/deploy.yml\/runs\?branch=master&status=success/);
    assert.equal(options.headers.Authorization, 'Bearer token');
    return {ok: true, json: async () => ({workflow_runs: [...invalid, valid]})};
  }), valid.head_sha);
  for (const request of [async () => { throw Error('Unavailable'); }, async () => ({ok: false}),
    async () => ({ok: true, json: async () => ({workflow_runs: null})})]) {
    assert.equal(await deployedRevision('owner/repo', 'token', request), undefined);
  }
});

test('comparison includes unpublished layout changes and withdrawn asset identities', () => {
  const root = mkdtempSync(join(tmpdir(), 'publication-plan-'));
  const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  const write = (path, content) => { mkdirSync(join(root, path, '..'), {recursive: true}); writeFileSync(join(root, path), content); };
  const commit = () => { git('add', '.'); git('commit', '-qm', 'Fixture'); return git('rev-parse', 'HEAD'); };
  try {
    git('init', '-q'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
    write('site/_articles/example.md', '---\narticle_id: hm-012345abcdef\n---\nBody');
    write('site/assets/images/hm-012345abcdef/figure.png', 'image');
    const published = commit();
    write('site/_includes/card.html', '<article>New layout</article>');
    const layout = commit();
    write('site/_articles/example.md', '---\narticle_id: hm-012345abcdef\n---\nNew body');
    const content = commit();
    assert.equal(planRevision(root, published, content).fullChecks, true);
    assert.equal(planRevision(root, layout, content).fullChecks, false);
    assert.equal(planRevision(root, undefined, content).fullChecks, true);
    assert.equal(planRevision(root, '0'.repeat(40), content).fullChecks, true);
    assert.equal(planRevision(root, 'f'.repeat(40), content).fullChecks, true);
    unlinkSync(join(root, 'site/_articles/example.md'));
    unlinkSync(join(root, 'site/assets/images/hm-012345abcdef/figure.png'));
    const withdrawal = commit();
    assert.equal(planRevision(root, content, withdrawal).fullChecks, false);
    assert.equal(planRevision(root, withdrawal, content).fullChecks, true);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
