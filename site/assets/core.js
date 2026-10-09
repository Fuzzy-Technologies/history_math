export function normalize(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё', 'е').trim().replace(/\s+/g, ' ');
}

export function search(records, query, language) {
  const terms = normalize(query).split(' ').filter(Boolean);
  if (!terms.length) return [];
  return records.filter(record => record.language === language && terms.every(term =>
    normalize([record.title, record.description, record.type, ...record.tags, record.text].join(' ')).includes(term)));
}

export function searchByTag(records, tag, language) {
  const topic = normalize(tag);
  if (!topic) return [];
  return records.filter(record => record.language === language &&
    record.tags.some(value => normalize(value) === topic));
}

export function selection(records, count, previous = [], random = Math.random) {
  const unique = Array.from(new Map(records.map(record => [record.url, record])).values());
  const shuffled = [...unique];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  let picked = shuffled.slice(0, count);
  if (unique.length > count && picked.every(record => previous.includes(record.url))) {
    picked[picked.length - 1] = shuffled.find(record => !previous.includes(record.url));
  }
  return picked;
}

export function anniversaries(records, now, language) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return records.filter(record => record.language === language && record.date.slice(5) === `${month}-${day}` &&
    Number(record.date.slice(0, 4)) < year);
}

// Newest ten are exclusive to the carousel; the freshest quarter of the rest is featured.
export function journalGroups(records, language) {
  const articles = records.filter(record => record.language === language && record.status === 'published')
    .sort((a, b) => b.date.localeCompare(a.date) || (a.url < b.url ? 1 : a.url > b.url ? -1 : 0));
  const remainder = articles.slice(10);
  const midpoint = Math.ceil(remainder.length / 4);
  return {latest: articles.slice(0, 10), featured: remainder.slice(0, midpoint), archive: remainder.slice(midpoint)};
}
