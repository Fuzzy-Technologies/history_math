import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname, sep, relative} from 'node:path';
import {chromium} from 'playwright';

export async function checkBrowser(root, articles, evidence) {
  await mkdir(evidence, {recursive: true});
  const mime = {'.webp': 'image/webp', '.pdf': 'application/pdf', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2'};
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith('/history_math/')) { response.writeHead(404).end(); return; }
      let path = resolve(root, '.' + decodeURIComponent(url.pathname.slice('/history_math'.length)));
      if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
      response.end(await readFile(path));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  let browser;
  const findings = [];
  const pages = [];
  try {
    browser = await chromium.launch({headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined});
    for (const viewport of [{name: 'wide', width: 1440, height: 1000}, {name: 'narrow', width: 390, height: 844}, {name: 'small', width: 320, height: 640}]) {
      for (const article of articles) {
        const page = await browser.newPage({viewport, reducedMotion: 'reduce'});
        const issues = [];
        page.on('pageerror', error => issues.push(error.message));
        page.on('console', msg => { if (msg.type() === 'error') issues.push(msg.text()); });
        page.on('requestfailed', request => issues.push(request.url()));
        const response = await page.goto(`http://127.0.0.1:${server.address().port}/history_math${article.url}`, {waitUntil: 'networkidle'});
        if (response?.status() !== 200) issues.push(`HTTP ${response?.status()}`);
        await page.locator('img').evaluateAll(images => images.forEach(img => { img.loading = 'eager'; }));
        try { await page.waitForFunction(() => [...document.images].every(x => x.complete && x.naturalWidth > 0), null, {timeout: 10000}); }
        catch { issues.push('Missing or undecoded image'); }
        await page.evaluate(() => document.fonts.ready);
        const state = await page.evaluate(() => {
          const content = document.querySelector('.article-body');
          const formulas = [...document.querySelectorAll('.math-source')];
          const tables = [...document.querySelectorAll('.article-body table')];
          const anchors = [...document.querySelectorAll('.article-body a[href^="#"]')];
          const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
          const visibleUrls = [];
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.parentElement.closest('pre, code, .katex-mathml') && /https?:\/\/|www\./i.test(node.textContent)) visibleUrls.push(node.textContent.trim());
          }
          const imageSizes = [...document.querySelectorAll('.article-body img')].map(img => {
            const style = getComputedStyle(img);
            const bounds = img.getBoundingClientRect();
            return {
              natural: [img.naturalWidth, img.naturalHeight],
              displayed: [bounds.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth) - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
                bounds.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)]
            };
          });
          return {
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            overflowElements: document.documentElement.scrollWidth > innerWidth + 1 ? [...document.querySelectorAll('body *')]
              .filter(x => !x.closest('.table-scroll') && !x.closest('.math-source[data-display="true"]') && x.getBoundingClientRect().right > innerWidth + 1)
              .slice(0, 12).map(x => ({tag: x.tagName, class: String(x.className), right: x.getBoundingClientRect().right, text: x.textContent.slice(0, 80)})) : [],
            formulas: formulas.length,
            unrendered: formulas.filter(x => x.dataset.rendered !== 'true').length,
            formulaOverflow: formulas.some(x => x.querySelector('.katex')?.getBoundingClientRect().width > content.getBoundingClientRect().width + 2),
            tableOverflow: tables.some(x => (x.closest('.table-scroll') ?? x).getBoundingClientRect().right > content.getBoundingClientRect().right + 2),
            tableRegions: tables.every(x => x.parentElement.matches('.table-scroll[tabindex="0"][role="region"][aria-label]')),
            imageSizing: imageSizes.every(x => x.displayed[0] <= Math.min(x.natural[0], 960) + 1 && x.displayed[1] <= Math.min(x.natural[1], 720) + 1),
            imageSizes,
            visibleUrls,
            missingAnchors: anchors.filter(x => !document.getElementById(decodeURIComponent(x.hash.slice(1)))).map(x => x.hash),
            images: [...document.querySelectorAll('.article-body img')].length
          };
        });
        if (state.overflow || state.formulaOverflow || state.tableOverflow || !state.tableRegions || !state.imageSizing || state.unrendered || state.visibleUrls.length || state.missingAnchors.length || state.formulas !== article.formulas || state.images !== article.figures) issues.push(JSON.stringify(state));
        const screenshot = `${evidence}/${article.id}-${viewport.name}.png`;
        await page.screenshot({path: screenshot, fullPage: true});
        const pdfLink = page.locator('.article-pdf');
        const pdfResponse = await page.request.get(new URL(await pdfLink.getAttribute('href'), page.url()).href);
        if (pdfResponse.status() !== 200 || (await pdfResponse.body()).subarray(0, 5).toString() !== '%PDF-') issues.push('Missing article PDF');
        pages.push({id: article.id, viewport: viewport.name, ...state, screenshot: relative(resolve('test-results'), screenshot).split(sep).join('/')});
        for (const detail of issues) findings.push({code: 'HM_BROWSER', severity: 'error', file: article.file, detail});
        await page.close();
      }
    }
    return {findings, pages};
  } finally {
    await browser?.close();
    await new Promise(done => server.close(done));
  }
}
