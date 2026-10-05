# Sepia science journal

The October 2026 owner brief replaces the initial reading-room palette with a polished science magazine in sepia. The layout takes inspiration from mid-century magazine composition, rather than reproducing a historical publication or claiming that those magazines were sepia.

## References

- [Scientific American's cover retrospective](https://www.scientificamerican.com/article/scientific-americans-colorful-covers-reveal-175-years-of-change/): a restrained masthead, generous margins and a dominant central illustration.
- [Scientific American, 1960s cover gallery](https://www.davelo.net/sciam/cover-sciam1960s-index.html): scientific diagrams as cover art, clear plate framing and confident typography.
- [Popular Science, 1960s cover gallery](https://www.davelo.net/sciam/cover-popsci1960s-index.html): a visual entry point and varied editorial scale.
- [Science and Life archive](https://www.nkj.ru/archive/): a reference for Russian science-magazine identity and reading structure.

Historical covers are references only; none are redistributed as site assets.

## Visual and reading rules

Ivory paper, dark brown ink and copper emphasis come from the supplied brand artwork. Fine double rules, numbered illustration plates, a portrait masthead and engraved geometric art form the journal's visual identity. The texture is deliberately subtle so that small text and formulas stay clear.

Self-hosted PT Serif provides consistent Latin and Cyrillic headings and reading text. Desktop browsing uses an explicitly controlled, keyboard-accessible carousel without autoplay. At 620px and below it becomes a vertical sequence. Articles keep a single text column, a generated section index, and previous/next article links. The initial catalog and archive also work without JavaScript.

## Reader controls and editorial voice

The English name is **Mathematics with Mansur**. Keep PT Serif while using approximately 17–19px article text, 17px card and cover descriptions and readable captions. Controls use soft pill shapes; cover and image frames have restrained rounded corners. Dark mode uses warm brown paper and cream ink. Follow the system preference initially, then preserve an explicit reader choice. Blocked browser storage must not disable reading controls.

Both themes share the same Markdown and article markup; CSS color tokens provide the two appearances. Use a compact 1.55 line height for prose, 0.75em paragraph gaps and restrained heading margins. Keep the cover free of welcome copy and repeated author credits. Search navigation uses the word alone.

On wide screens, the latest-material strip supports mouse dragging and vertical-wheel browsing in addition to arrows, keyboard controls and native horizontal scrolling. Dragging and wheel input retain the exact pixel position, including partial cards; never snap or settle to card edges after release. Arrow buttons and keyboard arrows retain deliberate card-sized steps. A short drag threshold preserves ordinary article-link clicks; reaching either end returns wheel scrolling to the page. Mobile cards remain a vertical sequence. Cards use a small copper border and shadow change, plus a 2px hover lift for fine pointers. Disable movement for reduced-motion readers.

Current interaction references: [Figma's 2026 web-design overview](https://www.figma.com/resource-library/web-design-trends/), [Webflow's 2026 trends](https://webflow.com/blog/web-design-trends-2026), and [W3C's dragging alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). Apply selected ideas within the established journal palette.

Unlinked illustrations open in a native modal dialog at the available width. Provide zoom buttons, fit-to-window, keyboard controls, pointer dragging and touch pinch. Preserve the original artwork; restore focus and page scrolling on close. Linked card covers continue to open their articles.

Remember the previous archive subset between visits, replace a repeated subset even with the same random sequence, and rotate restored back/forward pages. Show publication anniversaries only when real published articles match; do not fill the page with placeholder panels.

Use short, concrete, friendly wording rather than abstract promotional headings. Editorial references: [Mansur's account of his mathematical work](https://history-math.blogspot.com/2018/03/blog-post.html), [the mathematics blog](https://teletype.in/@history_math), and the owner's established preference for simple, direct personal-blog language. Demo texts retain their explicit status and attribution.

Remember reading positions per article in local browser storage and honor them for 90 days. Match a fingerprint of the paragraph and an offset within it, rather than a page pixel coordinate, so responsive reflow preserves the reading point. Normalize math to its source before fingerprinting. Restore after images, formulas and fonts settle. Explicit section URLs and native back/forward restoration take precedence; early reader interaction cancels automatic restoration. Ignore invalid, expired or missing anchors and storage failures. A short-lived, keyboard-accessible notice offers a restart. An explicit restart or finishing an article clears its position. Scrolling above the article to use the header navigation preserves the last reading point.

Primary Russian navigation contains Home, Reading Room, Showcase and Search. The About link belongs beside the masthead motto and remains visible on mobile. Use Reading Room above the latest strip; the catalog keeps the Materials title with a By Topic eyebrow. Keep Showcase in navigation and use Our Publications as its page title, with Books and Courses above it. The showcase currently links the owner's History of Mathematics to its [Ridero page](https://ridero.ru/books/istoriya_matematiki/); do not invent prices, formats or course availability. The typographic book plate is decorative website artwork, not a reproduction of the published cover.

## Catalog filters and topics

Pass the build version from the app entry point to every imported module, including nested imports. A reader may still have an older unversioned dependency cached when a new deployment arrives; mixing module versions must not disable theme controls, filters or search. The upgrade regression serves the legacy core for bare requests and verifies that the new graph bypasses it using one shared version.

Enhance the native catalog selects with themed select-only comboboxes following the [WAI-ARIA keyboard pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/). Keep focus on the trigger, expose the active option, support arrow keys, Home/End, type-ahead, Enter/Space, Tab and Escape, and keep the popup inside the viewport. Use a restrained 160ms appearance transition; reduced motion disables it. Both filters retain their combined type/topic behavior.

Tags on static cards, generated cards and article footers link to the current Russian search page using an encoded `tag` parameter. Match the complete normalized tag, including Cyrillic case and Yo/Ye equivalence, within the current language index. Tag mode never falls back to matches in titles or body text. Show the active topic and a clear-filter control; typing a normal query leaves tag mode. The existing static text index and ordinary text search remain in use; no new search service or editorial digest is introduced.

Reduce article prose by a further point (1.3333 CSS pixels), with prose links and math inheriting the change. Keep cover descriptions, headings and captions at their approved sizes.

## Asset provenance

- `Math-with-Mansur.png` and `Math-with-Mansur-logo.png`: original artwork supplied by the owner, already committed to the repository. Kept intact.
- `Math-with-Mansur-logo-ru.png`: the exact supplied Russian medallion from `02-math_channel_final.png`; no bitmap alteration.
- `frontispiece.svg`: original, code-drawn geometric artwork for this redesign. An illustrative composition, not a scan, historical source or attributed scientific discovery.
- `paper-grain.svg`: original decorative SVG noise tile, used at low opacity without obscuring text.
- `geometry.svg`, `triangle.svg`, `abacus.svg`, `mark.svg`: existing original prototype drawings, recolored into the new palette. Article image roles and provenance captions remain distinct.
- `assets/fonts/pt-serif-*.woff2`: regular and italic PT Serif from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/ptserif), losslessly converted from the supplied TTF format. The complete SIL Open Font License and copyright notice accompany them in `assets/fonts/OFL.txt`.
