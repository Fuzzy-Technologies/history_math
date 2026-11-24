# Publication performance

## Automated checks

Source CI runs two parallel jobs with five-minute timeouts. Article packages retain Markdown, schema, approval and image checks. Code and template changes also run the non-visual unit suites. Browser and rendered-image regression tests are paused for every automatic and manual workflow run.

Master publication builds the configured production site once. It generates PDFs with Chromium, publishes media, and checks the final URLs, indexes and upload size before deploying Pages. Production rendering and storage transfers have separate time budgets.

## Home and reading room

`discovery-<language>.json` contains card metadata for every public article and translation notice, without article bodies. Home and catalog use this index. Full-text `search-<language>.json` remains complete and is fetched only when a reader submits a nonempty text query. Exact topic searches use metadata and continue to exclude translation notices from article search results.

The catalog renders 20 cards per static page, with real `/publications/page/N/` and `/ru/publications/page/N/` links. All public records remain accessible without JavaScript or if the metadata request fails. Enhancement filters the whole metadata collection before creating only the selected page's cards; page sizes, reload/back state and existing query links remain supported. Static pagination gets localized canonical/hreflang and sitemap entries where counterparts exist. Output validation rejects missing or duplicated catalog entries and missing rendered articles in discovery/search.

Home selections retain their existing pools and rotation rules. Archive height measurement checks every eligible published article in batches of at most 16 cards instead of constructing the whole archive in the DOM at once. This includes the current reading selection: returning to a cached home page rotates that selection, so those cards may enter the archive. Text length alone cannot predict wrapped height. Each candidate is measured with the narrower ordinary-slot padding so a different rotation cannot exceed or change the reserved height. The selectable article pool remains complete.

## Size budget

`publication-size.mjs` counts the actual configured Pages output before artifact upload, including PDFs, original images, previews and HTML. It writes totals and PDF/image/other breakdowns to the workflow summary. It emits a warning from 800,000,000 bytes and blocks upload at 1,000,000,000 bytes, a conservative decimal 1 GB ceiling. Report the warning to the owner when following a publication; move PDFs only after a separate owner decision. Actions dependency/PDF cache quotas are separate from the deployed site's size.
