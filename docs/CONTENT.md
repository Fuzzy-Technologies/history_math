# Public content and export contract

For archival publication packages, [ADR 0001](adr/0001-archive-article-pilot.md) and [the preparation procedure](ARTICLE_PREPARATION.md) define the implemented v1 contract. This repository owns the canonical schema in `schemas/article-v1.schema.json`; the source gate checks its integrity lock, and both filled templates use that schema. FELab metadata and NAS source articles/images are read only. The fields below describe the retained legacy demo contract. Real archival packages additionally use `schema_version`, `article_id`, `authors`, `rights_basis` and structured `figures`. Draft v1 packages have no website placement date. Opt-in review artifacts do not change the production draft gate.

## Add an article

Copy `templates/article.md` to `site/_articles/<stable-slug>.<lang>.md`. One Markdown file is one article/language version. Edit the metadata and write prose with H2 headings where sections are useful. The common site header, footer and article structure come from shared layouts. Keep confidential drafts on NAS; `status: draft` excludes a file from the generated site but does not make a public Git file private.

Set `status: published` only after editorial approval; use `demo` for deliberately public prototype examples. Only these two statuses are emitted. The post-read gate runs before rendering and discovery, so `draft`, missing and unrecognized statuses have no page, public index or sitemap entry. Development documentation and templates live outside `site/` and are never copied.

## Front matter

The canonical contract is `schemas/article-v1.schema.json`. Legacy `demo-*.md` files exist only under `tests/fixtures/articles/` for isolated regression builds; the production collection contains real v1 articles only.

