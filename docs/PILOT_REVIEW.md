# Archival pilot review evidence

This records the original pilot publication. For subsequent work, use the master-only process in [ADR 0002](adr/0002-master-only-workflow.md).

On 2026-10-09, Timur Gilmullin approved the five article packages for website publication. Their status is `published`, their website date is 2026-10-09, and each approval covers the final Markdown and selected image bytes. Current technical results are recorded by CI; live deployment is tracked by the separate publication PR #39 and its master workflow. This editorial admission does not claim an independent scientific peer review.

Site infrastructure: [PR #26](https://github.com/Fuzzy-Technologies/history_math/pull/26), [ADR 0001](adr/0001-archive-article-pilot.md), [next-article procedure](ARTICLE_PREPARATION.md), [check conditions](ARTICLE_CHECKS.md). The site owns the canonical schema, templates, checks and editable article derivatives. Existing private FELab metadata and NAS article/image directories are read-only sources. No FELab infrastructure branch or PR is required; the separate public GitHub FELab project is outside this implementation.

The owner merged infrastructure #26 and article PRs #28–#32 into `develop`. PRs #36–#38 add publication details, branded PDFs and English notices. Publication follows the separate `develop` → `master` PR #39 after current-head checks pass.

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

Question states, sources, resolutions and authorized changes live only in `reviews/<article-id>.json`. Those records now contain the owner's publication decision and package digests. Accepted limitations remain explicitly distinguished from completed verification. Small archive images retain their native dimensions, including Rumovsky's 150 × 200 portrait.

## English translation notices

Each pilot article has an English title and short description in `_data/english_notices.json`. After its Russian original is admitted by the publication gate, a notice at `/articles/<id>/` links to that original and clearly states that an English translation is not available. Draft notices exist only in opt-in review builds. Published notices appear on the English home page; they are excluded from article search, the sitemap and translation hreflang records. They do not carry PDF downloads or article citations. The Russian language switch links to the corresponding notice. A real English article with the same translation key replaces the notice automatically.

The browser fixture temporarily approves copies of the five articles inside the test directory to validate the final navigation and home-page list. These fixture approvals are not editorial decisions and do not alter `reviews/`.

When real articles are published, the Russian home, catalog and about page stop claiming that only demos exist. The cover links to the newest published article. Existing demo pages retain their explicit labels. Browser regression checks use the current article index and actual card destinations, so the suite also works after the five articles enter the catalog. A complete local release-fixture run can use `BROWSER_SITE_DIR=test-results/notices-fixture node tests/browser.mjs` after running `bundle exec ruby tests/translation_notices_test.rb`.

Read the current report from the linked CI run. Reproduce visual evidence locally as described in [the preparation procedure](ARTICLE_PREPARATION.md).

## Publication decision — 2026-10-09

Timur Gilmullin explicitly confirmed the project images and approved publication with the remaining source/document checks deferred. The corresponding questions are resolved or accepted in their canonical review records; no unavailable verification is marked as completed. All five packages have named approval, the website date and matching content digests. Their earlier Telegram dates and the exact archived image bytes are preserved.

PR #39 collects `develop` for publication in `master`. Production admission uses the normal approval and digest checks; no gate, fixture or protocol has been bypassed. The master deployment workflow is the authority for whether the approved articles have reached the live site.
