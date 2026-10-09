// Optional local scale measurement; never adds synthetic articles to public source.
// First run: bundle exec ruby tests/publication_test.rb
import assert from 'node:assert/strict';
import {cp, readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildPdfs} from '../scripts/article-pdf.mjs';
const count = Number(process.argv[2] || 1000);
if (!Number.isInteger(count) || count < 1 || count > 10000) throw new Error('Expected 1–10000 articles');
const root = resolve('test-results/pdf-scale');
const cacheDirectory = resolve('test-results/pdf-scale-cache');
await rm(root, {recursive: true, force: true});
await rm(cacheDirectory, {recursive: true, force: true});
await mkdir(root, {recursive: true});
await cp('test-results/pdf-fixture/assets', resolve(root, 'assets'), {recursive: true});
const manifest = JSON.parse(await readFile('test-results/pdf-fixture/assets/article-pdfs.json', 'utf8'));
const sample = manifest.articles.find(article => article.url === '/ru/articles/demo-reading/');
const source = await readFile(resolve('test-results/pdf-fixture', '.' + sample.url, 'index.html'), 'utf8');
manifest.articles = [];
for (let index = 0; index < count; index++) {
  const url = `/ru/articles/scale-${index}/`;
  const article = {...sample, url, title: `${sample.title} ${index}`, pdf_url: `/assets/pdf/ru/scale-${index}.pdf`};
  manifest.articles.push(article);
  await mkdir(resolve(root, '.' + url), {recursive: true});
  await writeFile(resolve(root, '.' + url, 'index.html'), source.replaceAll(sample.url, url));
}
await writeFile(resolve(root, 'assets/article-pdfs.json'), JSON.stringify(manifest));
const cold = await buildPdfs(root, {cacheDirectory});
assert.equal(cold.rendered, count);
const warm = await buildPdfs(root, {cacheDirectory});
assert.equal(warm.reused, count);
assert.equal(warm.rendered, 0);
const path = resolve(root, '.' + manifest.articles[0].url, 'index.html');
await writeFile(path, (await readFile(path, 'utf8')).replace('<!-- pdf:body:start -->', '<!-- pdf:body:start --><p>Changed article.</p>'));
const edited = await buildPdfs(root, {cacheDirectory});
assert.equal(edited.rendered, 1);
assert.equal(edited.reused, count - 1);
console.log('PDF scale results: ' + JSON.stringify({cold, warm, edited}));
