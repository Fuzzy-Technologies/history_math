import {assignPair, createGame, hasAnswer, initialOrder, levels, moveItem, shuffle} from './brain-ring-game.js';
import {getBrainRingFeedback} from './brain-ring-feedback.js';

const copy = {
  ru: {
    journal: 'Математика с Мансур-абый',
    title: 'Брейн-ринг с Мансур-абый',
    intro: 'Задачи, история математики и вопросы на смекалку.',
    modes: {timed: 'Брейн-ринг', practice: 'Тренировка'},
    modeDetail: {timed: 'Время на ответ зависит от формата.', practice: 'Решайте в своём темпе.'},
    selectMode: 'Режим игры', difficulty: 'Сложность', rounds: 'Раунды', language: 'Язык игры',
    levels: {progressive: 'От простого к сложному', beginner: 'Начальная', intermediate: 'Средняя', expert: 'Экспертная'},
    rules: 'По 6 вопросов в раунде. Одна попытка и одно очко за верный ответ.',
    start: 'Начать игру', back: 'К настройкам', quit: 'Выйти из игры?',
    round: (round, total) => `Раунд ${round} из ${total}`,
    question: (number, total) => `Вопрос ${number} из ${total}`,
    score: (points) => `Очки: ${points}`,
    formats: {
      short_input: 'Введите короткий ответ.',
      single_choice: 'Выберите один вариант.',
      multiple_choice: 'Отметьте все подходящие варианты.',
      matching: 'Выберите пункт слева, затем соответствующий пункт справа. Повторное нажатие на пару снимает её.',
      ordering: 'Расставьте пункты по порядку кнопками ↑ и ↓.',
      self_check: 'Запишите своё решение. После отправки его можно будет сравнить с разбором.',
    },
    input: 'Ваш ответ', solutionInput: 'Ваше решение', answerOptions: 'Варианты ответа',
    left: 'Пункты', right: 'Соответствия',
    pair: (number) => `Пара ${number}`,
    countPairs: (count, total) => `Собрано пар: ${count} из ${total}`,
    move: {up: (name) => `Поднять «${name}»`, down: (name) => `Опустить «${name}»`},
    submit: 'Ответить', time: 'Осталось времени', next: 'Следующий вопрос', finish: 'К результатам',
    compare: 'Сверьте решение', matched: 'Решение совпало', missed: 'Есть ошибка',
    answer: 'Правильный ответ', explanation: 'Разбор', author: 'Пояснение автора',
    readMore: 'Почитать в журнале', result: 'Игра завершена',
    scoreTotal: (points, total) => `${points} из ${total}`,
    mistakes: (count) => `Разобрать ошибки (${count})`, perfect: 'Все ответы верны.',
    noAnswer: 'Ответа не было', replay: 'Новая игра', summary: 'К результату', point: '+1 очко',
  },
  en: {
    journal: 'Mathematics with Mansur',
    title: 'Brain Ring with Mansur',
    intro: 'Puzzles, mathematical history, and questions that reward a second look.',
    modes: {timed: 'Brain Ring', practice: 'Practice'},
    modeDetail: {timed: 'Time limits vary by question format.', practice: 'Play at your own pace.'},
    selectMode: 'Game mode', difficulty: 'Difficulty', rounds: 'Rounds', language: 'Game language',
    levels: {progressive: 'Increasing difficulty', beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert'},
    rules: 'Six questions per round. One attempt and one point for each correct answer.',
    start: 'Start game', back: 'Game settings', quit: 'Leave this game?',
    round: (round, total) => `Round ${round} of ${total}`,
    question: (number, total) => `Question ${number} of ${total}`,
    score: (points) => `Score: ${points}`,
    formats: {
      short_input: 'Enter a short answer.',
      single_choice: 'Choose one answer.',
      multiple_choice: 'Select every correct option.',
      matching: 'Choose an item on the left, then its match on the right. Select the same pair again to remove it.',
      ordering: 'Put the items in order using the ↑ and ↓ buttons.',
      self_check: 'Write your solution. After submitting it, compare it with the worked answer.',
    },
    input: 'Your answer', solutionInput: 'Your solution', answerOptions: 'Answer options',
    left: 'Items', right: 'Matches',
    pair: (number) => `Pair ${number}`,
    countPairs: (count, total) => `Pairs matched: ${count} of ${total}`,
    move: {up: (name) => `Move “${name}” up`, down: (name) => `Move “${name}” down`},
    submit: 'Submit answer', time: 'Time left', next: 'Next question', finish: 'View results',
    compare: 'Check your solution', matched: 'My solution matches', missed: 'I made a mistake',
    answer: 'Correct answer', explanation: 'Explanation', author: 'Author’s notes',
    readMore: 'Read in the journal', result: 'Game complete',
    scoreTotal: (points, total) => `${points} of ${total}`,
    mistakes: (count) => `Review mistakes (${count})`, perfect: 'Every answer was correct.',
    noAnswer: 'No answer submitted', replay: 'New game', summary: 'Back to results', point: '+1 point',
  },
};

const root = document.querySelector('#brain-ring');
const {banks, pilot} = JSON.parse(document.querySelector('#brain-ring-data').textContent);
let language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ru';
let t = copy[language];
let settings = {mode: 'timed', difficulty: 'progressive', rounds: 3};
let game;
let countdown;

function element(tag, classes, content) {
  const node = document.createElement(tag);
  if (classes) node.className = classes;
  if (content !== undefined) node.textContent = content;
  return node;
}

function button(content, action, classes = 'button') {
  const control = element('button', classes, content);
  control.type = 'button';
  control.addEventListener('click', action);
  return control;
}

function select(id, title, choices, value, change) {
  const label = element('label', 'field');
  label.htmlFor = id;
  label.append(element('span', 'field-label', title));
  const control = element('select');
  control.id = id;
  for (const [key, text] of choices) {
    const option = element('option', '', text);
    option.value = key;
    control.append(option);
  }
  control.value = value;
  control.addEventListener('change', () => change(control.value));
  label.append(control);
  return label;
}

function heading(tag, text, classes) {
  const node = element(tag, classes, text);
  node.tabIndex = -1;
  return node;
}

function focus(element) {
  element.focus({preventScroll: true});
}

function journalURL(path) {
  if (location.protocol === 'file:' || root.dataset.portable === 'true') {
    return new URL(path, 'https://history-math.org').href;
  }
  return (root.dataset.linkBase || '') + path;
}

function page(showSettings = false) {
  const header = element('header', 'masthead');
  const brand = element('a', 'brand', t.journal);
  brand.href = journalURL(language === 'ru' ? '/ru/' : '/');
  header.append(brand);
  if (showSettings) {
    header.append(button(t.back, () => {
      const phase = game.state().phase;
      if (phase === 'complete' || confirm(t.quit)) renderSettings(true);
    }, 'button plain'));
  } else {
    const switcher = element('div', 'languages');
    for (const locale of ['ru', 'en']) {
      const control = button(locale.toUpperCase(), () => {
        language = locale;
        t = copy[language];
        renderSettings(true);
      }, 'language');
      control.lang = locale;
      control.setAttribute('aria-label', locale === 'ru' ? 'Русский' : 'English');
      control.setAttribute('aria-pressed', String(language === locale));
      switcher.append(control);
    }
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', t.language);
    header.append(switcher);
  }
  const section = element('section', 'panel');
  root.replaceChildren(header, section);
  return section;
}

function renderSettings(shouldFocus = false) {
  clearInterval(countdown);
  game = null;
  document.documentElement.lang = language;
  document.title = t.title;
  const panel = page();
  panel.classList.add('setup');
  const title = heading('h1', t.title);
  panel.append(title, element('p', 'intro', t.intro));

  const fields = element('form', 'settings');
  const modes = element('fieldset', 'mode-field');
  modes.append(element('legend', 'field-label', t.selectMode));
  const modeList = element('div', 'mode-list');
  for (const mode of ['timed', 'practice']) {
    const card = element('label', 'mode-card');
    const input = element('input');
    input.type = 'radio';
    input.name = 'mode';
    input.value = mode;
    input.checked = settings.mode === mode;
    input.addEventListener('change', () => { settings.mode = mode; });
    const text = element('span');
    text.append(element('strong', '', t.modes[mode]), element('small', '', t.modeDetail[mode]));
    card.append(input, text);
    modeList.append(card);
  }
  modes.append(modeList);

  const row = element('div', 'settings-row');
  row.append(
    select('difficulty', t.difficulty, ['progressive', ...levels].map((level) => [level, t.levels[level]]),
      settings.difficulty, (value) => { settings.difficulty = value; }),
    select('rounds', t.rounds, [1, 2, 3].map((count) => [count, count]),
      settings.rounds, (value) => { settings.rounds = Number(value); }),
  );
  const start = element('button', 'button primary', t.start);
  start.type = 'submit';
  fields.append(modes, row, element('p', 'rules', t.rules), start);
  fields.addEventListener('submit', (event) => {
    event.preventDefault();
    game = createGame(banks[language], pilot, settings);
    renderGame();
  });
  panel.append(fields);
  if (shouldFocus) focus(title);
}

function renderStatus(panel, state) {
  const row = element('div', 'status');
  const stage = element('span', 'round', t.round(state.round, settings.rounds));
  const difficulty = element('span', 'difficulty', t.levels[state.level]);
  row.append(stage, difficulty, element('span', 'score', t.score(state.points)));
  panel.append(row);

  const progress = element('div', 'progress-label', t.question(state.position, pilot.questions_per_round));
  const bar = element('progress', 'round-progress');
  bar.max = pilot.questions_per_round;
  bar.value = state.position - (state.phase === 'answer' ? 1 : 0);
  bar.setAttribute('aria-label', progress.textContent);
  panel.append(progress, bar);
}

function renderTimer(panel) {
  const timer = element('div', 'timer');
  const label = element('span', '', t.time);
  const value = element('span', 'time-value');
  timer.setAttribute('role', 'timer');
  timer.append(label, value);
  panel.append(timer);

  function tick() {
    if (game.expire()) {
      renderGame();
      return;
    }
    const seconds = Math.ceil(game.state().timeLeft / 1000);
    value.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    timer.classList.toggle('urgent', seconds <= 10);
  }
  countdown = setInterval(tick, 125);
  tick();
}

function renderOptions(area, question, update) {
  const options = element('fieldset', 'choice-options');
  options.append(element('legend', 'visually-hidden', t.answerOptions));
  const multiple = question.format === 'multiple_choice';
  for (const option of shuffle(question.answer.options)) {
    const row = element('label', 'answer-choice');
    const input = element('input');
    input.type = multiple ? 'checkbox' : 'radio';
    input.name = 'answer';
    input.value = option.id;
    input.addEventListener('change', () => {
      update(multiple ? Array.from(options.querySelectorAll(':checked'), (item) => item.value) : input.value);
    });
    row.append(input, element('span', '', option.text));
    options.append(row);
  }
  area.append(options);
}

function renderTextEntry(area, question, update) {
  const longer = question.format === 'self_check';
  const label = element('label', 'field');
  const control = element(longer ? 'textarea' : 'input', 'text-input');
  control.name = longer ? 'solution' : 'answer';
  control.autocomplete = 'off';
  control.maxLength = longer ? 3000 : 300;
  if (longer) control.rows = 4;
  label.append(element('span', 'field-label', longer ? t.solutionInput : t.input), control);
  control.addEventListener('input', () => update(control.value));
  area.append(label);
}

function renderOrdering(area, question, update) {
  const key = question.answer;
  const list = element('ol', 'ordering');
  let order = initialOrder(key.items, key.order);
  const labels = Object.fromEntries(key.items.map(({id, text}) => [id, text]));

  function draw() {
    list.replaceChildren(...order.map((id, index) => {
      const item = element('li');
      const controls = element('div', 'order-controls');
      const text = labels[id];
      const moves = [[-1, 'up', '↑'], [1, 'down', '↓']];
      for (const [step, direction, symbol] of moves) {
        const control = button(symbol, () => {
          order = moveItem(order, index, step);
          draw();
          update(order);
          const row = list.children[index + step];
          const same = row.querySelector(`[data-direction="${direction}"]`);
          (same.disabled ? row.querySelector('button:not(:disabled)') : same)?.focus();
        }, 'button compact');
        control.dataset.direction = direction;
        control.disabled = index + step < 0 || index + step >= order.length;
        control.setAttribute('aria-label', t.move[direction](text));
        controls.append(control);
      }
      item.append(element('span', '', text), controls);
      return item;
    }));
  }

  draw();
  update(order);
  area.append(list);
}

function renderMatching(area, question, update) {
  const left = shuffle(question.answer.left);
  const right = shuffle(question.answer.right);
  const columns = element('div', 'match-columns');
  const status = element('p', 'match-count');
  status.setAttribute('role', 'status');
  let active;
  let matches = {};
  const leftControls = new Map();
  const rightControls = new Map();

  function draw() {
    for (const [index, item] of left.entries()) {
      const control = leftControls.get(item.id);
      control.setAttribute('aria-pressed', String(item.id === active));
      control.classList.toggle('paired', Object.hasOwn(matches, item.id));
      control.querySelector('.pair-mark').textContent = Object.hasOwn(matches, item.id) ? String(index + 1) : '';
      control.setAttribute('aria-label',
        Object.hasOwn(matches, item.id) ? `${item.text}, ${t.pair(index + 1)}` : item.text);
    }
    for (const item of right) {
      const index = left.findIndex(({id}) => matches[id] === item.id);
      const control = rightControls.get(item.id);
      control.classList.toggle('paired', index !== -1);
      control.querySelector('.pair-mark').textContent = index === -1 ? '' : String(index + 1);
      control.setAttribute('aria-label', index === -1 ? item.text : `${item.text}, ${t.pair(index + 1)}`);
      control.disabled = active === undefined;
    }
    status.textContent = t.countPairs(Object.keys(matches).length, left.length);
    update(matches);
  }

  function group(label, items, controls, pick) {
    const column = element('div', 'match-column');
    column.append(element('strong', 'field-label', label));
    for (const item of items) {
      const control = button('', () => pick(item.id), 'button match');
      control.append(element('span', '', item.text));
      const mark = element('span', 'pair-mark');
      mark.setAttribute('aria-hidden', 'true');
      control.append(mark);
      controls.set(item.id, control);
      column.append(control);
    }
    return column;
  }

  columns.append(
    group(t.left, left, leftControls, (id) => { active = id; draw(); }),
    group(t.right, right, rightControls, (id) => {
      const previous = active;
      matches = assignPair(matches, active, id);
      active = undefined;
      draw();
      leftControls.get(previous).focus();
    }),
  );
  area.append(columns, status);
  draw();
}

function renderAnswer(panel, question) {
  const form = element('form', 'answer-form');
  const instruction = element('p', 'instruction', t.formats[question.format]);
  const fields = element('div', 'answer-fields');
  const submit = element('button', 'button primary', t.submit);
  submit.type = 'submit';
  submit.disabled = true;
  let answer;
  const update = (value) => { answer = value; submit.disabled = !hasAnswer(question, value); };

  if (question.format === 'matching') {
    renderMatching(fields, question, update);
  } else if (question.format === 'ordering') {
    renderOrdering(fields, question, update);
  } else if (question.format.endsWith('choice')) {
    renderOptions(fields, question, update);
  } else {
    renderTextEntry(fields, question, update);
  }
  form.append(instruction, fields, submit);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    game.submit(answer);
    if (game.state().phase !== 'answer') renderGame();
  });
  panel.append(form);
}

