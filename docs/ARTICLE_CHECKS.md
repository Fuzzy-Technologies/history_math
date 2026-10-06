# Article check results and actions

This implements [ADR 0001](adr/0001-archive-article-pilot.md). The mandatory gate set is `source`, `build`, `output`, `browser`; the stable required CI job is `Article package`. JSON keeps stable codes and machine states. Human reports and generated descriptions use `schemas/messages.json`, selected solely by the actual head branch suffix. No LLM or external source fetch is required.

| Code | Blocking error | Warning or editorial finding | Unable to complete |
| --- | --- | --- | --- |
| HM_METADATA | Missing/invalid schema field, calendar date or language URL | None | Unreadable source blocks the source gate |
| HM_IDENTIFIER | Duplicate article identity, URL, translation identity or displayed figure ID | None | Cannot assess an unreadable package |
| HM_PATH | Traversal, escaped asset root or unsupported URL | None | Inaccessible filesystem blocks assessment |
| HM_IMAGE | Referenced local asset is absent | None | Undecodable images also block the browser gate |
| HM_FIGURE | Missing caption, alternative text, provenance or image-role inventory | None | An inaccessible asset cannot pass visual verification |
| HM_STRUCTURE | Missing sections, active/raw media HTML, unsupported Liquid or private operational data | None | Unparseable front matter blocks assessment |
| HM_LINK | Missing internal anchor, footnote or reference definition | None | Actual rendered anchors additionally require the browser gate |
| HM_MATH | Unbalanced delimiters, unsupported KaTeX syntax or missing math opt-in | A suspected mathematical mistake is separately HM_EDITOR | Missing parser/browser cannot establish a PASS |
| HM_CONTRACT | Snapshot differs from its pinned SHA-256 | None | Missing schema/lock blocks validation |
| HM_BUILD | Stock Jekyll returns an error | None | Missing tool or stale/unavailable preview is blocking; downstream gates remain not_run |
| HM_OUTPUT | Broken generated URLs/assets/language/index contracts | None | Missing build/tool prevents a successful output gate |
| HM_BROWSER | Failed request/console, missing image/anchor, formula count/render failure or overflow at either viewport | None | Missing browser/preview blocks the gate; it is never silently skipped |
| HM_REQUIRED | Required assessment throws an error | not_run identifies each absent downstream gate | Missing, skipped or cancelled mandatory work is incomplete, never PASS |
| HM_EXTERNAL | Never establishes source invalidity | External links are left for editorial verification; outages alone are not errors | No fetch is required for technical success |
| HM_EDITOR | Never a technical error by itself | Source fidelity, OCR, attribution and factual questions require an editor | An unanswered question remains open after a technical PASS |

Every finding includes its source file/line when applicable, a stable code, severity, explanation and action. For example, `HM_IMAGE` names the missing asset and instructs the author to add it or correct its path. Tool diagnostics remain in their original language beneath a localized explanation. JSON reports bind the result to the checked head SHA; a CI preview also carries `review-build.json`, which must match it before local reuse. Screenshots and the preview are available in the linked Actions run's `article-review-<sha>` artifact for 14 days.

The source-only command intentionally leaves the other mandatory gates `not_run`. Its process can succeed as a partial source check while its overall report remains incomplete. The full command exits successfully only when all four gates pass. The trusted comment job additionally requires the complete `Prototype checks` workflow to succeed, including its existing `verify` job. Skipped, cancelled or absent mandatory work is incomplete. It updates one marked bot comment, checks the live head again before writing and rejects older run IDs/attempts.

Technical success is “Technical checks passed; editorial review pending.” Automatic build/render checks do not prove complete transfer or correct mathematics. The private FELab ledger records which source fragments, numerical table cells, formulas and image captions were actually compared; remaining manual questions stay explicit. English and fallback language behavior are regression-tested with Russian content rather than fabricated article translations.
