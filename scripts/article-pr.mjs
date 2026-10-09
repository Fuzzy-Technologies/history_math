import {messages, reportLanguage, overall} from './article-messages.mjs';

// Descriptions use the same deterministic local language contract as reports.
export function articlePrBody({article, review, report, branch, runUrl}) {
  const m = messages[reportLanguage(branch)];
  const p = m.pr;
  const publication = article.original_publication;
  const questions = (review.questions ?? []).filter(x => x.state === 'open');
  const lines = [article.description ?? article.title, '',
    ...(publication ? [`${p.publication}: ${[publication.outlet, publication.date].filter(Boolean).join(' · ')}.`, ''] : []),
    ...(questions.length ? [`${p.questions}:`, '', ...questions.map(x => `- ${x.question}`), ''] : []),
    `${m[overall(report)]} [${p.preview}](${runUrl}).`];
  return lines.join('\n');
}
