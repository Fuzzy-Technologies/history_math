# Archival pilot review evidence

The five packages are review drafts. Technical checks passed; editorial review pending. No article has been approved by scientific review or released to the production site. Ordinary builds have no output URL for these drafts.

Site infrastructure: [PR #26](https://github.com/Fuzzy-Technologies/history_math/pull/26), [ADR 0001](adr/0001-archive-article-pilot.md), [next-article procedure](ARTICLE_PREPARATION.md), [check conditions](ARTICLE_CHECKS.md). The separate FELab infrastructure branch `feature/history-math-pilot` is pushed at `d3179ec549eed2ebab2964d0ecf9d4eee96bd9f7` to its authorized origin. That origin is bare Git without a PR service. Its infrastructure PR remains blocked pending an authorized review host; the cross-repository pilot cannot yet be declared complete.

Each article PR independently targets the pending infrastructure branch. After the owner merges #26 into `develop`, retarget each article PR to `develop` and rerun its checks. A separate human-controlled publication PR remains necessary.

## Selection and earlier publication

Approved digests and metadata located candidates; conversion used the complete canonical author text and relevant source documents. The dates below come from recorded publication of the long version to Telegram, not folder dates or a new website placement. Other existing source links remain in the articles. No unknown DOI, affiliation, license or date was supplied.

| Stable ID / article PR | Article | Source formats | Earlier Telegram publication | Selection and difficulty |
| --- | --- | --- | --- | --- |
| [hm-0b1ea17c8b02 / #28](https://github.com/Fuzzy-Technologies/history_math/pull/28) | Румовский, Степан Яковлевич (1734–1812) | txt, djvu | 2024-03-25 | Text-led historical biography with a portrait. |
| [hm-56520386b771 / #29](https://github.com/Fuzzy-Technologies/history_math/pull/29) | Арифметика пифагорейцев: совершенные числа | txt | 2023-11-21 | Historical number theory with multiple arithmetic examples and superscript formulas. |
| [hm-19a5d93e33c1 / #30](https://github.com/Fuzzy-Technologies/history_math/pull/30) | Старинная французская задача XVII века о трёх братьях и 8 экю: путешествие сквозь время | txt, docx | 2025-03-21 | Numerical table and a complete system-of-equations solution; DOCX stores equations separately from text. |
| [hm-15a0b4f1d18b / #31](https://github.com/Fuzzy-Technologies/history_math/pull/31) | Матрица Мартина Гарднера | txt, doc | 2023-08-23 | A 5 by 5 numerical illustration and legacy binary Word companion with nonstandard layout. |
| [hm-99120459b820 / #32](https://github.com/Fuzzy-Technologies/history_math/pull/32) | Числовой круг пифагорейцев: мистика и реальность | txt, djvu, docx | 2025-04-18 | Complex DOCX superscripts, a scanned historical cover, a numerical diagram and material originally split across comments. |

An archive scan candidate was excluded because permission to reproduce its complete magazine pages was insufficiently established. The complex-source slot therefore uses the number-circle article with DOCX superscripts/layout and historical illustrations. The Gardner legacy DOC adds a second nonstandard source case; its visual review remains outstanding. The pilot does not claim to have completed an OCR experiment.

The coin has a verified Commons source, CNG credit and CC BY-SA 3.0 terms in its figure record. Bronnikov and the historical Iamblichus engraving have linked reproduction sources; author-supplied diagrams/compositions retain their documented archival basis. Exact attribution and reproduction quality of the Rumovsky portrait remain editor questions. Source documents and research attachments were not exported.

## Checked heads and evidence

| Article PR | Checked head | Complete CI | Local source / stock build / output / browser | Formulas / figures / tables | Manual viewports |
| --- | --- | --- | --- | --- | --- |
| [#28](https://github.com/Fuzzy-Technologies/history_math/pull/28) | `e8f12707727acc012da01a6def6886e24dd89a65` | [PASS](https://github.com/Fuzzy-Technologies/history_math/actions/runs/37544096768) | PASS / PASS / PASS / PASS | 0 / 1 / 0 | 1440 × 1000 and 390 × 844 |
| [#29](https://github.com/Fuzzy-Technologies/history_math/pull/29) | `38fa91639ca80bdc433313aba9f7ee4e68c684fc` | [PASS](https://github.com/Fuzzy-Technologies/history_math/actions/runs/37544116400) | PASS / PASS / PASS / PASS | 7 / 3 / 0 | 1440 × 1000 and 390 × 844 |
| [#30](https://github.com/Fuzzy-Technologies/history_math/pull/30) | `31ec7ea5ec6ec10e6278a6a12cd22adfdb917fa7` | [PASS](https://github.com/Fuzzy-Technologies/history_math/actions/runs/37544120242) | PASS / PASS / PASS / PASS | 23 / 2 / 1 | 1440 × 1000 and 390 × 844 |
| [#31](https://github.com/Fuzzy-Technologies/history_math/pull/31) | `5040a4617df7db0184c5c15d2bd6c7c0b4198b96` | [PASS](https://github.com/Fuzzy-Technologies/history_math/actions/runs/37544126266) | PASS / PASS / PASS / PASS | 0 / 1 / 1 | 1440 × 1000 and 390 × 844 |
| [#32](https://github.com/Fuzzy-Technologies/history_math/pull/32) | `3f8d3d8a070e8525d79c903b2b2e505553a6d4fb` | [PASS](https://github.com/Fuzzy-Technologies/history_math/actions/runs/37544144740) | PASS / PASS / PASS / PASS | 2 / 3 / 0 | 1440 × 1000 and 390 × 844 |

Local Windows verification reused each exact head's stock CI Jekyll output only after checking its commit manifest, then reran source/output checks and Chromium on both viewports. A substitute renderer was not used. All ten final screenshots were viewed. No missing images, unrendered formulas, broken local anchors or formula/table/page overflow were observed. JSON/Markdown reports and relative screenshot links are in each `article-review-<head-sha>` artifact (14-day retention); the bot comment links the current run. A cancelled or incomplete required job cannot give technical success.

The final infrastructure has 14 targeted Node contract/workflow/report/browser-failure tests passing locally; full site regressions run in the linked CI. FELab has 17 affected preparation/publication tests and Ruff passing. Its full regression suite is not claimed because its current origin has no hosted CI/PR service. Private source hashes were unchanged, exported Markdown bytes matched the authoritative FELab derivative, and the rebuildable runtime cache passed SQLite `quick_check`.

## Reconciliation and questions

Automatic checks establish technical validity. Manual comparison covered the complete canonical author text, section structure, formula transcription, source images/captions, table/matrix values and existing notes/bibliography. The private per-fragment handling ledgers contain hm-0b1ea17c8b02: 17; hm-56520386b771: 20; hm-19a5d93e33c1: 32; hm-15a0b4f1d18b: 22; hm-99120459b820: 25 nonempty source lines. These ledgers, original paths, source hashes and commit-bound verification evidence remain in FELab; each PR exports only its public reconciliation record.

Manual changes were structural: title/section markup, dollar LaTeX, aligned line breaks, accessible image-table/matrix transcriptions, figure inventory and relocation of operational markers/hashtags. Author claims and historical numeric records were preserved.

### [Румовский, Степан Яковлевич (1734–1812)](https://github.com/Fuzzy-Technologies/history_math/pull/28)

- Уточнить даты основания Российской академии и статусы академика: в тексте два разных учреждения сведены к 1767 году. Авторский текст сохранён.
- Подтвердить атрибуцию исторического портрета и право размещения архивной репродукции.
- Портрет в архиве имеет размер 150 × 200 пикселей; подобрать более качественную репродукцию с подтверждённым источником.

### [Арифметика пифагорейцев: совершенные числа](https://github.com/Fuzzy-Technologies/history_math/pull/29)

- Сохранены сведения за 2019 год: число найденных совершенных чисел и рекорд не обновлялись. Решить, нужна ли датированная редакционная сноска.
- Проверить авторское утверждение о применении совершенных чисел в криптографических протоколах.
- Подтвердить происхождение архивной иллюстрации и авторской промокомпозиции; новые лицензии им не назначены.
- Сверить музей и местонахождение картины Бронникова в авторской подписи с указанной репродукцией; подпись сохранена без содержательного исправления.

### [Старинная французская задача XVII века о трёх братьях и 8 экю: путешествие сквозь время](https://github.com/Fuzzy-Technologies/history_math/pull/30)

- Проверить исторические утверждения о французских салонах XVII века и обучении банкиров: исследовательский DOCX содержит промежуточные выписки, а не подтверждённую научную ссылку.
- Проверить библиографические сведения о Люка и основание размещения изображения монеты.
- Таблица переписана из 15 ячеек исходного рисунка в доступную двухколоночную форму; подтвердить её соответствие исходным строкам и столбцам.

### [Матрица Мартина Гарднера](https://github.com/Fuzzy-Technologies/history_math/pull/31)

- Уточнить издание и страницу книги Мартина Гарднера: в каноническом тексте они не указаны.
- Старый DOC требует дополнительной визуальной сверки в редакторе; автоматический Word-экспорт в этом окружении не завершился. Полный канонический long.txt прочитан и сохранён.

### [Числовой круг пифагорейцев: мистика и реальность](https://github.com/Fuzzy-Technologies/history_math/pull/32)

- Формулировка ряда включает две единицы; сохранена без исправления. Подтвердить соответствие определения и доказательства.
- В подписи гравюры сохранено исходное написание латинского текста; проверить его по изображению.
- Три ссылки на DJVU сохранены как библиографическая ссылка на три тома; современный перевод Ямвлиха указан библиографически без публикации PDF.

## Inspecting the page and preparing article six

Download and unzip the Actions artifact linked above. From the infrastructure checkout run `node scripts/serve-review.mjs <unzipped-artifact>/article-preview`; open `http://127.0.0.1:4173/history_math/ru/articles/<stable-id>/`. The local server preserves the project base path. Stop it with Ctrl+C. Re-run CI to regenerate an expired artifact.

For article six follow the linked procedure: select through existing digests, read complete originals, document provenance and the private fragment ledger, fill the pinned FELab-owned schema/template, prepare under the existing Work lease, export one public package into an independent branch, run all required gates, compare both viewports, record evidence in FELab and request editorial review. Corrections belong in the FELab derivative before re-export; NAS originals remain unchanged.
