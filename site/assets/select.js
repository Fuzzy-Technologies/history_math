const {normalize} = await import('./core.js' + new URL(import.meta.url).search);

let closeCurrent;

export function enhanceSelect(select) {
  const label = select.labels[0];
  const wrapper = document.createElement('div');
  wrapper.className = 'choice';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = select.id + '-button';
  trigger.className = 'choice-trigger';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const value = document.createElement('span');
  value.id = select.id + '-value';
  trigger.setAttribute('aria-labelledby', label.id + ' ' + value.id);
  trigger.append(value);
  const list = document.createElement('div');
  list.id = select.id + '-list';
  list.className = 'choice-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-labelledby', label.id);
  list.setAttribute('aria-hidden', 'true');
  list.inert = true;
  trigger.setAttribute('aria-controls', list.id);
  const options = [...select.options].map((option, index) => {
    const item = document.createElement('div');
    item.id = select.id + '-option-' + index;
    item.className = 'choice-option';
    item.setAttribute('role', 'option');
    item.textContent = option.text;
    list.append(item);
    item.addEventListener('pointerdown', event => event.preventDefault());
    item.addEventListener('click', () => { activate(index); close(true); trigger.focus({preventScroll: true}); });
    return item;
  });
  wrapper.append(trigger, list);
  select.after(wrapper);
  label.htmlFor = trigger.id;
  select.hidden = true;
  let open = false;
  let active = select.selectedIndex;
  let typed = '';
  let lastTyped = 0;

  function activate(index) {
    active = Math.min(options.length - 1, Math.max(0, index));
    options.forEach((option, index) => {
      option.classList.toggle('is-active', open && index === active);
      option.setAttribute('aria-selected', String(index === (open ? active : select.selectedIndex)));
    });
    if (!open) return;
    trigger.setAttribute('aria-activedescendant', options[active].id);
    const option = options[active];
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }
  function sync() {
    value.textContent = select.selectedOptions[0].text;
    activate(select.selectedIndex);
    options.forEach((option, index) => option.classList.toggle('is-chosen', index === select.selectedIndex));
  }
  function close(commit = false) {
    if (!open) return;
    open = false;
    if (commit && select.selectedIndex !== active) {
      select.selectedIndex = active;
      select.dispatchEvent(new Event('change', {bubbles: true}));
    }
    wrapper.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    list.setAttribute('aria-hidden', 'true');
    list.inert = true;
    sync();
    if (closeCurrent === close) closeCurrent = undefined;
  }
  function show() {
    if (open) return;
    closeCurrent?.(true);
    closeCurrent = close;
    const bounds = trigger.getBoundingClientRect();
    const below = innerHeight - bounds.bottom - 16;
    const above = bounds.top - 16;
    const up = below < 220 && above > below;
    wrapper.classList.toggle('opens-up', up);
    list.style.maxHeight = Math.max(44, Math.min(320, up ? above : below)) + 'px';
    open = true;
    list.inert = false;
    list.setAttribute('aria-hidden', 'false');
    wrapper.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    activate(select.selectedIndex);
  }
  trigger.addEventListener('click', () => { if (open) close(); else show(); });
  trigger.addEventListener('keydown', event => {
    if (event.key === 'Tab') { close(true); return; }
    if (event.key === 'Escape') {
      if (open) { event.preventDefault(); close(); }
      return;
    }
    if (event.ctrlKey || event.metaKey) return;
    const wasOpen = open;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (wasOpen && ['Enter', ' '].includes(event.key)) { close(true); return; }
      if (wasOpen && event.altKey && event.key === 'ArrowUp') { close(true); return; }
      show();
      if (event.key === 'Home' || (!wasOpen && event.key === 'ArrowUp')) activate(0);
      else if (event.key === 'End') activate(options.length - 1);
      else if (wasOpen && !event.altKey && event.key === 'ArrowDown') activate(active + 1);
      else if (wasOpen && event.key === 'ArrowUp') activate(active - 1);
      else if (event.key === 'PageDown') activate(active + 10);
      else if (event.key === 'PageUp') activate(active - 10);
    } else if (!event.altKey && event.key.length === 1) {
      event.preventDefault();
      show();
      const now = Date.now();
      typed = now - lastTyped > 700 ? event.key : typed + event.key;
      lastTyped = now;
      const characters = [...normalize(typed)];
      const prefix = characters.every(value => value === characters[0]) ? characters[0] : normalize(typed);
      const start = prefix.length === 1 ? active + 1 : active;
      for (let offset = 0; offset < options.length; offset += 1) {
        const index = (start + offset) % options.length;
        if (normalize(options[index].textContent).startsWith(prefix)) { activate(index); break; }
      }
    }
  });
  wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) close(true); });
  document.addEventListener('pointerdown', event => { if (!wrapper.contains(event.target)) close(true); });
  window.addEventListener('resize', () => close());
  select.addEventListener('change', sync);
  sync();
}