function textBlock(container, label, text) {
  if (!text) return;
  container.append(element('h3', 'field-label', label), element('p', 'prose', text));
}

function renderFeedback(container, feedback, {showStatus = true, solution} = {}) {
  if (showStatus) {
    const outcome = heading('h2', feedback.message, 'outcome');
    outcome.classList.add(feedback.points ? 'positive' : 'negative');
    if (feedback.points) outcome.append(element('span', 'point', t.point));
    container.append(outcome);
  }
  textBlock(container, t.answer, solution ?? feedback.answer);
  textBlock(container, t.explanation, feedback.digest);
  const notes = [...new Set([feedback.authorExplanation, feedback.authorNote])].filter(Boolean);
  if (notes.length) {
    const details = element('details', 'author-note');
    details.append(element('summary', '', t.author), ...notes.map((note) => element('p', 'prose', note)));
    container.append(details);
  }
  if (feedback.links.length) {
    const list = element('ul', 'related');
    for (const link of feedback.links) {
      const item = element('li');
      const a = element('a', '', link.title);
      a.href = journalURL(link.url);
      a.target = '_blank';
      a.rel = 'noopener';
      item.append(a);
      list.append(item);
    }
    container.append(element('h3', 'field-label', t.readMore), list);
  }
}

function attemptText({question, attempt}) {
  if (attempt === null) return t.noAnswer;
  const key = question.answer;
  const lookup = (items, id) => items.find((item) => item.id === id).text;
  switch (question.format) {
    case 'single_choice':
      return lookup(key.options, attempt);
    case 'multiple_choice':
      return attempt.map((id) => lookup(key.options, id)).join('; ');
    case 'ordering':
      return attempt.map((id) => lookup(key.items, id)).join(' → ');
    case 'matching':
      return key.left.map(({id, text}) => `${text} — ${lookup(key.right, attempt[id])}`).join('\n');
    default:
      return attempt;
  }
}

