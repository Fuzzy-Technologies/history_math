'use strict';
document.querySelectorAll('.math-source').forEach(node => {
  try {
    window.katex.render(node.dataset.tex, node, {displayMode: node.dataset.display === 'true', throwOnError: true, trust: false});
    node.dataset.rendered = 'true';
  } catch (error) {
    node.classList.add('math-error');
    console.error('Formula rendering failed', error.message);
  }
});
