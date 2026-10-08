import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

// Approval covers the public Markdown and the exact bytes of its selected assets.
export function packageDigest(text, data, root) {
  const hash = createHash('sha256').update(text.replace(/\r\n/g, '\n'));
  const paths = [...new Set([...(data.figures ?? []).map(x => x.path), ...['preview_image', 'cover_image', 'hero_image'].map(key => data[key]).filter(Boolean)])].sort();
  for (const path of paths) {
    if (!/^\/assets\/images\/[a-z0-9-]+\/[A-Za-z0-9._-]+$/.test(path)) throw new Error('Invalid review asset path');
    hash.update('\0' + path + '\0').update(readFileSync(resolve(root, 'site', '.' + path)));
  }
  return hash.digest('hex');
}

export function checkReview(text, data, root) {
  const file = `reviews/${data.article_id}.json`;
  const findings = [];
  const fail = detail => findings.push({code: 'HM_REVIEW', severity: 'error', file, detail});
  let review;
  try { review = JSON.parse(readFileSync(resolve(root, file), 'utf8')); }
  catch { fail('Missing or unreadable review record'); return findings; }
  if (!review || review.review_version !== 1 || review.article_id !== data.article_id || !Array.isArray(review.questions) || !['pending', 'approved'].includes(review.approval?.status) || 'editorial_questions' in review) {
    fail('Invalid review record'); return findings;
  }
  const ids = new Set();
  for (const question of review.questions) {
    if (!question || typeof question.id !== 'string' || !question.id.trim() || ids.has(question.id) || typeof question.blocking !== 'boolean' || typeof question.question !== 'string' || !question.question.trim() || !['open', 'resolved', 'accepted'].includes(question.state)) {
      fail('Invalid or duplicate editorial question'); continue;
    }
    ids.add(question.id);
    if (question.state !== 'open' && (typeof question.resolution !== 'string' || !question.resolution.trim())) fail('Closed question requires a resolution');
    if (question.state === 'open') findings.push({code: 'HM_EDITOR', severity: 'editor', file, detail: question.question});
  }
  if (data.status === 'published') {
    const approval = review.approval;
    const date = new Date(approval.date);
    if (approval.status !== 'approved' || typeof approval.reviewed_by !== 'string' || !approval.reviewed_by.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(approval.date ?? '') || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== approval.date) fail('Publication requires a named editorial approval and valid date');
    if (review.questions.some(x => x.blocking && x.state === 'open')) fail('Publication has open blocking questions');
    try { if (approval.package_sha256 !== packageDigest(text, data, root)) fail('Approval does not match the current text and images'); }
    catch (error) { fail(error.message); }
  }
  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const {parseArticle} = await import('./article-checks.mjs');
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/article-review.mjs site/_articles/<id>.<lang>.md');
  const text = readFileSync(file, 'utf8');
  console.log(packageDigest(text, parseArticle(text).data, resolve('.')));
}
