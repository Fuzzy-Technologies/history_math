import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {publicationPlan, completedPublications, successfulDeployment, deployedRevision, planRevision} from '../scripts/publication-plan.mjs';

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

const deployedJobs = runId => ({total_count: 3, jobs: ['build', 'deploy', 'media_cleanup'].map(name => ({
  run_id: runId, name, status: 'completed', conclusion: name === 'media_cleanup' ? 'failure' : 'success'
}))});

test('only completed master publication runs can supply a deployment baseline', () => {
  const valid = {id: 10, head_sha: 'a'.repeat(40), status: 'completed', conclusion: 'failure', head_branch: 'master',
    event: 'push', path: '.github/workflows/deploy.yml', created_at: '2026-10-20T00:00:00Z'};
  const invalid = [{id: 0}, {id: '10'}, {status: 'in_progress'}, {head_branch: 'feature/test'},
    {path: '.github/workflows/ci.yml'}, {event: 'pull_request'}, {head_sha: 'invalid'}]
    .map(values => ({...valid, ...values, created_at: '2026-10-21T00:00:00Z'}));
  assert.deepEqual(completedPublications([...invalid, valid]), [valid]);
  assert.deepEqual(completedPublications(invalid), []);
  const newer = {...valid, id: 11, created_at: '2026-10-22T00:00:00Z'};
  assert.deepEqual(completedPublications([valid, newer]), [newer, valid]);
});

test('a successful build and deployment survive a later cleanup failure', async () => {
  const valid = {id: 10, head_sha: 'a'.repeat(40), status: 'completed', conclusion: 'failure', head_branch: 'master',
    event: 'push', path: '.github/workflows/deploy.yml', created_at: '2026-10-20T00:00:00Z'};
  const calls = [];
  assert.equal(await deployedRevision('owner/repo', 'token', async (url, options) => {
    calls.push(url);
    assert.equal(options.headers.Authorization, 'Bearer token');
    if (calls.length === 1) {
      assert.match(url, /workflows\/deploy.yml\/runs\?branch=master&status=completed&per_page=30$/);
      return {ok: true, json: async () => ({workflow_runs: [valid]})};
    }
    assert.match(url, /actions\/runs\/10\/jobs\?filter=latest&per_page=100$/);
    return {ok: true, json: async () => deployedJobs(10)};
  }), valid.head_sha);
  assert.equal(calls.length, 2);
});

test('failed, skipped, duplicate, incomplete and foreign deployment jobs never qualify', () => {
  assert.equal(successfulDeployment(deployedJobs(10), 10), true);
  for (const name of ['build', 'deploy']) for (const changes of [
    {conclusion: 'failure'}, {conclusion: 'skipped'}, {status: 'in_progress'}, {run_id: 11}
  ]) {
    const data = deployedJobs(10);
    Object.assign(data.jobs.find(job => job.name === name), changes);
    assert.equal(successfulDeployment(data, 10), false, `${name}: ${JSON.stringify(changes)}`);
  }
  const duplicate = deployedJobs(10);
  duplicate.jobs.push({...duplicate.jobs[1]});
  duplicate.total_count++;
  for (const data of [null, {}, {jobs: []}, {jobs: [], total_count: 1}, duplicate,
    {jobs: deployedJobs(10).jobs, total_count: 4}, {jobs: deployedJobs(10).jobs.slice(0, 1), total_count: 1}]) {
    assert.equal(successfulDeployment(data, 10), false);
  }
});

test('deployment history checks newest attempts and falls back only to a verified deployment', async () => {
  const base = {status: 'completed', conclusion: 'success', head_branch: 'master', event: 'push',
    path: '.github/workflows/deploy.yml'};
  const runs = [{...base, id: 11, head_sha: 'b'.repeat(40), created_at: '2026-10-21T00:00:00Z'},
    {...base, id: 10, head_sha: 'a'.repeat(40), created_at: '2026-10-20T00:00:00Z'}];
  const calls = [];
  assert.equal(await deployedRevision('owner/repo', 'token', async url => {
    calls.push(url);
    if (calls.length === 1) return {ok: true, json: async () => ({workflow_runs: [...runs].reverse()})};
    const data = deployedJobs(url.includes('/11/') ? 11 : 10);
    if (url.includes('/11/')) data.jobs[1].conclusion = 'failure';
    return {ok: true, json: async () => data};
  }), runs[1].head_sha);
  assert.match(calls[1], /\/11\/jobs/);
  assert.match(calls[2], /\/10\/jobs/);
});

test('unavailable or incomplete history fails closed without accepting an older snapshot', async () => {
  for (const request of [async () => { throw Error('Unavailable'); }, async () => ({ok: false}),
    async () => ({ok: true, json: async () => ({workflow_runs: null})})]) {
    assert.equal(await deployedRevision('owner/repo', 'token', request), undefined);
  }
  const run = {id: 10, head_sha: 'a'.repeat(40), status: 'completed', head_branch: 'master', event: 'push',
    path: '.github/workflows/deploy.yml', created_at: '2026-10-20T00:00:00Z'};
  for (const jobs of [null, {jobs: null}, {jobs: [], total_count: 1}]) {
    let calls = 0;
    assert.equal(await deployedRevision('owner/repo', 'token', async () => {
      calls++;
      if (calls === 1) return {ok: true, json: async () => ({workflow_runs: [run]})};
      return {ok: true, json: async () => jobs};
    }), undefined);
    assert.equal(calls, 2);
  }
  let called = false;
  assert.equal(await deployedRevision('owner/repo', '', async () => { called = true; }), undefined);
  assert.equal(called, false);
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
