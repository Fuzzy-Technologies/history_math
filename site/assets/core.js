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

export function articleCandidates(records, language, excludedTags) {
  const excluded = new Set(excludedTags.map(topicKey));
  return records.filter(record => record.language === language && record.status === 'published' &&
    !record.translation_notice && record.tags.every(tag => !excluded.has(topicKey(tag))));
}

// Measure every candidate while keeping the temporary DOM bounded.
export function* archiveMeasurementBatches(records) {
  for (let offset = 0; offset < records.length; offset += 16) yield records.slice(offset, offset + 16);
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
    const alternate = shuffled.find(record => !previous.includes(record.url));
    if (alternate && picked.length) picked[picked.length - 1] = alternate;
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

export function newestFirst(a, b) {
  return b.date.localeCompare(a.date) || (a.url < b.url ? 1 : a.url > b.url ? -1 : 0);
}

export function journalGroups(records, language, rules, {excluded = [], previous = [], random = Math.random} = {}) {
  const articles = Array.from(new Map(records.filter(record => record.language === language && record.status === 'published')
    .map(record => [record.url, record])).values()).sort(newestFirst);
  const published = articles.filter(record => !record.translation_notice);
  const recent = published.slice(0, Math.ceil(published.length / 2));
  const hero = new Set(excluded);
  const buckets = new Map(Object.keys(rules.group_limits).map(group => [group, []]));
  const rubrics = Object.entries(rules.rubric_tags).map(([id, tags]) => [id, new Set(tags.map(topicKey))]);
  for (const record of recent) {
    if (hero.has(record.url)) continue;
    const match = rubrics.find(([, tags]) => record.tags.some(tag => tags.has(topicKey(tag))));
    const group = match ? match[0] : record.type === 'instrument' ? 'instruments' : 'other';
    buckets.get(group).push(record);
  }
  const reading = [];
  for (const [group, candidates] of buckets) {
    reading.push(...selection(candidates, rules.group_limits[group], previous, random));
  }
  const urls = new Set(reading.map(record => record.url));
  return {reading: reading.sort(newestFirst), archive: articles.filter(record => !urls.has(record.url))};
}
