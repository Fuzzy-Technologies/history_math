import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {checkSources, checkArticle, checkContract} from './article-checks.mjs';
import {checkBrowser} from './article-browser.mjs';
import {reportLanguage, overall, humanReport, requiredChecks} from './article-messages.mjs';

const root = resolve('.');
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const branch = option('--branch', process.env.PR_HEAD_REF ?? process.env.GITHUB_HEAD_REF ?? spawnSync('git', ['branch', '--show-current'], {encoding: 'utf8'}).stdout.trim());
const commit = option('--commit', process.env.PR_HEAD_SHA ?? spawnSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).stdout.trim());
const report = {version: 1, commit, branch, language: reportLanguage(branch), checks: Object.fromEntries(requiredChecks.map(key => [key, 'not_run'])), findings: [], articles: [], pages: []};
mkdirSync('test-results', {recursive: true});
const run = (code, executable, params) => {
  const result = spawnSync(executable, params, {encoding: 'utf8', shell: false, timeout: 180000, env: {...process.env, PYTHONIOENCODING: 'utf-8'}});
  if (result.error || result.status !== 0) {
    // Diagnostics contain only the public checkout and its tool output, never editorial source locations.
    report.findings.push({code, severity: 'error', detail: (result.error?.message ?? (result.stderr + result.stdout)).slice(-6000)});
    return false;
  }
  return true;
};
try {
  const source = checkSources(root);
  report.findings.push(...source.findings);
  report.articles = source.articles;
  for (const template of ['templates/article.md', 'templates/minimal-article.md']) {
    report.findings.push(...checkArticle(readFileSync(template, 'utf8'), template, root).findings.filter(x => x.severity === 'error'));
  }
  report.checks.source = report.findings.some(x => x.severity === 'error') ? 'fail' : 'pass';
  if (!args.includes('--source-only') && report.checks.source === 'pass') {
    const preview = resolve(option('--preview-dir', 'test-results/article-preview'));
    if (args.includes('--existing-preview')) {
      const manifest = JSON.parse(readFileSync(resolve(preview, 'review-build.json')));
      if (manifest.commit !== commit) throw new Error('Preview commit does not match the checked commit');
      report.checks.build = manifest.jekyll === 'pass' ? 'pass' : 'not_run';
    } else {
      report.checks.build = run('HM_BUILD', option('--bundle', 'bundle'), ['exec', 'jekyll', 'build', '--config', '_config.yml,_config.review.yml', '--trace']) ? 'pass' : 'fail';
      if (report.checks.build === 'pass') writeFileSync(resolve(preview, 'review-build.json'), JSON.stringify({commit, jekyll: 'pass'}));
    }
    if (report.checks.build === 'pass') {
      report.checks.output = run('HM_OUTPUT', option('--python', process.env.PYTHON_EXECUTABLE ?? 'python3'), ['scripts/check_site.py', preview, '/history_math']) ? 'pass' : 'fail';
      const browser = await checkBrowser(preview, report.articles, resolve('test-results/article-screenshots'));
      report.findings.push(...browser.findings); report.pages = browser.pages;
      report.checks.browser = browser.findings.length ? 'fail' : 'pass';
    }
  }
} catch (error) { report.findings.push({code: 'HM_REQUIRED', severity: 'error', detail: error.message}); }
for (const [check, state] of Object.entries(report.checks)) if (state === 'not_run') report.findings.push({code: 'HM_REQUIRED', severity: 'warning', detail: check});
report.result = overall(report);
writeFileSync('test-results/article-report.json', JSON.stringify(report, null, 2));
writeFileSync('test-results/article-report.md', humanReport(report));
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, humanReport(report), {flag: 'a'});
console.log(humanReport(report));
process.exitCode = args.includes('--source-only') ? (report.checks.source === 'pass' ? 0 : 1) : (report.result === 'pass' ? 0 : 1);
