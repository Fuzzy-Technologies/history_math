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
