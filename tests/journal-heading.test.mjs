import test from 'node:test';
import assert from 'node:assert/strict';
import {hasStrayHeadingPeriod} from './journal-heading.mjs';

test('published titles preserve abbreviations and author punctuation', () => {
  const title = 'Проценты и компания: %, п. п., б. п.';
  assert.equal(hasStrayHeadingPeriod(title, [{title}]), false);
  assert.equal(hasStrayHeadingPeriod('  ' + title + '\n', [{title}]), false);
  assert.equal(hasStrayHeadingPeriod('An author sentence.', [{title: 'An author sentence.'}]), false);
  assert.equal(hasStrayHeadingPeriod('An ellipsis...', []), false);
  assert.equal(hasStrayHeadingPeriod('Многоточие…', []), false);
});

test('UI periods and added article-title periods still fail', () => {
  assert.equal(hasStrayHeadingPeriod('About the journal.', []), true);
  assert.equal(hasStrayHeadingPeriod('Mathematics.', [{title: 'Mathematics'}]), true);
  assert.equal(hasStrayHeadingPeriod('Changed б. п.', [{title: 'Проценты и компания: %, п. п., б. п.'}]), true);
  assert.equal(hasStrayHeadingPeriod('Reading room', []), false);
});
