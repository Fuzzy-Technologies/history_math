// A digest is authored prose, never a mechanically clipped article opening.
export function digestProblems(description, language) {
  if (typeof description !== 'string' || !description.trim()) return ['A digest is required'];
  const text = description.trim();
  const problems = [];
  if (/…|\.{3}/u.test(text)) problems.push('Ellipses and truncated openings are not allowed');
  if (/[\r\n]/u.test(text)) problems.push('Use one paragraph');
  if (!/[.!?][»”"')\]]?$/u.test(text)) problems.push('Finish the last sentence');
  // Initials in names are not sentence boundaries (e.g. Е. И. Игнатьев).
  const prose = text.replace(/(?<!\p{L})(\p{Lu})\.(?=\s*\p{Lu})/gu, '$1');
  const sentences = [...new Intl.Segmenter(language === 'ru' ? 'ru' : 'en', {granularity: 'sentence'}).segment(prose)];
  if (sentences.length > 2) problems.push('Use one or two complete sentences');
  return problems;
}
