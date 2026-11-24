import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {parse} from 'yaml';
import {pagesConfig} from '../scripts/pages-config.mjs';

const cleanup = readFileSync('.github/workflows/cleanup-merged-branch.yml', 'utf8').replace(/\r\n/g, '\n');
const script = cleanup.split('script: |\n')[1].split('\n').map(line => line.replace(/^            /, '')).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
test('S3 publication stays on approved master and blocks Pages upload until final validation', () => {
  const workflow = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'));
  assert.deepEqual(workflow.on.push.branches, ['master']);
  assert.equal(Object.hasOwn(workflow.on, 'pull_request'), false);
  const job = workflow.jobs.build, steps = job.steps;
  assert.match(job.if, /github.ref == 'refs\/heads\/master'/);
  assert.equal(job.environment, 'history-math-storage');
  const media = steps.findIndex(step => step.name === 'Publish verified S3 media');
  const preflight = steps.findIndex(step => step.name === 'Preflight existing S3 media copies');
  const check = steps.findIndex(step => step.name === 'Verify final lightweight publication');
  const upload = steps.findIndex(step => step.uses?.startsWith('actions/upload-pages-artifact@'));
  assert.ok(media > steps.findIndex(step => step.name === 'Build and verify configured Pages site'));
  assert.ok(media < check && check < upload);
  assert.match(steps[media].run, /publication-media.mjs --site-dir _site-pages --publish --prune-output/);
  assert.ok(preflight > steps.findIndex(step => step.name === 'Validate article sources and reading assets'));
  assert.ok(preflight < steps.findIndex(step => step.name === 'Install PDF rendering engine'));
  assert.match(steps[preflight].run, /backfill-media.mjs --preflight/);
  assert.doesNotMatch(steps[preflight].run, /prune|finalize|publication-media.mjs/);
  for (const key of ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
    assert.equal(steps[media].env[key], '${{ secrets.' + key + ' }}');
    assert.equal(steps[preflight].env[key], '${{ secrets.' + key + ' }}');
    assert.equal(steps.filter(step => Object.hasOwn(step.env || {}, key)).length, 2);
  }
  assert.match(steps[check].run, /check_site.py/);
  assert.match(steps[check].run, /publication-size.mjs/);
  assert.equal(workflow.jobs.deploy.needs, 'build');
});

test('one-time backfill uses the deployment account on master without deploying or executing PR code', () => {
  const workflow = parse(readFileSync('.github/workflows/media-backfill.yml', 'utf8'));
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.equal(workflow.concurrency.group, 'github-pages');
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  const job = workflow.jobs.copy;
  assert.equal(job.environment, 'history-math-storage');
  assert.match(job.if, /github.ref == 'refs\/heads\/master'/);
  assert.match(job.if, /github.event_name == 'workflow_dispatch'/);
  assert.deepEqual(workflow.permissions, {contents: 'read', 'pull-requests': 'read', pages: 'read'});
  const source = JSON.stringify(job);
  assert.ok(!source.includes('pull_request_target')); assert.ok(!source.includes('deploy-pages@'));
  assert.ok(!source.includes('git push')); assert.ok(!source.includes('jekyll'));
  assert.equal(job.steps.find(step => step.uses?.startsWith('actions/checkout@')).with['persist-credentials'], false);
  const transfer = job.steps.find(step => step.run?.includes('backfill-media.mjs'));
  assert.equal(transfer.env.S3_ACCESS_KEY_ID, '${{ secrets.S3_ACCESS_KEY_ID }}');
  assert.equal(transfer.env.S3_SECRET_ACCESS_KEY, '${{ secrets.S3_SECRET_ACCESS_KEY }}');
});

test('source checks use shallow heads and publication resolves the exact master SHA from full history', () => {
  for (const file of ['ci.yml', 'deploy.yml']) {
    const workflow = parse(readFileSync(`.github/workflows/${file}`, 'utf8'));
    for (const [name, job] of Object.entries(workflow.jobs)) {
      for (const step of job.steps ?? []) {
        if (step.uses?.startsWith('actions/checkout@')) assert.equal(step.with['fetch-depth'], file === 'deploy.yml' && name !== 'media_cleanup' ? 0 : 1);
      }
    }
  }
  const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');
  assert.match(deploy, /HISTORY_MATH_PUBLICATION_REF="\$GITHUB_SHA" HISTORY_MATH_PUBLICATION_STRICT=1 bundle exec jekyll build/);
});

