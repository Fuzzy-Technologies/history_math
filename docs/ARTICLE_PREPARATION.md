# Preparing the next archival article

For the current contributor upload and automated storage flow, use
[Preparing an article PR](article-preparation.md) and
[external-original storage](adr/0005-external-article-originals.md).

For the owner-authorized 2026-10-11 Teletype migration, read the complete saved
Teletype article and its exact original image bytes instead of unavailable
NAS working files. Preserve the visible source publication date using the
exception in PUBLICATION_DATES.md. Prepare one Russian article and an explicit
English version per independent master-targeting draft PR. An explicit
translation placeholder may be used during preparation, but final review
requires the completed English adaptation. Store each new article's image inventory in
`site/_data/article_image_assets/<article-id>.json`, so independent article PRs
do not edit one shared inventory. Teletype image originals are unchanged;
lossless WebP reading variants retain the original download/zoom target. The
article preparation automation stores heavy originals outside Git, records
their immutable URLs and SHA-256 digests in the inventory, and keeps compact
reading assets in the article PR. Opening an external original uses a native
image request; downloading follows its release attachment link. Exact-byte
and checksum verification happens in trusted preparation, without relying on
cross-origin JavaScript reads in the browser. It removes originals from
unmerged branch history only after independently verifying public delivery and
the uploaded bytes. Existing local originals remain supported. Migrated PDFs
use the largest local reading variant so
their post-merge generation remains offline and reproducible.
Original animations retain animation in their reading variants. Editorial
approval remains pending until the owner reviews the current package.

Follow [ADR 0001](adr/0001-archive-article-pilot.md). Use existing FELab metadata and NAS originals only for reading. This repository owns the schema, templates, checks and prepared article versions for review. Do not create or modify FELab code, branches, targets, Works or cache entries.

See [check conditions and report interpretation](ARTICLE_CHECKS.md) for stable codes, blocking failures and unavailable checks. `scripts/article-pr.mjs` exports the deterministic `articlePrBody` helper used for pilot PR descriptions; it consumes the same local language dictionaries and an actual head's report.

