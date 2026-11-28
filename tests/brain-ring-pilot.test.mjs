import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {
  assignPair, createGame, hasAnswer, initialOrder, levels, makeSchedule, moveItem,
} from '../site/assets/brain-ring-game.js';

const read = (name) => parse(readFileSync(new URL(`../site/_data/brain_ring/${name}.yaml`, import.meta.url), 'utf8'));
const pilot = read('pilot');
const banks = ['ru', 'en'].map(read);

function seeded(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function key(question) {
  const answer = question.answer;
  switch (question.format) {
    case 'short_input': return answer.accepted[0];
    case 'self_check': return answer.solution;
    case 'single_choice':
    case 'multiple_choice': return answer.correct;
    case 'matching': return answer.pairs;
    case 'ordering': return answer.order;
  }
}

test('both pilot banks have six formats and a full pool for each difficulty', () => {
  const formats = ['matching', 'multiple_choice', 'ordering', 'self_check', 'short_input', 'single_choice'];
  const ids = Object.values(pilot.levels).flat();
  assert.equal(new Set(ids).size, ids.length);
  for (const bank of banks) {
    const picked = bank.questions.filter((question) => ids.includes(question.source_id));
    assert.equal(picked.length, ids.length);
    assert.deepEqual([...new Set(picked.map((question) => question.format))].sort(), formats);
    assert.ok(picked.every((question) => hasAnswer(question, key(question))));
    assert.ok(formats.every((format) => pilot.seconds_by_format[format] > 0));
  }
  for (const level of levels) {
    assert.ok(pilot.levels[level].length >= 3 * pilot.questions_per_round);
  }
});

test('the schedule rotates difficulty, balances topics and formats, and varies between games', () => {
  for (const bank of banks) {
    const options = {difficulty: 'progressive', rounds: 3};
    const schedule = makeSchedule(bank.questions, pilot, options, seeded(1));
    assert.notDeepEqual(schedule, makeSchedule(bank.questions, pilot, options, seeded(22)));
    for (const [index, level] of levels.entries()) {
      const round = schedule.filter((entry) => entry.round === index + 1);
      assert.equal(round.length, 6);
      assert.ok(round.every((entry) => entry.level === level));
      assert.ok(new Set(round.map(({question}) => question.topic)).size >= 3);
      assert.ok(new Set(round.map(({question}) => question.format)).size >= 2);
    }
    assert.equal(new Set(schedule.map(({question}) => question.source_id)).size, schedule.length);
  }
});

test('full games complete in both languages and modes for every round count and difficulty', () => {
  for (const bank of banks) {
    for (const mode of ['timed', 'practice']) {
      for (const difficulty of ['progressive', ...levels]) {
        for (const rounds of [1, 2, 3]) {
          let elapsed = 0;
          const seen = new Set();
          const game = createGame(bank, pilot, {mode, difficulty, rounds}, {
            clock: () => elapsed,
            random: seeded(5071),
          });
          const total = rounds * 6;
          for (let n = 0; n < total; n += 1) {
            const {question, timeLeft, level, phase} = game.state();
            assert.equal(phase, 'answer');
            assert.equal(level, difficulty === 'progressive' ? levels[Math.floor(n / 6)] : difficulty);
            assert.ok(!seen.has(question.source_id));
            seen.add(question.source_id);
            assert.equal(game.advance(), false);
            if (mode === 'timed') {
              assert.equal(timeLeft, pilot.seconds_by_format[question.format] * 1000);
            } else {
              assert.equal(timeLeft, null);
              elapsed += 300000;
              assert.equal(game.expire(), false);
            }

            if (mode === 'timed' && n === 0) {
              elapsed += timeLeft;
              assert.equal(game.submit(key(question)), false);
              assert.equal(game.state().last.outcome, 'timeout');
              assert.equal(game.state().last.feedback.answer, question.answer_text);
            } else {
              assert.equal(game.submit(key(question)), true);
              assert.equal(game.submit(key(question)), false);
              if (question.format === 'self_check') {
                assert.equal(game.state().phase, 'review');
                assert.equal(game.advance(), false);
                elapsed += 300000;
                assert.equal(game.expire(), false);
                assert.equal(game.grade(true), true);
                assert.equal(game.grade(true), false);
              }
              assert.equal(game.state().last.feedback.points, 1);
            }

            assert.equal(game.state().timeLeft, null);
            assert.equal(game.state().index, n);
            assert.equal(game.advance(), true);
          }
          const result = game.state();
          assert.equal(result.phase, 'complete');
          assert.equal(result.points, total - (mode === 'timed' ? 1 : 0));
          assert.equal(result.mistakes.length, mode === 'timed' ? 1 : 0);
          assert.equal(game.advance(), false);
        }
      }
    }
  }
});

test('incomplete answers do not use the attempt, and mistakes keep the submitted answer', () => {
  for (const bank of banks) {
    const game = createGame(bank, pilot, {mode: 'practice', difficulty: 'intermediate', rounds: 1}, {
      random: seeded(12),
    });

    while (game.state().phase !== 'complete') {
      const {question} = game.state();
      const answer = question.answer;
      assert.equal(game.submit(''), false);
      if (question.format === 'matching') {
        const [first, second] = answer.left;
        const pairs = {...answer.pairs, [first.id]:answer.pairs[second.id], [second.id]:answer.pairs[first.id]};
        assert.equal(game.submit(pairs), true);
        assert.deepEqual(game.state().last.attempt, pairs);
      } else if (question.format === 'short_input') {
        assert.equal(game.submit('unmatched input'), true);
      } else if (question.format === 'self_check') {
        game.submit('An incomplete argument');
        assert.equal(game.grade(false), true);
      } else if (question.format === 'single_choice') {
        game.submit(answer.options.find(({id}) => id !== answer.correct).id);
      } else {
        game.submit([answer.options.find(({id}) => !answer.correct.includes(id)).id]);
      }
      assert.equal(game.state().last.outcome, 'incorrect');
      assert.equal(game.state().last.feedback.points, 0);
      assert.equal(game.state().last.feedback.answer, question.answer_text);
      assert.equal(game.advance(), true);
    }

    assert.equal(game.state().mistakes.length, 6);
    assert.equal(game.state().points, 0);
  }
});

test('tapping pairs and moving order items preserves unique choices', () => {
  assert.deepEqual(assignPair({a: '1'}, 'b', '1'), {b: '1'});
  assert.deepEqual(assignPair({b: '1'}, 'b', '1'), {});
  assert.deepEqual(assignPair({b: '1'}, 'a', '2'), {a: '2', b: '1'});
  const items = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
  assert.notDeepEqual(initialOrder(items, ['a','b','c'], () => .999), ['a','b','c']);
  assert.deepEqual(moveItem(['a','b','c'], 1, -1), ['b','a','c']);
  assert.deepEqual(moveItem(['a','b','c'], 0, -1), ['a','b','c']);
});
