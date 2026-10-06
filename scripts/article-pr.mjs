import {messages, reportLanguage, overall} from './article-messages.mjs';

// Descriptions use the same deterministic local language contract as reports.
export function articlePrBody({article, review, report, branch, commit, infrastructureUrl, runUrl, selectionKey}) {
  const m = messages[reportLanguage(branch)];
  const p = m.pr;
  const publication = article.original_publication;
  const lines = [article.title, '', p.selection[selectionKey] ?? p.selection.default, '',
    `${p.publication}: ${publication ? [publication.outlet, publication.date, publication.url].filter(Boolean).join(' · ') : p.unknown}.`, '',
    p.converted, '', `${p.commit}: \`${commit}\`.`,
    m[overall(report)], '', `${p.questions}:`, '',
    ...(review.editorial_questions?.length ? review.editorial_questions.map(question => `- ${question}`) : [`- ${p.none}`]), '',
    `${p.preview}: ${runUrl}. ${p.artifact} \`article-review-${commit}\`.`,
    p.serve,
    `${p.page}: \`${article.permalink}\`.`, '',
    `${p.dependency} ${infrastructureUrl}. ${p.retarget}`, '', p.noPublication];
  return lines.join('\n');
}
