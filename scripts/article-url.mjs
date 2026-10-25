// Mirror HistoryMath.article_url for source reports and browser gate destinations.
export function articleUrl(path, language) {
  const match = typeof path === 'string' && /^\/(ru\/)?(?:articles|publications)\/([a-z0-9-]+)\/$/.exec(path);
  if (!match) return path;
  const slug = match[2].replace(/^(hm-(?:tt-)?[0-9a-f]{12})(?:-ru|-en)?$/, `$1-${language}`);
  return `/${match[1] || ''}publications/${slug}/`;
}
