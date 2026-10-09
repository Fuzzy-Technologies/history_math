import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, rm, stat} from 'node:fs/promises';
import {resolve, extname, sep, dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {platform, release} from 'node:os';
import {digest, fileDigest, printDocument, dependencyReader, readCachedPdf, writeCachedPdf, pruneCache, validPdf} from './pdf-cache.mjs';
import {chromium} from 'playwright';

export function validateManifest(manifest) {
  if (manifest.version !== 1 || !/^(?:\/[a-zA-Z0-9_-]+)*$/.test(manifest.baseurl ?? 'INVALID') ||
      !/^https:\/\/[^/]+$/.test(manifest.origin ?? '') || !Array.isArray(manifest.articles)) throw new Error('Invalid PDF manifest');
  const paths = new Set();
  for (const article of manifest.articles) {
    const match = /^\/(ru\/)?articles\/([a-z0-9-]+)\/$/.exec(article.url ?? '');
    if (!match || !['en', 'ru'].includes(article.lang) || Boolean(match[1]) !== (article.lang === 'ru') ||
        article.pdf_url !== `/assets/pdf/${article.lang}/${match[2]}.pdf` ||
        typeof article.title !== 'string' || !article.title.trim() || paths.has(article.pdf_url)) throw new Error('Invalid or duplicate PDF article');
    paths.add(article.pdf_url);
  }
  return manifest;
}

// Rewrite only the private PDF server response, before browser preload discovery.
// Public HTML keeps previews and inert original URLs for the interactive viewer.
export function printImageSources(html) {
  return html.replace(/<img\b[^>]*>/gi, tag => {
    const original = tag.match(/\sdata-original="([^"]+)"/);
    if (!original) return tag;
    return tag.replace(/\ssrc="[^"]*"/, () => ` src="${original[1]}"`)
      .replace(/\s(?:srcset|sizes)="[^"]*"/g, '');
  });
}

