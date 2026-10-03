import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const cleanup = readFileSync('.github/workflows/cleanup-merged-branch.yml', 'utf8');
const script = cleanup.split('script: |\n')[1].split('\n').map(line => line.replace(/^            /, '')).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
async function cleanupScenario(overrides = {}) {
  const pr = {merged: true, base: {ref: 'develop'}, head: {ref: 'feature/example', sha: 'old', repo: {full_name: 'Fuzzy-Technologies/history_math'}}, ...overrides.pr};
  let deleted = 0;
  let reads = 0;
  const github = {rest: {git: {
    getRef: async () => {
      reads += 1;
      if (overrides.missing) throw Object.assign(new Error(), {status: 404});
      return {data: {object: {sha: overrides.newHead ? 'new' : (overrides.race && reads > 1 ? 'new' : 'old')}}};
    },
    deleteRef: async () => { deleted += 1; }
  }, pulls: {list: () => {}}}, paginate: async () => overrides.open ? [{}] : []};
  await new AsyncFunction('context', 'github', 'core', script)({payload: {pull_request: pr}, repo: {owner: 'Fuzzy-Technologies', repo: 'history_math'}}, github, {info() {}, warning() {}});
  return deleted;
}

test('cleanup permits only a merged same-repository unchanged feature into develop', async () => {
  assert.equal(await cleanupScenario(), 1);
  for (const overrides of [{pr: {merged: false}}, {pr: {base: {ref: 'master'}}},
    {pr: {head: {ref: 'master'}}}, {pr: {head: {ref: 'develop'}}},
    {pr: {head: {ref: 'feature/fork', repo: {full_name: 'someone/fork'}}}},
    {newHead: true}, {open: true}, {missing: true}, {race: true}]) {
    assert.equal(await cleanupScenario(overrides), 0);
  }
  assert.ok(!cleanup.includes('actions/checkout'));
  assert.ok(!cleanup.includes('run:'));
  assert.ok(!/\$\{\{\s*github\.event\.pull_request\.(title|body)/.test(cleanup));
});

test('production build and deployment both require master for push and manual dispatch', () => {
  const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');
  const guard = "github.ref == 'refs/heads/master' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')";
  assert.equal(deploy.split(guard).length - 1, 2);
  assert.match(deploy, /branches: \[master\]/);
  assert.ok(!deploy.includes('pull_request:'));
  for (const branch of ['master', 'develop', 'feature/site-prototype']) {
    for (const event of ['push', 'workflow_dispatch', 'pull_request']) {
      const allowed = `refs/heads/${branch}` === 'refs/heads/master' && ['push', 'workflow_dispatch'].includes(event);
      assert.equal(allowed, branch === 'master' && event !== 'pull_request');
    }
  }
  const files = ['ci.yml', 'deploy.yml', 'cleanup-merged-branch.yml'];
  for (const file of files) {
    const content = readFileSync(`.github/workflows/${file}`, 'utf8');
    for (const match of content.matchAll(/uses: ([^\s]+)/g)) assert.match(match[1], /@[a-f0-9]{40}$/);
  }
});
