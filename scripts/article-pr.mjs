import {messages, reportLanguage, overall} from './article-messages.mjs';
import {editorialQuestionText, hasQuestionTranslation, validQuestionLocalizations} from './editorial-question-messages.mjs';

// Descriptions use the same deterministic local language contract as reports.
export function articlePrBody({article, review, report, branch, runUrl}) {
  const language = reportLanguage(branch);
  const m = messages[language];
  const p = m.pr;
  const publication = article.original_publication;
  const questions = (review.questions ?? []).filter(x => x.state === 'open');
  for (const question of questions) {
    if (!validQuestionLocalizations(question)) throw new Error('Invalid or stale editorial question localization');
    if (language === 'ru' && !hasQuestionTranslation(question, language, article.lang)) {
      throw new Error('Russian editorial question translation required: ' + question.id);
    }
  }
  const lines = [article.description ?? article.title, '',
    ...(publication ? [`${p.publication}: ${[publication.outlet, publication.date].filter(Boolean).join(' · ')}.`, ''] : []),
    ...(questions.length ? [`${p.questions}:`, '', ...questions.map(x => `- ${editorialQuestionText(x, language)}`), ''] : []),
    `${m[overall(report)]} [${p.preview}](${runUrl}).`];
  return lines.join('\n');
}
