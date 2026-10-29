import {createHash} from 'node:crypto';
import {S3Client, HeadObjectCommand, PutObjectCommand} from '@aws-sdk/client-s3';

export const storage = Object.freeze({endpoint: 'https://storage.yandexcloud.kz', region: 'kz1',
  bucket: 'history-math-media-kz', base: 'https://storage.yandexcloud.kz/history-math-media-kz'});
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const types = {pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml'};

export function mediaObject(kind, filename, digest, bytes) {
  const extension = typeof filename === 'string' && filename.split('.').at(-1).toLowerCase();
  if (!['pdf', 'originals'].includes(kind) || typeof filename !== 'string' ||
      !/^[a-z0-9][a-z0-9._-]*$/i.test(filename) || filename.includes('..') || !types[extension] ||
      (kind === 'pdf') !== (extension === 'pdf') || !/^[a-f0-9]{64}$/.test(digest) ||
      !Number.isSafeInteger(bytes) || bytes <= 0) throw new Error('Invalid media identity');
  const key = `${kind}/${digest}/${filename}`;
  return {key, url: `${storage.base}/${key}`, sha256: digest, bytes, filename, content_type: types[extension]};
}

export function validateObject(object) {
  const expected = mediaObject(object?.key?.split('/')[0], object?.filename, object?.sha256, object?.bytes);
  for (const [key, value] of Object.entries(expected)) if (object[key] !== value) throw new Error('Changed media destination');
  return expected;
}

export function assertBytes(object, bytes) {
  validateObject(object);
  if (bytes.length !== object.bytes || sha256(bytes) !== object.sha256 ||
      (object.content_type === types.pdf && bytes.subarray(0, 5).toString() !== '%PDF-')) {
    throw new Error(`Media integrity failure: ${object.key}`);
  }
}

export function configuredClient(env = process.env) {
  if (env.S3_ENDPOINT_URL !== storage.endpoint || env.S3_REGION !== storage.region ||
      env.S3_BUCKET !== storage.bucket || env.S3_PUBLIC_BASE_URL !== storage.base ||
      !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) throw new Error('Missing or invalid Kazakhstan storage configuration');
  return new S3Client({endpoint: storage.endpoint, region: storage.region, forcePathStyle: true, maxAttempts: 3,
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY}});
}

export async function responseBytes(response, limit) {
  if (!response.ok) {
    try { await response.body?.cancel(); } catch { /* The failed response is discarded. */ }
    throw Object.assign(new Error(`Media HTTP ${response.status}`), {status: response.status});
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > limit) throw new Error('Media exceeds expected size');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function transientCode(error) {
  if ([408, 429, 500, 502, 503, 504].includes(error?.status)) return `HTTP_${error.status}`;
  const codes = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH',
    'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT']);
  for (let cause = error, depth = 0; cause && depth < 4; cause = cause.cause, depth++) {
    if (codes.has(cause.code)) return cause.code;
  }
  if (error?.name === 'TimeoutError') return 'TIMEOUT';
  if (error instanceof TypeError && error.message === 'fetch failed' && !error.cause?.code) return 'NETWORK';
  return null;
}

// Retry only public reads. Authentication, TLS, integrity and metadata errors
// remain blocking. Never print upstream messages or redirected signed URLs.
export async function readWithRetries(context, read, {pause = milliseconds => new Promise(done => setTimeout(done, milliseconds))} = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await read(); }
    catch (error) {
      const code = transientCode(error);
      if (!code || attempt === 2) {
        const tlsCodes = new Set(['CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT']);
        const permanent = Number.isInteger(error?.status) ? `HTTP_${error.status}` :
          tlsCodes.has(error?.cause?.code) ? error.cause.code : /integrity/i.test(error?.message || '') ? 'integrity mismatch' : 'INVALID_MEDIA';
        throw new Error(`Public media read failed: ${context} (${code || permanent}; ${attempt + 1} attempts)`);
      }
      await pause([1000, 3000][attempt]);
    }
  }
}

// Verification is deliberately anonymous: signed HEAD/metadata alone cannot
// prove that the public site will be able to download the exact object.
export async function verifyPublic(object, request = fetch) {
  validateObject(object);
  return readWithRetries(`S3 verification ${object.key}`, async () => {
    const response = await request(object.url, {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(120_000)});
    if (!response.ok) await responseBytes(response, object.bytes);
    if (response.headers.get('content-type')?.split(';')[0] !== object.content_type ||
        !response.headers.get('content-disposition')?.includes(`filename="${object.filename}"`)) {
      throw new Error(`Invalid public media headers: ${object.key}`);
    }
    assertBytes(object, await responseBytes(response, object.bytes));
    return {...validateObject(object), verified: true};
  });
}

// Content addressing preserves previous publications. There is no delete API,
// bucket listing, ACL change or overwrite of a different content identity here.
export async function uploadVerified(client, object, source, {request = fetch} = {}) {
  validateObject(object);
  let missing = false;
  try { await client.send(new HeadObjectCommand({Bucket: storage.bucket, Key: object.key})); }
  catch (error) {
    if (error.$metadata?.httpStatusCode !== 404) throw new Error(`S3 HEAD failed: ${object.key}`);
    missing = true;
  }
  if (missing) {
    const bytes = await source();
    assertBytes(object, bytes);
    try {
      await client.send(new PutObjectCommand({Bucket: storage.bucket, Key: object.key, Body: bytes,
        ContentLength: bytes.length, ContentType: object.content_type,
        ContentDisposition: `attachment; filename="${object.filename}"`,
        CacheControl: 'public, max-age=31536000, immutable', Metadata: {sha256: object.sha256}}));
    } catch { throw new Error(`S3 upload failed: ${object.key}`); }
  }
  return verifyPublic(object, request);
}

export async function transfer(objects, client, source, {request = fetch, progress = () => {}} = {}) {
  const receipt = [];
  let cursor = 0, failed = false;
  async function worker() {
    while (!failed && cursor < objects.length) {
      const object = objects[cursor++];
      try {
        receipt.push(await uploadVerified(client, object, () => source(object), {request}));
        progress(receipt.length, objects.length);
      } catch (error) { failed = true; throw error; }
    }
  }
  const results = await Promise.allSettled(Array.from({length: Math.min(3, objects.length)}, worker));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
  return receipt.sort((a, b) => a.key.localeCompare(b.key));
}
