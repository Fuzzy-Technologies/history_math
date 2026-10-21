import {appendFileSync, readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArticle} from './article-frontmatter.mjs';

const shaPattern = /^[a-f0-9]{40}$/;
const articlePath = /^site\/_articles\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.md$/i;

// Unknown files require the full gate. Only article-owned assets use the light path.
export function publicationPlan(paths, articleIds = []) {
  const known = new Set(articleIds);
  const content = path => {
    if (articlePath.test(path)) return true;
    const image = /^site\/assets\/images\/(?:previews\/)?([a-z0-9-]+)\/[A-Za-z0-9._-]+$/.exec(path);
    const metadata = /^(?:reviews|site\/_data\/article_image_assets)\/([a-z0-9-]+)\.json$/.exec(path);
    return Boolean((image && known.has(image[1])) || (metadata && known.has(metadata[1])));
  };
  const docs = path => /^(?:docs\/.*\.md|README\.md|LICENSE(?:\.md)?|templates\/[^/]+\.md)$/.test(path);
  const fullChecks = paths.some(path => !content(path) && !docs(path));
  return {fullChecks, reason: fullChecks ? 'Site code, layout, pages or unclassified files changed' : 'Article content/assets or documentation only'};
}

export function latestPublishedRevision(runs) {
  return [...runs].filter(run => run.status === 'completed' && run.conclusion === 'success' &&
    run.head_branch === 'master' && ['push', 'workflow_dispatch'].includes(run.event) &&
    run.path === '.github/workflows/deploy.yml' && shaPattern.test(run.head_sha || ''))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]?.head_sha;
}

export async function deployedRevision(repository, token, request = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !token) return undefined;
  try {
    const response = await request(`https://api.github.com/repos/${repository}/actions/workflows/deploy.yml/runs?branch=master&status=success&per_page=10`, {
      headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'},
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return undefined;
    const data = await response.json();
    return Array.isArray(data.workflow_runs) ? latestPublishedRevision(data.workflow_runs) : undefined;
  } catch { return undefined; }
}

export function planRevision(root, base, head) {
  const full = reason => ({fullChecks: true, reason, base: base || '', head, changedFiles: []});
  if (!shaPattern.test(base || '') || !shaPattern.test(head || '') || /^0+$/.test(base)) return full('No trustworthy comparison revision');
  const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024});
  try {
    git(['merge-base', '--is-ancestor', base, head]);
    const paths = git(['diff', '--name-only', '-z', base, head]).split('\0').filter(Boolean);
    const ids = new Set();
    const current = git(['ls-tree', '-r', '--name-only', head, '--', 'site/_articles']).split('\n').filter(path => articlePath.test(path));
    for (const path of current) {
      const data = parseArticle(readFileSync(resolve(root, path), 'utf8')).data;
      if (typeof data.article_id === 'string') ids.add(data.article_id);
    }
    // Include withdrawn identities so deleting their images remains a content-only change.
    for (const path of paths.filter(path => articlePath.test(path) && !current.includes(path))) {
      const data = parseArticle(git(['show', `${base}:${path}`])).data;
      if (typeof data.article_id === 'string') ids.add(data.article_id);
    }
    return {...publicationPlan(paths, ids), base, head, changedFiles: paths};
  } catch { return full('Comparison unavailable or incomplete; require the full gate'); }
}

async function main() {
  const args = process.argv.slice(2);
  const value = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const root = resolve(value('--root') || '.');
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  const base = value('--base') || await deployedRevision(process.env.GITHUB_REPOSITORY, process.env.GITHUB_TOKEN);
  const plan = planRevision(root, base, head);
  if (process.env.PUBLICATION_FORCE_FULL === 'true') {
    plan.fullChecks = true;
    plan.reason = 'Explicit full publication check';
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `full_checks=${plan.fullChecks}\nbase_sha=${plan.base}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### Publication checks\n\n- Mode: **${plan.fullChecks ? 'full' : 'content'}**\n- Reason: ${plan.reason}\n- Compared with: ${plan.base || 'unavailable'}\n- Changed files: ${plan.changedFiles.length}\n\n`);
  console.log(JSON.stringify(plan));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
