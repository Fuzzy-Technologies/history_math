# Read-only corporate reference audit

Audited on 2026-10-01. Repository: `Fuzzy-Technologies/fuzzy-technologies.github.io`. Master tree/HEAD returned by GitHub: `9041d4ab4f9b59d28bad3d3f255988205e343b02`.

Read: `DEVELOPMENT_PROTOCOL.md`, `README.md`, `_config.yml`, `_layouts/default.html`, `_layouts/article.html`, `_layouts/articles.html`, `docs/ARTICLES.md`, `docs/LOCALIZATION.md`, `static/style.css`, `static/main.js`. The recursive tree contains no `.github` workflow files at this audited revision.

The reference uses Jekyll, Markdown/front matter, shared layouts, conditional math rendering, distinct preview/social/hero images and localized metadata/navigation. Those principles are useful here. Both projects route ordinary PRs directly into master after owner review. Unlike the corporate reference, history_math supports independent original article languages. The former integration branch was retired by [ADR 0002](adr/0002-master-only-workflow.md).

The reference's neon styles, animation effects, analytics/counters and unprefixed domain-root asset paths are not reused. This project uses base-path-aware filters, a warm light journal design, local math assets and no analytics. No code or setting in the corporate repository was modified.
