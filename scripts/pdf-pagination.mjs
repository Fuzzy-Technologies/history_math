// Deterministic A4 print planning. Mutations apply to the private print DOM only.
export const PRINT_LAYOUT = Object.freeze({pageWidthMm: 172, pageHeightMm: 260,
  minimumImageScale: 0.8, minimumWhitespaceMm: 8,
  maximumPasses: 48});

export function figureFitPlan(overflow, images, {minimumScale = PRINT_LAYOUT.minimumImageScale} = {}) {
  if (!Number.isFinite(overflow) || overflow <= 0 || !Array.isArray(images) || !images.length ||
      !Number.isFinite(minimumScale) || minimumScale < PRINT_LAYOUT.minimumImageScale || minimumScale > 1) return null;
  if (!images.every(image => Number.isFinite(image.height) && image.height > 0 && Number.isFinite(image.width) && image.width > 0 &&
    (image.minimumHeight == null || Number.isFinite(image.minimumHeight)))) return null;
  const limits = images.map(image => Number.isFinite(image.height) && image.height > 0 && Number.isFinite(image.width) && image.width > 0 ?
    Math.max(0, Math.min(image.height * (1 - minimumScale),
      image.minimumHeight == null ? Infinity : image.height - image.minimumHeight)) : 0);
  const capacity = limits.reduce((sum, limit) => sum + limit, 0);
  const required = overflow + 1;
  if (capacity < required) return null;
  return images.map((image, index) => {
    const reduction = capacity ? limits[index] * required / capacity : 0;
    const scale = 1 - reduction / image.height;
    return {...image, width: image.width * scale, height: image.height * scale, scale, reduction};
  });
}

export function layoutPrintBlocks(blocks, pageHeight, initialOffset = 0) {
  if (!(pageHeight > 0) || !Number.isFinite(pageHeight) || initialOffset < 0 || !Number.isFinite(initialOffset)) throw new Error('Invalid print geometry');
  let cursor = initialOffset;
  const placements = [];
  // Physical millimetres become fractional CSS pixels. A boundary such as
  // 3 * pageHeight can divide back to 2.9999999999999996, hiding a real break.
  const pageAt = value => Math.floor(value / pageHeight + 1e-9);
  const remainder = value => Math.min(pageHeight, Math.max(0, pageHeight - (value - pageAt(value) * pageHeight)));
  for (const block of blocks) {
    if (!Number.isFinite(block.height) || block.height < 0 || !Number.isFinite(block.gap ?? 0)) throw new Error('Invalid print block');
    cursor += Math.max(0, block.gap ?? 0);
    if (block.breakBefore && remainder(cursor) < pageHeight - 0.5) cursor = (pageAt(cursor) + 1) * pageHeight;
    const before = cursor, originPage = pageAt(cursor), available = remainder(cursor);
    const keep = Math.max(0, block.keepNextHeight ?? 0);
    if (keep > 0 && block.height + keep <= pageHeight && block.height + keep > available + 0.5) cursor = (originPage + 1) * pageHeight;
    if (block.kind === 'text' && Number.isInteger(block.lines) && block.lines > 1 && block.lines < 100000 && block.height <= pageHeight * 20) {
      const lineHeight = block.height / block.lines;
      let lines = block.lines;
      let iterations = 0;
      while (lines > 0 && iterations++ <= block.lines + 2) {
        let fit = Math.floor((remainder(cursor) + 0.5) / lineHeight);
        if (fit >= lines) { cursor += lines * lineHeight; break; }
        const orphans = Math.min(3, lines), widows = Math.min(3, lines);
        if (fit < orphans) fit = 0;
        else if (lines - fit < widows) fit = Math.max(0, lines - widows);
        if (fit === 0 && remainder(cursor) >= pageHeight - 0.5) fit = Math.min(lines, Math.floor(pageHeight / lineHeight));
        if (fit === 0) {
          if (lineHeight > pageHeight) { cursor += lines * lineHeight; break; }
          cursor = (pageAt(cursor) + 1) * pageHeight;
        } else {
          cursor += fit * lineHeight;
          lines -= fit;
          cursor = (pageAt(cursor - 0.01) + 1) * pageHeight;
        }
      }
    } else {
      if (block.height <= pageHeight && block.height > remainder(cursor) + 0.5) cursor = (pageAt(cursor) + 1) * pageHeight;
      const start = cursor;
      cursor += block.height;
      placements.push({...block, originPage, page: pageAt(start), start, end: cursor,
        whitespace: pageAt(start) > originPage ? available : 0,
        overflow: Math.max(0, block.height - available), oversized: block.height > pageHeight});
      continue;
    }
    placements.push({...block, originPage, page: pageAt(before), start: before, end: cursor,
      whitespace: 0, overflow: 0, oversized: false});
  }
  return {placements, height: cursor, pages: Math.max(1, Math.ceil(cursor / pageHeight - 1e-9))};
}