test('preparation requires an explicit PR on master and pins both jobs to the dispatch SHA', () => {
  const workflow = parse(readFileSync('.github/workflows/article-prepare.yml', 'utf8'));
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  const input = workflow.on.workflow_dispatch.inputs.pr;
  assert.equal(input.required, true);
  assert.equal(input.type, 'string');
  assert.match(workflow.concurrency.group, /inputs\.pr/);
  const {plan, prepare} = workflow.jobs;
  assert.match(plan.if, /github\.event_name == 'workflow_dispatch'/);
  assert.match(plan.if, /github\.ref == 'refs\/heads\/master'/);
  assert.match(plan.if, /github\.repository == 'Fuzzy-Technologies\/history_math'/);
  assert.deepEqual(plan.permissions, {contents: 'read', 'pull-requests': 'read'});
  assert.equal(prepare.needs, 'plan');
  for (const job of [plan, prepare]) {
    const checkout = job.steps.find(step => step.uses?.startsWith('actions/checkout@'));
    assert.equal(checkout.with.ref, '${{ github.sha }}');
    assert.equal(checkout.with['persist-credentials'], false);
    const command = job.steps.find(step => step.run?.includes('tools/article_batch.py')).run;
    assert.ok(command.includes('--base-sha "$GITHUB_SHA" --event-file "$GITHUB_EVENT_PATH"'));
  }
});

test('only the two API-only workflows require the pull_request_target policy', () => {
  const paths = readdirSync('.github/workflows').filter(name => /\.ya?ml$/.test(name));
  const affected = paths.filter(name => Object.hasOwn(parse(readFileSync(
    `.github/workflows/${name}`, 'utf8')).on, 'pull_request_target'));
  assert.deepEqual(affected.sort(), ['cleanup-merged-branch.yml', 'pr-metadata.yml']);
});

test('publication validates and uploads the build selected by GitHub Pages metadata', () => {
  const workflow = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'));
  const steps = workflow.jobs.build.steps;
  const configuration = steps.find(step => step.uses?.startsWith('actions/configure-pages@'));
  assert.equal(configuration.id, 'pages');
  const build = steps.find(step => step.name === 'Build and verify configured Pages site');
  assert.deepEqual(build.env, {
    JEKYLL_ENV: 'production',
    PAGES_ORIGIN: 'https://${{ steps.pages.outputs.host }}',
    PAGES_BASE_PATH: '${{ steps.pages.outputs.base_path }}',
  });
  assert.match(build.run, /node scripts\/pages-config.mjs > "\$RUNNER_TEMP\/history-math-pages.yml"/);
  assert.match(build.run, /jekyll build --config "_config.yml,\$RUNNER_TEMP\/history-math-pages.yml" --destination _site-pages/);
  assert.equal(steps.find(step => step.uses?.startsWith('actions/upload-pages-artifact@')).with.path, '_site-pages');
  assert.ok(steps.indexOf(build) < steps.findIndex(step => step.uses?.startsWith('actions/upload-pages-artifact@')));
});

test('publication uses HTTPS even when Pages reports HTTP before certificate activation', () => {
  const workflow = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'));
  const build = workflow.jobs.build.steps.find(step => step.name === 'Build and verify configured Pages site');
  for (const [host, base_path] of [['history-math.org', ''], ['fuzzy-technologies.com', '/history_math']]) {
    const outputs = {origin: `http://${host}`, host, base_path};
    const environment = Object.fromEntries(Object.entries(build.env).map(([name, value]) => [name,
      value.replace(/\$\{\{ steps\.pages\.outputs\.(\w+) \}\}/g, (_, key) => outputs[key])
    ]));
    assert.deepEqual(pagesConfig(environment.PAGES_ORIGIN, environment.PAGES_BASE_PATH), {
      url: `https://${host}`, baseurl: base_path
    });
  }
});

