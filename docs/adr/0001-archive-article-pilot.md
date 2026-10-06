# ADR 0001: Archive-linked article preparation and review

Status: implemented on the pilot feature branch; awaiting owner review. Date: 2026-10-07.
This is the first numbered ADR in this repository. It complements the owner-controlled development protocol.

## Context

Archival articles need a faithful, inspectable public package, while NAS remains the editorial authority. A successful static build cannot establish completeness, mathematical correctness or permission to publish. FELab currently has an NAS Git origin, without a PR service; the site has a GitHub origin.

## Decision

FELab owns `contracts/history-math/article-v1.schema.json`. The site consumes a byte-identical snapshot in `schemas/article-v1.schema.json`, with its FELab commit and SHA-256 in `contract-lock.json`. Update the canonical schema, commit it, regenerate the snapshot and lock, and test both consumers together. The snapshot is not an independently editable contract. The filled and minimal site templates are validated against it.

NAS originals and archival `long.txt` remain unchanged. FELab creates a production Work containing a reference to the historical Work and one editable derived `publications/site_history_math/article.md`, its assets and private reconciliation evidence. No second canonical `long.txt` is created. SQLite/FTS remain rebuildable projections. FELab Git contains code, the schema, tests and instructions; site Git contains the public export only. Export conflicts require reconciliation in FELab and cannot overwrite user edits.

Required metadata includes stable article/source IDs, actual authors, content language, title, description, rubric, topics, editorial state, permalink and a documented placement basis. Previous outlet/date and website placement date are separate. Unknown dates, affiliations, DOIs and licenses are absent. Drafts have no placement date. Authors are displayed from their array. Figure records require alternative text, caption, source and placement basis; image roles remain distinct.

Use GFM/kramdown Markdown, explicit H2 anchors, ordinary tables, footnotes and reference links. Use `$...$` and `$$...$$`; the existing dollar-protection hook feeds vendored KaTeX 0.16.10 with trust disabled. Macro packages, arbitrary active HTML and arbitrary Liquid are outside the pilot grammar. Unsupported constructs are blocking `HM_MATH`/`HM_STRUCTURE` findings, with a separate editor question when conversion is ambiguous. Shared figure markup belongs in an include and applies `relative_url`.

The source gate validates schema, IDs, paths, figure inventory, Markdown grammar, internal references and KaTeX parsing. Jekyll builds a review artifact with explicit `article_review: true`; ordinary/production builds still exclude drafts before rendering. Review pages are visibly marked and noindexed; drafts remain absent from search and sitemap. Output and Chromium gates check real URLs/assets/anchors, language metadata, formula counts/rendering, images and desktop/mobile overflow. JSON reports retain stable codes and `pass`, `fail` or `not_run` for each required check; absent checks cannot produce a technical PASS. Markdown summaries use the same data. External source fetching is advisory and never establishes an invalid source from an outage.

Automation uses only a literal lowercase terminal `-ru` suffix for Russian, terminal `-en` for English, and English otherwise. It reads the actual PR head branch, including forks. This does not change content `lang`. Local RU/EN dictionaries require no LLM. Check codes and the `Article package` CI job name remain stable.

Unprivileged content checks have read-only permissions and no persisted checkout credentials. A separate `pull_request_target` job checks out no contributor code, reads only the trusted base's message dictionary and Actions API metadata, and updates one bot comment. It serializes updates per PR, checks the live head immediately before writing, and rejects older run IDs/attempts. GitHub has no atomic compare-and-update comment API; a push between the final head read and write remains a narrow service race, superseded by the new run. A timeout is incomplete, not PASS.

Site infrastructure has a PR into `develop`. Five independent article branches start at that infrastructure branch and temporarily target it. Each content PR contains one article, assets and a public reconciliation record. PR validation runs for these bases and feature pushes. After infrastructure acceptance, retarget each content PR to `develop` and rerun checks. All PRs retain the required assignee and label. Human approval precedes publication through a separate `develop` → `master` PR; no automatic merge or deployment is part of the pilot.

The current GitHub `pull_request_target` context uses the default branch. Before the owner installs this new workflow there, a bootstrap trigger restricted to the maintainer-owned `feature/archive-pilot-en` branch discovers its open article PRs through the API and applies the identical comment operation. It reads its own trusted commit's local dictionary, executes no article checkout and has no publication permissions. Manual dispatch is restricted to that same infrastructure ref. Once temporary-base PRs are retargeted, bootstrap finds no articles. See [GitHub's trigger contract](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target).

## Alternatives

HTML-only transcription loses a manageable author format; PDF-only publication limits accessible reading and formula inspection. Independent schemas would drift. Copying originals into site Git would expose private research and create competing sources. LLM-only validation would be nondeterministic and unavailable offline. Rendering drafts in ordinary builds would violate the publication boundary. Privileged PR checkout would expose write credentials to contributor code.

## Consequences and limitations

The initial pilot includes short complete archival texts rather than translating articles. Complex DOCX/superscripts and source-image tables require manual reconciliation. Visual checks catch obvious defects, not semantic formula errors. Existing source mistakes and uncertain factual claims become editor questions. Technical success is exactly “Technical checks passed; editorial review pending.” Review artifacts expire after 14 days and can be regenerated. The FELab NAS origin cannot host a PR until an owner supplies an authorized review service.

See [the next-article procedure](../ARTICLE_PREPARATION.md) and the FELab companion ADR.
