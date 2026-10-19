# Repository instructions

Read `DEVELOPMENT_PROTOCOL.md` before making changes. This repository is the public publication target for the Mathematics with Mansur project.

- Continue the current feature branch and preserve user changes. History rewriting is forbidden except for owner-authorized article preparation: verify external originals first, then replace only the pinned article branch with an atomic lease. Never rewrite `master`.
- Create short-lived `feature/*` branches from `master` and target `master` with PRs. The owner-approved merge also approves publication; there is no permanent integration branch.
- Assign every PR to `Tim55667757` and add the `documentation` label, including feature and publication PRs. Preserve other assignees and labels; verify both fields after creation.
- Do not self-merge, create product releases/tags, enable auto-merge, or create a backlog without explicit owner instruction. The owner has authorized content-addressed `article-originals-*` storage releases and preparation of the 190 unmerged article PRs; this does not authorize publication.
- Article publication requires Timur's final review and a new PR discussion comment or submitted overall review whose main body contains only `Approved` from `Tim55667757` (a `COMMENTED` review is valid). On 2026-10-19 he delegated final publication preparation and merging to the agent after that approval; he does not need to merge the article himself or confirm again.
- Bind approval to the reviewed article revision and retain its comment URL and source commit in the review record. Publication metadata and approval bookkeeping may be finalized without another approval when the reviewed prose, formulas, captions, translations and image bytes remain unchanged. Later editorial or image changes require a new `Approved`. Never manufacture approval or treat green CI as editorial approval.
- Keep implementation, comments, documentation, commits and PR descriptions in English. Localized UI and articles use their actual language.
- English is the default site locale, not a requirement on the original language of articles.
- Keep NAS/FELab as the editorial source of truth; no private paths, databases, sessions, logs or internal metadata belong here.
- Keep shared markup in layouts/includes. Apply base-path filters to site URLs.
- Public article statuses are only `published` and `demo`; ensure drafts have no direct output URL.
- Preserve preview/social/hero image roles; use assets with documented provenance.
- Run source contract, workflow, output and browser checks. Report actual results and unresolved limitations.
- Do not modify the corporate website as part of a history_math change.
