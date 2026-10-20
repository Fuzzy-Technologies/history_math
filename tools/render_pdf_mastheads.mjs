import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

// The same pinned renderer used for PDFs creates faithful PNG counterparts.
const browser = await chromium.launch({executablePath: process.env.BROWSER_EXECUTABLE || undefined});
try {
  for (const language of ['ru', 'en']) {
    const name = `site/assets/images/Math-with-Mansur-print-${language}`;
    const page = await browser.newPage({viewport: {width: 2880, height: 480}, deviceScaleFactor: 1});
    await page.goto(pathToFileURL(resolve(name + '.svg')).href, {waitUntil: 'load'});
    await page.screenshot({path: name + '.png'});
    await page.close();
  }
} finally { await browser.close(); }
