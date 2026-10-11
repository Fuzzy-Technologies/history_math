const imageTypes = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml'};

function assertActive(signal) {
  if (signal?.aborted) throw signal.reason || new DOMException('Original image request cancelled', 'AbortError');
}

function validateOriginal({url, apiUrl, sha256, bytes, filename}) {
  if (!/^[a-f0-9]{64}$/.test(sha256) || !Number.isSafeInteger(bytes) || bytes <= 0 ||
      !/^[a-z0-9][a-z0-9.-]*\.(png|jpe?g|gif|webp|svg)$/i.test(filename)) {
    throw new Error('Invalid original image integrity metadata');
  }
  const source = new URL(url, globalThis.location?.href || 'http://localhost/');
  if (!['http:', 'https:'].includes(source.protocol) || source.username || source.password) {
    throw new Error('Invalid original image URL');
  }
  if (apiUrl) {
    const api = new URL(apiUrl);
    const assetPath = new RegExp(`^/Fuzzy-Technologies/history_math/releases/download/article-originals-${sha256[0]}/[a-z0-9.-]+-${sha256}\\.(png|jpe?g|gif|webp|svg)$`);
    if (source.protocol !== 'https:' || source.hostname !== 'github.com' || source.port ||
        source.search || source.hash || !assetPath.test(source.pathname) ||
        api.protocol !== 'https:' || api.hostname !== 'api.github.com' || api.port ||
        api.username || api.password || api.search || api.hash ||
        !/^\/repos\/Fuzzy-Technologies\/history_math\/releases\/assets\/[1-9][0-9]*$/.test(api.pathname)) {
      throw new Error('Invalid external original image location');
    }
  }
  return source.href;
}

// The returned object URL exists only after the exact original passes its digest.
// The caller owns its lifetime and must revoke it when the viewer closes.
export async function loadVerifiedOriginal(descriptor, {fetch: request = globalThis.fetch,
  crypto: cryptoAPI = globalThis.crypto, url: urlAPI = globalThis.URL, signal} = {}) {
  const source = validateOriginal(descriptor);
  assertActive(signal);
  const candidates = descriptor.apiUrl ? [descriptor.apiUrl, source] : [source];
  let failure;
  for (const candidate of candidates) {
    try {
      assertActive(signal);
      const response = await request(candidate, {credentials: 'omit', signal,
        headers: candidate === descriptor.apiUrl ? {Accept: 'application/octet-stream'} : {}});
      if (!response.ok || /\bjson\b/i.test(response.headers.get('content-type') || '')) {
        throw new Error('Original image binary unavailable');
      }
      const bytes = await response.arrayBuffer();
      assertActive(signal);
      if (bytes.byteLength !== descriptor.bytes) throw new Error('Original image size mismatch');
      const digest = await cryptoAPI.subtle.digest('SHA-256', bytes);
      assertActive(signal);
      const sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      if (sha256 !== descriptor.sha256) throw new Error('Original image checksum mismatch');
      const extension = descriptor.filename.split('.').at(-1).toLowerCase();
      const objectUrl = urlAPI.createObjectURL(new Blob([bytes], {type: imageTypes[extension]}));
      let revoked = false;
      return {url: objectUrl, filename: descriptor.filename, revoke() {
        if (!revoked) urlAPI.revokeObjectURL(objectUrl);
        revoked = true;
      }};
    } catch (error) {
      assertActive(signal);
      failure = error;
    }
  }
  throw failure || new Error('Original image unavailable');
}
