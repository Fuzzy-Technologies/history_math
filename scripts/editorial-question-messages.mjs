import {readFileSync} from 'node:fs';

// Imported questions retain their canonical wording and pending decisions.
// Exact source matching prevents a changed question from reusing a stale translation.
export const importedQuestionMessages = JSON.parse(readFileSync(new URL('../schemas/editorial-question-messages.json', import.meta.url), 'utf8'));
const russianQuestions = new Map();
for (const entry of importedQuestionMessages) {
  if (typeof entry.source !== 'string' || !entry.source.trim() ||
      typeof entry.ru !== 'string' || !entry.ru.trim() || russianQuestions.has(entry.source)) {
    throw new Error('Invalid or duplicate editorial question translation');
  }
  russianQuestions.set(entry.source, entry.ru);
}

export function validQuestionLocalizations(question) {
  if (!Object.hasOwn(question, 'localizations')) return true;
  const value = question.localizations;
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    value.source === question.question && Object.keys(value).some(key => ['ru', 'en'].includes(key)) &&
    Object.entries(value).every(([key, text]) => ['source', 'ru', 'en'].includes(key) && typeof text === 'string' && text.trim());
}

export function questionTranslation(question, language) {
  if (validQuestionLocalizations(question) && question.localizations &&
      Object.hasOwn(question.localizations, language)) return question.localizations[language];
  return language === 'ru' ? russianQuestions.get(question.question) : undefined;
}

export function hasQuestionTranslation(question, language, sourceLanguage) {
  return language === sourceLanguage || questionTranslation(question, language) !== undefined;
}

export function editorialQuestionText(question, language) {
  return questionTranslation(question, language) ?? question.question;
}
