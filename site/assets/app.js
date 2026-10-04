import {search, selection, anniversaries} from './core.js';

const language = document.body.dataset.lang;
const labels = {essay: 'Очерк', problem: 'Задача', instrument: 'Инструмент', note: 'Заметка'};
let indexPromise;
function loadIndex() {
  indexPromise ??= fetch(document.body.dataset.index).then(response => {
    if (!response.ok) throw new Error('Search index unavailable');
    return response.json();
  });
  return indexPromise;
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}
function card(record, className) {
  const node = element('article', className);
  const suffix = record.status === 'demo' ? ' · Демо' : '';
  node.append(element('p', 'eyebrow', `${labels[record.type]}${suffix}`));
  const heading = element('h3', '');
  const link = element('a', '', record.title);
  link.href = record.url;
  heading.append(link);
  node.append(heading, element('p', '', record.description));
  return node;
}

const carousel = document.querySelector('#latest-cards');
if (carousel) {
  const controls = document.querySelector('.carousel-controls');
  const status = document.querySelector('.carousel-status');
  const buttons = [...controls.querySelectorAll('button')];
  const wide = window.matchMedia('(min-width: 621px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [...carousel.children];
  function updateCarousel() {
    const overflow = carousel.scrollWidth > carousel.clientWidth + 2;
    controls.hidden = !wide.matches || !overflow;
    status.hidden = !wide.matches || !overflow;
    carousel.tabIndex = wide.matches && overflow ? 0 : -1;
    carousel.setAttribute('aria-label', wide.matches ? 'Новые материалы, перелистывайте стрелками' : 'Новые материалы');
    buttons[0].disabled = carousel.scrollLeft <= 2;
    buttons[1].disabled = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 2;
    const visible = cards.map((node, index) => ({index, left: node.offsetLeft - carousel.offsetLeft - carousel.scrollLeft, width: node.offsetWidth})).filter(item => item.left + item.width > 2 && item.left < carousel.clientWidth - 2);
    if (visible.length) status.textContent = `Страницы ${visible[0].index + 1}–${visible.at(-1).index + 1} из ${cards.length}`;
  }
  function turn(direction) {
    const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : carousel.clientWidth;
    carousel.scrollBy({left: direction * step, behavior: reduced.matches ? 'auto' : 'smooth'});
  }
  buttons.forEach(button => button.addEventListener('click', () => turn(Number(button.dataset.carouselDirection))));
  carousel.addEventListener('keydown', event => {
    if (!wide.matches || event.target !== carousel || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    turn(event.key === 'ArrowRight' ? 1 : -1);
  });
  let frame;
  carousel.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(updateCarousel);
  }, {passive: true});
  new ResizeObserver(updateCarousel).observe(carousel);
  wide.addEventListener('change', updateCarousel);
  updateCarousel();
}

const sidebar = document.querySelector('.article-sidebar');
if (sidebar) {
  const headings = [...document.querySelectorAll('.article-body h2')];
  if (headings.length > 1) {
    const list = sidebar.querySelector('ol');
    headings.forEach((heading, index) => {
      if (!heading.id) {
        let id = `section-${index + 1}`;
        while (document.getElementById(id)) id += '-section';
        heading.id = id;
      }
      const item = document.createElement('li');
      const link = element('a', '', heading.textContent);
      link.href = '#' + encodeURIComponent(heading.id);
      item.append(link);
      list.append(item);
    });
    sidebar.hidden = false;
  }
}

const archive = document.querySelector('#archive-cards');
if (archive) {
  loadIndex().then(records => {
    const pool = records.filter(record => record.language === language);
    let previous = [];
    function rotate() {
      const picked = selection(pool, 3, previous);
      previous = picked.map(record => record.url);
      archive.replaceChildren(...picked.map(record => card(record, 'archive-card')));
      document.querySelector('#archive-status').textContent = 'Подборка обновлена: ' + picked.map(record => record.title).join(', ');
    }
    rotate();
    const button = document.querySelector('#reshuffle');
    button.hidden = pool.length <= 3;
    button.addEventListener('click', rotate);
    const matches = anniversaries(records, new Date(), language);
    if (matches.length) {
      document.querySelector('#anniversary-heading').textContent = 'В этот день мы писали';
      document.querySelector('#anniversary-note').textContent = 'Годовщины публикаций в журнале. Даты демоматериалов условны.';
      const result = document.querySelector('#anniversary-result');
      result.replaceChildren(...matches.map(record => {
        const link = element('a', '', `${record.title} (${record.date.slice(0, 4)}) →`);
        link.href = record.url;
        return link;
      }));
    }
  }).catch(() => { document.querySelector('#archive-status').textContent = 'Показана исходная подборка.'; });
}

const form = document.querySelector('#search-form');
if (form) {
  const input = document.querySelector('#query');
  const status = document.querySelector('#search-status');
  const results = document.querySelector('#search-results');
  let requestNumber = 0;
  async function update() {
    const request = ++requestNumber;
    const query = input.value.trim();
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
    if (!query) {
      results.replaceChildren();
      status.textContent = 'Введите слово или фразу, чтобы начать поиск.';
      return;
    }
    status.textContent = 'Ищем в читальном зале…';
    try {
      const records = await loadIndex();
      if (request !== requestNumber) return;
      const matches = search(records, query, language);
      results.replaceChildren(...matches.map(record => card(record, 'search-result')));
      status.textContent = matches.length ? `Найдено материалов: ${matches.length}` : 'Ничего не найдено. Попробуйте другое слово или тему.';
    } catch {
      status.textContent = 'Поиск временно недоступен. Материалы можно найти в читальном зале.';
    }
  }
  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 150); });
  form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); update(); });
  input.value = new URL(window.location.href).searchParams.get('q') ?? '';
  if (input.value) update();
}

const controls = document.querySelector('.catalog-controls');
if (controls) {
  controls.hidden = false;
  const type = document.querySelector('#type-filter');
  const tag = document.querySelector('#tag-filter');
  const cards = [...document.querySelectorAll('.catalog-list .material-card')];
  function filter() {
    let visible = 0;
    for (const node of cards) {
      node.hidden = Boolean((type.value && type.value !== node.dataset.type) ||
        (tag.value && !node.dataset.tags.split('|').includes(tag.value)));
      if (!node.hidden) visible += 1;
    }
    document.querySelector('#catalog-count').textContent = `Материалов: ${visible}`;
    document.querySelector('#catalog-empty').hidden = visible !== 0;
  }
  type.addEventListener('change', filter);
  tag.addEventListener('change', filter);
  filter();
}
