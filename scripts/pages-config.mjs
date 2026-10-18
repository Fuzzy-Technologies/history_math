import {pathToFileURL} from 'node:url';

// Keep the reference build stable while Pages settings select the deployed address.
export function pagesConfig(origin, basePath) {
  const parsed = new URL(origin);
  if (parsed.protocol !== 'https:' || parsed.origin !== origin) {
    throw new Error('Pages origin must be an HTTPS origin without a path or credentials');
  }
  if (typeof basePath !== 'string' || !/^(?:\/[a-zA-Z0-9_-]+)*$/.test(basePath)) {
    throw new Error('Pages base path must be empty or contain repository path segments');
  }
  return {url: origin, baseurl: basePath};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(pagesConfig(process.env.PAGES_ORIGIN, process.env.PAGES_BASE_PATH)));
}
