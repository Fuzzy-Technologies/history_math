import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {publicationSize, siteSizeLimit, siteSizeWarning} from '../scripts/publication-size.mjs';

test('publication counts all output bytes and warns before the conservative 1 GB ceiling', () => {
  assert.equal(siteSizeLimit, 1_000_000_000);
  assert.equal(siteSizeWarning, 800_000_000);
  const root = mkdtempSync(join(tmpdir(), 'publication-size-'));
  try {
    mkdirSync(join(root, 'assets/pdf'), {recursive: true});
    mkdirSync(join(root, 'assets/images'), {recursive: true});
    writeFileSync(join(root, 'assets/pdf/article.pdf'), Buffer.alloc(40));
    writeFileSync(join(root, 'assets/images/preview.webp'), Buffer.alloc(30));
    writeFileSync(join(root, 'index.html'), Buffer.alloc(10));
    const report = publicationSize(root, {limit: 100, warning: 80});
    assert.equal(report.bytes, 80); assert.equal(report.files, 3);
    assert.deepEqual(report.groups, {pdf: 40, images: 30, other: 10});
    assert.equal(report.status, 'warning');
    assert.equal(publicationSize(root, {limit: 80, warning: 70}).status, 'over-limit');
    assert.equal(publicationSize(root, {limit: 100, warning: 90}).status, 'ok');
    symlinkSync(join(root, 'index.html'), join(root, 'link.html'));
    assert.throws(() => publicationSize(root), /Symbolic link/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