1. Read the repository instructions and inspect the current site branch and user changes. Search approved digests and metadata in the existing FELab runtime through a read-only SQLite connection (`mode=ro`); do not rebuild or update it. Read the complete authoritative `long.txt`, relevant source documents and images from that article's existing NAS directories. Record source hashes, selection rationale and original publication records in ignored `test-results/private/`. Verify image provenance before copying selected publication assets. A digest is only a candidate finder.
2. Assign a stable public ID; the pilot uses `hm-` plus 12 hexadecimal characters from SHA-256 of the historical Work ID. Retain the original Work mapping in the private local evidence here. Preserve it if a folder is renamed. Choose the content `lang` independently from the report language.
3. Fill `templates/article.md`, or start from `templates/minimal-article.md`. Every schema `required` field is mandatory. Optional fields describe only known facts. Omit `date`: the build derives website publication from the first published state in `master` history. Keep earlier outlet/date in `original_publication`. See [automatic publication dates](PUBLICATION_DATES.md). Keep `status: draft` during preparation.
4. Preserve every author paragraph, note, formula, caption and bibliography item. Promote the original title to the shared H1 and its section titles to H2. Remove only documented operational instructions and move hashtags to metadata. An instruction to publish in comments is removed; its useful content is retained. Follow the [comment-block reconciliation rule](#legacy-comment-blocks) for every article and announcement. Record each source fragment's handling in the private coverage ledger. Do not silently alter a historical claim, OCR ambiguity or suspected equation. Record questions in `reviews/<id>.json`; document authorized editorial corrections and their sources there. Short notes need no artificial H2. Biographies require the `Персоналии` tag and series.
5. Use explicit `{#section-id}` anchors, `[text](#section-id)` references, kramdown footnotes and ordinary reference definitions. Every cited definition must exist. Link external destinations from descriptive words; do not display bare URLs or URL-labelled links in prose. Use dollar LaTeX; unsupported commands block the gate. Preserve equality and operation order when splitting a long equation. Preserve the original rows and columns when transcribing image tables. Stage new Markdown and run `python3 tools/markdown_tables.py --write`. Figure records supply `id`, `path`, `alt`, `caption`, `source`, `rights_basis`, plus a verified URL/license when known. Insert `{% include article-figure.html id="fig-1" %}`; put no shared HTML in the article.
6. Prepare `site/_articles/<id>.<lang>.md`, copy selected images to `site/assets/images/<id>/`, and write `reviews/<id>.json` with public reconciliation and editor questions. These files are the single editable site derivative. Keep private source paths, byte hashes, fragment mappings and review evidence in ignored `test-results/private/`, not on NAS or in FELab. Verify original source bytes before and after reading/conversion. Original source and image files are never overwritten. Do not maintain another editable article in a staging folder.
7. Create `feature/article-<id>-ru` for Russian reports, `-en` for English, or omit the suffix for English fallback. Start each independent article branch from current `master` and target `master`. Make review corrections directly in that article's site branch. Do not write them back to the source archive or FELab.
8. Push the prepared branch and use GitHub CI for source contracts and regression tests. `Article package` runs `node scripts/check-articles.mjs --source-only`; its `source` profile can pass without claiming a site build or browser result. Feature CI installs no browser and creates no site or PDF. A missing source tool or failed required source check blocks technical success.
9. Review formulas, table cells, caption/source relations and bibliography against originals. Update private evidence with exactly what was compared or left to the editor. Keep questions explicit and editorial approval pending. The owner handles visual review; agents do not build or browse the site during article preparation.
10. Commit the public Markdown, its selected assets and `reviews/<id>.json` only. Push to site origin and open a PR into `master`. Add `Tim55667757` and `documentation` without replacing existing metadata, then verify both. Use one or two plain sentences about the change, only open editorial questions, and a CI report link. Keep operational details in the report, not the PR body. The terminal branch suffix controls automatically generated descriptions as well as reports.
11. Verify the actual head SHA's `Article package` run and its JSON/Markdown source report. A single bot comment links the current run. Successful source checks still await editorial review. After a new PR discussion comment or submitted overall review with main body `Approved` from `Tim55667757`, the agent records the real approval, finalizes publication metadata without changing reviewed content, verifies current-head CI and merges into `master` on the owner's behalf. Follow [the delegated approval contract](../DEVELOPMENT_PROTOCOL.md#change-process), including source revision and comment evidence. The guarded master workflow then builds the site and PDFs and checks rendered output; the agent verifies that result. No separate promotion PR or additional owner confirmation is needed.

To prepare article six, repeat these steps using the site-owned schema and templates. FELab and NAS access remains read-only throughout.

CI keeps only the small `article-report-<head-sha>` JSON/Markdown artifact for 14 days; the same human report appears in the job summary. PR and feature checks validate source files and run regression tests without generating a site, screenshots or PDFs. Master publication generates the deployed site and PDF editions after owner approval, with reusable PDF cache entries saved only from validated master builds.

Before publication, record the real human approval as described in [the content contract](CONTENT.md#editorial-decision). It covers current public text and image bytes and requires closed blocking questions.

## Legacy comment blocks

Before supplementing an existing article, fetch its current PR branch, read its editorial changes and review record, and preserve that version. Read the complete article, announcement and related working documents. Find every comment-placement instruction, including singular/plural forms, case differences and second/third-comment variants such as “Опубликовать в комментариях”, “ОПУБЛИКОВАТЬ В КОММЕНТАРИИ” and “Опубликовать вторым/третьим комментарием”. Do not stop at the first match or treat a digest as source text.

Remove the placement instruction itself. Retain the useful prose, formulas, explanations, images, links and bibliography belonging to its block. Put a local explanation beside the relevant passage; put supplementary material after the article under “Примечания”; use “Послесловие” for an independent closing section. Choose by meaning rather than imposing the same heading on every article. Existing tags, native image sizing, shared figure markup and Markdown table rules still apply.

Compare every block with the current article before adding text. Map already covered content to its existing location and add only missing information. Do not restore assertions rejected by earlier editorial corrections, including claims found again in an announcement or research document. Keep ambiguities in the canonical `reviews/<id>.json` question list and leave editorial approval pending.

In ignored local evidence, record every marker's source hash and line range, its complete block, individual paragraph/formula/image/reference destinations, and the reason for any exclusion. Distinguish empty placeholders, already included content, newly restored content and material withheld because of an existing editorial correction. Map private attachment names to retained public bibliographic references or permitted figures; do not export private research files. A source with no markers also receives an explicit checked result. Public review records contain only publication-safe summaries. Recheck source hashes after the work and verify the current-commit GitHub source checks; rendering checks belong to owner-approved master publication.

## Topic labels and homepage rubrics

Use the canonical labels in `site/_data/topics.json` for new articles, including `History of Mathematics` and `Lives of Remarkable People`. Do not introduce case or underscore variants. Draft source checks warn about recognized variants. Existing approved source metadata stays unchanged: shared topic filters project canonical labels into article links, catalog options and discovery/search indexes. Legacy topic URLs remain valid through case-insensitive matching with underscores treated as spaces.

Homepage rubric membership is defined in `site/_data/home_rubrics.json`. The humor rubric includes jokes, anecdotes and quotations. The people rubric requires `Персоналии` (case-insensitive), or `People` in English; `ЖЗЛ` and `Lives of Remarkable People` alone do not qualify. Only published articles in the current language qualify; demos, drafts and translation notices do not. Keep rubrics visible with a localized empty state until matching articles are published.

The homepage reading selection samples ten articles from the newest fifty in each language, then orders the chosen cards by descending publication date. `site/_data/reading_selection.json` defines the window, card count, soft three-card series limit and explicit glossary tag aliases. Use the optional `series` field consistently for a recurring series; broad topic tags never create a series limit. Glossary tags also identify that specific series even when legacy metadata has no `series`. The limit relaxes only when there are too few alternatives to fill ten cards. The archive excludes the current reading selection. A balanced deterministic fallback remains available without JavaScript.
