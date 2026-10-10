import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accessDate} from '../site/assets/article-details.js';

test('citation access dates preserve the chosen day and reject impossible calendar dates', () => {
  assert.equal(accessDate('2026-10-09'), '09.10.2026');
  assert.equal(accessDate('2024-02-29'), '29.02.2024');
  assert.equal(accessDate('2024-02-29', 'en'), 'Feb. 29, 2024');
  for (const [i, month] of ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'].entries()) {
    assert.equal(accessDate(`2026-${String(i + 1).padStart(2, '0')}-09`, 'en'), `${month} 9, 2026`);
  }
  for (const language of ['ru', 'en']) for (const value of ['2026-02-29', '2026-02-30', '2026-13-01', '', '09.10.2026', '<script>']) assert.equal(accessDate(value, language), null);
});
