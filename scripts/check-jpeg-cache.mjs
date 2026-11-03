import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {jpegPolicy, validateReplacement} from './image-publication.mjs';
import {mediaObject, mediaRead, readWithRetries, sha256} from './s3-media.mjs';

// Use the same bounded, pooled public transport as publication and retirement.
// A read failure is never permission to regenerate from a retired source.
export async function checkedJpegCache(registry, request = mediaRead, retryOptions) {
  if (registry?.version !== 1 || registry.policy !== jpegPolicy || !registry.replacements ||
      typeof registry.replacements !== 'object' || Array.isArray(registry.replacements)) throw new Error('Invalid JPEG registry');
  const entries = Object.entries(registry.replacements);
  for (const [path, record] of entries) validateReplacement(path, record?.source, record);
  const cached = []; let cursor = 0, failed = false;
  const results = await Promise.allSettled(Array.from({length: Math.min(6, entries.length)}, async () => {
    while (!failed && cursor < entries.length) {
      const [path, record] = entries[cursor++];
      const object = mediaObject('originals', record.filename, record.sha256, record.bytes);
      try {
        const found = await readWithRetries(`cached JPEG ${object.key}`, async () => {
          const response = await request(object.url, {method: 'HEAD', credentials: 'omit', redirect: 'error',
            signal: AbortSignal.timeout(60_000)});
          if (response.status === 404) return false;
          if (response.status !== 200) throw Object.assign(new Error('Cached JPEG unavailable'), {status: response.status});
          return response.headers.get('content-length') === String(object.bytes) &&
            response.headers.get('content-type')?.split(';')[0] === object.content_type &&
            response.headers.get('x-amz-meta-sha256') === object.sha256;
        }, retryOptions);
        if (found) cached.push(path);
      } catch (error) { failed = true; throw error; }
    }
  }));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
  return cached.sort();
}

async function main() {
  const chunks = []; let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    if (length > 12_000_000) throw new Error('JPEG registry exceeds input limit');
    chunks.push(chunk);
  }
  const input = Buffer.concat(chunks);
  const cached = await checkedJpegCache(JSON.parse(input));
  console.log(JSON.stringify({version: 1, registry_sha256: sha256(input), cached}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
