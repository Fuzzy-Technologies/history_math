import {existsSync, readFileSync} from 'node:fs';
import {resolve, basename} from 'node:path';
import {mediaObject} from './s3-media.mjs';
import {validateExternalOriginal} from './external-originals.mjs';

export const imageBudget = Object.freeze({recommendation: 10_000_000, critical: 13_000_000, hard: 15_000_000});
export const jpegPolicy = 'jpeg-max15mb-444-pillow-12.3.0-v1';
const shaPattern = /^[a-f0-9]{64}$/;
const notePattern = /^https:\/\/github\.com\/Fuzzy-Technologies\/history_math\/pull\/[1-9]\d*(?:#(?:issuecomment-|discussion_r)[1-9]\d*)?$/;

export function validSizeException(exception, object) {
  return Boolean(exception && exception.one_use === true && exception.sha256 === object.sha256 &&
    exception.bytes === object.bytes && typeof exception.reason === 'string' && exception.reason.trim() &&
    notePattern.test(exception.note_url || '') && object.bytes <= imageBudget.hard);
}

export function sizeFinding(path, object, exception) {
  if (!Number.isSafeInteger(object?.bytes) || object.bytes <= 0) throw new Error('Invalid image byte count');
  const detail = `${path}: ${object.bytes.toLocaleString('en-US')} bytes`;
  if (object.bytes > imageBudget.hard) return {code: 'HM_IMAGE_HARD_LIMIT', severity: 'error', detail: detail + '; exceeds 15 MB; replace before publication'};
  if (object.bytes >= imageBudget.critical) return {code: 'HM_IMAGE_CRITICAL',
    severity: validSizeException(exception, object) ? 'warning' : 'error',
    detail: detail + (validSizeException(exception, object) ? `; one-use exception: ${exception.note_url}` : '; critical 13 MB threshold; one-use PR note required')};
  if (object.bytes >= imageBudget.recommendation) return {code: 'HM_IMAGE_RECOMMENDATION', severity: 'warning', detail: detail + '; recommend an original below 10 MB'};
  return null;
}

export function validateReplacement(path, entry, record) {
  if (!/^\/assets\/images\/[a-z0-9-]+\/[A-Za-z0-9._-]+\.(?:png|jpg|jpeg|webp|gif)$/.test(path) || path.includes('..') ||
      !record || record.policy !== jpegPolicy || record.source_sha256 !== entry.sha256 || record.source_bytes !== entry.bytes ||
      record.width !== entry.width || record.height !== entry.height || record.filename !== basename(path).replace(/\.[^.]+$/, '.jpg') ||
      !shaPattern.test(record.sha256 || '') || !Number.isInteger(record.quality) || record.quality < 1 || record.quality > 100 ||
      !Number.isSafeInteger(record.bytes) || record.bytes <= 0 || record.bytes >= entry.bytes || record.bytes > imageBudget.hard ||
      entry.logo || record.source?.sha256 !== entry.sha256 || record.source?.bytes !== entry.bytes ||
      record.source?.width !== entry.width || record.source?.height !== entry.height) {
    throw new Error(`Invalid JPEG publication replacement: ${path}`);
  }
  validateExternalOriginal(path, record.source);
  if (record.bytes >= imageBudget.critical && !validSizeException(record.exception, record)) {
    throw new Error(`JPEG critical size requires a one-use PR note: ${path}`);
  }
  return record;
}

export function publicationReplacements(root) {
  const path = resolve(root, 'site/_data/image_publication.json');
  if (!existsSync(path)) return {};
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (data.version !== 1 || data.policy !== jpegPolicy || !data.replacements || typeof data.replacements !== 'object' || Array.isArray(data.replacements)) {
    throw new Error('Invalid JPEG publication registry');
  }
  for (const [path, record] of Object.entries(data.replacements)) validateReplacement(path, record.source, record);
  return data.replacements;
}

export function jpegObject(root, path, entry, record) {
  validateReplacement(path, entry, record);
  return {...mediaObject('originals', record.filename, record.sha256, record.bytes),
    source: {file: resolve(root, 'test-results/publication-jpegs', record.sha256, record.filename)}};
}

export function publicationSizeExceptions(root) {
  const path = resolve(root, 'site/_data/image_size_exceptions.json');
  if (!existsSync(path)) return {};
  const entries = JSON.parse(readFileSync(path, 'utf8'));
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) throw new Error('Invalid image size exception registry');
  for (const [path, exception] of Object.entries(entries)) {
    if (!path.startsWith('/assets/images/') || path.includes('..') || !shaPattern.test(exception?.sha256 || '') ||
        !Number.isSafeInteger(exception?.bytes) || exception.bytes < imageBudget.critical ||
        !validSizeException(exception, exception)) throw new Error(`Invalid one-use image size exception: ${path}`);
  }
  return entries;
}

export function imageSizeFindings(inventory, replacements = {}, exceptions = {}) {
  const findings = [];
  for (const [path, entry] of Object.entries(inventory)) {
    const record = replacements[path];
    if (record) validateReplacement(path, entry, record);
    const finding = sizeFinding(path, record || entry, record?.exception || exceptions[path]);
    if (finding) findings.push(finding);
    for (const variant of entry.variants || []) {
      const warning = sizeFinding(variant.path, variant, exceptions[variant.path]);
      if (warning) findings.push(warning);
    }
  }
  return findings;
}
