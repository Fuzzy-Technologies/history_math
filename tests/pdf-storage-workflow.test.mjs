import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';

const workflow = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'));
test('PDF delivery browser registers the shared production analytics stub before every page', () => {
  const source = readFileSync('tests/pdf-delivery-browser.mjs', 'utf8');
  const check = text => {
    assert.match(text, /import \{stubMetrika\} from '\.\/metrika-fixture\.mjs';/);
    assert.match(text, /const context = await browser\.newContext\([^\n]+\);\s+await stubMetrika\(context\);/);
    assert.ok(text.indexOf('await stubMetrika(context)') < text.indexOf('await context.newPage()'));
  };
  check(source);
  assert.throws(() => check(source.replace('await stubMetrika(context);', '')));
});

test('PDF opt-out retains the existing local publication and unchanged hard budget', () => {
  const build = workflow.jobs.build;
  assert.equal(build.permissions.contents, 'read');
  const step = build.steps.find(step => step.name === 'Build and verify configured Pages site');
  assert.match(step.run, /if \[ "\$PDF_RELEASE_STORAGE" = "true" \]; then[\s\S]*external_pdfs.py plan[\s\S]*else[\s\S]*publication-size.mjs _site-pages/);
  const local = build.steps.find(step => step.uses?.startsWith('actions/upload-pages-artifact@'));
  assert.equal(local.if, "vars.ARTICLE_PDF_RELEASE_STORAGE != 'true'");
  assert.equal(local.with.path, '_site-pages');
  assert.match(step.run, /external_pdfs.py fetch --compatibility-dir test-results\/pdf-compatibility-cache/);
  assert.match(step.run, /external_pdfs.py plan[^\n]+--compatibility-dir test-results\/pdf-compatibility-cache/);
  const input = build.steps.find(step => step.with?.name === 'pdf-storage-input');
  assert.ok(input.with.path.includes('test-results/pdf-compatibility-cache'));
  assert.ok(input.with.path.includes('test-results/pdf-compatibility-fetch.json'));
});

test('only trusted master can write PDF releases, never PR code or an opt-out publication', () => {
  const job = workflow.jobs['pdf-storage'];
  assert.equal(job.permissions.contents, 'write');
  assert.equal(job.needs, 'build');
  for (const required of ["github.repository == 'Fuzzy-Technologies/history_math'", "github.ref == 'refs/heads/master'", "vars.ARTICLE_PDF_RELEASE_STORAGE == 'true'"])
    assert.ok(job.if.includes(required));
  assert.match(job.if, /github.event_name == 'push' \|\| github.event_name == 'workflow_dispatch'/);
  const authorize = new Function('github', 'vars', `return (${job.if});`);
  for (const repository of ['Fuzzy-Technologies/history_math', 'other/fork'])
    for (const ref of ['refs/heads/master', 'refs/heads/feature/example'])
      for (const event_name of ['push', 'workflow_dispatch', 'pull_request', 'pull_request_target'])
        for (const enabled of [undefined, 'false', 'true']) {
          assert.equal(authorize({repository, ref, event_name}, {ARTICLE_PDF_RELEASE_STORAGE: enabled}),
            repository === 'Fuzzy-Technologies/history_math' && ref === 'refs/heads/master' &&
            ['push', 'workflow_dispatch'].includes(event_name) && enabled === 'true');
        }
  const checkout = job.steps.find(step => step.uses?.startsWith('actions/checkout@'));
  assert.equal(checkout.with.ref, '${{ github.sha }}');
  assert.equal(checkout.with['persist-credentials'], false);
  assert.equal(checkout.with['fetch-depth'], 0);
  const store = job.steps.findIndex(step => step.run?.includes('external_pdfs.py store'));
  const verify = job.steps.findIndex(step => step.run?.includes('pdf-delivery-browser.mjs'));
  const upload = job.steps.findIndex(step => step.uses?.startsWith('actions/upload-pages-artifact@'));
  assert.ok(store < verify && verify < upload);
  assert.match(job.steps[store].run, /--compatibility-dir publication-input\/test-results\/pdf-compatibility-cache/);
  assert.match(job.steps[verify].run, /check_site.py _site-pages-external/);
  assert.match(job.steps[verify].run, /publication-size.mjs _site-pages-external/);
  assert.equal(job.steps[upload].with.path, '_site-pages-external');
});

test('deployment fails closed if storage fails, is cancelled or unexpectedly skipped', () => {
  assert.deepEqual(workflow.jobs.deploy.needs, ['build', 'pdf-storage']);
  const guard = workflow.jobs.deploy.if.replace('always()', 'true').replaceAll('needs.pdf-storage.', 'needs.storage.');
  const authorize = new Function('github', 'vars', 'needs', `return (${guard});`);
  for (const enabled of [false, true]) for (const build of ['success', 'failure', 'cancelled', 'skipped'])
    for (const storage of ['success', 'failure', 'cancelled', 'skipped']) {
      const actual = authorize({ref: 'refs/heads/master', event_name: 'push'},
        {ARTICLE_PDF_RELEASE_STORAGE: enabled ? 'true' : ''}, {build: {result: build}, storage: {result: storage}});
      assert.equal(actual, build === 'success' && storage === (enabled ? 'success' : 'skipped'));
    }
  assert.equal(authorize({ref: 'refs/heads/feature/example', event_name: 'workflow_dispatch'},
    {ARTICLE_PDF_RELEASE_STORAGE: 'true'}, {build: {result: 'success'}, storage: {result: 'success'}}), false);
});
