export function accessDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return value.split('-').reverse().join('.');
}

if (typeof document !== 'undefined') {
  for (const details of document.querySelectorAll('.article-details')) {
    const input = details.querySelector('[data-citation-date]');
    const access = details.querySelector('[data-citation-access]');
    const button = details.querySelector('[data-copy-citation]');
    const status = details.querySelector('.citation-copy-status');
    const ru = document.documentElement.lang === 'ru';
    if (input && access) {
      const now = new Date();
      input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const update = () => {
        const value = accessDate(input.value);
        access.textContent = value || 'дд.мм.гггг';
        if (button) button.disabled = !value;
      };
      update();
      input.addEventListener('input', update);
    }
    if (button) {
      button.hidden = false;
      button.addEventListener('click', async () => {
        const citation = details.querySelector('[data-article-citation]');
        try {
          await navigator.clipboard.writeText(citation.textContent.replace(/\s+/g, ' ').trim());
          status.textContent = ru ? 'Скопировано.' : 'Copied.';
        } catch {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(citation);
          selection.removeAllRanges(); selection.addRange(range);
          status.textContent = ru ? 'Текст выделен. Нажмите Ctrl+C или ⌘C.' : 'Text selected. Press Ctrl+C or ⌘C.';
        }
      });
    }
  }
}
