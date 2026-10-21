import {appendFileSync, readdirSync, statSync, lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const siteSizeLimit = 1_000_000_000;
export const siteSizeWarning = 800_000_000;

export function publicationSize(directory, {limit = siteSizeLimit, warning = siteSizeWarning} = {}) {
  let bytes = 0, files = 0;
  const groups = {pdf: 0, images: 0, other: 0};
  function visit(path, relative = '') {
    for (const entry of readdirSync(path, {withFileTypes: true})) {
      const target = resolve(path, entry.name);
      const name = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isSymbolicLink() || lstatSync(target).isSymbolicLink()) throw new Error(`Symbolic link in publication: ${name}`);
      if (entry.isDirectory()) visit(target, name);
      else if (entry.isFile()) {
        const size = statSync(target).size;
        bytes += size; files++;
        groups[name.startsWith('assets/pdf/') ? 'pdf' : name.startsWith('assets/images/') ? 'images' : 'other'] += size;
      }
    }
  }
  visit(resolve(directory));
  return {bytes, files, groups, limit, warning, status: bytes >= limit ? 'over-limit' : bytes >= warning ? 'warning' : 'ok'};
}

function main() {
  const report = publicationSize(process.argv[2] || '_site-pages');
  const mb = bytes => (bytes / 1_000_000).toFixed(1);
  const message = `${mb(report.bytes)} MB / ${mb(report.limit)} MB; ${report.files} files`;
  console.log(`Publication size: ${JSON.stringify(report)}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### Publication size\n\n${message}\n\nPDF: ${mb(report.groups.pdf)} MB; images: ${mb(report.groups.images)} MB; other: ${mb(report.groups.other)} MB.\n\nWarning starts at ${mb(report.warning)} MB.\n`);
  if (report.status === 'warning') console.log(`::warning title=Publication approaching Pages size limit::${message}`);
  if (report.status === 'over-limit') {
    console.log(`::error title=Publication exceeds Pages size limit::${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
