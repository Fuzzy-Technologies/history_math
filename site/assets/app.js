const assetVersion = new URL(import.meta.url).search;
const [{search, searchByTag, selection, anniversaries, journalGroups}, {enhanceSelect}, {rememberReadingPosition}] = await Promise.all([
  import('./core.js' + assetVersion),
  import('./select.js' + assetVersion),
  import('./reading-position.js' + assetVersion)
]);

const language = document.body.dataset.lang;
const labels = {essay: 'Очерк', problem: 'Задача', instrument: 'Инструмент', note: 'Заметка'};

document.querySelectorAll('.prose table').forEach((table, index) => {
  const region = element('div', 'table-scroll');
  region.tabIndex = 0;
  region.setAttribute('role', 'region');
  region.setAttribute('aria-label', `${language === 'ru' ? 'Таблица' : 'Table'} ${index + 1}`);
  table.before(region);
  region.append(table);
});

const themeButton = document.querySelector('.theme-toggle');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let explicitTheme = false;
try { explicitTheme = ['light', 'dark'].includes(localStorage.getItem('history-math:theme')); } catch {}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1e1a17' : '#f4eddf';
  themeButton.querySelector('.theme-label').textContent = themeButton.dataset[theme === 'dark' ? 'lightLabel' : 'darkLabel'];
  themeButton.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀' : '☾';
}
applyTheme(document.documentElement.dataset.theme || (systemTheme.matches ? 'dark' : 'light'));
themeButton.hidden = false;
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  explicitTheme = true;
  applyTheme(theme);
  try { localStorage.setItem('history-math:theme', theme); } catch {}
});
systemTheme.addEventListener('change', () => {
  if (!explicitTheme) applyTheme(systemTheme.matches ? 'dark' : 'light');
});
window.addEventListener('storage', event => {
  if (event.key !== 'history-math:theme') return;
  explicitTheme = ['light', 'dark'].includes(event.newValue);
  applyTheme(explicitTheme ? event.newValue : (systemTheme.matches ? 'dark' : 'light'));
});

