import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';

const cleanup = readFileSync('.github/workflows/cleanup-merged-branch.yml', 'utf8').replace(/\r\n/g, '\n');
const script = cleanup.split('script: |\n')[1].split('\n').map(line => line.replace(/^            /, '')).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
test('source checks use shallow heads and publication resolves the exact master SHA from full history', () => {
  for (const file of ['ci.yml', 'deploy.yml']) {
    const workflow = parse(readFileSync(`.github/workflows/${file}`, 'utf8'));
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps ?? []) {
        if (step.uses?.startsWith('actions/checkout@')) assert.equal(step.with['fetch-depth'], file === 'deploy.yml' ? 0 : 1);
      }
    }
  }
  const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');
  assert.match(deploy, /HISTORY_MATH_PUBLICATION_REF="\$GITHUB_SHA" HISTORY_MATH_PUBLICATION_STRICT=1 bundle exec jekyll build/);
});
async function cleanupScenario(overrides = {}) {
  const pr = {merged: true, base: {ref: 'master'}, head: {ref: 'feature/example', sha: 'old', repo: {full_name: 'Fuzzy-Technologies/history_math'}}, ...overrides.pr};
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

test('cleanup permits only a merged same-repository unchanged feature into master', async () => {
  assert.equal(await cleanupScenario(), 1);
  for (const overrides of [{pr: {merged: false}}, {pr: {base: {ref: 'develop'}}},
    {pr: {head: {ref: 'master'}}}, {pr: {head: {ref: 'develop'}}},
    {pr: {head: {ref: 'feature/fork', repo: {full_name: 'someone/fork'}}}},
    {newHead: true}, {open: true}, {missing: true}, {race: true}]) {
    assert.equal(await cleanupScenario(overrides), 0);
  }
  assert.ok(!cleanup.includes('actions/checkout'));
  assert.ok(!cleanup.includes('run:'));
  assert.ok(!/\$\{\{\s*github\.event\.pull_request\.(title|body)/.test(cleanup));
});

test('CI checks feature PRs once and cleanup routes their merges directly to master', () => {
  const ci = parse(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const clean = parse(cleanup);
  assert.deepEqual(ci.on.push.branches, ['master']);
  assert.ok(Object.hasOwn(ci.on, 'pull_request'));
  assert.ok(Object.hasOwn(ci.on, 'workflow_dispatch'));
  assert.deepEqual(clean.on.pull_request_target.branches, ['master']);
  assert.deepEqual(clean.on.pull_request_target.types, ['closed']);
  assert.match(clean.jobs.cleanup.if, /base\.ref == 'master'/);
  assert.match(clean.jobs.cleanup.if, /merged == true/);
  assert.match(clean.jobs.cleanup.if, /startsWith\(github.event.pull_request.head.ref, 'feature\/'\)/);
});

test('PR metadata uses additive APIs without executing contributor code', async () => {
  const workflow = readFileSync('.github/workflows/pr-metadata.yml', 'utf8').replace(/\r\n/g, '\n');
  assert.match(workflow, /pull_request_target:\s+types: \[opened, reopened\]/);
  assert.match(workflow, /permissions:\s+pull-requests: write\s+jobs:/);
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
  const files = ['ci.yml', 'deploy.yml', 'cleanup-merged-branch.yml', 'pr-metadata.yml', 'article-report.yml', 'article-prepare.yml'];
  for (const file of files) {
    const content = readFileSync(`.github/workflows/${file}`, 'utf8');
    for (const match of content.matchAll(/uses: ([^\s]+)/g)) assert.match(match[1], /@[a-f0-9]{40}$/);
  }
});

test('the actual privileged article comment job has no checkout and rejects stale or duplicate results', async () => {
  const workflow = readFileSync('.github/workflows/article-report.yml', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(!workflow.includes('actions/checkout'));
  assert.ok(!/^\s+run:/m.test(workflow));
  assert.match(workflow, /context.payload.pull_request.base.sha : context.sha/);
  assert.match(workflow, /live.head.ref.endsWith\('-ru'\)/);
  const source = workflow.split('script: |\n')[1].split('\n').map(line => line.replace(/^            /, '')).join('\n');
  const comments = []; let created = 0; let updated = 0; let currentSha = 'head'; let runId = 10; let jobConclusion = 'success'; let workflowConclusion = 'success';
  const dictionary = readFileSync('schemas/messages.json', 'utf8');
  const github = {rest: {
    repos: {getContent: async () => ({data: {size: dictionary.length, encoding: 'base64', content: Buffer.from(dictionary).toString('base64')}})},
    pulls: {get: async () => ({data: {state: 'open', head: {sha: currentSha, ref: 'feature/article-ru', repo: {full_name: 'fork/repo'}}}})},
    actions: {listWorkflowRunsForRepo: async () => ({data: {workflow_runs: [{name: 'Prototype checks', event: 'pull_request', status: 'completed', conclusion: workflowConclusion, id: runId, html_url: 'https://github.com/example/repo/actions/runs/10', run_attempt: 1}]}}), listJobsForWorkflowRun: 'jobs'},
    issues: {listComments: 'comments', createComment: async args => { created++; comments.push({id: 1, user: {type: 'Bot'}, body: args.body}); }, updateComment: async args => { updated++; comments[0].body = args.body; }}
  }, paginate: async kind => kind === 'jobs' ? [{name: 'Article package', conclusion: jobConclusion}] : comments};
  const context = {eventName: 'pull_request_target', repo: {owner: 'example', repo: 'repo'}, payload: {pull_request: {number: 1, head: {sha: 'head'}, base: {sha: 'trusted-base'}}}};
  const execute = () => new AsyncFunction('github', 'context', source)(github, context);
  await execute(); await execute();
  assert.equal(created, 1); assert.equal(updated, 1);
  assert.match(comments[0].body, /Проверки исходных файлов пройдены/);
  assert.match(comments[0].body, /только исходные файлы/);
  assert.ok(comments[0].body.includes('\n\n'));
  assert.ok(!comments[0].body.includes('\\n'));
  runId = 9; await execute(); assert.equal(updated, 1);
  currentSha = 'new-head'; await execute(); assert.equal(updated, 1);
  context.eventName = 'push'; context.ref = 'refs/heads/untrusted';
  await execute(); assert.equal(updated, 1);
  context.eventName = 'pull_request_target'; currentSha = 'head'; runId = 11; jobConclusion = 'skipped';
  await execute(); assert.equal(updated, 2);
  assert.match(comments[0].body, /Обязательные технические проверки не выполнены/);
  runId = 12; jobConclusion = 'success'; workflowConclusion = 'cancelled';
  await execute(); assert.match(comments[0].body, /Обязательные технические проверки не выполнены/);
  runId = 13; workflowConclusion = 'failure';
  await execute(); assert.match(comments[0].body, /Технические проверки выявили блокирующие ошибки/);
});

test('completed manual CI runs report only the current open same-repository master PR', async () => {
  const workflow = readFileSync('.github/workflows/article-report.yml', 'utf8').replace(/\r\n/g, '\n');
  const parsed = parse(workflow);
  assert.deepEqual(parsed.on.workflow_run, {workflows: ['Prototype checks'], types: ['completed']});
  assert.match(parsed.concurrency.group, /workflow_run.head_branch/);
  assert.ok(!workflow.includes('actions/checkout'));
  assert.ok(!/^\s+run:/m.test(workflow));
  const source = workflow.split('script: |\n')[1].split('\n').map(line => line.replace(/^            /, '')).join('\n');
  const repository = 'example/repo', sha = 'a'.repeat(40), branch = 'feature/article-ru';
  const original = {number: 1, state: 'open', base: {ref: 'master', repo: {full_name: repository}},
    head: {sha, ref: branch, repo: {full_name: repository}}};
  let live = structuredClone(original), candidates = [structuredClone(original)], runId = 20, reads = 0;
  let created = 0, updated = 0;
  const comments = [], refs = [], searches = [];
  const dictionary = readFileSync('schemas/messages.json', 'utf8');
  const context = {eventName: 'workflow_run', sha: 'trusted-default-sha', repo: {owner: 'example', repo: 'repo'},
    payload: {workflow_run: {name: 'Prototype checks', status: 'completed', event: 'workflow_dispatch',
      repository: {full_name: repository}, head_repository: {full_name: repository},
      head_sha: sha, head_branch: branch, id: runId, run_attempt: 1, conclusion: 'success',
      html_url: 'https://github.com/example/repo/actions/runs/20'}}};
  const github = {rest: {
    repos: {getContent: async args => { refs.push(args.ref); return {data: {size: dictionary.length, encoding: 'base64', content: Buffer.from(dictionary).toString('base64')}}; }},
    pulls: {list: 'requests', get: async () => { reads++; return {data: live}; }},
    actions: {listWorkflowRunsForRepo: async () => { throw new Error('Completed dispatch uses its pinned run'); }, listJobsForWorkflowRun: 'jobs'},
    issues: {listComments: 'comments', createComment: async args => { created++; comments.push({id: 1, user: {type: 'Bot'}, body: args.body}); },
      updateComment: async args => { updated++; comments[0].body = args.body; }}
  }, paginate: async (kind, args) => {
    if (kind === 'requests') { searches.push(args); return candidates; }
    if (kind === 'jobs') return [{name: 'Article package', conclusion: 'success'}];
    return comments;
  }};
  const execute = () => new AsyncFunction('github', 'context', source)(github, context);
  await execute(); await execute();
  assert.equal(created, 1); assert.equal(updated, 1);
  assert.match(comments[0].body, /Проверки исходных файлов пройдены/);
  assert.ok(refs.every(ref => ref === 'trusted-default-sha'));
  assert.ok(searches.every(args => args.base === 'master' && args.state === 'open' && args.head === 'example:feature/article-ru'));
  context.payload.workflow_run.id = 19;
  await execute(); assert.equal(updated, 1);
  context.payload.workflow_run.id = 21;
  live = {...original, head: {...original.head, sha: 'b'.repeat(40)}};
  await execute(); assert.equal(updated, 1);
  live = {...original, state: 'closed'};
  await execute(); assert.equal(updated, 1);
  for (const mutation of [
    {...original, state: 'closed'},
    {...original, base: {...original.base, ref: 'develop'}},
    {...original, head: {...original.head, sha: 'b'.repeat(40)}},
    {...original, head: {...original.head, repo: {full_name: 'fork/repo'}}}
  ]) {
    candidates = [mutation]; live = mutation;
    await execute(); assert.equal(updated, 1);
  }
  candidates = [structuredClone(original)]; live = structuredClone(original);
  const before = reads;
  context.payload.workflow_run.head_repository.full_name = 'fork/repo';
  await execute(); assert.equal(reads, before); assert.equal(updated, 1);
  context.payload.workflow_run.head_repository.full_name = repository;
  context.payload.workflow_run.name = 'Unrelated workflow';
  await execute(); assert.equal(reads, before); assert.equal(updated, 1);
});

// Keep the owner's CI storage budget independent of website and screenshot growth.
test('CI uploads compact reports without full-site, screenshots or PDF archives', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  const uploads = ci.split(/uses: actions\/upload-artifact@/).slice(1);
  assert.equal(uploads.length, 1);
  assert.match(uploads[0], /name: article-report-/);
  assert.match(uploads[0], /test-results\/article-report.json/);
  assert.match(uploads[0], /test-results\/article-report.md/);
  assert.doesNotMatch(uploads[0], /article-preview|article-screenshots|article-pdfs|path: _site|path: test-results\s*$/m);
});

test('PR and feature CI run source checks without building sites, browsers or PDFs', () => {
  const ci = parse(readFileSync('.github/workflows/ci.yml', 'utf8'));
  assert.equal(ci.name, 'Prototype checks');
  assert.equal(ci.jobs.articles.name, 'Article package');
  assert.equal(ci.permissions.contents, 'read');
  const articleCommands = ci.jobs.articles.steps.filter(step => step.run).map(step => step.run).join('\n');
  assert.match(articleCommands, /node scripts\/check-articles\.mjs --source-only/);
  const commands = Object.values(ci.jobs).flatMap(job => job.steps.filter(step => step.run).map(step => step.run)).join('\n');
  assert.match(commands, /npm test/);
  assert.match(commands, /tests\/image_originals_test\.rb/);
  assert.match(commands, /tests\/external_originals_test\.rb/);
  assert.match(commands, /pip install -r tools\/requirements-images.txt/);
  assert.doesNotMatch(commands, /jekyll build|article-pdf\.mjs|playwright install|test:browser|browser\.mjs|publication_test\.rb|article_details_test\.rb|translation_notices_test\.rb/);
  for (const job of Object.values(ci.jobs)) {
    assert.ok(!job.steps.some(step => step.uses?.startsWith('actions/cache/')));
  }
  const checker = readFileSync('scripts/check-articles.mjs', 'utf8');
  assert.doesNotMatch(checker, /article-pdf\.mjs/);
});

test('source and publication jobs install pinned image dependencies before their tests', () => {
  for (const [file, job] of [['ci.yml', 'verify'], ['deploy.yml', 'build']]) {
    const workflow = parse(readFileSync(`.github/workflows/${file}`, 'utf8'));
    const commands = workflow.jobs[job].steps.filter(step => step.run).map(step => step.run).join('\n');
    const install = commands.indexOf('python3 -m pip install -r tools/requirements-images.txt');
    const tests = commands.indexOf('npm test');
    assert.ok(install >= 0 && tests > install, `${file} must install Pillow before image preparation tests`);
  }
});

test('only guarded master publication generates PDFs and saves their validated cache', () => {
  const deploy = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'));
  const build = deploy.jobs.build;
  assert.match(build.if, /github.ref == 'refs\/heads\/master'/);
  assert.match(build.if, /github.event_name == 'push'/);
  const commands = build.steps.filter(step => step.run).map(step => step.run).join('\n');
  assert.match(commands, /bundle exec jekyll build/);
  assert.match(commands, /node scripts\/article-pdf\.mjs/);
  const restore = build.steps.find(step => step.uses?.startsWith('actions/cache/restore@'));
  assert.equal(restore.with.path, '.pdf-cache');
  assert.match(restore.with['restore-keys'], /pdf-v1-/);
  assert.doesNotMatch(commands, /cache-hit/);
  const save = build.steps.find(step => step.uses?.startsWith('actions/cache/save@'));
  assert.match(save.if, /github.ref == 'refs\/heads\/master'/);
  assert.match(save.if, /github.event_name != 'pull_request'/);
  assert.equal(save.with.path, '.pdf-cache');
  assert.match(save.with.key, /cache-primary-key/);
});
