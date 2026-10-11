# External storage for article originals

Status: owner-authorized implementation, pending infrastructure PR review.

## Decision

Contributors continue submitting a single article package in a feature branch and PR to `master`. The package contains both language files, article review records and the original images. Trusted preparation code treats these files as data. It validates the package, assigns safe asset paths, creates local reading previews, and stores original image bytes as GitHub Release assets.

Originals use immutable names containing the article ID, image stem and complete SHA-256. Sixteen `article-originals-<hex>` release containers distribute assets by the first checksum character. Storage tags point to an existing clean `master` commit and do not change the latest product release. A second article referring to the same original can reuse a verified asset; existing assets are never overwritten.

The public image manifest retains the logical original path and records its release URL, public API asset URL, SHA-256 and byte count. Reading uses the local preview. Opening or downloading the original fetches its exact bytes lazily and checks its checksum. PDFs use the local reading preview; they are generated only by the approved master publication workflow and never committed to Git.

## Preparation and authority

The privileged workflow checks out only trusted base code, never PR scripts or dependencies. Fork PRs receive ordinary read-only source checks. Same-repository article preparation requires a repository writer; repository-wide preparation and the initial 190-PR bootstrap require the owner. Source heads are pinned before any work.

Preparation first validates source and preview bytes, then uploads each original and independently downloads it from public storage to verify its length and SHA-256. Only after every excluded original has a verified receipt may it create a clean article commit. The commit has one trusted base parent and reuses the existing text, review and preview blobs. An atomic force-with-lease protects the branch from concurrent edits. A failed upload, invalid package, unavailable original delivery or changed PR head leaves the branch intact.

The initial bootstrap produces receipts without moving PR heads. The authorized migration workers apply those receipts to the existing PRs. After the infrastructure is merged, the trusted PR workflow applies the same guarded preparation and explicitly dispatches source CI, because ref changes made with `GITHUB_TOKEN` do not trigger ordinary workflow events.

Technical preparation never grants editorial approval, changes publication dates, translates text, edits formulas, invents tags or sources, or merges a PR. NAS remains the source of truth for author originals. Runtime plans and receipts are workflow artifacts rather than public repository files.

## Storage and history

Release assets are outside the Git object history. New clones and article merges therefore carry previews rather than full originals. GitHub documents a per-asset limit below 2 GiB and a maximum of 1,000 assets per release. This design does not use Git LFS or require a paid external storage account. GitHub service limits can change; uploads handle API quota responses and preserve verifiable checkpoints.

Rewriting an unmerged branch removes original blobs from its reachable publication history. It does not guarantee immediate removal from GitHub's internal PR references, cached objects, existing clones or reflogs. Deleting a branch alone is insufficient to erase merged history. A fresh clone after preparation avoids old local objects; the automation does not run destructive garbage collection on contributor workspaces.

## References

- [GitHub release storage limits](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [Removing repository data and PR reference limitations](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