const viewer = document.querySelector('#image-viewer');
if (viewer && typeof viewer.showModal === 'function') {
  const stage = viewer.querySelector('.viewer-stage');
  const canvas = viewer.querySelector('.viewer-canvas');
  const scaleLabel = viewer.querySelector('.viewer-scale');
  const caption = viewer.querySelector('#viewer-caption');
  const expanded = document.createElement('img');
  const pointers = new Map();
  let activeTrigger;
  let baseWidth = 1;
  let ratio = 1;
  let zoom = 1;
  let request = 0;

  function resizeImage() {
    const width = baseWidth * zoom;
    const height = width / ratio;
    canvas.style.width = Math.max(stage.clientWidth, width) + 'px';
    canvas.style.height = Math.max(stage.clientHeight, height) + 'px';
    expanded.style.width = width + 'px';
    scaleLabel.value = Math.round(zoom * 100) + '%';
    viewer.querySelector('[data-viewer-action="out"]').disabled = zoom <= 0.1;
    viewer.querySelector('[data-viewer-action="in"]').disabled = zoom >= 4;
  }
  function changeZoom(value, anchor = {x: stage.clientWidth / 2, y: stage.clientHeight / 2}) {
    const previousWidth = baseWidth * zoom;
    const previousHeight = previousWidth / ratio;
    const x = (stage.scrollLeft + anchor.x - Math.max(0, (stage.clientWidth - previousWidth) / 2)) / previousWidth;
    const y = (stage.scrollTop + anchor.y - Math.max(0, (stage.clientHeight - previousHeight) / 2)) / previousHeight;
    zoom = Math.min(4, Math.max(0.1, value));
    resizeImage();
    const width = baseWidth * zoom;
    const height = width / ratio;
    stage.scrollLeft = x * width + Math.max(0, (stage.clientWidth - width) / 2) - anchor.x;
    stage.scrollTop = y * height + Math.max(0, (stage.clientHeight - height) / 2) - anchor.y;
  }
  function fitImage() {
    changeZoom(Math.min(1, stage.clientHeight * ratio / baseWidth));
    stage.scrollTo(0, 0);
  }
  async function openImage(image, trigger) {
    const current = ++request;
    activeTrigger = trigger;
    expanded.src = image.currentSrc || image.src;
    expanded.alt = image.alt;
    const description = image.closest('figure')?.querySelector('figcaption');
    caption.textContent = (description?.innerText || image.alt).replace(/\s*\n\s*/g, ' · ');
    canvas.replaceChildren(expanded);
    viewer.showModal();
    document.documentElement.classList.add('viewer-open');
    viewer.querySelector('[data-viewer-action="close"]').focus();
    try {
      await expanded.decode();
      if (!viewer.open || current !== request) return;
      baseWidth = stage.clientWidth;
      ratio = expanded.naturalWidth / expanded.naturalHeight;
      zoom = 1;
      resizeImage();
      stage.scrollTo(0, 0);
    } catch {
      if (viewer.open && current === request) caption.textContent = viewer.dataset.errorLabel;
    }
  }
  document.querySelectorAll('.hero-figure img, .english-hero > img, .prose img, .about-teaser > img, .book-gallery img').forEach(image => {
    if (image.closest('a, button')) return;
    const trigger = element('button', 'image-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-label', viewer.dataset.openLabel + (image.alt ? ': ' + image.alt : ''));
    image.before(trigger);
    trigger.append(image);
    trigger.addEventListener('click', () => openImage(image, trigger));
  });
  viewer.addEventListener('close', () => {
    request += 1;
    pointers.clear();
    canvas.replaceChildren();
    stage.classList.remove('is-dragging');
    document.documentElement.classList.remove('viewer-open');
    activeTrigger?.focus({preventScroll: true});
  });
  viewer.querySelectorAll('[data-viewer-action]').forEach(button => button.addEventListener('click', () => {
    switch (button.dataset.viewerAction) {
      case 'in': changeZoom(zoom * 1.25); break;
      case 'out': changeZoom(zoom / 1.25); break;
      case 'fit': fitImage(); break;
      case 'close': viewer.close(); break;
    }
  }));
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const focusable = [...viewer.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (!['+', '=', '-', '0'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === '0') fitImage(); else changeZoom(zoom * (event.key === '-' ? 0.8 : 1.25));
  });
  function anchorAt(x, y) {
    const bounds = stage.getBoundingClientRect();
    return {x: x - bounds.left, y: y - bounds.top};
  }
  stage.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    changeZoom(zoom * Math.exp(-event.deltaY * 0.005), anchorAt(event.clientX, event.clientY));
  }, {passive: false});
  stage.addEventListener('dblclick', event => {
    changeZoom(zoom > 1.5 ? 1 : 2, anchorAt(event.clientX, event.clientY));
  });
  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('is-dragging');
    event.preventDefault();
  });
  stage.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const pair = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (pair) {
      const distance = Math.hypot(event.clientX - pair.x, event.clientY - pair.y);
      const previousDistance = Math.hypot(previous.x - pair.x, previous.y - pair.y);
      if (previousDistance > 0) changeZoom(zoom * distance / previousDistance, anchorAt((event.clientX + pair.x) / 2, (event.clientY + pair.y) / 2));
    } else {
      stage.scrollLeft += previous.x - event.clientX;
      stage.scrollTop += previous.y - event.clientY;
    }
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stage.addEventListener(name, event => {
      pointers.delete(event.pointerId);
      if (!pointers.size) stage.classList.remove('is-dragging');
    });
  }
  window.addEventListener('resize', () => {
    if (!viewer.open || !expanded.naturalWidth) return;
    baseWidth = stage.clientWidth;
    resizeImage();
  });
}

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
  const topics = element('div', 'tag-list');
  for (const tag of record.tags) {
    const link = element('a', 'tag', tag);
    link.dataset.tag = tag;
    const url = new URL(document.body.dataset.search, location.origin);
    url.searchParams.set('tag', tag);
    link.href = url.pathname + url.search;
    topics.append(link);
  }
  node.append(topics);
  return node;
}

