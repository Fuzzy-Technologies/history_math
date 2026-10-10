// Retain shared section links and query parameters without adding a history entry.
const target = document.querySelector('[data-article-redirect]');
if (target) window.location.replace(target.href + window.location.search + window.location.hash);
