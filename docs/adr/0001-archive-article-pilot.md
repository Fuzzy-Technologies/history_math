# ADR 0001: Archive-linked article preparation and review

Status: implemented on the pilot feature branch; awaiting owner review. Date: 2026-10-07.
This is the first numbered ADR in this repository. It complements the owner-controlled development protocol.

## Context

Archival articles need a faithful, inspectable public package, while NAS remains the authority for originals. A successful static build cannot establish completeness, mathematical correctness or permission to publish. The owner clarified that the existing private local FELab is only a source of article metadata and digests, and article images already live in the corresponding NAS directories. The separate public GitHub FELab project is not a mirror of that private project and is outside this pilot's implementation.

## Decision

This repository owns the canonical `schemas/article-v1.schema.json`, identified by `urn:history-math:article:1`. Node validation and the site's Jekyll pipeline consume this contract from the same checkout; no cross-repository schema copy is required. `schemas/contract-lock.json` records the owning repository, canonical path, version and SHA-256. Update the schema and integrity lock together and test both templates and all five pilot articles. The filled and minimal site templates are validated against this schema.

NAS originals and archival `long.txt` remain unchanged. Existing FELab SQLite/FTS are rebuildable local caches used only for read-only candidate discovery; open SQLite with `mode=ro`. Read full sources and selected images from their existing NAS article directories, then prepare one editable publication derivative in `site/_articles/<id>.<lang>.md`, assets in `site/assets/images/<id>/`, and public reconciliation in `reviews/<id>.json`. Source IDs retain a private mapping to the original Work. Private paths, hashes, fragment coverage and local review evidence stay in ignored `test-results/private/`, outside public Git and CI logs. Local source copies and validation artifacts are evidence snapshots, not separately editable articles. Review corrections are made in the site branch. No FELab code, branch, production Work, publication target or cache mutation is needed.

Required metadata includes stable article/source IDs, actual authors, content language, title, description, rubric, topics, editorial state, permalink and a documented placement basis. Previous outlet/date and website placement date are separate. Unknown dates, affiliations, DOIs and licenses are absent. Drafts have no placement date. Authors are displayed from their array. Figure records require alternative text, caption, source and placement basis; image roles remain distinct.

Use GFM/kramdown Markdown, explicit H2 anchors, ordinary tables, footnotes and reference links. Use `$...$` and `$$...$$`; the existing dollar-protection hook feeds vendored KaTeX 0.16.10 with trust disabled. Macro packages, arbitrary active HTML and arbitrary Liquid are outside the pilot grammar. Unsupported constructs are blocking `HM_MATH`/`HM_STRUCTURE` findings, with a separate editor question when conversion is ambiguous. Shared figure markup belongs in an include and applies `relative_url`.

The source gate validates schema, IDs, paths, figure inventory, Markdown grammar, internal references and KaTeX parsing. Jekyll builds a review artifact with explicit `article_review: true`; ordinary/production builds still exclude drafts before rendering. Review pages are visibly marked and noindexed; drafts remain absent from search and sitemap. Output and Chromium gates check real URLs/assets/anchors, language metadata, formula counts/rendering, images and desktop/mobile overflow. JSON reports retain stable codes and `pass`, `fail` or `not_run` for each required check; absent checks cannot produce a technical PASS. Markdown summaries use the same data. External source fetching is advisory and never establishes an invalid source from an outage.

Automation uses only a literal lowercase terminal `-ru` suffix for Russian, terminal `-en` for English, and English otherwise. It reads the actual PR head branch, including forks. This does not change content `lang`. Local RU/EN dictionaries require no LLM. Check codes and the `Article package` CI job name remain stable.

Unprivileged content checks have read-only permissions and no persisted checkout credentials. A separate `pull_request_target` job checks out no contributor code, reads only the trusted base's message dictionary and Actions API metadata, and updates one bot comment. It serializes updates per PR, checks the live head immediately before writing, and rejects older run IDs/attempts. GitHub has no atomic compare-and-update comment API; a push between the final head read and write remains a narrow service race, superseded by the new run. A timeout is incomplete, not PASS.

Site infrastructure has a PR into `develop`. Five independent article branches start at that infrastructure branch and temporarily target it. Each content PR contains one article, assets and a public reconciliation record. PR validation runs for these bases and feature pushes. After infrastructure acceptance, retarget each content PR to `develop` and rerun checks. All PRs retain the required assignee and label. Human approval precedes publication through a separate `develop` → `master` PR; no automatic merge or deployment is part of the pilot.

The current GitHub `pull_request_target` context uses the default branch. Before the owner installs this new workflow there, a bootstrap trigger restricted to the maintainer-owned `feature/archive-pilot-en` branch discovers its open article PRs through the API and applies the identical comment operation. It reads its own trusted commit's local dictionary, executes no article checkout and has no publication permissions. Manual dispatch is restricted to that same infrastructure ref. Once temporary-base PRs are retargeted, bootstrap finds no articles. See [GitHub's trigger contract](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target).

## Alternatives

HTML-only transcription loses a manageable author format; PDF-only publication limits accessible reading and formula inspection. Independent schemas would drift. Adding preparation/export code and derived Works to private FELab exceeds its read-only role for this task. Keeping separately editable NAS and Git derivatives would create competing versions. Copying complete originals or private research into site Git would expose internal material. LLM-only validation would be nondeterministic and unavailable offline. Rendering drafts in ordinary builds would violate the publication boundary. Privileged PR checkout would expose write credentials to contributor code.

## Consequences and limitations

The initial pilot includes short complete archival texts. Complex DOCX/superscripts and source-image tables require manual reconciliation. Visual checks catch obvious defects, not semantic formula errors. Existing source mistakes and uncertain factual claims become editor questions. Technical success is exactly “Technical checks passed; editorial review pending.” Review artifacts expire after 14 days and can be regenerated. A missing FELab PR service is irrelevant because this implementation changes only the site repository. Private local evidence must be retained separately from expiring CI artifacts.

See [the next-article procedure](../ARTICLE_PREPARATION.md).
