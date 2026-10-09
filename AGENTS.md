# Repository instructions

Read `DEVELOPMENT_PROTOCOL.md` before making changes. This repository is the public publication target for the Mathematics with Mansur project.

- Continue the current feature branch; preserve user changes and never reset or force-push.
- Create short-lived `feature/*` branches from `master` and target `master` with PRs. The owner-approved merge also approves publication; there is no permanent integration branch.
- Assign every PR to `Tim55667757` and add the `documentation` label, including feature and publication PRs. Preserve other assignees and labels; verify both fields after creation.
- Do not self-merge, create releases/tags, enable auto-merge, or create a backlog without explicit owner instruction.
- Keep implementation, comments, documentation, commits and PR descriptions in English. Localized UI and articles use their actual language.
- English is the default site locale, not a requirement on the original language of articles.
- Keep NAS/FELab as the editorial source of truth; no private paths, databases, sessions, logs or internal metadata belong here.
- Keep shared markup in layouts/includes. Apply base-path filters to site URLs.
- Public article statuses are only `published` and `demo`; ensure drafts have no direct output URL.
- Preserve preview/social/hero image roles; use assets with documented provenance.
- Run source contract, workflow, output and browser checks. Report actual results and unresolved limitations.
- Do not modify the corporate website as part of a history_math change.
