# Publication performance

## Article-only checks

`publication-plan.mjs` allows the light path only for article Markdown, images in a known article's directory (including generated previews), its review/image manifests and non-executable documentation. Shared illustrations, templates, styles, scripts, plugins, new pages/sections, dependencies and unknown files require full checks. Missing comparison history or an unavailable Actions API also requires full checks. Manual publication runs always request full checks.

PR checks compare with the PR base. Master publication compares with the most recent **successful deployment** of `deploy.yml` on `master`, rather than the immediately preceding commit. An unpublished layout change therefore remains subject to browser checks even if the next push contains only an article. Only successful ancestor revisions qualify.

Every content publication retains Markdown, schema, editorial approval/digest and image metadata/hash checks, the configured Pages Jekyll build, incremental PDF generation, and standard-library output validation. It does not rebuild the separate reference site or run unrelated unit/browser suites. Chromium is still installed as the existing PDF rendering engine; this is not a browser regression run. PDF format and generation are unchanged. Storage remains local unless the owner separately authorizes and enables the [opt-in Release PDF path](adr/0006-opt-in-release-pdfs.md).

Code/layout publications additionally run the full source, rendering and browser contracts, including the reference project path and configured Pages domain. Feature PRs still do not render websites or generate PDFs. The first publication of this pipeline change itself uses the full gate.

## Home and reading room

`discovery-<language>.json` contains card metadata for every public article and translation notice, without article bodies. Home and catalog use this index. Full-text `search-<language>.json` remains complete and is fetched only when a reader submits a nonempty text query. Exact topic searches use metadata and continue to exclude translation notices from article search results.

The catalog renders 20 cards per static page, with real `/materials/page/N/` and `/ru/materials/page/N/` links. All public records remain accessible without JavaScript or if the metadata request fails. Enhancement filters the whole metadata collection before creating only the selected page's cards; page sizes, reload/back state and existing query links remain supported. Static pagination gets localized canonical/hreflang and sitemap entries where counterparts exist. Output validation rejects missing or duplicated catalog entries and missing rendered articles in discovery/search.

Home selections retain their existing pools and rotation rules. Archive height measurement checks every eligible published article in batches of at most 16 cards instead of constructing the whole archive in the DOM at once. This includes the current reading selection: returning to a cached home page rotates that selection, so those cards may enter the archive. Text length alone cannot predict wrapped height. Each candidate is measured with the narrower ordinary-slot padding so a different rotation cannot exceed or change the reserved height. The selectable article pool remains complete.

## Size budget

`publication-size.mjs` counts the actual configured Pages output before artifact upload, including PDFs, original images, previews and HTML. It writes totals and PDF/image/other breakdowns to the workflow summary. It emits a warning from 800,000,000 bytes and blocks upload at 1,000,000,000 bytes, a conservative decimal 1 GB ceiling. Report the warning to the owner when following a publication; move PDFs only after a separate owner decision. Actions dependency/PDF cache quotas are separate from the deployed site's size.

The optional Release path first plans against the complete local output, then verifies every stored PDF before constructing a separate final directory. Its final output retains all PDF download controls and exact copies of the 58 previously public PDFs pinned in `site/assets/pdf-compatibility.json`, preserving already shared direct URLs. The old bytes add 216,536,165 bytes to the output and reduce future headroom; the 800 MB warning and 1 GB hard gate remain unchanged. A public-inventory preflight stops relocation if newer local PDF URLs are absent from this reviewed list. Every retained path/hash/size and every external descriptor must pass before upload. The local checked input remains available for retry/rollback. An unset opt-in variable never grants storage-write permission or removes local PDFs.
