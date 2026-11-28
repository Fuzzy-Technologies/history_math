import {getBrainRingFeedback, matchesShortAnswer} from './brain-ring-feedback.js';

export const levels = ['beginner', 'intermediate', 'expert'];

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function makeSchedule(questions, pilot, options, random = Math.random) {
  const {difficulty, rounds} = options;
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > levels.length
      || (difficulty !== 'progressive' && !levels.includes(difficulty))) {
    throw new RangeError('Invalid Brain Ring game settings');
  }

  const bySource = new Map(questions.map((question) => [question.source_id, question]));
  const used = new Set();
  return Array.from({length: rounds}, (_, index) => {
    const level = difficulty === 'progressive' ? levels[index] : difficulty;
    const ids = [...new Set(pilot.levels[level])];
    const pool = shuffle(ids.map((id) => bySource.get(id)).filter(Boolean), random);
    const topics = new Map();
    const formats = new Map();
    const count = pilot.questions_per_round;
    const score = (question) => 2 * (topics.get(question.topic) ?? 0) + (formats.get(question.format) ?? 0);
    const selected = [];
    while (selected.length < count) {
      const available = pool.filter((question) => !used.has(question.source_id));
      if (!available.length) throw new Error(`Insufficient pilot questions at ${level}`);
      const question = available.reduce((best, item) => score(item) < score(best) ? item : best);
      used.add(question.source_id);
      topics.set(question.topic, (topics.get(question.topic) ?? 0) + 1);
      formats.set(question.format, (formats.get(question.format) ?? 0) + 1);
      selected.push({question, level, round: index + 1, position: selected.length + 1});
    }
    return selected;
  }).flat();
}

function sameOrder(answer, expected) {
  return answer.length === expected.length && answer.every((id, index) => id === expected[index]);
}

function validOptions(answer, options, minimum) {
  return Array.isArray(answer) && answer.length >= minimum
    && new Set(answer).size === answer.length
    && answer.every((id) => options.some((option) => option.id === id));
}

export function hasAnswer(question, value) {
  const key = question.answer;
  switch (question.format) {
    case 'short_input':
    case 'self_check':
      return typeof value === 'string' && value.trim() !== '';
    case 'single_choice':
      return key.options.some((option) => option.id === value);
    case 'multiple_choice':
      return validOptions(value, key.options, 1);
    case 'ordering':
      return validOptions(value, key.items, key.items.length);
    case 'matching':
      return Boolean(value) && key.left.every((item) => Object.hasOwn(value, item.id))
        && validOptions(Object.values(value), key.right, key.right.length);
    default:
      return false;
  }
}

function correctAnswer(question, value) {
  const key = question.answer;
  switch (question.format) {
    case 'short_input':
      return matchesShortAnswer(value, key.accepted);
    case 'single_choice':
      return value === key.correct;
    case 'multiple_choice':
      return value.length === key.correct.length && value.every((id) => key.correct.includes(id));
    case 'matching':
      return Object.entries(key.pairs).every(([left, right]) => value[left] === right);
    case 'ordering':
      return sameOrder(value, key.order);
    default:
      return false;
  }
}

export function initialOrder(items, expected, random = Math.random) {
  const ids = shuffle(items, random).map(({id}) => id);
  return sameOrder(ids, expected) ? [...ids.slice(1), ids[0]] : ids;
}

export function moveItem(ids, index, step) {
  const destination = index + step;
  if (index < 0 || index >= ids.length || destination < 0 || destination >= ids.length) return ids;
  const result = [...ids];
  [result[index], result[destination]] = [result[destination], result[index]];
  return result;
}

export function assignPair(pairs, left, right) {
  const entries = Object.entries(pairs).filter(([key, value]) => key !== left && value !== right);
  return Object.fromEntries(pairs[left] === right ? entries : [...entries, [left, right]]);
}

export function createGame(bank, pilot, options, {clock = () => performance.now(), random = Math.random} = {}) {
  if (!['timed', 'practice'].includes(options.mode)) throw new RangeError('Invalid Brain Ring mode');

  const schedule = makeSchedule(bank.questions, pilot, options, random);
  const results = [];
  let index = 0;
  let phase = 'answer';
  let attempt = null;
  let deadline = null;
  let last = null;
  const currentQuestion = () => schedule[index].question;
  const timeLimit = () => pilot.seconds_by_format[currentQuestion().format] * 1000;

  function startQuestion() {
    phase = 'answer';
    attempt = null;
    last = null;
    deadline = options.mode === 'timed' ? clock() + timeLimit() : null;
  }

  function resolve(outcome) {
    const entry = schedule[index];
    last = {
      ...entry, attempt, outcome,
      feedback: getBrainRingFeedback(bank.feedback, entry.question, outcome),
    };
    results.push(last);
    phase = 'feedback';
    deadline = null;
  }

  function remaining() {
    return deadline === null ? null : Math.max(0, deadline - clock());
  }

  function expire() {
    if (phase !== 'answer' || remaining() !== 0) return false;
    resolve('timeout');
    return true;
  }

  startQuestion();
  return {
    state: () => ({
      ...schedule[index], index, phase, last, attempt,
      timeLeft: remaining(),
      timeLimit: timeLimit(),
      total: schedule.length,
      points: results.reduce((sum, item) => sum + item.feedback.points, 0),
      mistakes: results.filter(({outcome}) => outcome !== 'correct'),
    }),
    submit(value) {
      if (expire() || phase !== 'answer' || !hasAnswer(currentQuestion(), value)) return false;
      attempt = value;
      if (currentQuestion().format === 'self_check') {
        deadline = null;
        phase = 'review';
      } else {
        resolve(correctAnswer(currentQuestion(), value) ? 'correct' : 'incorrect');
      }
      return true;
    },
    grade(value) {
      if (phase !== 'review' || typeof value !== 'boolean') return false;
      resolve(value ? 'correct' : 'incorrect');
      return true;
    },
    expire,
    advance() {
      if (phase !== 'feedback') return false;
      if (index === schedule.length - 1) {
        phase = 'complete';
      } else {
        index += 1;
        startQuestion();
      }
      return true;
    },
  };
}
