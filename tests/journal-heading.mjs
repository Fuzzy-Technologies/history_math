// Published article titles retain their author's exact punctuation.
export function hasStrayHeadingPeriod(heading, records) {
  const title = heading.trim();
  const endsWithPeriod = /\.$/.test(title.replace(/(?:\.{3}|…)$/, ''));
  return endsWithPeriod && !records.some(record => record.title === title);
}
