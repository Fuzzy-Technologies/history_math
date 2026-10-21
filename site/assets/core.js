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
  const topic = topicKey(tag);
  if (!topic) return [];
  return records.filter(record => record.language === language &&
    record.tags.some(value => topicKey(value) === topic));
}

export function topicKey(value) {
  return normalize(String(value).normalize('NFKC').replaceAll('_', ' '));
}

export function rubricArticles(records, language, tags) {
  const topics = new Set(tags.map(topicKey));
  return records.filter(record => record.language === language && record.status === 'published' &&
    !record.translation_notice && record.tags.some(tag => topics.has(topicKey(tag))));
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

export function seriesKey(record, rules) {
  const explicit = topicKey(record.series || '');
  const keys = new Set([explicit, ...(record.tags || []).map(topicKey)]);
  return rules.series_tags.find(group => group.tags.some(tag => keys.has(topicKey(tag))))?.id || explicit;
}

export function newestFirst(a, b) {
  return b.date.localeCompare(a.date) || (a.url < b.url ? 1 : a.url > b.url ? -1 : 0);
}

// Sample recent articles before sorting; series limits soften only to fill a sparse selection.
export function journalGroups(records, language, rules, {previous = [], random = Math.random} = {}) {
  const articles = Array.from(new Map(records.filter(record => record.language === language && record.status === 'published')
    .sort(newestFirst).map(record => [record.url, record])).values());
  const candidates = articles.slice(0, rules.pool_size);
  const shuffled = selection(candidates, candidates.length, [], random);
  const counts = new Map();
  const selected = [], overflow = [];
  for (const record of shuffled) {
    const key = seriesKey(record, rules);
    if (!key || (counts.get(key) || 0) < rules.series_limit) {
      selected.push(record);
      counts.set(key, (counts.get(key) || 0) + 1);
    } else overflow.push(record);
  }
  const reading = [...selected, ...overflow].slice(0, rules.card_count);
  if (candidates.length > reading.length && reading.every(record => previous.includes(record.url))) {
    const alternative = shuffled.find(record => !previous.includes(record.url));
    if (alternative) {
      const key = seriesKey(alternative, rules);
      const sameSeries = reading.filter(record => key && seriesKey(record, rules) === key);
      const replace = sameSeries.length >= rules.series_limit ? reading.indexOf(sameSeries.at(-1)) : reading.length - 1;
      reading[replace] = alternative;
    }
  }
  const urls = new Set(reading.map(record => record.url));
  return {reading: reading.sort(newestFirst), archive: articles.filter(record => !urls.has(record.url))};
}
