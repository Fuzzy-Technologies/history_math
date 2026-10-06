import {createServer} from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname, sep, relative} from 'node:path';
import {chromium} from 'playwright';

export async function checkBrowser(root, articles, evidence) {
  await mkdir(evidence, {recursive: true});
  const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2'};
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
    browser = await chromium.launch({headless: true});
    for (const viewport of [{name: 'wide', width: 1440, height: 1000}, {name: 'narrow', width: 390, height: 844}]) {
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
        const state = await page.evaluate(() => {
          const content = document.querySelector('.article-body');
          const formulas = [...document.querySelectorAll('.math-source')];
          const tables = [...document.querySelectorAll('.article-body table')];
          const anchors = [...document.querySelectorAll('.article-body a[href^="#"]')];
          return {
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            formulas: formulas.length,
            unrendered: formulas.filter(x => x.dataset.rendered !== 'true').length,
            formulaOverflow: formulas.some(x => x.querySelector('.katex')?.getBoundingClientRect().width > content.getBoundingClientRect().width + 2),
            tableOverflow: tables.some(x => x.getBoundingClientRect().right > content.getBoundingClientRect().right + 2),
            missingAnchors: anchors.filter(x => !document.getElementById(decodeURIComponent(x.hash.slice(1)))).map(x => x.hash),
            images: [...document.querySelectorAll('.article-body img')].length
          };
        });
        if (state.overflow || state.formulaOverflow || state.tableOverflow || state.unrendered || state.missingAnchors.length || state.formulas !== article.formulas || state.images !== article.figures) issues.push(JSON.stringify(state));
        const screenshot = `${evidence}/${article.id}-${viewport.name}.png`;
        await page.screenshot({path: screenshot, fullPage: true});
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