export function paginatePrintDocument(options = PRINT_LAYOUT) {
  const settings = {...PRINT_LAYOUT, ...options};
  const body = document.querySelector('.article-body');
  if (!body) throw new Error('Missing print body');
  const mm = 96 / 25.4, pageHeight = settings.pageHeightMm * mm;
  if (!Number.isFinite(settings.pageWidthMm) || settings.pageWidthMm <= 0 || !Number.isFinite(pageHeight) || pageHeight <= 0 ||
    !Number.isInteger(settings.maximumPasses) || settings.maximumPasses < 1 || settings.maximumPasses > 100 ||
    !Number.isFinite(settings.minimumImageScale) || settings.minimumImageScale < PRINT_LAYOUT.minimumImageScale || settings.minimumImageScale > 1 ||
    !Number.isFinite(settings.minimumWhitespaceMm) || settings.minimumWhitespaceMm < 0) throw new Error('Invalid print layout settings');
  document.documentElement.style.width = settings.pageWidthMm + 'mm';
  document.body.style.width = settings.pageWidthMm + 'mm';
  const report = {shrunk: [], moved: [], naturalBreaks: [], oversized: [], passes: 0};
  const originals = new WeakMap(), attempted = new WeakSet();
  const figures = [...body.querySelectorAll(':scope > figure')];
  figures.forEach((figure, index) => { figure.dataset.pdfFigure = figure.id || 'figure-' + (index + 1); });
  const isDisplayFormula = node => node?.matches('.math-source[data-display="true"], p:has(.math-source[data-display="true"])');
  for (const formula of [...body.children]) {
    if (formula.parentElement !== body || !isDisplayFormula(formula)) continue;
    const paragraph = formula.previousElementSibling;
    if (paragraph?.tagName !== 'P' || isDisplayFormula(paragraph)) continue;
    // Consecutive equations often share one introduction. Keep the whole run
    // together when it fits, rather than stranding its last equation alone.
    let formulas = [formula], next = formula.nextElementSibling;
    while (isDisplayFormula(next)) { formulas.push(next); next = next.nextElementSibling; }
    if (formulas.at(-1).getBoundingClientRect().bottom - paragraph.getBoundingClientRect().top > pageHeight) formulas = [formula];
    const combined = formulas.at(-1).getBoundingClientRect().bottom - paragraph.getBoundingClientRect().top;
    if (combined > pageHeight) { paragraph.classList.add('pdf-keep-with-next'); formula.classList.add('pdf-keep-with-previous'); continue; }
    const pair = document.createElement('div'); pair.className = 'pdf-math-pair';
    paragraph.before(pair); pair.append(paragraph, ...formulas);
    // A flow-root contains outer margins that previously collapsed. Measure the
    // actual wrapper too, or a near-full-page introduction becomes oversized.
    if (pair.getBoundingClientRect().height > pageHeight) {
      pair.replaceWith(paragraph, ...formulas);
      paragraph.classList.add('pdf-keep-with-next'); formula.classList.add('pdf-keep-with-previous');
    }
  }
  function lineCount(node) {
    const lineHeight = parseFloat(getComputedStyle(node).lineHeight);
    return Number.isFinite(lineHeight) && lineHeight > 0 ? Math.max(1, Math.round(node.getBoundingClientRect().height / lineHeight)) : 1;
  }
  // Chromium can relax widows at nested fragmentation boundaries. Keep short
  // paragraphs intact; longer prose still uses the ordinary widows/orphans rule.
  for (const paragraph of body.querySelectorAll(':scope > p')) {
    if (!paragraph.querySelector('img, .math-source[data-display="true"]') && lineCount(paragraph) <= 6 &&
        paragraph.getBoundingClientRect().height <= pageHeight) paragraph.classList.add('pdf-short-paragraph');
  }
  function measure() {
    let previousBottom = body.getBoundingClientRect().top;
    const nodes = [...body.children].filter(node => getComputedStyle(node).display !== 'none');
    const blocks = nodes.map((node, index) => {
      const rect = node.getBoundingClientRect(), gap = Math.max(0, rect.top - previousBottom);
      previousBottom = rect.bottom;
      const text = node.matches('p:not(.pdf-short-paragraph)') && !node.querySelector('img, .math-source[data-display="true"]');
      const next = nodes[index + 1];
      const keepNextHeight = /^H[1-6]$/.test(node.tagName) && next ? Math.min(next.getBoundingClientRect().height, next.matches('p') ? parseFloat(getComputedStyle(next).lineHeight) * 3 : pageHeight) : 0;
      return {node, id: node.dataset.pdfFigure || 'block-' + index, kind: text ? 'text' : node.tagName === 'FIGURE' ? 'figure' : 'atomic',
        height: rect.height, gap, lines: text ? lineCount(node) : 0, keepNextHeight,
        breakBefore: node.classList.contains('pdf-page-break')};
    });
    return layoutPrintBlocks(blocks, pageHeight, body.getBoundingClientRect().top);
  }
  function remember(img) {
    if (!originals.has(img)) { const rect = img.getBoundingClientRect(); originals.set(img, {width: rect.width, height: rect.height, styleWidth: img.style.width, styleHeight: img.style.height}); }
    return originals.get(img);
  }
  function restore(images, snapshot) { images.forEach((img, index) => { img.style.width = snapshot[index].width; img.style.height = snapshot[index].height; }); }
  const budget = Math.min(settings.maximumPasses, figures.length * 2 + 1);
  for (let pass = 0; pass < budget; pass++) {
    report.passes++;
    const layout = measure();
    const problem = layout.placements.find(block => block.kind === 'figure' && !attempted.has(block.node) && !block.breakBefore &&
      (block.oversized || block.whitespace >= settings.minimumWhitespaceMm * mm));
    if (!problem) break;
    const figure = problem.node; attempted.add(figure);
    if (problem.oversized) { report.oversized.push(problem.id); continue; }
    const pageFigures = layout.placements.filter(block => block.kind === 'figure' &&
      (block.page === problem.originPage || block.node === figure));
    const images = pageFigures.flatMap(block => [...block.node.querySelectorAll('img')]);
    images.forEach(remember);
    const stylesBefore = images.map(img => ({width: img.style.width, height: img.style.height}));
    const fit = figureFitPlan(problem.overflow, images.map((img, index) => {
      const original = remember(img), rect = img.getBoundingClientRect();
      return {index, width: rect.width, height: rect.height,
        minimumHeight: original.height * settings.minimumImageScale};
    }),
      {minimumScale: settings.minimumImageScale});
    if (fit) {
      fit.forEach(plan => { const img = images[plan.index]; img.style.width = plan.width + 'px'; img.style.height = plan.height + 'px'; });
      const after = measure().placements.find(block => block.node === figure);
      if (after.page <= problem.originPage) {
        report.shrunk.push({id: problem.id, images: fit.map(plan => ({figure: images[plan.index].closest('figure').dataset.pdfFigure, reductionMm: plan.reduction / mm, scale: plan.scale}))});
        continue;
      }
      restore(images, stylesBefore);
    }
    const originalNext = figure.nextSibling, parent = figure.parentNode;
    let moved = false, previous = figure.previousElementSibling;
    for (let paragraphs = 1; paragraphs <= 2 && previous?.tagName === 'P' && !previous.querySelector('img, .math-source[data-display="true"]'); paragraphs++) {
      const candidate = previous, earlier = candidate.previousElementSibling;
      candidate.before(figure);
      const after = measure().placements.find(block => block.node === figure);
      if (after.page <= problem.originPage) { report.moved.push({id: problem.id, paragraphs}); moved = true; break; }
      previous = earlier;
    }
    if (!moved) {
      parent.insertBefore(figure, originalNext);
      // The unfragmented measurements only approximate Chromium's pagination:
      // page-edge margins and paragraph fragments can leave more room in print.
      // Keep the original order and let break-inside: avoid place the complete
      // figure naturally instead of turning an estimate into a forced break.
      report.naturalBreaks.push(problem.id);
    }
  }
  report.estimatedPages = measure().pages;
  return report;
}

if (typeof window !== 'undefined') window.HistoryMathPdfPagination = paginatePrintDocument;

