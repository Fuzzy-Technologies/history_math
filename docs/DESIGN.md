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

The English name is **Mathematics with Mansur**. Keep PT Serif while using 20–22px article text, 17–18px card descriptions and readable captions. Controls use soft pill shapes; cover and image frames have restrained rounded corners. Dark mode uses warm brown paper and cream ink. Follow the system preference initially, then preserve an explicit reader choice. Blocked browser storage must not disable reading controls.

Unlinked illustrations open in a native modal dialog at the available width. Provide zoom buttons, fit-to-window, keyboard controls, pointer dragging and touch pinch. Preserve the original artwork; restore focus and page scrolling on close. Linked card covers continue to open their articles.

Remember the previous archive subset between visits, replace a repeated subset even with the same random sequence, and rotate restored back/forward pages. Show publication anniversaries only when real published articles match; do not fill the page with placeholder panels.

Use short, concrete, friendly wording rather than abstract promotional headings. Editorial references: [Mansur's account of his mathematical work](https://history-math.blogspot.com/2018/03/blog-post.html), [the mathematics blog](https://teletype.in/@history_math), and the owner's established preference for simple, direct personal-blog language. Demo texts retain their explicit status and attribution.

## Asset provenance

- `Math-with-Mansur.png` and `Math-with-Mansur-logo.png`: original artwork supplied by the owner, already committed to the repository. Kept intact.
- `Math-with-Mansur-logo-ru.png`: the exact supplied Russian medallion from `02-math_channel_final.png`; no bitmap alteration.
- `frontispiece.svg`: original, code-drawn geometric artwork for this redesign. An illustrative composition, not a scan, historical source or attributed scientific discovery.
- `paper-grain.svg`: original decorative SVG noise tile, used at low opacity without obscuring text.
- `geometry.svg`, `triangle.svg`, `abacus.svg`, `mark.svg`: existing original prototype drawings, recolored into the new palette. Article image roles and provenance captions remain distinct.
- `assets/fonts/pt-serif-*.woff2`: regular and italic PT Serif from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/ptserif), losslessly converted from the supplied TTF format. The complete SIL Open Font License and copyright notice accompany them in `assets/fonts/OFL.txt`.
