# Stable article URLs

Public archive articles use `hm-<12-character work hash>-<language>` as the final
path segment. English routes are `/articles/hm-<hash>-en/`; Russian routes are
`/ru/articles/hm-<hash>-ru/`. Authors, titles and publication dates do not affect
the URL. The existing hash is retained rather than recalculated from mutable text.

The publication layer derives this route from the approved package's `permalink`
after validation and before URL discovery. Both legacy and already suffixed
permalinks normalize to the same route. Editorial Markdown, internal article IDs,
translation keys and approval digests remain unchanged. Non-archive examples and
test fixtures keep their existing routes.

Cards, search, citations, canonical/hreflang, the sitemap and the PDF manifest use
the derived URL. PDF download filenames stay stable for existing shared links;
the article URL printed inside regenerated PDFs uses the new canonical route.

Old HTML paths produce localized, non-indexed transition pages on GitHub Pages.
JavaScript replaces the location, preserving query parameters and section anchors;
without JavaScript a localized link remains available. These are static HTML
transitions, not HTTP 301 responses. Alias collisions fail the build, aliases do
not appear in indexes or the sitemap, and production drafts receive no aliases.
English translation notices follow the same language suffix rule and are replaced
by real translations at the same address.

Run `bundle exec ruby tests/publication_test.rb`,
`bundle exec ruby tests/translation_notices_test.rb`,
`node --test tests/article-url.test.mjs`, and
`node tests/article-urls-browser.mjs` after building the site. The browser check
also accepts `URL_SITE_DIR` and `URL_BASEURL` for root-domain verification.
