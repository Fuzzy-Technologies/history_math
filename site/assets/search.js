// Unmodified, same-origin ESM builds from @orama/stemmers (Apache-2.0).
import {stemmer as englishStem} from './vendor/orama-stemmers-3.1.18/en.js';
import {stemmer as russianStem} from './vendor/orama-stemmers-3.1.18/ru.js';

const stopwords = {
  en: new Set('a an and are as at be by for from in is it of on or the to was were with'.split(' ')),
  ru: new Set('а без бы был была были было в во для до его же за и из или к как ко на но о об от по при с со то у что это'.split(' '))
};
const documents = new WeakMap();
const vocabulary = {en: new Map(), ru: new Map()};

function tokenize(text, language) {
  const words = (text || '').normalize('NFKC').toLowerCase().replaceAll('ё', 'е')
    .match(/[\p{L}\p{N}]+|[=+×÷√∞∑∫≤≥≠]/gu) || [];
  const dictionary = vocabulary[language];
  const tokens = [];
  for (const word of words) {
    if (stopwords[language].has(word)) continue;
    if (!dictionary.has(word)) {
      const stem = language === 'ru' ? russianStem : englishStem;
      dictionary.set(word, stem(word) || word);
    }
    tokens.push(dictionary.get(word));
  }
  return tokens;
}

function indexDocument(record) {
  if (documents.has(record)) return documents.get(record);
  const words = value => tokenize(value, record.language);
  const tags = (record.tags || []).map(words);
  const title = words(record.title);
  const description = words(record.description);
  const body = words(record.text);
  const frequency = new Map();
  for (const word of body) frequency.set(word, 1 + (frequency.get(word) || 0));
  const tagTerms = new Set(tags.flat());
  const terms = new Set([...frequency.keys(), ...title, ...description, ...tagTerms, ...words(record.type)]);
  const doc = {tagTerms, tags, title, description, body, frequency, terms};
  documents.set(record, doc);
  return doc;
}

// Prefer words remembered in order and close together, including across omitted words.
function proximity(words, query) {
  if (query.length < 2) return 0;
  let best = 0;
  for (let start = 0; start < words.length; start++) {
    if (words[start] !== query[0]) continue;
    const end = Math.min(words.length, start + query.length + 10);
    let next = 1;
    for (let pos = start + 1; pos < end; pos++) {
      if (words[pos] !== query[next]) continue;
      if (++next === query.length) {
        best = Math.max(best, 11 - (pos - start + 1 - query.length));
        break;
      }
    }
    if (best === 11) break;
  }
  return best;
}

function rank(doc, query, unique) {
  const exactTag = doc.tags.some(tag => tag.length === query.length && tag.every((word, i) => word === query[i]));
  const tagHits = unique.filter(term => doc.tagTerms.has(term)).length;
  const titleHits = unique.filter(term => doc.title.includes(term)).length;
  const descriptionHits = unique.filter(term => doc.description.includes(term)).length;
  const nearby = Math.max(proximity(doc.title, query), proximity(doc.description, query), proximity(doc.body, query));
  // Cap repetitions so a long article cannot gain indefinitely by repeating a word.
  const frequency = unique.reduce((sum, term) => sum + Math.min(4, doc.frequency.get(term) || 0), 0);
  return [exactTag, tagHits, titleHits, descriptionHits, nearby, frequency];
}

export async function search(records, query, language, isCurrent = () => true) {
  if (!Object.hasOwn(stopwords, language)) return [];
  const terms = tokenize(query, language);
  if (!terms.length) return [];
  const unique = [...new Set(terms)];
  const matches = [];
  let sliceStart = performance.now();
  for (const record of records) {
    if (record.language !== language || record.translation_notice) continue;
    const doc = indexDocument(record);
    if (unique.every(term => doc.terms.has(term))) matches.push({record, rank: rank(doc, terms, unique)});
    // Index the cold corpus in slices so typing or navigating remains responsive.
    if (performance.now() - sliceStart >= 12) {
      if (globalThis.scheduler?.yield) await globalThis.scheduler.yield();
      else await new Promise(resolve => setTimeout(resolve, 0));
      if (!isCurrent()) return [];
      sliceStart = performance.now();
    }
  }
  // Stable ties retain the existing publication order.
  return matches.sort((a, b) => {
    for (let i = 0; i < a.rank.length; i++) {
      if (a.rank[i] !== b.rank[i]) return b.rank[i] - a.rank[i];
    }
    return 0;
  }).map(match => match.record);
}
