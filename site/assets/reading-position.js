export function rememberReadingPosition() {
  const body = document.querySelector('.article-body');
  const notice = document.querySelector('.reading-resume');
  if (!body || !notice) return;

  const storageKey = 'history-math:reading:' + location.pathname;
  const lifetime = 90 * 24 * 60 * 60 * 1000;
  const occurrences = new Map();
  const blocks = [...body.children].filter(node => node.matches('h2, h3, p, blockquote, ul, ol, table, .math-source'));
  const anchors = blocks.map(node => {
    const content = node.cloneNode(true);
    for (const source of [content, ...content.querySelectorAll('.math-source')]) {
      if (source.matches('.math-source')) source.textContent = source.dataset.tex;
    }
    let hash = 2166136261;
    for (const character of node.tagName + ':' + content.textContent.replace(/\s+/g, ' ').trim()) {
      hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0;
    }
    const count = occurrences.get(hash) || 0;
    occurrences.set(hash, count + 1);
    return {node, key: hash.toString(16) + ':' + count};
  });
  if (!anchors.length) return;

  let saved;
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    if (value?.version === 1 && typeof value.anchor === 'string' &&
        Number.isFinite(value.offset) && value.offset >= 0 && value.offset <= 1 &&
        Number.isFinite(value.updated) && value.updated <= Date.now() && Date.now() - value.updated < lifetime) saved = value;
  } catch {}

  let ready = false;
  let interrupted = false;
  let dirty = false;
  let saveTimer;
  let noticeTimer;
  function clearPosition() {
    try { localStorage.removeItem(storageKey); } catch {}
  }
  function savePosition() {
    clearTimeout(saveTimer);
    if (!ready || !dirty || document.documentElement.classList.contains('viewer-open')) return;
    dirty = false;
    const first = anchors[0].node.getBoundingClientRect();
    const end = document.querySelector('.article-end')?.getBoundingClientRect();
    if (first.top > 24 || (end && end.top < innerHeight * 0.6)) {
      clearPosition();
      return;
    }
    const anchor = [...anchors].reverse().find(item => item.node.getBoundingClientRect().top <= 24) || anchors[0];
    const bounds = anchor.node.getBoundingClientRect();
    const offset = Math.min(1, Math.max(0, (24 - bounds.top) / Math.max(1, bounds.height)));
    try { localStorage.setItem(storageKey, JSON.stringify({version: 1, anchor: anchor.key, offset, updated: Date.now()})); } catch {}
  }
  const interrupt = () => { if (!ready) interrupted = true; };
  for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown']) window.addEventListener(event, interrupt, {passive: true});
  window.addEventListener('scroll', () => {
    if (!ready) return;
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(savePosition, 500);
  }, {passive: true});
  window.addEventListener('pagehide', savePosition);
  document.addEventListener('visibilitychange', () => { if (document.hidden) savePosition(); });

  function hideNotice() {
    clearTimeout(noticeTimer);
    notice.hidden = true;
  }
  notice.querySelector('[data-reading-dismiss]').addEventListener('click', hideNotice);
  notice.querySelector('[data-reading-start]').addEventListener('click', () => {
    hideNotice();
    clearPosition();
    dirty = false;
    window.scrollTo({top: 0, behavior: 'instant'});
    document.querySelector('.article-heading h1').focus({preventScroll: true});
  });
  async function restorePosition() {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const nativeReturn = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    const anchor = saved && anchors.find(item => item.key === saved.anchor);
    if (anchor && !location.hash && !nativeReturn && !interrupted) {
      const bounds = anchor.node.getBoundingClientRect();
      window.scrollTo({top: scrollY + bounds.top + bounds.height * saved.offset - 24, behavior: 'instant'});
      notice.hidden = false;
      noticeTimer = setTimeout(() => { if (!notice.contains(document.activeElement)) hideNotice(); }, 12000);
    }
    ready = true;
    for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown']) window.removeEventListener(event, interrupt);
  }
  if (document.readyState === 'complete') restorePosition();
  else window.addEventListener('load', restorePosition, {once: true});
}
