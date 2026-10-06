import {readFileSync, existsSync, realpathSync, readdirSync} from 'node:fs';
import {resolve, relative, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import Ajv from 'ajv';
import {parseDocument} from 'yaml';

const katexModule = {exports: {}};
runInNewContext(readFileSync(new URL('../site/assets/vendor/katex/katex.min.js', import.meta.url), 'utf8'), {module: katexModule, exports: katexModule.exports});
const katex = katexModule.exports;
const schema = JSON.parse(readFileSync(new URL('../schemas/article-v1.schema.json', import.meta.url)));
const validate = new Ajv({allErrors: true, strict: false}).compile(schema);

export function parseArticle(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error('YAML front matter required');
  const yaml = parseDocument(match[1], {uniqueKeys: true});
  if (yaml.errors.length) throw new Error(yaml.errors.map(x => x.message).join('; '));
  return {data: yaml.toJS(), body: match[2], bodyLine: match[1].split('\n').length + 3};
}

export function checkArticle(text, file, root, identities = new Set()) {
  const findings = [];
  const add = (code, detail, line = 1, severity = 'error') => findings.push({code, severity, file, line, detail});
  let article;
  try { article = parseArticle(text); } catch (error) { add('HM_METADATA', error.message); return {findings}; }
  const {data, body, bodyLine} = article;
  if (!validate(data)) for (const error of validate.errors) add('HM_METADATA', `${error.instancePath || '/'} ${error.message}`);
  if (!data || typeof data !== 'object') return {findings};
  if (data.lang === 'ru' !== String(data.permalink).startsWith('/ru/')) add('HM_METADATA', 'lang / permalink');
  if (Array.isArray(data.authors) && data.author !== data.authors.join(', ')) add('HM_METADATA', 'author must display the authors array');
  for (const value of [data.date, data.updated, data.original_publication?.date].filter(Boolean)) {
    try {
      if (new Date(value).toISOString().slice(0, 10) !== value) add('HM_METADATA', `Invalid calendar date: ${value}`);
    } catch { add('HM_METADATA', `Invalid calendar date: ${value}`); }
  }
  for (const key of [`id:${data.article_id}:${data.lang}`, `url:${data.permalink}`, `translation:${data.translation_key}:${data.lang}`]) {
    if (identities.has(key)) add('HM_IDENTIFIER', key);
    identities.add(key);
  }
  const safeAsset = (path, line) => {
    if (typeof path !== 'string' || !/^\/assets\/images\/[a-z0-9-]+\/[A-Za-z0-9._-]+$/.test(path) || path.includes('..')) { add('HM_PATH', String(path), line); return; }
    const target = resolve(root, 'site', '.' + path);
    if (!existsSync(target)) { add('HM_IMAGE', path, line); return; }
    if (!realpathSync(target).startsWith(realpathSync(resolve(root, 'site')) + sep)) add('HM_PATH', path, line);
  };
  for (const key of ['preview_image', 'cover_image', 'hero_image']) if (data[key]) safeAsset(data[key], 1);
  const figures = new Map();
  for (const figure of data.figures ?? []) {
    if (figures.has(figure.id)) add('HM_IDENTIFIER', figure.id);
    figures.set(figure.id, figure);
    if (['alt', 'caption', 'source', 'rights_basis'].some(key => typeof figure[key] !== 'string' || !figure[key].trim())) add('HM_FIGURE', figure.id);
    safeAsset(figure.path, 1);
  }
  const used = new Set();
  const clean = body.replace(/```[\s\S]*?```|`[^`\n]*`/g, match => match.replace(/[^\n]/g, ' '));
  const lineAt = index => bodyLine + body.slice(0, index).split('\n').length - 1;
  for (const match of clean.matchAll(/\{%\s*include\s+article-figure.html\s+id="([a-z0-9-]+)"\s*%\}/g)) {
    if (!figures.has(match[1])) add('HM_FIGURE', match[1], lineAt(match.index));
    used.add(match[1]);
  }
  for (const id of figures.keys()) if (!used.has(id) && data.hero_image !== figures.get(id).path) add('HM_FIGURE', `Unused figure: ${id}`);
  if (/<\/?(?:script|iframe|img|figure|table|style)\b/i.test(clean) || /!\[[^\]]*\]\(/.test(clean)) add('HM_STRUCTURE', 'Use shared article-figure includes; raw active/media HTML is unsupported');
  const withoutIncludes = clean.replace(/\{%\s*include\s+article-figure.html\s+id="[a-z0-9-]+"\s*%\}/g, '');
  if (/\{%|\{\{/.test(withoutIncludes)) add('HM_STRUCTURE', 'Only the documented shared figure include is allowed');
  if (/\\\\[A-Za-z0-9-]+\\|[A-Za-z]:\\|\.felab\.json|runtime\.sqlite|ОПУБЛИКОВАТЬ В|ОПУБЛИКОВАТЬ ВТОРЫМ|ОПУБЛИКОВАТЬ ТРЕТЬИМ/.test(text)) add('HM_STRUCTURE', 'Private paths or operational metadata must remain in FELab');
  if (!/^##\s+/m.test(clean) || /^#\s+/m.test(clean)) add('HM_STRUCTURE', 'Use H2 sections beneath the shared H1 title');
  const anchors = new Set([...clean.matchAll(/\{#([A-Za-z][A-Za-z0-9_-]*)\}/g)].map(x => x[1]));
  for (const id of used) anchors.add(id);
  const notes = new Set([...clean.matchAll(/^\[\^([^\]]+)\]:/gm)].map(x => x[1]));
  for (const match of clean.matchAll(/\[\^([^\]]+)\](?!:)/g)) if (!notes.has(match[1])) add('HM_LINK', `[^${match[1]}]`, lineAt(match.index));
  for (const match of clean.matchAll(/\[[^\]]+\]\(#([^\)]+)\)/g)) if (!anchors.has(match[1])) add('HM_LINK', `#${match[1]}`, lineAt(match.index));
  for (const match of clean.matchAll(/\[[^\]]+\]\(([^\)]+)\)/g)) {
    if (!/^(?:https:\/\/|mailto:|#)/.test(match[1])) add('HM_PATH', match[1], lineAt(match.index));
  }
  const references = new Set([...clean.matchAll(/^\[([^\]^]+)\]:\s+\S/gm)].map(x => x[1].toLowerCase()));
  for (const match of clean.matchAll(/\[[^\]]+\]\[([^\]]*)\]/g)) if (!references.has(match[1].toLowerCase())) add('HM_LINK', `[${match[1]}]`, lineAt(match.index));
  const mathPattern = /\$\$([\s\S]*?)\$\$|(?<![\\$])\$(?!\$)([^\n$]*?)\$(?!\$)/g;
  let formulaCount = 0;
  const remaining = clean.replace(mathPattern, (match, display, inline, offset) => {
    formulaCount++;
    try { katex.renderToString((display ?? inline).trim(), {displayMode: display !== undefined, throwOnError: true, trust: false, strict: 'error'}); }
    catch (error) { add('HM_MATH', error.message, lineAt(offset)); }
    return match.replace(/[^\n]/g, ' ');
  });
  if (/(?<!\\)\$/.test(remaining) || /\\(?:begin|end)\{/.test(remaining)) add('HM_MATH', 'Unmatched delimiters or LaTeX outside dollar math');
  if (formulaCount > 0 && data.math !== true) add('HM_MATH', 'math: true is required');
  for (const question of data.editorial_questions ?? []) add('HM_EDITOR', question, 1, 'editor');
  if (/https:\/\//.test(body)) add('HM_EXTERNAL', '', 1, 'warning');
  return {...article, findings, formulaCount, figureCount: figures.size};
}

export function checkContract(root) {
  const lock = JSON.parse(readFileSync(resolve(root, 'schemas/contract-lock.json'), 'utf8').replace(/^\uFEFF/, ''));
  const hash = createHash('sha256').update(readFileSync(resolve(root, 'schemas/article-v1.schema.json'))).digest('hex');
  return hash === lock.sha256 ? [] : [{code: 'HM_CONTRACT', severity: 'error', file: 'schemas/article-v1.schema.json'}];
}

export function articleFiles(root) {
  return readdirSync(resolve(root, 'site/_articles')).filter(x => x.endsWith('.md')).map(x => 'site/_articles/' + x);
}

export function checkSources(root, files = articleFiles(root)) {
  const identities = new Set();
  const findings = checkContract(root);
  const articles = [];
  for (const file of files) {
    const text = readFileSync(resolve(root, file), 'utf8');
    const parsed = parseArticle(text);
    if (parsed.data.schema_version !== 1) {
      if (!/^site\/_articles\/demo-(?:abacus|area|geometry|reading|notation)\.md$/.test(file)) findings.push({code: 'HM_METADATA', severity: 'error', file, line: 1, detail: 'schema_version: 1 is required for new article packages'});
      continue;
    }
    const result = checkArticle(text, file, root, identities);
    findings.push(...result.findings);
    articles.push({file, id: result.data?.article_id, url: result.data?.permalink, formulas: result.formulaCount, figures: result.figureCount});
  }
  return {findings, articles};
}
