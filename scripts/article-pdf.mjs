import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, rm, stat} from 'node:fs/promises';
import {resolve, extname, sep, dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
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

export async function buildPdfs(siteDirectory) {
  const root = resolve(siteDirectory);
  const manifest = validateManifest(JSON.parse(await readFile(resolve(root, 'assets/article-pdfs.json'), 'utf8')));
  // A former public article must not survive as an orphaned downloadable PDF.
  await rm(resolve(root, 'assets/pdf'), {recursive: true, force: true});
  const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'};
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith(manifest.baseurl + '/')) { response.writeHead(404).end(); return; }
      let path = resolve(root, '.' + decodeURIComponent(url.pathname.slice(manifest.baseurl.length)));
      if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
      response.end(await readFile(path));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const localOrigin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined});
    for (const article of manifest.articles) {
      const page = await browser.newPage({viewport: {width: 1000, height: 1400}, reducedMotion: 'reduce'});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('requestfailed', request => errors.push(request.url()));
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      await page.route('**/*', route => new URL(route.request().url()).origin === localOrigin ? route.continue() : route.abort());
      await page.emulateMedia({media: 'print', colorScheme: 'light'});
      const response = await page.goto(localOrigin + manifest.baseurl + article.url, {waitUntil: 'networkidle'});
      if (response?.status() !== 200) throw new Error(`Missing article: ${article.url}`);
      await page.evaluate(async () => {
        document.documentElement.dataset.theme = 'light';
        for (const img of document.images) img.loading = 'eager';
        // Finish preview requests before replacing their sources, so Chromium does
        // not report self-inflicted request cancellations during PDF validation.
        await Promise.all([...document.images].map(img => img.decode()));
        // Only the build-time PDF renderer loads originals without viewer interaction.
        for (const img of document.querySelectorAll('.print-masthead img, .article-body img')) {
          if (!img.dataset.original) continue;
          img.removeAttribute('srcset');
          img.src = img.dataset.original;
        }
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
      if (bytes.length < 1000 || bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid generated PDF');
      await writeFile(destination, bytes);
      console.log(`PDF ${article.lang}: ${article.url} (${Math.ceil(bytes.length / 1024)} KiB)`);
      await page.close();
    }
  } finally {
    await browser?.close();
    await new Promise(done => server.close(done));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const option = process.argv.indexOf('--site-dir');
  await buildPdfs(option < 0 ? '_site' : process.argv[option + 1]);
}
