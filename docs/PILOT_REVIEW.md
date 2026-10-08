# Archival pilot review evidence

The five packages are review drafts. Current technical results are recorded by CI; editorial review is pending. No article has been approved by scientific review or released to the production site. Ordinary builds have no output URL for these drafts.

Site infrastructure: [PR #26](https://github.com/Fuzzy-Technologies/history_math/pull/26), [ADR 0001](adr/0001-archive-article-pilot.md), [next-article procedure](ARTICLE_PREPARATION.md), [check conditions](ARTICLE_CHECKS.md). The site owns the canonical schema, templates, checks and editable article derivatives. Existing private FELab metadata and NAS article/image directories are read-only sources. No FELab infrastructure branch or PR is required; the separate public GitHub FELab project is outside this implementation.

Each article PR independently targets the pending infrastructure branch. After the owner merges #26 into `develop`, retarget each article PR to `develop` and rerun its checks. A separate human-controlled publication PR remains necessary.

## Selection and earlier publication

Approved digests and metadata located candidates; conversion used the complete canonical author text and relevant source documents. All five canonical author articles are TXT; listed DOC/DOCX/DJVU files are companions or research references, not substitute canonical texts. The dates below come from recorded publication of the long version to Telegram, not folder dates or a new website placement. Other existing source links remain in the articles. No unknown DOI, affiliation, license or date was supplied.

| Stable ID / article PR                                                              | Article                                                                                 | Canonical / companion formats | Earlier Telegram publication | Selection and difficulty                                                                                                  |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [hm-0b1ea17c8b02 / #28](https://github.com/Fuzzy-Technologies/history_math/pull/28) | Румовский, Степан Яковлевич (1734–1812)                                                 | txt, djvu                     | 2024-03-25                   | Text-led historical biography with a portrait.                                                                            |
| [hm-56520386b771 / #29](https://github.com/Fuzzy-Technologies/history_math/pull/29) | Арифметика пифагорейцев: совершенные числа                                              | txt                           | 2023-11-21                   | Historical number theory with multiple arithmetic examples and superscript formulas.                                      |
| [hm-19a5d93e33c1 / #30](https://github.com/Fuzzy-Technologies/history_math/pull/30) | Старинная французская задача XVII века о трёх братьях и 8 экю: путешествие сквозь время | txt, docx                     | 2025-03-21                   | Numerical table and a complete system-of-equations solution; DOCX stores equations separately from text.                  |
| [hm-15a0b4f1d18b / #31](https://github.com/Fuzzy-Technologies/history_math/pull/31) | Матрица Мартина Гарднера                                                                | txt, doc                      | 2023-08-23                   | A 5 by 5 numerical illustration and legacy binary Word companion with nonstandard layout.                                 |
| [hm-99120459b820 / #32](https://github.com/Fuzzy-Technologies/history_math/pull/32) | Числовой круг пифагорейцев: мистика и реальность                                        | txt, djvu, docx               | 2025-04-18                   | Complex DOCX superscripts, a scanned historical cover, a numerical diagram and material originally split across comments. |

An archive scan candidate was excluded because permission to reproduce its complete magazine pages was insufficiently established. The complex-source slot therefore uses the number-circle article with DOCX superscripts/layout and historical illustrations. The Gardner legacy DOC adds a second nonstandard source case; its visual review remains outstanding. The pilot does not claim to have completed an OCR experiment.

The coin has a verified Commons source, CNG credit and CC BY-SA 3.0 terms in its figure record. Bronnikov and the historical Iamblichus engraving have linked reproduction sources; author-supplied diagrams/compositions retain their documented archival basis. Exact attribution and reproduction quality of the Rumovsky portrait remain editor questions. Source documents and research attachments were not exported.

## Current verification and review

Each PR's current CI report is the authority for its checked head. Earlier runs do not establish success after an editorial correction. The article artifact contains the stock Jekyll preview, JSON/Markdown report, screenshots at 1440, 390 and 320 pixels, and an offline PDF; retention is 14 days.

Question states, sources, resolutions and authorized changes live only in `reviews/<article-id>.json` on the corresponding article branch. Approval remains pending until the human editor records a decision for the current package. Small archive images retain their native dimensions, including Rumovsky's 150 × 200 portrait.

Download the current artifact from the CI link in the PR. Open `article-pdfs/<article-id>.pdf` directly, or run `node scripts/serve-review.mjs <unzipped-artifact>/article-preview` and follow the article URL. See [the preparation procedure](ARTICLE_PREPARATION.md) for the next article.
