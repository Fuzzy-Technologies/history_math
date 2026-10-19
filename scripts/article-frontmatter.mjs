import {parseDocument} from 'yaml';

export function parseArticle(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error('YAML front matter required');
  const yaml = parseDocument(match[1], {uniqueKeys: true});
  if (yaml.errors.length) throw new Error(yaml.errors.map(x => x.message).join('; '));
  return {data: yaml.toJS(), body: match[2], bodyLine: match[1].split('\n').length + 3};
}
