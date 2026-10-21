const assetVersion = new URL(import.meta.url).search;
const [{search, searchByTag, topicKey, rubricArticles, articleCandidates, archiveMeasurementBatches, selection, journalGroups}, {enhanceSelect}, {rememberReadingPosition}, {loadVerifiedOriginal, nativeOriginalTarget}, {catalogState, catalogPage, catalogPageNumbers, catalogUrl}] = await Promise.all([
  import('./core.js' + assetVersion),
  import('./select.js' + assetVersion),
  import('./reading-position.js' + assetVersion),
  import('./original-image.js' + assetVersion),
  import('./catalog.js' + assetVersion)
]);

const language = document.body.dataset.lang;
const ru = language === 'ru';
const labels = ru ? {essay: 'Очерк', problem: 'Задача', instrument: 'Инструмент', note: 'Заметка'} :
  {essay: 'Essay', problem: 'Problem', instrument: 'Instrument', note: 'Note'};
const pendingLabel = ru ? 'Русский оригинал · Перевод готовится' : 'Russian original · Translation pending';
const searchPrompt = ru ? 'Введите слово или фразу, чтобы начать поиск.' : 'Enter a word or phrase to start searching.';


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
  const download = viewer.querySelector('[data-viewer-download]');
  const expanded = document.createElement('img');
  let activeOriginal;
  let loadController;
  download.addEventListener('click', async event => {
    if (!download.hasAttribute('href') || download.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
      return;
    }
    const target = new URL(download.href);
    if (download.dataset.nativeOriginal === 'true' || target.protocol === 'blob:' || target.origin === location.origin) return;
    event.preventDefault();
    const current = request;
    let original;
    try {
      // A cross-origin download attribute alone navigates instead of downloading.
      if (activeOriginal?.sha256) {
        original = await loadVerifiedOriginal(activeOriginal, {signal: loadController.signal});
      } else {
        const response = await fetch(target.href, {credentials: 'omit', signal: loadController.signal});
        if (!response.ok) throw new Error('Original image download failed');
        const objectUrl = URL.createObjectURL(await response.blob());
        original = {url: objectUrl, filename: target.pathname.split('/').at(-1),
          revoke: () => URL.revokeObjectURL(objectUrl)};
      }
      if (!viewer.open || current !== request) {
        original.revoke();
        return;
      }
      const link = document.createElement('a');
      link.href = original.url;
      link.download = original.filename;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => original.revoke(), 1000);
    } catch {
      original?.revoke();
      if (viewer.open && current === request) caption.textContent = viewer.dataset.errorLabel;
    }
  });
  const pointers = new Map();
  let activeTrigger;
  let baseWidth = 1;
  let ratio = 1;
  let zoom = 1;
  let fitMode = true;
  let request = 0;

  function fittedZoom() {
    return Math.min(1, stage.clientHeight * ratio / baseWidth);
  }
  function minimumZoom() {
    return Math.min(0.1, fittedZoom());
  }
  function resizeImage() {
    const width = baseWidth * zoom;
    const height = width / ratio;
    canvas.style.width = Math.max(stage.clientWidth, width) + 'px';
    canvas.style.height = Math.max(stage.clientHeight, height) + 'px';
    expanded.style.width = width + 'px';
    const percentage = zoom * 100;
    scaleLabel.value = (percentage < 1 ? percentage.toFixed(1) : Math.round(percentage)) + '%';
    viewer.querySelector('[data-viewer-action="out"]').disabled = zoom <= minimumZoom();
    viewer.querySelector('[data-viewer-action="in"]').disabled = zoom >= 4;
  }
  function changeZoom(value, anchor = {x: stage.clientWidth / 2, y: stage.clientHeight / 2}) {
    const previousWidth = baseWidth * zoom;
    const previousHeight = previousWidth / ratio;
    const x = (stage.scrollLeft + anchor.x - Math.max(0, (stage.clientWidth - previousWidth) / 2)) / previousWidth;
    const y = (stage.scrollTop + anchor.y - Math.max(0, (stage.clientHeight - previousHeight) / 2)) / previousHeight;
    fitMode = false;
    zoom = Math.min(4, Math.max(minimumZoom(), value));
    resizeImage();
    const width = baseWidth * zoom;
    const height = width / ratio;
    stage.scrollLeft = x * width + Math.max(0, (stage.clientWidth - width) / 2) - anchor.x;
    stage.scrollTop = y * height + Math.max(0, (stage.clientHeight - height) / 2) - anchor.y;
  }
  function fitImage() {
    fitMode = true;
    zoom = fittedZoom();
    resizeImage();
    stage.scrollTo(0, 0);
  }
  async function openImage(image, trigger) {
    const current = ++request;
    loadController?.abort();
    loadController = new AbortController();
    activeOriginal = {url: image.dataset.original || image.currentSrc || image.src,
      apiUrl: image.dataset.originalApi, sha256: image.dataset.originalSha256,
      bytes: Number(image.dataset.originalBytes), filename: image.dataset.originalName};
    activeTrigger = trigger;
    viewer.setAttribute('aria-busy', 'true');
    expanded.removeAttribute('src');
    download.removeAttribute('href');
    delete download.dataset.nativeOriginal;
    download.setAttribute('aria-disabled', 'true');
    expanded.alt = image.alt;
    const description = image.closest('figure')?.querySelector('figcaption');
    caption.textContent = (description?.innerText || image.alt).replace(/\s*\n\s*/g, ' · ');
    canvas.replaceChildren(expanded);
    if (!viewer.open) viewer.showModal();
    document.documentElement.classList.add('viewer-open');
    viewer.querySelector('[data-viewer-action="close"]').focus();
    try {
      if (activeOriginal.apiUrl) {
        const original = nativeOriginalTarget(activeOriginal);
        expanded.src = original.url;
        download.download = original.filename;
        download.dataset.nativeOriginal = 'true';
      } else {
        expanded.src = activeOriginal.url;
        download.download = activeOriginal.filename || new URL(expanded.src).pathname.split('/').at(-1);
      }
      await expanded.decode();
      if (!viewer.open || current !== request) return;
      download.href = expanded.src;
      download.removeAttribute('aria-disabled');
      baseWidth = stage.clientWidth;
      ratio = expanded.naturalWidth / expanded.naturalHeight;
      fitImage();
      viewer.setAttribute('aria-busy', 'false');
    } catch {
      if (viewer.open && current === request) {
        expanded.removeAttribute('src');
        caption.textContent = viewer.dataset.errorLabel;
        viewer.setAttribute('aria-busy', 'false');
      }
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
    loadController?.abort();
    activeOriginal = undefined;
    viewer.setAttribute('aria-busy', 'false');
    pointers.clear();
    canvas.replaceChildren();
    expanded.removeAttribute('src');
    download.removeAttribute('href');
    delete download.dataset.nativeOriginal;
    download.setAttribute('aria-disabled', 'true');
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
      const focusable = [...viewer.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
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
    if (fitMode) fitImage(); else resizeImage();
  });
}

