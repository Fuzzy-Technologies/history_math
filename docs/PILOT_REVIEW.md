# Archival pilot review evidence

The five packages are review drafts. Current technical results are recorded by CI; editorial review is pending. No article has been approved by scientific review or released to the production site. Ordinary builds have no output URL for these drafts.

Site infrastructure: [PR #26](https://github.com/Fuzzy-Technologies/history_math/pull/26), [ADR 0001](adr/0001-archive-article-pilot.md), [next-article procedure](ARTICLE_PREPARATION.md), [check conditions](ARTICLE_CHECKS.md). The site owns the canonical schema, templates, checks and editable article derivatives. Existing private FELab metadata and NAS article/image directories are read-only sources. No FELab infrastructure branch or PR is required; the separate public GitHub FELab project is outside this implementation.

The owner merged infrastructure #26 and article PRs #28–#32 into `develop`. All five articles still have `status: draft` and pending editorial approvals. A separate publication PR remains necessary after the remaining blocking questions are resolved or explicitly accepted by the editor.

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

The coin has a verified Commons source, CNG credit and CC BY-SA 3.0 terms in its figure record. Bronnikov and the historical Iamblichus engraving have linked reproduction sources; author-supplied diagrams/compositions retain their documented archival basis. The existing Rumovsky portrait was visually matched to the documented Commons lithograph; its authorship, historical publication and public-domain source are now recorded without replacing its original pixels. Source documents and research attachments were not exported.

## Current verification and review

Each PR's current CI report is the authority for its checked head. Earlier runs do not establish success after an editorial correction. The compact CI artifact contains only the JSON/Markdown report for 14 days. Local checks still create the Jekyll preview, screenshots at 1440, 390 and 320 pixels, and offline PDFs. Full-site and screenshot archives are no longer uploaded.

Question states, sources, resolutions and authorized changes live only in `reviews/<article-id>.json`. Approval remains pending until the human editor records a decision for the current package. Small archive images retain their native dimensions, including Rumovsky's 150 × 200 portrait.

## English translation notices

Each pilot article has an English title and short description in `_data/english_notices.json`. After its Russian original is admitted by the publication gate, a notice at `/articles/<id>/` links to that original and clearly states that an English translation is not available. Draft notices exist only in opt-in review builds. Published notices appear on the English home page; they are excluded from article search, the sitemap and translation hreflang records. They do not carry PDF downloads or article citations. The Russian language switch links to the corresponding notice. A real English article with the same translation key replaces the notice automatically.

The browser fixture temporarily approves copies of the five articles inside the test directory to validate the final navigation and home-page list. These fixture approvals are not editorial decisions and do not alter `reviews/`.

When real articles are published, the Russian home, catalog and about page stop claiming that only demos exist. The cover links to the newest published article. Existing demo pages retain their explicit labels. Browser regression checks use the current article index and actual card destinations, so the suite also works after the five articles enter the catalog. A complete local release-fixture run can use `BROWSER_SITE_DIR=test-results/notices-fixture node tests/browser.mjs` after running `bundle exec ruby tests/translation_notices_test.rb`.

Read the current report from the linked CI run. Reproduce visual evidence locally as described in [the preparation procedure](ARTICLE_PREPARATION.md).

## Publication decision checkpoint — 2026-10-09

The publication-details and PDF features are integrated into `develop` through PRs #36 and #37. PR #38 integrates English notices and the final site navigation. These merges do not by themselves approve the five article packages.

Two of the six previously open questions are resolved with evidence in the review records: the Rumovsky portrait attribution and the Gardner edition (1999, chapter 2, pages 21–23). Four questions remain: the two project compositions in the perfect-number article, the exact Lucas reference, the visual comparison of the private Gardner DOC, and the printed page for Ignatiev. The Direct-Media excerpt confirms Ignatiev book 2 (1909), problem 11, but its OCR page marker conflicts with the earlier companion record, so no unverified page was inserted.

To complete publication, the owner must resolve or explicitly accept each remaining limitation. Record that decision in the existing review records, set the real website publication date and `status: published`, calculate the digest for each final article package, and run the current-head gates before the separate `develop` → `master` merge. Do not mark unavailable visual checks as completed or reuse fixture approvals as an editorial decision.