test('configured Pages builds only the production domain', () => {
  const workflow = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'));
  const steps = workflow.jobs.build.steps;
  const production = steps.find(step => step.name === 'Build and verify configured Pages site');
  assert.doesNotMatch(production.run, /_config.reference.yml/);
  assert.match(production.run, /node scripts\/pages-config.mjs/);
  assert.match(production.run, /--config "_config.yml,\$RUNNER_TEMP\/history-math-pages.yml"/);
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
  assert.equal(deploy.split(guard).length - 1, 4);
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

test('automatic S3 deletion follows deployment; only explicit manual recovery takes the publication lock', () => {
  const maintenance = parse(readFileSync('.github/workflows/storage-maintenance.yml', 'utf8'));
  const publication = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'));
  const check = (audit, deploy) => {
    assert.deepEqual(Object.keys(audit.on), ['schedule', 'workflow_dispatch']);
    assert.equal(audit.on.workflow_dispatch.inputs.clean_s3.default, false);
    assert.equal(audit.on.workflow_dispatch.inputs.clean_github.default, false);
    assert.equal(audit.concurrency.group, "${{ github.event_name == 'workflow_dispatch' && inputs.clean_s3 && 'github-pages' || 'media-storage-audit' }}");
    assert.equal(audit.concurrency['cancel-in-progress'], false);
    assert.equal(deploy.concurrency.group, 'github-pages');
    assert.equal(deploy.concurrency['cancel-in-progress'], false);
    const job = deploy.jobs.media_cleanup;
    assert.deepEqual(job.needs, ['deploy', 'retire_oversized_media']);
    assert.ok(!job.if.includes('always()'));
    assert.equal(job.concurrency.group, audit.jobs.github_cleanup.concurrency.group);
    const runtime = job.steps.find(step => step.run?.includes('scripts/media-cleanup.mjs'));
    assert.equal(runtime.run, 'node scripts/media-cleanup.mjs --apply');
    assert.equal(runtime.env.MEDIA_CLEANUP_AFTER_DEPLOY, 'true');
    assert.equal(runtime.env.GITHUB_TOKEN, '${{ github.token }}');
    assert.deepEqual(job.permissions, {contents: 'write', actions: 'write', 'pull-requests': 'read'});
    const report = audit.jobs.audit.steps.find(step => step.run?.includes('scripts/media-cleanup.mjs'));
    assert.equal(report.run, 'node scripts/media-cleanup.mjs --dry-run');
    assert.ok(!JSON.stringify(report).includes('MEDIA_CLEANUP_AFTER_DEPLOY'));
    assert.ok(!JSON.stringify(report).includes('MEDIA_CLEANUP_MANUAL'));
    const s3 = audit.jobs.s3_cleanup;
    assert.equal(s3.needs, 'audit');
    assert.equal(s3.if, "github.ref == 'refs/heads/master' && github.event_name == 'workflow_dispatch' && inputs.clean_s3");
    assert.equal(s3.environment, 'history-math-storage');
    assert.equal(s3.permissions, undefined);
    assert.deepEqual(audit.permissions, {contents: 'read', 'pull-requests': 'read', actions: 'read'});
    assert.equal(s3.concurrency.group, job.concurrency.group);
    assert.equal(s3.concurrency['cancel-in-progress'], false);
    const recovery = s3.steps.find(step => step.run?.includes('scripts/media-cleanup.mjs'));
    assert.equal(recovery.run, 'node scripts/media-cleanup.mjs --apply-s3');
    assert.equal(recovery.env.MEDIA_CLEANUP_MANUAL, 'true');
    assert.ok(!JSON.stringify(recovery).includes('MEDIA_CLEANUP_AFTER_DEPLOY'));
    const github = audit.jobs.github_cleanup;
    assert.equal(github.needs, 'audit');
    assert.ok(github.if.includes('inputs.clean_github'));
    assert.ok(!JSON.stringify(github).includes('S3_SECRET_ACCESS_KEY'));
    assert.ok(github.steps.some(step => step.run === 'node scripts/github-storage-cleanup.mjs --apply'));
    for (const candidate of [audit.jobs.audit, s3, github, job]) {
      assert.match(candidate.if, /github.ref == 'refs\/heads\/master'/);
      const checkout = candidate.steps.find(step => step.uses?.startsWith('actions/checkout@'));
      assert.equal(checkout.with['persist-credentials'], false);
      assert.ok(!JSON.stringify(candidate).includes('pull_request_target'));
      for (const action of candidate.steps.filter(step => step.uses)) assert.match(action.uses, /@[a-f0-9]{40}$/);
    }
  };
  check(maintenance, publication);
  for (const mutate of [p => {p.jobs.media_cleanup.needs = ['build'];}, p => {p.jobs.media_cleanup.if = 'always()';},
    p => {p.jobs.media_cleanup.steps.find(step => step.env?.MEDIA_CLEANUP_AFTER_DEPLOY).env.MEDIA_CLEANUP_AFTER_DEPLOY = ''; }]) {
    const unsafe = structuredClone(publication); mutate(unsafe); assert.throws(() => check(maintenance, unsafe));
  }
  for (const mutate of [m => {m.concurrency.group = 'github-pages';}, m => {m.concurrency.group = 'media-storage-audit';},
    m => {m.on.workflow_dispatch.inputs.clean_s3.default = true;}, m => {m.jobs.s3_cleanup.if = "github.ref == 'refs/heads/master'";},
    m => {m.jobs.s3_cleanup.steps.find(s => s.env?.MEDIA_CLEANUP_MANUAL).env.MEDIA_CLEANUP_MANUAL = '';},
    m => {m.jobs.s3_cleanup.steps.find(s => s.env?.MEDIA_CLEANUP_MANUAL).run = 'node scripts/media-cleanup.mjs --apply';}]) {
    const unsafe = structuredClone(maintenance); mutate(unsafe); assert.throws(() => check(unsafe, publication));
  }
  const steps = publication.jobs.build.steps;
  assert.ok(steps.findIndex(s => s.name === 'Prepare bounded full-resolution JPEG originals') < steps.findIndex(s => s.name === 'Preflight existing S3 media copies'));
});

test('only a completed source CI run can report on the current open same-repository PR', async () => {
  const workflow = parse(readFileSync('.github/workflows/article-report.yml', 'utf8'));
  assert.deepEqual(workflow.on, {workflow_run: {workflows: ['Prototype checks'], types: ['completed']}});
  assert.deepEqual(workflow.permissions, {contents: 'read', actions: 'read', 'pull-requests': 'write'});
  const job = workflow.jobs.comment;
  assert.match(job.if, /head_repository.full_name == github.repository/);
  assert.match(job.if, /conclusion != 'action_required'/);
  assert.match(job.concurrency.group, /workflow_run.head_branch/);
  assert.equal(job.steps.length, 1);
  assert.match(job.steps[0].uses, /^actions\/github-script@[0-9a-f]{40}$/);
  const execute = new AsyncFunction('github', 'context', job.steps[0].with.script);
  const repository = 'example/repo', sha = 'a'.repeat(40), branch = 'feature/article-example-ru';
  const original = {number: 1, state: 'open', base: {ref: 'master', repo: {full_name: repository}},
    head: {sha, ref: branch, repo: {full_name: repository}}};
  let live = structuredClone(original), candidates = [original], jobConclusion = 'success';
  const run = {name: 'Prototype checks', path: '.github/workflows/ci.yml', status: 'completed',
    event: 'workflow_dispatch', repository: {full_name: repository}, head_repository: {full_name: repository},
    head_sha: sha, head_branch: branch, id: 20, run_attempt: 1, conclusion: 'success',
    html_url: 'https://github.com/example/repo/actions/runs/20'};
  const context = {eventName: 'workflow_run', sha: 'trusted-default-sha',
    repo: {owner: 'example', repo: 'repo'}, payload: {workflow_run: run}};
  const marker = '<!-- history-math-article-report-v1 -->';
  const comments = [{id: 30, user: {login: 'another-bot'}, body: marker}];
  const attempts = [], searches = [], writes = [], refs = [];
  const dictionary = readFileSync('schemas/messages.json', 'utf8');
  const github = {rest: {
    repos: {getContent: async args => {
      refs.push(args.ref);
      return {data: {size: dictionary.length, encoding: 'base64', content: Buffer.from(dictionary).toString('base64')}};
    }},
    pulls: {list: 'requests', get: async () => ({data: live})},
    actions: {listJobsForWorkflowRunAttempt: 'jobs'},
    issues: {listComments: 'comments', createComment: async args => {
      assert.equal(args.issue_number, 1);
      comments.push({id: 31, user: {login: 'github-actions[bot]'}, body: args.body});
      writes.push(args.body);
    }, updateComment: async args => {
      assert.equal(args.comment_id, 31);
      comments[1].body = args.body;
      writes.push(args.body);
    }}
  }, paginate: async (kind, args) => {
    if (kind === 'requests') { searches.push(args); return candidates; }
    if (kind === 'jobs') {
      attempts.push([args.run_id, args.attempt_number]);
      return [{name: 'Article package', conclusion: jobConclusion}];
    }
    assert.equal(kind, 'comments');
    return comments;
  }};
  const report = () => execute(github, context);
  await report(); await report();
  assert.equal(writes.length, 1);
  assert.match(writes[0], /Проверки исходных файлов пройдены/);
  assert.ok(writes[0].includes(sha));
  run.event = 'pull_request'; run.run_attempt = 2; jobConclusion = 'skipped';
  await report(); assert.match(writes.at(-1), /Обязательные технические проверки не выполнены/);
  assert.deepEqual(attempts.at(-1), [20, 2]);
  run.run_attempt = 1; await report();
  run.id = 19; await report();
  assert.equal(writes.length, 2);
  run.id = 21; run.event = 'push'; jobConclusion = 'success'; run.conclusion = 'cancelled';
  await report(); assert.match(writes.at(-1), /Обязательные технические проверки не выполнены/);
  run.id++; run.conclusion = 'failure';
  await report(); assert.match(writes.at(-1), /Технические проверки выявили блокирующие ошибки/);
  assert.equal(writes.length, 4);
  run.id++;
  for (const changed of [{...original, state: 'closed'},
    {...original, base: {...original.base, ref: 'develop'}},
    {...original, head: {...original.head, sha: 'b'.repeat(40)}},
    {...original, head: {...original.head, repo: {full_name: 'fork/repo'}}}]) {
    candidates = [original]; live = changed; await report();
    candidates = [changed]; live = original; await report();
  }
  assert.equal(writes.length, 4);
  const before = searches.length;
  for (const [key, value] of Object.entries({name: 'Other checks', path: '.github/workflows/other.yml',
    status: 'in_progress', head_repository: {full_name: 'fork/repo'}, head_sha: '', head_branch: 'master',
    event: 'issue_comment', conclusion: 'action_required'})) {
    const old = run[key]; run[key] = value; await report(); run[key] = old;
  }
  context.eventName = 'pull_request_target'; await report();
  assert.equal(searches.length, before);
  assert.equal(writes.length, 4);
  assert.ok(refs.every(ref => ref === context.sha));
  assert.ok(searches.every(args => args.base === 'master' && args.state === 'open' && args.head === `example:${branch}`));
  assert.equal(comments[0].body, marker);
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
    const tests = commands.indexOf(file === 'ci.yml' ? 'npm test' : 'python3 scripts/publication_jpegs.py');
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

test('automated publication runs no visual suite and source CI has a five-minute ceiling', () => {
  const deploy = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'));
  const ci = parse(readFileSync('.github/workflows/ci.yml', 'utf8'));
  for (const job of Object.values(ci.jobs)) assert.equal(job['timeout-minutes'], 5);
  for (const job of [...Object.values(ci.jobs), deploy.jobs.build]) {
    const commands = job.steps.map(step => step.run || '').join('\n');
    assert.doesNotMatch(commands, /test:browser|node tests\/[^ ]*browser|check_pdf_colors|_config\.reference|pdftoppm/);
  }
  const commands = deploy.jobs.build.steps.map(step => step.run || '').join('\n');
  assert.equal(commands.split('bundle exec jekyll build').length - 1, 1);
  assert.equal(commands.split('python3 scripts/check_site.py').length - 1, 1);
});