const indexPromises = new Map();
function loadIndex(fullText = false) {
  const url = fullText ? document.body.dataset.searchIndex : document.body.dataset.index;
  if (!indexPromises.has(url)) indexPromises.set(url, fetch(url).then(response => {
    if (!response.ok) throw new Error('Search index unavailable');
    return response.json();
  }).catch(error => { indexPromises.delete(url); throw error; }));
  return indexPromises.get(url);
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}
function card(record, className) {
  const node = element('article', className);
  const suffix = record.status === 'demo' ? (ru ? ' · Демо' : ' · Demo') : '';
  node.append(element('p', 'eyebrow', `${labels[record.type]}${suffix}`));
  const heading = element('h3', '');
  const link = element('a', '', record.title);
  link.href = record.url;
  heading.append(link);
  node.append(heading);
  if (record.translation_notice) node.append(element('p', 'translation-label', pendingLabel));
  node.append(element('p', '', record.description));
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

function heroPick(record, {size = 80, description = true} = {}) {
  const link = element('a', 'hero-pick');
  link.href = record.url;
  if (record.preview_image) {
    const image = document.createElement('img');
    image.src = record.preview_image; image.alt = ''; image.width = size; image.height = size;
    image.loading = 'lazy'; image.decoding = 'async';
    link.append(image);
  }
  const copy = element('span', 'hero-pick-copy');
  copy.append(element('span', 'hero-pick-title', record.title));
  if (description) copy.append(element('span', 'hero-pick-description', record.description));
  link.append(copy);
  return link;
}

function readingCard(record) {
  const node = card(record, 'material-card');
  node.dataset.type = record.type;
  node.dataset.tags = record.tags.join('|');
  const topics = node.querySelector('.tag-list');
  const copy = element('div', 'card-copy');
  copy.append(...node.childNodes);
  const meta = element('div', 'card-meta');
  const date = element('time', '', record.date.split('-').reverse().join('.'));
  date.dateTime = record.date;
  meta.append(date, topics);
  copy.append(meta);
  if (record.preview_image) {
    const link = element('a', 'card-image');
    link.href = record.url;
    link.tabIndex = -1;
    link.setAttribute('aria-hidden', 'true');
    const image = document.createElement('img');
    image.src = record.preview_image; image.alt = ''; image.width = 640; image.height = 400;
    image.loading = 'lazy'; image.decoding = 'async';
    link.append(image);
    node.append(link);
  }
  node.append(copy);
  return node;
}

const carousel = document.querySelector('#latest-cards');
let refreshCarousel = () => {};
if (carousel) {
  const controls = document.querySelector('.carousel-controls');

  const buttons = [...controls.querySelectorAll('button')];
  const wide = window.matchMedia('(min-width: 621px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
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
    const title = document.querySelector('#latest-heading').textContent;
    carousel.setAttribute('aria-label', title + (wide.matches ? (ru ? ': стрелки, перетаскивание или колёсико' : ': use arrows, drag or scroll') : ''));
    buttons[0].disabled = carousel.scrollLeft <= 2;
    buttons[1].disabled = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 2;


  }
  function turn(direction) {
    const cards = [...carousel.children];
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
  refreshCarousel = () => { finishDrag(); carousel.scrollLeft = 0; updateCarousel(); };
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
    const rules = JSON.parse(carousel.dataset.selection);
    const readingKey = `history-math:reading:${language}`;
    let readingPrevious = [];
    try {
      const saved = JSON.parse(sessionStorage.getItem(readingKey));
      if (Array.isArray(saved) && saved.every(url => typeof url === 'string')) readingPrevious = saved.slice(0, rules.card_count);
    } catch {}
    let pool = [];
    function rotateReading() {
      const groups = journalGroups(records, language, rules, {previous: readingPrevious});
      readingPrevious = groups.reading.map(record => record.url);
      try { sessionStorage.setItem(readingKey, JSON.stringify(readingPrevious)); } catch {}
      if (groups.reading.length) carousel.replaceChildren(...groups.reading.map(readingCard));
      refreshCarousel();
      pool = groups.archive;
    }
    rotateReading();
    const articlePicks = document.querySelector('#article-picks');
    const articlePool = articlePicks ? articleCandidates(records, language, articlePicks.dataset.excludeTags.split('|')) : [];
    const articleKey = `history-math:article-picks:${language}`;
    let articlePrevious = [];
    try {
      const saved = JSON.parse(sessionStorage.getItem(articleKey));
      if (Array.isArray(saved) && saved.every(url => typeof url === 'string')) articlePrevious = saved.slice(0, 3);
    } catch {}
    function rotateArticlePicks() {
      if (!articlePool.length) return;
      const picks = selection(articlePool, 3, articlePrevious);
      articlePrevious = picks.map(record => record.url);
      try { sessionStorage.setItem(articleKey, JSON.stringify(articlePrevious)); } catch {}
      articlePicks.replaceChildren(...picks.map(record => heroPick(record, {size: 64, description: false})));
    }
    rotateArticlePicks();
    const rubricPrevious = new Map();
    function rotateRubrics() {
      document.querySelectorAll('[data-rubric]').forEach(rubric => {
        const candidates = rubricArticles(records, language, rubric.dataset.rubricTags.split('|'));
        if (!candidates.length) return; // Keep the localized server-rendered empty state.
        const key = `history-math:rubric:${language}:${rubric.dataset.rubric}`;
        let previous = rubricPrevious.get(key) || [];
        try {
          const saved = JSON.parse(sessionStorage.getItem(key));
          if (Array.isArray(saved) && saved.every(url => typeof url === 'string')) previous = saved.slice(0, 1);
        } catch {}
        const [record] = selection(candidates, 1, previous);
        rubricPrevious.set(key, [record.url]);
        try { sessionStorage.setItem(key, JSON.stringify([record.url])); } catch {}
        const link = heroPick(record);
        rubric.querySelector('.hero-rubric-content').replaceChildren(link);
      });
    }
    rotateRubrics();
    // Measure every candidate in bounded batches; text length cannot predict wrapped height.
    function reserveArchiveSpace() {
      if (!pool.length || !archive.clientWidth) return;
      const probe = archive.cloneNode(false);
      probe.removeAttribute('id');
      probe.setAttribute('aria-hidden', 'true');
      probe.inert = true;
      probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${archive.clientWidth}px`;
      archive.after(probe);
      let height = 0;
      try {
        for (const batch of archiveMeasurementBatches(pool)) {
          // The first visible slot has more text width. Reserve the narrower ordinary-slot height
          // for every record, since rotation can put any article in any of the four positions.
          const sentinel = document.createElement('span');
          sentinel.hidden = true;
          const cards = batch.map(record => card(record, 'archive-card'));
          probe.replaceChildren(sentinel, ...cards);
          for (const node of cards) height = Math.max(height, node.getBoundingClientRect().height);
        }
      } finally { probe.remove(); }
      archive.style.setProperty('--archive-card-height', `${Math.ceil(height)}px`);
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
      if (!pool.length) return;
      const picked = selection(pool, 4, previous);
      previous = picked.map(record => record.url);
      try { localStorage.setItem(storageKey, JSON.stringify(previous)); } catch {}
      archive.replaceChildren(...picked.map(record => card(record, 'archive-card')));
      document.querySelector('#archive-status').textContent = (ru ? 'Подборка обновлена: ' : 'Selection updated: ') + picked.map(record => record.title).join(', ');
    }
    rotate();
    window.addEventListener('pageshow', event => {
      if (!event.persisted) return;
      rotateReading();
      rotateArticlePicks();
      rotateRubrics();
      reserveArchiveSpace();
      rotate();
    });
  }).catch(() => { document.querySelector('#archive-status').textContent = ru ? 'Показана исходная подборка.' : 'Showing the original selection.'; });
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
      status.textContent = searchPrompt;
      return;
    }
    status.textContent = ru ? 'Ищем…' : 'Searching…';
    try {
      const records = await loadIndex(Boolean(query));
      if (request !== requestNumber) return;
      if (activeTag) {
        activeTag = records.flatMap(record => record.tags).find(tag => topicKey(tag) === topicKey(activeTag)) || activeTag;
        topic.querySelector('strong').textContent = activeTag;
        const canonicalUrl = new URL(location.href);
        canonicalUrl.searchParams.set('tag', activeTag);
        history.replaceState(null, '', canonicalUrl);
      }
      const searchable = records.filter(record => !record.translation_notice);
      const matches = activeTag ? searchByTag(searchable, activeTag, language) : search(searchable, query, language);
      results.replaceChildren(...matches.map(record => card(record, 'search-result')));
      status.textContent = matches.length ? (ru ? `Найдено материалов: ${matches.length}` : `Articles found: ${matches.length}`) : (ru ? 'Ничего не найдено. Попробуйте другое слово или тему.' : 'No matches. Try another word or topic.');
    } catch {
      if (request !== requestNumber) return;
      status.textContent = ru ? 'Поиск временно недоступен. Откройте читальный зал.' : 'Search is temporarily unavailable. Open the reading room.';
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
  try {
    const type = document.querySelector('#type-filter');
    const tag = document.querySelector('#tag-filter');
    const pageSize = document.querySelector('#page-size');
    const list = document.querySelector('.catalog-list');
    const pagination = document.querySelector('.catalog-pagination');
    const pageLinks = pagination.querySelector('ol');
    // Static pages remain navigable without JavaScript; enhancement uses lightweight metadata.
    const cards = await loadIndex();
    const options = {types: [...type.options].map(option => option.value), tags: [...tag.options].map(option => option.value)};
    const catalogBase = list.dataset.catalogBase;
    const readState = () => {
      const url = new URL(location.href);
      if (!url.searchParams.has('page') && url.pathname !== catalogBase) url.searchParams.set('page', list.dataset.catalogPage);
      return catalogState(url.searchParams, options);
    };
    let state = readState();
    let restoring = false;

    function pageLink(page, text, label) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'catalog-page';
      link.textContent = text;
      const target = new URL(location.href);
      target.pathname = catalogBase;
      link.href = catalogUrl(target, {...state, page});
      link.setAttribute('aria-label', label);
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (state.page !== page) {
          state.page = page;
          render('push');
        }
        list.querySelector('h3 a')?.focus({preventScroll: true});
        list.scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
      });
      item.append(link);
      return item;
    }

    function render(history = 'replace') {
      const result = catalogPage(cards, state);
      state.page = result.page;
      type.value = state.type;
      tag.value = state.tag;
      pageSize.value = String(result.perPage);
      list.replaceChildren(...result.items.map(readingCard));
      document.querySelector('#catalog-count').textContent = ru ? `Материалов: ${result.total}` : `Articles: ${result.total}`;
      document.querySelector('#catalog-empty').hidden = result.total !== 0;
      document.querySelector('#catalog-range').textContent = ru ? `Показано ${result.start}–${result.end} из ${result.total}` : `Showing ${result.start}–${result.end} of ${result.total}`;
      pagination.hidden = result.pageCount <= 1;
      const links = [];
      if (result.page > 1) links.push(pageLink(result.page - 1, '←', pagination.dataset.previousLabel));
      for (const number of catalogPageNumbers(result.page, result.pageCount)) {
        if (number === 'ellipsis') {
          const item = document.createElement('li');
          const token = document.createElement('span');
          token.className = 'catalog-ellipsis';
          token.textContent = '…';
          token.setAttribute('aria-hidden', 'true');
          item.append(token);
          links.push(item);
        } else {
          const item = pageLink(number, String(number), `${pagination.dataset.pageLabel} ${number}`);
          if (number === result.page) item.firstChild.setAttribute('aria-current', 'page');
          links.push(item);
        }
      }
      if (result.page < result.pageCount) links.push(pageLink(result.page + 1, '→', pagination.dataset.nextLabel));
      pageLinks.replaceChildren(...links);
      const target = new URL(location.href);
      target.pathname = catalogBase;
      const url = catalogUrl(target, state);
      if (history === 'push') window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
    }

    function filter() {
      if (restoring) return;
      state = {type: type.value, tag: tag.value, perPage: Number(pageSize.value), page: 1};
      render('push');
    }
    type.addEventListener('change', filter);
    tag.addEventListener('change', filter);
    pageSize.addEventListener('change', filter);
    render();
    controls.hidden = false;
    enhanceSelect(type);
    enhanceSelect(tag);
    enhanceSelect(pageSize);
    window.addEventListener('popstate', () => {
      state = readState();
      render();
      restoring = true;
      for (const select of [type, tag, pageSize]) select.dispatchEvent(new Event('change', {bubbles: true}));
      restoring = false;
    });
  } catch {
    // Keep the server-rendered page and real pagination links when metadata cannot load.
  }
}
