import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {pagesConfig} from '../scripts/pages-config.mjs';

test('production defaults are canonical and the legacy address is an explicit reference override', () => {
  const production = parse(readFileSync('_config.yml', 'utf8'));
  assert.equal(production.url, 'https://history-math.org');
  assert.equal(production.baseurl, '');
  assert.equal(production.lang, 'en');
  const reference = parse(readFileSync('_config.reference.yml', 'utf8'));
  assert.deepEqual(reference, {url: 'https://fuzzy-technologies.github.io', baseurl: '/history_math'});
});

test('Pages metadata selects the company project path or the independent journal domain', () => {
  assert.deepEqual(pagesConfig('https://fuzzy-technologies.com', '/history_math'), {
    url: 'https://fuzzy-technologies.com', baseurl: '/history_math'
  });
  assert.deepEqual(pagesConfig('https://history-math.org', ''), {
    url: 'https://history-math.org', baseurl: ''
  });
});

test('missing or malformed Pages metadata fails before a deployment configuration is written', () => {
  for (const origin of [undefined, '', 'http://history-math.org', 'https://history-math.org/',
    'https://user@history-math.org', 'https://history-math.org/path', 'https://history-math.org?query',
    'https://history-math.org#fragment']) {
    assert.throws(() => pagesConfig(origin, ''));
  }
  for (const basePath of [undefined, null, '/', 'history_math', '/history_math/', '/../outside', '/x?query', '/x\nurl: other']) {
    assert.throws(() => pagesConfig('https://history-math.org', basePath));
  }
});

test('the workflow CLI emits a YAML-compatible JSON override and returns failure for missing metadata', () => {
  const env = {...process.env, PAGES_ORIGIN: 'https://history-math.org', PAGES_BASE_PATH: ''};
  const valid = spawnSync(process.execPath, ['scripts/pages-config.mjs'], {env, encoding: 'utf8'});
  assert.equal(valid.status, 0, valid.stderr);
  assert.deepEqual(JSON.parse(valid.stdout), {url: 'https://history-math.org', baseurl: ''});
  delete env.PAGES_BASE_PATH;
  const invalid = spawnSync(process.execPath, ['scripts/pages-config.mjs'], {env, encoding: 'utf8'});
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.stdout, '');
});
