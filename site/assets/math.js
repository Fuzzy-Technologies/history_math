'use strict';
document.querySelectorAll('.math-source').forEach(node => {
  try {
    window.katex.render(node.dataset.tex, node, {displayMode: node.dataset.display === 'true', throwOnError: true, trust: false});
    node.dataset.rendered = 'true';
    if (node.dataset.display === 'true') {
      const display = node.querySelector('.katex-display');
      display.tabIndex = 0;
      display.setAttribute('role', 'region');
      display.setAttribute('aria-label', document.documentElement.lang === 'ru' ? 'Формула' : 'Formula');
    }
    if (node.dataset.display === 'false') {
      const next = node.nextSibling;
      const punctuation = next?.nodeType === Node.TEXT_NODE && next.textContent.match(/^[,.;:!?…]+/);
      if (punctuation) {
        const group = document.createElement('span');
        group.className = 'math-with-punctuation';
        node.before(group);
        group.append(node, document.createTextNode(punctuation[0]));
        next.textContent = next.textContent.slice(punctuation[0].length);
      }
    }
  } catch (error) {
    node.classList.add('math-error');
    console.error('Formula rendering failed', error.message);
  }
});
