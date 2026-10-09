# Localization

`site.lang: en` selects the default site edition. It does not select the original language of every article. Russian originals may publish immediately without an English version.

| Edition | Project-site URL    | Current state                                                           |
| ------- | ------------------- | ----------------------------------------------------------------------- |
| English | `/history_math/`    | Full navigation and discovery; notices identify untranslated originals. |
| Russian | `/history_math/ru/` | Published originals, reading room, showcase and search.                 |

Every public page has its own canonical built from `site.url + site.baseurl + page.url`. In particular, a Russian article never uses the English homepage as canonical. `translation_key` is a stable work identity, not a slug and not a declaration that a translation already exists.

## Add a translation

1. Add a new Markdown file in `site/_articles/`, preserving the original `translation_key`.
2. Set the new `lang`, localized title/summary/tags/author display, actual publication date and a unique localized permalink.
3. Keep the original publication date separately if needed. Review source links and media captions in the target language.
4. Set the translation to `published` only when it actually exists and is approved.
5. Build and inspect both canonical URLs, language indexes and browser navigation.

The generator groups only emitted pages/documents by translation_key and rejects duplicate languages in a group. Hreflang and counterpart links therefore refer only to existing public pages. English and Russian homes are deliberately paired; untranslated Russian articles have no English hreflang. Where English summary metadata exists, the EN link opens a translation-status page with a link to the Russian original. Notices have no translation_key or hreflang and are excluded from article-only indexes, the sitemap and PDFs.

UI labels and the homepage, reading room and search markup are shared between editions. Discovery indexes contain approved local articles and explicitly marked English summary notices. Notice searches cover their English title and summary only; they do not claim an English full text. A real translation replaces its notice at the same URL. Further locales require deliberate updates to the publication contract, layouts, index generator and tests.

For a later custom domain, change `_config.yml` `url` and set `baseurl: ''`. Continue storing local content/media paths without the project base prefix. CI also verifies a root-path build; no bulk link rewrite is needed.

## Error pages

The English `/404.html` and Russian `/ru/404.html` use the same localized content and site shell. GitHub Pages serves the root fallback for every missing URL; a small inline selector uses the `/ru` path segment (after the deployment base path) to install the pre-rendered Russian shell before application modules run. It preserves the original missing URL and HTTP 404 status, and updates the document language, title, metadata, navigation, logos and recovery links together. Other paths use English. Error pages are noindex and excluded from the sitemap. With JavaScript disabled, the shared fallback remains English with a language link to the fully rendered Russian error page; both explicit error URLs work without scripts.

Search, image-loading and archive-fallback messages follow the page language. Browser tests exercise failed requests as well as unknown URLs on both project-path and root-domain hosting. Hosting-provider 5xx responses that bypass the site cannot use its templates.


## External destinations

External links must select the matching Russian/English destination when the provider exposes a verified locale route. Shared templates and Markdown pages use `external_url: page.lang`; it preserves the resource, unrelated query parameters and fragments. The output gate checks every rendered anchor, including the Russian shell embedded in the shared 404 document. New multilingual providers need an explicit verified rule in the filter and output gate; do not guess a translated hostname, article slug or product ID.

The full-site link audit on 2026-10-10 found these locale routes:

- Fuzzy Technologies: `/ru/` for Russian and `/` for English, in all footers and About pages.
- Blogger archive: `?hl=ru` / `?hl=en`. Both URLs returned HTTP 200 with the requested HTML language. This selects Blogger's interface, not a translation of the archived Russian articles; the English About page identifies their language.
- Wikimedia Commons file descriptions: `?uselang=ru` / `?uselang=en`, preserving the same file and its provenance.
- Creative Commons license summaries: `deed.ru` / `deed.en`, preserving the license type and version. Legal-code links are not substituted with summaries.

Original article sources (Teletype, Telegraph, RAS, the scanned Gardner book and OEIS), the Telegram channel and individual book offers remain exact resource links where no corresponding translated resource was established. In particular, an English book description on this journal does not create an English Ridero/Avito listing. Tribute's inspected web client chooses its interface from a saved preference, Telegram user language or browser language; its `lang` value is local storage, not a verified URL parameter. Preserve its shop/product identifiers and Telegram `startapp` values. Add locale-specific offer URLs when actual translated listings become available, rather than restoring a blanket language claim for all current and future books.