| Field                                    | Contract                                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version`                         | Required, `1`.                                                                                                                            |
| `article_id`, `source_work_id`           | Required stable public IDs; never private paths.                                                                                          |
| `layout`, `title`, `description`         | Required article layout, localized title and brief summary.                                                                               |
| `authors`, `author`                      | Required authors array and its comma-separated display value.                                                                             |
| `lang`, `translation_key`, `permalink`   | Required language, stable work key and language-specific URL.                                                                             |
| `type`, `tags`, `math`                   | Required rubric, topic array and formula boolean. Biographies use `series: Персоналии` and the `Персоналии` tag, alongside existing tags. |
| `status`                                 | `draft` during preparation; `published` requires recorded approval. `demo` labels examples.                                               |
| `date`                                   | Website placement date; required only for published/demo pages. Omit on drafts.                                                           |
| `original_publication`                   | Optional known earlier outlet, date, URL or citation; distinct from website placement.                                                    |
| `rights_basis`                           | Required documented basis for placing the author text.                                                                                    |
| `preview_image`, `cover_image`           | Optional existing illustrations for cards and social previews. Include their provenance in `figures`.                                     |
| `hero_image`, `hero_alt`, `hero_caption` | Optional leading illustration; both text fields required when used.                                                                       |
| `figures`                                | Figure inventory: ID, local path, alternative text, caption, source and rights basis; verified links/licenses when known.                 |

## Markdown, formulas and media

Short notes may begin with ordinary prose; no placeholder heading is required. Real section headings start at H2 beneath the shared title. Use explicit anchors, footnotes, reference links and ordinary Markdown tables. Run `python3 tools/markdown_tables.py --write` after staging new Markdown files; CI checks alignment without editing files. The formatter is reused from 1337; see [reuse details](REUSE.md).

External links use descriptive words, such as a book title or original publication title, rather than a visible URL. Keep the original destination in the Markdown link or reference definition. Figure `source_url` and `license_url` remain metadata; the shared include displays named source and license links. Source and browser gates reject bare URLs and URL-labelled links in article prose, while literal code examples remain unchanged.

Use `$x_1^2+x_2^2=r^2$` inline and `$$...$$` on separate lines for display mathematics. Set `math: true`. The common hook protects formulas from Markdown and supplies them to pinned local KaTeX with trust disabled. Unsupported notation fails validation. Escape literal dollar signs as `\$`.

Keep selected images in `site/assets/images/<article-id>/`. Record each figure in front matter and insert `{% include article-figure.html id="fig-1" %}`. The shared template keeps native dimensions and proportionally reduces images above 960 × 720 pixels or the available width. Small images stay small; the existing image viewer opens on click. Tables retain their row/column structure and scroll inside a keyboard-accessible region on narrow screens.

## Editorial decision

`reviews/<article-id>.json` is the only editable question list. It contains `review_version: 1`, the article ID, `questions` and `approval`; reconciliation notes may remain alongside them. Each question has a stable `id`, `question`, `blocking` boolean and `state` (`open`, `resolved`, `accepted`). Closed questions require a written `resolution`. PR descriptions show only open questions; do not duplicate the list in article metadata or pilot documentation.

Keep `approval: {"status": "pending"}` until a human editor approves. To publish, set the intended publication metadata, resolve blocking questions, and calculate the public package digest with `node scripts/article-review.mjs site/_articles/<id>.<lang>.md`. Record `status: approved`, the actual `reviewed_by`, ISO `date`, and `package_sha256` in `approval`. Node checks and Jekyll require approval matching the current Markdown and selected image bytes. Changing either invalidates the decision. This records the editor's decision; it does not grant automatic merge or publication permission.

## Discovery and archive behavior

The build generates compact `assets/search-ru.json` and `assets/search-en.json` indexes: title, description, tags, type, language, publication date, URL, plain search text, public status and optional preview image. Interactive discovery uses the separate indexes described below and needs no keys or GitHub API. The article-only EN index remains empty until a real English translation is approved. Russian normalization handles case and Cyrillic Yo/Ye equivalence.

Fresh materials remain stable and chronological. Featured and archive selections each show up to four distinct records from their exclusive pools; see the exact split below. Reserved archive card heights prevent layout shifts during rotation.

## Archive reading and publication boundary

Read existing FELab metadata and full articles and images from their corresponding NAS directories, then prepare and review the publication derivative in this site repository. Do not modify FELab or NAS. Omit private research, local SQLite/FTS, sessions, locks, logs, NAS paths, full internal metadata and large source media. Safe public IDs preserve provenance without leaking internal locations. Keep private reconciliation evidence in ignored local files here. Editorial review precedes approved website publication; draft Git copies are explicitly authorized review material. There is no live NAS synchronization or second editable derivative.

Legacy instructions to publish in comments are operational markers, not a reason to discard their contents. Preserve useful content in context, in notes or in an afterword; reconcile all blocks against the current article and existing editorial decisions. Follow the [complete comment-block procedure](ARTICLE_PREPARATION.md#legacy-comment-blocks) and retain a private disposition for each block, including empty or already incorporated ones.

Figure `caption` may be an empty string for a decorative illustration. `source`, `rights_basis` and meaningful `alt` remain required provenance. Optional `credit` overrides the visible source text, including an empty string to omit internal editorial notes; verified source and license links remain visible. Captions are heading-like, without final periods. Inline formula punctuation belongs to ordinary prose outside dollar delimiters; the renderer keeps adjacent punctuation attached without including it in the TeX source.

Raster additions or replacements also require `npm run build:images` (see `docs/DESIGN.md`). Commit the generated reading derivatives and image manifest together with the untouched originals.

## Homepage discovery

In each edition, sort published articles and eligible translation notices by website publication date descending, with URL descending as a stable tie-breaker. The newest ten appear only in the new-materials carousel. From the remainder, take the freshest quarter (round up) for the four small featured links; the older three quarters supply four text-only archive cards. Draw without replacement on page load and offer another archive selection. When more than four candidates exist, avoid repeating the previous complete selection if local storage is available. Smaller pools show only their available records. With ten or fewer records, both older-content sections remain visible with localized empty-state text. Full browsing belongs in the reading room; the carousel has no archive pagination.

`assets/discovery-<lang>.json` powers homepage selections and interactive search. It adds English translation-notice summaries with `translation_notice: true` to eligible article records; each notice is visibly marked as a Russian original awaiting translation. The existing `search-<lang>.json` indexes remain article-only. Drafts and review-only notices never enter either public discovery set. Demos remain test-only and are excluded from homepage pools. The same shared templates provide Home, Reading room, Showcase and Search in both locales.
