export const catalogPageSizes = Object.freeze([5, 10, 20, 50, 100]);

// Keep URL state small and restricted to the real filter options.
export function catalogState(params, {types = [], tags = []} = {}) {
  const positiveInteger = value => /^[1-9]\d*$/.test(value ?? '') && Number.isSafeInteger(Number(value)) ? Number(value) : 1;
  const rawPerPage = params.get('per_page');
  const perPage = /^[1-9]\d*$/.test(rawPerPage ?? '') ? Number(rawPerPage) : NaN;
  return {
    type: types.includes(params.get('type')) ? params.get('type') : '',
    tag: tags.includes(params.get('tag')) ? params.get('tag') : '',
    perPage: catalogPageSizes.includes(perPage) ? perPage : 10,
    page: positiveInteger(params.get('page'))
  };
}

export function catalogPage(items, state) {
  const perPage = catalogPageSizes.includes(state.perPage) ? state.perPage : 10;
  const matching = items.filter(item => (!state.type || item.type === state.type) && (!state.tag || item.tags.includes(state.tag)));
  const pageCount = Math.ceil(matching.length / perPage);
  const requested = Number.isSafeInteger(state.page) && state.page > 0 ? state.page : 1;
  const page = Math.min(requested, Math.max(1, pageCount));
  const offset = (page - 1) * perPage;
  return {items: matching.slice(offset, offset + perPage), total: matching.length, pageCount, page, perPage,
    start: matching.length ? offset + 1 : 0, end: Math.min(offset + perPage, matching.length)};
}

// At most nine tokens even when the journal contains thousands of pages.
export function catalogPageNumbers(page, pageCount) {
  if (!Number.isSafeInteger(pageCount) || pageCount < 1) return [];
  const current = Math.min(Math.max(1, page), pageCount);
  const pages = [...new Set([1, pageCount, current - 1, current, current + 1])]
    .filter(value => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const tokens = [];
  for (const value of pages) {
    const previous = tokens.at(-1);
    if (typeof previous === 'number' && value - previous === 2) tokens.push(previous + 1);
    else if (typeof previous === 'number' && value - previous > 2) tokens.push('ellipsis');
    tokens.push(value);
  }
  return tokens;
}

export function catalogUrl(current, state) {
  const url = new URL(current);
  for (const [key, value] of [['type', state.type], ['tag', state.tag],
    ['page', state.page > 1 ? String(state.page) : ''], ['per_page', state.perPage !== 10 ? String(state.perPage) : '']]) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  return url;
}