const carousel = document.querySelector('#latest-cards');
if (carousel) {
  const controls = document.querySelector('.carousel-controls');

  const buttons = [...controls.querySelectorAll('button')];
  const wide = window.matchMedia('(min-width: 621px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [...carousel.children];
  let drag;
  let suppressClick = false;
  const canScroll = () => wide.matches && carousel.scrollWidth > carousel.clientWidth + 2;
  function finishDrag(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const finished = drag;
    drag = undefined;
    carousel.classList.remove('is-dragging');
    if (carousel.hasPointerCapture(finished.id)) carousel.releasePointerCapture(finished.id);
    if (finished.moved) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
    }
  }
  function updateCarousel() {
    const overflow = carousel.scrollWidth > carousel.clientWidth + 2;
    controls.hidden = !wide.matches || !overflow;

    carousel.tabIndex = wide.matches && overflow ? 0 : -1;
    carousel.setAttribute('aria-label', wide.matches ? 'Новые материалы: стрелки, перетаскивание или колёсико' : 'Новые материалы');
    buttons[0].disabled = carousel.scrollLeft <= 2;
    buttons[1].disabled = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 2;


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
  carousel.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !canScroll()) return;
    drag = {id: event.pointerId, x: event.clientX, left: carousel.scrollLeft, moved: false};
  });
  window.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientX - drag.x;
    if (!drag.moved && Math.abs(distance) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      carousel.classList.add('is-dragging');
      carousel.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    carousel.scrollLeft = drag.left - distance;
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    window.addEventListener(name, finishDrag);
  }
  window.addEventListener('blur', () => finishDrag());
  carousel.addEventListener('dragstart', event => { if (canScroll()) event.preventDefault(); });
  carousel.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);
  carousel.addEventListener('wheel', event => {
    if (!canScroll() || drag || event.ctrlKey || event.metaKey || !event.cancelable || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? carousel.clientWidth : 1;
    const delta = event.deltaY * unit;
    const maximum = carousel.scrollWidth - carousel.clientWidth;
    if ((delta < 0 && carousel.scrollLeft <= 2) || (delta > 0 && carousel.scrollLeft >= maximum - 2)) return;
    event.preventDefault();
    carousel.scrollLeft += delta;
  }, {passive: false});
  let frame;
  carousel.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(updateCarousel);
  }, {passive: true});
  new ResizeObserver(updateCarousel).observe(carousel);
  wide.addEventListener('change', () => { finishDrag(); updateCarousel(); });
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

rememberReadingPosition();

