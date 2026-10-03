# Public content and export contract

## Add an article

Copy `templates/article.md` to `site/_articles/<stable-slug>.<lang>.md`. One Markdown file is one article/language version. Edit the metadata and write prose using H2 section headings. The common site header, footer and article structure come from shared layouts. Keep confidential drafts on NAS; `status: draft` excludes a file from the generated site but does not make a public Git file private.

Set `status: published` only after editorial approval; use `demo` for deliberately public prototype examples. Only these two statuses are emitted. The post-read gate runs before rendering and discovery, so `draft`, missing and unrecognized statuses have no page, public index or sitemap entry. Development documentation and templates live outside `site/` and are never copied.

## Front matter

| Field | Contract |
|---|---|
| `layout` | Required, `article`. |
| `title` | Required, nonempty localized title. |
| `lang` | Required, `ru` or `en`; actual language of this file. |
| `translation_key` | Required, stable lowercase ASCII work key shared only by its language versions. |
| `date` | Required publication date, `YYYY-MM-DD`; drives fresh order and anniversaries. Demo dates are illustrative. |
| `type` | Required: `essay`, `problem`, `instrument`, or `note`. |
| `author` | Required actual author or an explicit demo authorship label. |
| `description` | Required brief localized summary for cards, metadata and search. Quote YAML strings containing a colon. |
| `tags` | Required array of nonempty localized topic strings. |
| `math` | Required boolean; `true` opts into formula assets and dollar-math protection. |
| `status` | Required editorial state; only `published` and `demo` are public. |
| `permalink` | Required stable path: `/ru/articles/<slug>/` or `/articles/<slug>/`, without baseurl. |
| `updated` | Optional revision date. |
| `series` | Optional localized series label. |
| `preview_image` | Optional local asset used only for the catalog/card. |
| `cover_image` | Optional separate local asset used only for social/Open Graph preview. |
| `hero_image` | Optional local asset rendered inside the article. |
| `hero_alt` | Required when hero_image exists; accessible localized description. |
| `hero_caption` | Optional visible image provenance/context. |
| `original_publication_date` | Optional original outlet date; not the website anniversary date. |
| `source_work_id` | Optional safe public ID: letters, digits, `_` or `-`, at most 80 characters; never a NAS path. |

Image fields must refer to existing `/assets/...` files and retain their distinct roles. The rendered URL adds `baseurl`. Article dates and duplicate public URLs/language versions are validated by the Jekyll plugin.

## Markdown, formulas and media

Headings, lists, blockquotes, tables, footnotes and source links use GFM/kramdown Markdown. Use `$x_1^2 + x_2^2 = r^2$` inline and a separate block for display math:

```latex
$$
S = \pi r^2.
$$
```

Set `math: true`. A pre-render hook protects math from Markdown emphasis and supplies it to pinned local KaTeX 0.16.10. Backtick code is left alone. KaTeX trust is disabled; unsupported notation produces a visible unrendered formula and makes browser validation fail. Pages without formulas load no math JavaScript or font CSS. Literal dollar signs outside math should be escaped as `\$`.

Place images and GIFs in `site/assets/images/<work-key>/`. They must be publication-sized and have known provenance. Use a base-path-aware Markdown image:

```markdown
![Localized alternative text]({{ '/assets/images/work-key/figure.gif' | relative_url }})

*Figure 1. A localized caption and source attribution.*

Reference text.[^source]

[^source]: Bibliographic details and a link to the actual source.
```

For semantic figures, Markdown content can contain HTML:

```html
<figure>
  <img src="{{ '/assets/images/work-key/figure.svg' | relative_url }}" alt="Localized description">
  <figcaption>Localized caption and provenance.</figcaption>
</figure>
```

Small public video files can use native controls without a backend. Keep heavy originals outside Git. Caption tracks and accessible descriptions belong with the publication:

```html
<video controls preload="none" poster="{{ '/assets/images/work-key/poster.jpg' | relative_url }}">
  <source src="{{ '/assets/media/work-key/video.mp4' | relative_url }}" type="video/mp4">
  <track kind="captions" srclang="ru" label="Russian" src="{{ '/assets/media/work-key/captions.vtt' | relative_url }}" default>
  A localized fallback link to the video.
</video>
```

## Discovery and archive behavior

The build generates compact `assets/search-ru.json` and `assets/search-en.json` indexes: title, description, tags, type, language, publication date, URL, plain search text, public status and optional preview image. Queries use a single local file and no keys/GitHub API. The current EN index is empty. Russian normalization handles case and Cyrillic Yo/Ye equivalence.

Fresh materials are sorted by publication date and remain stable. The archive rotates a three-item subset without duplicate URLs or repeated subsets when alternatives exist. Its reserved desktop grid and mobile row heights prevent rotation shifts. Publication anniversaries match month/day in previous years; historical birth/event dates are not used. If no date matches, a plain archive alternative is shown. Demos remain labeled, including when their illustrative dates match.

## Future FELab export boundary

No exporter is implemented here. A future exporter may produce an approved public package of Markdown language variants and selected assets conforming to this contract. It must omit private research, local SQLite/FTS, sessions, locks, logs, NAS paths, full internal metadata and large source media. Safe `source_work_id` can preserve provenance without leaking internal locations. Export should preserve `translation_key` and stable permalinks and require editorial approval before Git publication. The public build then creates indexes; there is no promised live NAS synchronization.