export async function buildPdfs(siteDirectory, {cacheDirectory = '.pdf-cache', force = false, jobs = 2} = {}) {
  if (!Number.isInteger(jobs) || jobs < 1 || jobs > 4) throw new Error('PDF jobs must be an integer from 1 to 4');
  const started = performance.now();
  const root = resolve(siteDirectory);
  const manifest = validateManifest(JSON.parse(await readFile(resolve(root, 'assets/article-pdfs.json'), 'utf8')));
  const cacheRoot = resolve(cacheDirectory);
  if (cacheRoot === root || cacheRoot.startsWith(root + sep) || root.startsWith(cacheRoot + sep)) throw new Error('PDF cache must be outside site output');
  const cache = resolve(cacheRoot, digest(JSON.stringify([manifest.origin, manifest.baseurl])));
  const executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
  // Include actual browser and fallback fonts, not just the nominal Playwright version.
  // Fontconfig enumerates Linux fonts; other platforms render without persistent reuse.
  const fonts = platform() === 'linux' ? [...new Set(execFileSync('fc-list', ['--format', '%{file}\n'], {encoding: 'utf8'}).trim().split('\n'))].filter(Boolean).sort() : [];
  const engineFiles = [executablePath, new URL('./article-pdf.mjs', import.meta.url),
    new URL('./pdf-cache.mjs', import.meta.url), new URL('../package-lock.json', import.meta.url), ...fonts];
  const engineHashes = [];
  for (const path of engineFiles) engineHashes.push(await fileDigest(path));
  const engine = digest(JSON.stringify([platform(), release(), process.env.ImageVersion, fonts, engineHashes]));
  const dependencies = dependencyReader(root, manifest.baseurl);
  const documents = new Map(), allowedAssets = new Set(), keys = new Set(), pending = [];
  let reused = 0;
  // A former public article must not survive as an orphaned downloadable PDF.
  await rm(resolve(root, 'assets/pdf'), {recursive: true, force: true});
  for (const article of manifest.articles) {
    const source = await readFile(resolve(root, '.' + article.url, 'index.html'), 'utf8');
    const html = printImageSources(printDocument(source, article, manifest.baseurl));
    const assets = await dependencies(html, manifest.baseurl + article.url); // Missing assets fail even on cache hits.
    const key = digest(JSON.stringify({engine, html, assets, origin: manifest.origin, baseurl: manifest.baseurl}));
    keys.add(key);
    const bytes = !force && fonts.length ? await readCachedPdf(cache, key) : null;
    if (bytes) {
      const destination = resolve(root, '.' + article.pdf_url);
      await mkdir(dirname(destination), {recursive: true});
      await writeFile(destination, bytes);
      reused++;
    } else {
      documents.set(manifest.baseurl + article.url, html);
      for (const [url] of assets) allowedAssets.add(url);
      pending.push({article, key, assets: new Set(assets.map(([url]) => url))});
    }
  }
  const summary = async () => {
    await pruneCache(cache, keys);
    const result = {rendered: pending.length, reused, total: manifest.articles.length, seconds: Number(((performance.now() - started) / 1000).toFixed(2))};
    console.log(`PDF summary: ${JSON.stringify(result)}`);
    return result;
  };
  if (!pending.length) return summary();
  const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'};
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (documents.has(url.pathname)) { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(documents.get(url.pathname)); return; }
      if (!allowedAssets.has(url.pathname)) { response.writeHead(404).end(); return; }
      if (!url.pathname.startsWith(manifest.baseurl + '/')) { response.writeHead(404).end(); return; }
      let path = resolve(root, '.' + decodeURIComponent(url.pathname.slice(manifest.baseurl.length)));
      if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
      const bytes = await readFile(path);
      response.end(extname(path) === '.html' ? printImageSources(bytes.toString('utf8')) : bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const localOrigin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless: true, executablePath});
    let cursor = 0, stopped = false;
    async function worker() {
      while (!stopped && cursor < pending.length) {
        const {article, key, assets} = pending[cursor++];
        let page;
        try {
          page = await browser.newPage({viewport: {width: 1000, height: 1400}, reducedMotion: 'reduce'});
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
          page.on('requestfailed', request => errors.push(`${request.url()} (${request.failure()?.errorText})`));
          page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
          await page.route('**/*', route => {
            const url = new URL(route.request().url());
            return url.origin === localOrigin && (url.pathname === manifest.baseurl + article.url || assets.has(url.pathname)) ? route.continue() : route.abort();
          });
          await page.emulateMedia({media: 'print', colorScheme: 'light'});
          const response = await page.goto(localOrigin + manifest.baseurl + article.url, {waitUntil: 'load'});
          if (response?.status() !== 200) throw new Error(`Missing article: ${article.url}`);
          await page.evaluate(async () => {
            document.documentElement.dataset.theme = 'light';
            for (const img of document.images) img.loading = 'eager';
            await Promise.all([...document.images].map(img => img.decode()));
            await document.fonts.ready;
          });
          const state = await page.evaluate(() => ({
            lang: document.documentElement.lang,
            unrendered: [...document.querySelectorAll('.math-source')].some(node => node.dataset.rendered !== 'true'),
            logo: document.querySelector('.print-masthead img')?.getAttribute('src'),
            content: document.querySelector('.article-body')?.textContent.trim(),
            missingPrintImage: [...document.querySelectorAll('.article-body img, .print-masthead img')].some(img => img.getBoundingClientRect().width < 1 || img.getBoundingClientRect().height < 1),
            clipped: [...document.querySelectorAll('.article-body table, .math-source[data-display="true"] .katex')]
              .some(node => node.getBoundingClientRect().width > document.querySelector('.article-body').getBoundingClientRect().width + 2)
          }));
          const logo = article.lang === 'ru' ? 'Math-with-Mansur-ru.png' : 'Math-with-Mansur.png';
          if (errors.length || state.lang !== article.lang || state.unrendered || state.missingPrintImage || state.clipped || !state.content || !state.logo?.endsWith(logo)) {
            throw new Error(`PDF render failed for ${article.url}: ${JSON.stringify({errors, state})}`);
          }
          // Downsample only the print DOM to about 240 dpi; never modify the archived assets.
          await page.evaluate(async ({localOrigin, publicOrigin}) => {
            for (const img of document.querySelectorAll('.print-masthead img, .article-body img')) {
              if (new URL(img.src).pathname.endsWith('.svg') && !img.closest('.print-masthead')) continue;
              const bounds = img.getBoundingClientRect();
              const ratio = Math.min(1, Math.max(bounds.width * 2.5 / img.naturalWidth, bounds.height * 2.5 / img.naturalHeight));
              if (ratio >= 1) continue;
              const canvas = document.createElement('canvas');
              canvas.width = Math.ceil(img.naturalWidth * ratio); canvas.height = Math.ceil(img.naturalHeight * ratio);
              const context = canvas.getContext('2d');
              context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
              context.drawImage(img, 0, 0, canvas.width, canvas.height);
              // Keep the CSS dimensions stable when intrinsic pixel dimensions change.
              img.style.width = `${bounds.width}px`; img.style.height = `${bounds.height}px`;
              img.src = canvas.toDataURL('image/jpeg', 0.9);
              await img.decode();
            }
            for (const link of document.querySelectorAll('a[href]')) {
              if (link.getAttribute('href').startsWith('#')) continue;
              const target = new URL(link.href);
              if (target.origin === localOrigin) link.href = publicOrigin + target.pathname + target.search + target.hash;
            }
          }, {localOrigin, publicOrigin: manifest.origin});
          const destination = resolve(root, '.' + article.pdf_url);
          await mkdir(dirname(destination), {recursive: true});
          const journal = article.lang === 'ru' ? 'Математика с Мансур-абый' : 'Mathematics with Mansur';
          // Chromium keeps selectable text, vector formulas, embedded fonts and link annotations.
          const bytes = await page.pdf({format: 'A4', preferCSSPageSize: true, printBackground: true, tagged: true, outline: true,
            displayHeaderFooter: true, headerTemplate: '<span></span>',
            footerTemplate: `<div style="width:100%;margin:0 19mm;font:8pt Arial;color:#62554e;display:flex;justify-content:space-between"><span>${journal}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`});
          if (!validPdf(bytes)) throw new Error('Invalid generated PDF');
          await writeFile(destination, bytes);
          await writeCachedPdf(cache, key, bytes);
          console.log(`PDF ${article.lang}: ${article.url} (${Math.ceil(bytes.length / 1024)} KiB)`);
        } catch (error) {
          stopped = true;
          throw error;
        } finally {
          await page?.close();
        }
      }
    }
    // Wait for every worker before closing the shared browser, including on failure.
    const results = await Promise.allSettled(Array.from({length: Math.min(jobs, pending.length)}, worker));
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
  } finally {
    await browser?.close();
    await new Promise(done => server.close(done));
  }
  return summary();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
  await buildPdfs(option('--site-dir', '_site'), {cacheDirectory: option('--cache-dir', process.env.PDF_CACHE_DIR || '.pdf-cache'), force: process.argv.includes('--force'), jobs: Number(option('--jobs', process.env.PDF_JOBS || '2'))});
}