const archive = document.querySelector('#archive-cards');
if (archive) {
  loadIndex().then(async records => {
    const groups = journalGroups(records, language);
    const pool = groups.archive;
    archive.closest('.archive-section').hidden = !pool.length;
    const hero = document.querySelector('#hero-picks');
    if (hero) {
      const picks = selection(groups.featured, 4);
      hero.replaceChildren(...picks.map(record => {
        const link = element('a', 'hero-pick');
        link.href = record.url;
        if (record.preview_image) {
          const image = document.createElement('img');
          image.src = record.preview_image; image.alt = ''; image.width = 160; image.height = 160;
          link.append(image);
        }
        link.append(element('span', '', record.title));
        return link;
      }));
      hero.hidden = !picks.length;
      hero.closest('.journal-hero').classList.toggle('without-picks', !picks.length);
    }
    // Reserve enough space for any article, including long archival titles and tags.
    function reserveArchiveSpace() {
      if (!pool.length || !archive.clientWidth) return;
      const probe = archive.cloneNode(false);
      probe.removeAttribute('id');
      probe.setAttribute('aria-hidden', 'true');
      probe.inert = true;
      probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${archive.clientWidth}px`;
      probe.replaceChildren(...pool.map(record => card(record, 'archive-card')));
      archive.after(probe);
      const height = Math.ceil(Math.max(...[...probe.children].map(node => node.getBoundingClientRect().height)));
      probe.remove();
      archive.style.setProperty('--archive-card-height', `${height}px`);
    }
    await document.fonts.ready;
    reserveArchiveSpace();
    let measuredWidth = archive.clientWidth;
    new ResizeObserver(() => {
      if (archive.clientWidth === measuredWidth) return;
      measuredWidth = archive.clientWidth;
      reserveArchiveSpace();
    }).observe(archive);
    const storageKey = `history-math:archive:${language}`;
    let previous = [...archive.querySelectorAll('h3 a')].map(link => link.getAttribute('href'));
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(saved) && saved.every(url => typeof url === 'string')) previous = saved.slice(0, 4);
    } catch {}
    function rotate() {
      const picked = selection(pool, 4, previous);
      previous = picked.map(record => record.url);
      try { localStorage.setItem(storageKey, JSON.stringify(previous)); } catch {}
      archive.replaceChildren(...picked.map(record => card(record, 'archive-card')));
      document.querySelector('#archive-status').textContent = 'Подборка обновлена: ' + picked.map(record => record.title).join(', ');
    }
    rotate();
    const button = document.querySelector('#reshuffle');
    button.hidden = pool.length <= 4;
    button.addEventListener('click', rotate);
    window.addEventListener('pageshow', event => { if (event.persisted) rotate(); });
    const matches = anniversaries(records.filter(record => record.status === 'published'), new Date(), language);
    if (matches.length) {
      document.querySelector('.anniversary-panel').hidden = false;
      document.querySelector('#anniversary-heading').textContent = 'В этот день мы писали';
      document.querySelector('#anniversary-note').textContent = 'Вспоминаем статьи, опубликованные в этот день.';
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
  const topic = document.querySelector('#search-topic');
  const params = new URL(location.href).searchParams;
  let activeTag = params.get('tag')?.trim() || '';
  let requestNumber = 0;
  async function update() {
    const request = ++requestNumber;
    const query = activeTag ? '' : input.value.trim();
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    if (activeTag) url.searchParams.set('tag', activeTag); else url.searchParams.delete('tag');
    window.history.replaceState(null, '', url);
    topic.hidden = !activeTag;
    topic.querySelector('strong').textContent = activeTag;
    if (!query && !activeTag) {
      results.replaceChildren();
      status.textContent = 'Введите слово или фразу, чтобы начать поиск.';
      return;
    }
    status.textContent = 'Ищем…';
    try {
      const records = await loadIndex();
      if (request !== requestNumber) return;
      const matches = activeTag ? searchByTag(records, activeTag, language) : search(records, query, language);
      results.replaceChildren(...matches.map(record => card(record, 'search-result')));
      status.textContent = matches.length ? `Найдено материалов: ${matches.length}` : 'Ничего не найдено. Попробуйте другое слово или тему.';
    } catch {
      if (request !== requestNumber) return;
      status.textContent = 'Поиск временно недоступен. Откройте раздел «Материалы».';
    }
  }
  let timer;
  input.addEventListener('input', () => { activeTag = ''; clearTimeout(timer); timer = setTimeout(update, 150); });
  form.addEventListener('submit', event => { event.preventDefault(); activeTag = ''; clearTimeout(timer); update(); });
  topic.querySelector('button').addEventListener('click', () => {
    activeTag = '';
    input.value = '';
    clearTimeout(timer);
    update();
    input.focus();
  });
  input.value = activeTag ? '' : params.get('q') ?? '';
  if (input.value || activeTag) update();
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
  enhanceSelect(type);
  enhanceSelect(tag);
  filter();
}
