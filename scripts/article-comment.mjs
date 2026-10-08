import {messages, reportLanguage} from './article-messages.mjs';

export const commentMarker = '<!-- history-math-article-report-v1 -->';

export async function updateReportComment({github, repo, number, commit, result, runUrl}) {
  const pr = (await github.rest.pulls.get({...repo, pull_number: number})).data;
  if (pr.head.sha !== commit) return false;
  const m = messages[reportLanguage(pr.head.ref)];
  const body = `${commentMarker}\n${m[result] ?? m.incomplete}\n\n${m.commit}: \`${commit}\`\n\n${m.preview}: [Actions report, preview and screenshots](${runUrl})\n`;
  const issue = {...repo, issue_number: number};
  const comments = await github.paginate(github.rest.issues.listComments, {...issue, per_page: 100});
  const previous = comments.find(x => x.user?.type === 'Bot' && x.body?.includes(commentMarker));
  if ((await github.rest.pulls.get({...repo, pull_number: number})).data.head.sha !== commit) return false;
  if (previous) await github.rest.issues.updateComment({...repo, comment_id: previous.id, body});
  else await github.rest.issues.createComment({...issue, body});
  return true;
}
