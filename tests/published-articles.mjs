import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseArticle} from '../scripts/article-frontmatter.mjs';
import {articleUrl} from '../scripts/article-url.mjs';

// Read expected publication identities from source, independently of rendered indexes.
export function publishedArticles() {
  const directory = resolve('site/_articles');
  return readdirSync(directory).filter(file => file.endsWith('.md'))
    .map(file => parseArticle(readFileSync(resolve(directory, file), 'utf8')).data)
    .filter(data => data.status === 'published')
    .map(data => ({lang: data.lang, url: articleUrl(data.permalink, data.lang)}));
}
