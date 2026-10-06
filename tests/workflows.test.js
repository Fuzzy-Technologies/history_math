import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const cleanup = readFileSync('.github/workflows/cleanup-merged-branch.yml', 'utf8').replace(/\r\n/g, '\n');
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

test('PR metadata uses additive APIs without executing contributor code', async () => {
  const workflow = readFileSync('.github/workflows/pr-metadata.yml', 'utf8').replace(/\r\n/g, '\n');
  assert.match(workflow, /pull_request_target:\s+types: \[opened, reopened\]/);
  assert.match(workflow, /permissions:\s+issues: write\s+jobs:/);
  assert.ok(!workflow.includes('actions/checkout'));
  assert.ok(!/^\s+run:/m.test(workflow));
  assert.ok(!workflow.includes('${{'));
  assert.ok(!workflow.includes('branches:'));
  const metadataScript = workflow.split('script: |\n')[1].split('\n').map(line => line.replace(/^            /, '')).join('\n');
  const calls = [];
  const github = {rest: {issues: {
    addAssignees: async args => calls.push(['assignees', args]),
    addLabels: async args => calls.push(['labels', args])
  }}};
  await new AsyncFunction('context', 'github', metadataScript)({repo: {owner: 'Fuzzy-Technologies', repo: 'history_math'}, payload: {pull_request: {number: 21, title: '${{ secrets.EXAMPLE }}', head: {ref: 'untrusted'}}}}, github);
  assert.deepEqual(calls, [
    ['assignees', {owner: 'Fuzzy-Technologies', repo: 'history_math', issue_number: 21, assignees: ['Tim55667757']}],
    ['labels', {owner: 'Fuzzy-Technologies', repo: 'history_math', issue_number: 21, labels: ['documentation']}]
  ]);
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
  const files = ['ci.yml', 'deploy.yml', 'cleanup-merged-branch.yml', 'pr-metadata.yml', 'article-report.yml'];
  for (const file of files) {
    const content = readFileSync(`.github/workflows/${file}`, 'utf8');
    for (const match of content.matchAll(/uses: ([^\s]+)/g)) assert.match(match[1], /@[a-f0-9]{40}$/);
  }
});

test('the actual privileged article comment job has no checkout and rejects stale or duplicate results', async () => {
  const workflow = readFileSync('.github/workflows/article-report.yml', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(!workflow.includes('actions/checkout'));
  assert.ok(!/^\s+run:/m.test(workflow));
  assert.match(workflow, /ref: context.payload.pull_request.base.sha/);
  assert.match(workflow, /live.head.ref.endsWith\('-ru'\)/);
  const source = workflow.split('script: |\n')[1].split('\n').map(line => line.replace(/^            /, '')).join('\n');
  const comments = []; let created = 0; let updated = 0; let currentSha = 'head'; let runId = 10;
  const dictionary = readFileSync('schemas/messages.json', 'utf8');
  const github = {rest: {
    repos: {getContent: async () => ({data: {size: dictionary.length, encoding: 'base64', content: Buffer.from(dictionary).toString('base64')}})},
    pulls: {get: async () => ({data: {state: 'open', head: {sha: currentSha, ref: 'feature/article-ru', repo: {full_name: 'fork/repo'}}}})},
    actions: {listWorkflowRunsForRepo: async () => ({data: {workflow_runs: [{name: 'Prototype checks', event: 'pull_request', status: 'completed', id: runId, html_url: 'https://github.com/example/repo/actions/runs/10', run_attempt: 1}]}}), listJobsForWorkflowRun: 'jobs'},
    issues: {listComments: 'comments', createComment: async args => { created++; comments.push({id: 1, user: {type: 'Bot'}, body: args.body}); }, updateComment: async args => { updated++; comments[0].body = args.body; }}
  }, paginate: async kind => kind === 'jobs' ? [{name: 'Article package', conclusion: 'success'}] : comments};
  const context = {repo: {owner: 'example', repo: 'repo'}, payload: {pull_request: {number: 1, head: {sha: 'head'}, base: {sha: 'trusted-base'}}}};
  const execute = () => new AsyncFunction('github', 'context', source)(github, context);
  await execute(); await execute();
  assert.equal(created, 1); assert.equal(updated, 1);
  assert.match(comments[0].body, /Технические проверки пройдены/);
  runId = 9; await execute(); assert.equal(updated, 1);
  currentSha = 'new-head'; await execute(); assert.equal(updated, 1);
});
