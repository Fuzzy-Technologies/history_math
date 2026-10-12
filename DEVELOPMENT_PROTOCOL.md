# Development protocol

Version: 1.2. Project: Mathematics with Mansur (`history_math`). This owner-controlled contract applies to human contributors and automation. Its initial creation is authorized by the prototype task; future changes require owner instruction.

## Architecture and authority

The pipeline reads existing FELab metadata and NAS originals, prepares public Markdown/assets in this repository, and builds them through Jekyll. FELab is used only as a read-only source of existing article metadata and digests; images come from each original article's corresponding NAS directories. Do not add code, branches, targets, production Works or cache records to the private FELab for this site. NAS remains the source of truth for original author material. This repository owns the article schema, templates, checks, documentation and the single editable publication derivative. Private reconciliation evidence stays in ignored local files here. No SQLite/FTS, locks, NAS paths, local session state or full `.felab.json` may be exported. [ADR 0001](docs/adr/0001-archive-article-pilot.md) describes the owner-authorized review pilot; production publication still requires human approval.

## Change process

1. Inspect live HEAD, worktree and repository instructions.
2. Define the affected content, layout or infrastructure contract.
3. Make a focused change on `feature/*` branched from `master`.
4. Run relevant checks, inspect the diff, and capture browser evidence for layout changes.
5. Push without history rewriting and open a PR to `master`. Assign it to `Tim55667757`, add the `documentation` label, and verify both fields. The owner-authorized article preparation exception below permits replacing a pinned article branch after verified external storage.
6. Let Timur decide whether to merge. The merge into `master` approves publication and starts the existing Pages deployment. No second promotion PR is required.

For article PRs, complete editorial corrections and technical checks before requesting the owner's final review. Timur must review the final version, explicitly write `Approved`, and merge the article PR himself. Neither a technical PASS, an infrastructure merge nor an agent-written approval record substitutes for this decision. Record only approval actually given by the owner; any later change to article text or images requires renewed review and `Approved` for that version. This rule was explicitly reaffirmed by the owner on 2026-10-12.

Never merge a PR, publish a release/tag, or change visibility without explicit authorization. Do not enable auto-merge or repository-wide automatic branch deletion. The guarded existing cleanup workflow deletes only eligible merged feature branches into `master`.

The owner has explicitly authorized preparation automation and parallel processing of article PRs #56–#245. Article-original storage releases use only `article-originals-*` tags anchored to clean `master`, immutable content-addressed asset names, and verified SHA-256 receipts. They are storage containers, not product releases or approval to publish articles. Preparation may replace an unmerged same-repository article branch with a clean commit after all excluded originals have been publicly downloaded and verified. Use a pinned head and an atomic lease; stop on concurrent changes. Retain the PR number, texts, dates, previews, pending editorial review, assignees and labels. Never rewrite `master`, remove source originals from NAS, or claim GitHub has purged old PR objects.

Feature and PR checks validate source data and contract unit tests. Site rendering, browser checks and PDF generation belong to the owner-approved `master` publication workflow. This follows the owner's instruction to avoid feature-site builds and browser checks during preparation.

Every PR, including publication PRs and drafts, must have `Tim55667757` as an assignee and the `documentation` label. Add these fields without replacing other assignees or labels. The PR metadata workflow applies this rule on opening and reopening; contributors must still verify it. Historical PRs were reconciled at the owner's request.

## Languages and editorial claims

The README, source code, comments and technical documentation must be written in English. Other languages belong only in localized site content, UI text and locale-specific test fixtures. Default locale and original article language are independent. Do not require English-first drafting or fabricate translations. Every public page has its own canonical URL. Only existing published counterparts share `translation_key` and hreflang.

Automation comments, summaries, recommendations and generated PR descriptions use local message dictionaries. Read the actual PR head branch, including forks: a lowercase terminal `-ru` selects Russian, a lowercase terminal `-en` selects English, and every other name falls back to English. Intermediate `ru`, uppercase suffixes and `-ru-fix` do not select Russian. This rule never changes article `lang`; check codes and required CI names remain stable. Technical success means that editorial review is pending, not that scientific review or publication approval has occurred.

Demo content must remain visibly marked and must not be attributed as authored scholarship by Mansur or Timur. Do not invent historical sources or license the authors' work. Keep factual claims grounded in actual supplied materials when real articles replace demos.

## UI and asset rules

Use the owner-requested sepia science-magazine design: ivory paper, dark brown ink, restrained copper accents, engraved illustrations and readable Cyrillic typography. Draw on mid-century editorial composition while keeping mobile reading vertical and comfortable. Avoid company-site neon effects, counters or analytics. All local paths must use the project base path. Keep shared layouts separate from Markdown article bodies. Respect reduced motion, keyboard focus, semantic navigation and responsive reading.

## Validation and evidence

Changes affecting source/publication contracts need mutation tests for rejected inputs. Validate built URLs, assets, languages, canonical/hreflang and indexes. Verify literal `$...$` and `$$...$$` through Markdown into the browser. Check search case, Cyrillic Yo/Ye equivalence, empty queries and no-result behavior, plus safe archive rotation. Capture desktop/mobile evidence, check console/request failures and run automated accessibility rules.

CI must succeed for the current PR SHA. The mere presence of a workflow is not evidence it ran. Cleanup mocks prove decision logic only; a real merged event remains unverified until an owner-approved merge. Production workflow guards must reject non-master refs even on manual dispatch. Do not claim the site was published when only a PR or artifact exists.
