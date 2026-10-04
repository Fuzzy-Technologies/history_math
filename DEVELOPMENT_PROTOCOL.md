# Development protocol

Version: 1.0. Project: Mathematics with Mansur (`history_math`). This owner-controlled contract applies to human contributors and automation. Its initial creation is authorized by the prototype task; future changes require owner instruction.

## Architecture and authority

The pipeline is editorial preparation in NAS/FELab → approved public Markdown/assets → Git → static Jekyll build. NAS remains the source of truth for editorial originals. Git stores website code, public publication copies, checks and documentation. No SQLite/FTS, locks, NAS paths, local session state or full `.felab.json` may be exported. FELab integration is out of scope for this prototype.

## Change process

1. Inspect live HEAD, worktree and repository instructions.
2. Define the affected content, layout or infrastructure contract.
3. Make a focused change on `feature/*` branched from `develop`.
4. Run relevant checks, inspect the diff, and capture browser evidence for layout changes.
5. Push without history rewriting and open a PR to `develop`.
6. Let Timur decide whether to merge. A separate `develop` → `master` PR approves publication.

Never merge a PR, publish a release/tag, or change visibility without explicit authorization. Do not enable auto-merge or repository-wide automatic branch deletion. The guarded existing cleanup workflow deletes only eligible merged feature branches into `develop`.

## Languages and editorial claims

The README, source code, comments and technical documentation must be written in English. Other languages belong only in localized site content, UI text and locale-specific test fixtures. Default locale and original article language are independent. Do not require English-first drafting or fabricate translations. Every public page has its own canonical URL. Only existing published counterparts share `translation_key` and hreflang.

Demo content must remain visibly marked and must not be attributed as authored scholarship by Mansur or Timur. Do not invent historical sources or license the authors' work. Keep factual claims grounded in actual supplied materials when real articles replace demos.

## UI and asset rules

Use the owner-requested sepia science-magazine design: ivory paper, dark brown ink, restrained copper accents, engraved illustrations and readable Cyrillic typography. Draw on mid-century editorial composition while keeping mobile reading vertical and comfortable. Avoid company-site neon effects, counters or analytics. All local paths must use the project base path. Keep shared layouts separate from Markdown article bodies. Respect reduced motion, keyboard focus, semantic navigation and responsive reading.

## Validation and evidence

Changes affecting source/publication contracts need mutation tests for rejected inputs. Validate built URLs, assets, languages, canonical/hreflang and indexes. Verify literal `$...$` and `$$...$$` through Markdown into the browser. Check search case, Cyrillic Yo/Ye equivalence, empty queries and no-result behavior, plus safe archive rotation. Capture desktop/mobile evidence, check console/request failures and run automated accessibility rules.

CI must succeed for the current PR SHA. The mere presence of a workflow is not evidence it ran. Cleanup mocks prove decision logic only; a real merged event remains unverified until an owner-approved merge. Production workflow guards must reject non-master refs even on manual dispatch. Do not claim the site was published when only a PR or artifact exists.
