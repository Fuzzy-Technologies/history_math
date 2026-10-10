import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseDocument} from 'yaml';

// Walk only the public branch: author dates and commits on review branches
// must never become publication dates. Identity survives file moves and edits.
export function publicationDates(root, ref = 'refs/remotes/origin/master') {
  const git = (...args) => execFileSync('git', args, {
    cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (git('rev-parse', '--is-shallow-repository').trim() !== 'false') {
    throw new Error('Publication dates require full Git history (fetch-depth: 0)');
  }
  const head = git('rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`).trim();
  const commits = git('log', '--first-parent', '--reverse', '--format=%H%x09%cI', head,
    '--', 'site/_articles').trim().split('\n').filter(Boolean);
  const articles = Object.create(null);
  const metadata = new Map();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  for (const line of commits) {
    const [commit, publishedAt] = line.split('\t');
    const date = formatter.format(new Date(publishedAt));
    for (const entry of git('ls-tree', '-rz', commit, '--', 'site/_articles').split('\0').filter(Boolean)) {
      const [object, path] = entry.split('\t');
      const [mode, type, sha] = object.split(' ');
      if (type !== 'blob' || !mode.startsWith('100') || !path.endsWith('.md')) continue;
      if (!metadata.has(sha)) {
        const text = git('cat-file', 'blob', sha);
        const front = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
        if (!front) throw new Error(`Missing historical front matter: ${commit}:${path}`);
        const yaml = parseDocument(front[1], {uniqueKeys: true});
        if (yaml.errors.length) throw new Error(`Invalid historical metadata: ${commit}:${path}`);
        metadata.set(sha, yaml.toJS());
      }
      const data = metadata.get(sha);
      if (data?.status !== 'published' || !data.article_id) continue;
      const key = `${data.article_id}:${data.lang}`;
      articles[key] ??= {date, commit, published_at: publishedAt};
    }
  }
  return {version: 1, ref: head, articles};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [root = '.', ref = 'refs/remotes/origin/master'] = process.argv.slice(2);
    console.log(JSON.stringify(publicationDates(root, ref)));
  } catch (error) {
    console.error(`Publication dates: ${error.message}`);
    process.exitCode = 1;
  }
}
