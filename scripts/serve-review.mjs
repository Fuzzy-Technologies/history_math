import {createServer} from 'node:http';
import {readFile, realpath, stat} from 'node:fs/promises';
import {resolve, sep, extname} from 'node:path';

const directory = process.argv[2];
const port = Number(process.argv[3] ?? 4173);
if (!directory || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Usage: node scripts/serve-review.mjs <article-preview-directory> [port]');
  process.exit(1);
}
const root = await realpath(resolve(directory));
if (!(await stat(root)).isDirectory()) throw new Error('The preview must be a directory');
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml'};
const contained = path => path === root || path.startsWith(root + sep);
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/history_math') { response.writeHead(302, {Location: '/history_math/'}).end(); return; }
    if (!url.pathname.startsWith('/history_math/')) { response.writeHead(404).end(); return; }
    let path = resolve(root, '.' + decodeURIComponent(url.pathname.slice('/history_math'.length)));
    if (!contained(path)) { response.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    path = await realpath(path);
    if (!contained(path)) { response.writeHead(403).end(); return; }
    response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Review preview: http://127.0.0.1:${port}/history_math/ (Ctrl+C to stop)`));