function renderResult(showMistakes = false) {
  const state = game.state();
  const panel = page(true);
  panel.classList.add('results');
  const title = heading('h1', showMistakes ? t.mistakes(state.mistakes.length) : t.result);
  panel.append(title);
  if (showMistakes) {
    for (const entry of state.mistakes) {
      const details = element('details', 'mistake');
      const summary = element('summary', '', `${t.round(entry.round, settings.rounds)} · ${t.question(entry.position, pilot.questions_per_round)}`);
      details.append(summary, element('p', 'prose mistake-question', entry.question.prompt));
      textBlock(details, t.input, attemptText(entry));
      renderFeedback(details, entry.feedback, {showStatus: false});
      panel.append(details);
    }
    panel.append(button(t.summary, () => renderResult(), 'button primary'));
  } else {
    panel.append(element('p', 'result-score', t.scoreTotal(state.points, state.total)));
    const actions = element('div', 'actions');
    if (state.mistakes.length) {
      actions.append(button(t.mistakes(state.mistakes.length), () => renderResult(true), 'button primary'));
    } else {
      panel.append(element('p', 'prose', t.perfect));
    }
    actions.append(button(t.replay, () => renderSettings(true), 'button'));
    panel.append(actions);
  }
  focus(title);
}

function renderGame() {
  clearInterval(countdown);
  const state = game.state();
  if (state.phase === 'complete') {
    renderResult();
    return;
  }
  const panel = page(true);
  renderStatus(panel, state);
  if (state.timeLeft !== null) renderTimer(panel);
  const title = heading('h1', state.question.prompt, 'question');
  panel.append(element('p', 'topic', banks[language].topics[state.question.topic]), title);
  if (state.phase === 'answer') {
    renderAnswer(panel, state.question);
    focus(title);
  } else if (state.phase === 'review') {
    const review = element('section', 'feedback');
    const label = heading('h2', t.compare);
    review.append(label);
    textBlock(review, t.solutionInput, state.attempt);
    const data = getBrainRingFeedback(banks[language].feedback, state.question, 'incorrect');
    renderFeedback(review, data, {showStatus: false, solution: state.question.answer.solution});
    const actions = element('div', 'actions');
    const grade = (correct) => { if (game.grade(correct)) renderGame(); };
    actions.append(button(t.matched, () => grade(true), 'button primary'), button(t.missed, () => grade(false)));
    review.append(actions);
    panel.append(review);
    focus(label);
  } else {
    const feedback = element('section', 'feedback');
    renderFeedback(feedback, state.last.feedback);
    const label = state.index + 1 === state.total ? t.finish : t.next;
    feedback.append(button(label, () => { if (game.advance()) renderGame(); }, 'button primary'));
    panel.append(feedback);
    focus(feedback.querySelector('h2'));
    feedback.scrollIntoView({block: 'nearest'});
  }
}

renderSettings();
