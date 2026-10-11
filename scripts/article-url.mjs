// Mirror HistoryMath.article_url for source reports and browser gate destinations.
export function articleUrl(path, language) {
  return typeof path === 'string'
    ? path.replace(/\/(hm-(?:tt-)?[0-9a-f]{12})(?:-ru|-en)?\/$/, `/$1-${language}/`)
    : path;
}
