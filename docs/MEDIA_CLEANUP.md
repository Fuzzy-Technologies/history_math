# Current publication media and obsolete copies

## Storage contract

Object Storage is the delivery location for current PDFs and full-resolution
images and raster reading previews. GitHub Pages serves HTML, styles, fonts, logos and local SVGs. The Git repository contains those public sources and approval metadata.
NAS/FELab remains the editorial source of truth.

There is **no previous-PDF archive and no grace-period timer**. When manual cleanup runs, retain only media required by the current public manifests/pages,
current master sources and the changed files of open PRs, including drafts.
An older base snapshot in a draft must not pin unrelated old published images.

The cleanup removes unreferenced `pdf/` and `originals/` objects, their old
versions and delete markers. For a current content key, only its latest version
is needed; an explicit current `versionId` link protects that exact version.
Stable PDF aliases select current objects rather than every old hash sharing a
filename. An unresolved content alias stops cleanup. Filenames without a current
counterpart receive no automatic archive exemption.

The two exact 2026-10-29 infrastructure probe keys listed in the script are also
retired, including their versions. Other infrastructure keys and unclassified
prefixes are outside media cleanup. Nothing changes NAS originals, article
prose/dates, editorial approvals or Git history.

## Publication and source safety

Ordinary publication reuses current Pages receipts for stored objects. Only new keys receive a conditional upload and one public HEAD. JPEG preparation uses the pinned registry and published receipts. The PDF renderer uses local reading images. Article preparation preserves approved release descriptors and looks up previously published originals in the Pages receipt.

Cleanup inventories all relevant object/version and GitHub pages, pins master,
open PR heads/descriptions and public manifest digests, and reads PR content as
bounded, Git-verified data. It never executes PR code. Forks, truncated trees,
unsafe paths, corrupt identities and missing current media stop cleanup.

All current/draft media must pass public status, size, MIME and SHA-256 metadata
checks. Reference guards run immediately before every deletion. S3 requests use
exact version IDs; GitHub requests use exact asset/artifact/cache IDs. The
remaining S3 inventory must equal the initial inventory minus the deletion
journal. Public media is rechecked afterwards.

## GitHub storage

`article-originals-*` Release attachments are migration copies, not the canonical
archive. Every referenced attachment must map to an exact current S3 object or
an owner-authorized JPEG conversion. Before deleting any GitHub copies in a
batch, the job anonymously downloads and verifies all corresponding S3 bytes.
It preserves direct current GitHub download links until they are migrated.

The 27 unreferenced original asset IDs audited on 2026-11-01 are explicitly
listed for retirement. Unknown new uploads are reported as staging inputs,
not deleted merely because their PR has not appeared yet. Individual asset
deletion cannot erase a concurrently uploaded asset with another ID. Release
containers, product releases and tags are not deleted.

Completed-run production media archives, superseded reports/review previews and
obsolete master PDF caches are removed. Active/queued/waiting runs, the latest
review preview and report for each current open-PR head, the newest
current Pages transfer/report and one current master PDF rendering cache per
runner platform remain. Dependency caches are outside this policy. The current
PDF cache speeds deterministic rendering; it is separate from published S3 media.

GitHub deletion observes its remaining REST quota, reserves 100 calls and handles
at most 800 resources per run. `remaining` and `complete` in the exact-ID journal
are authoritative: quota exhaustion is a partial cleanup, not a claim that all
copies disappeared. The daily maintenance job resumes from a fresh inventory.
GraphQL reference checks use their separate point budget; source blobs are read
from pinned public Git URLs with Git SHA verification.

## Jobs and rollout

Manual dispatch of **Audit and maintain current media storage** defaults to audit only. Set `clean_github=true` to enable GitHub cleanup after the audit. The GitHub-only job receives no S3 credentials. No scheduled or post-deployment inventory runs.

Manual `clean_s3=true` enables a separate S3-only recovery job after a successful
audit, including when a storage failure prevents a new deployment. It takes the
same `github-pages` workflow lock as publication before the audit starts, so a
publisher cannot upload pending files while recovery inventories and deletes.
The `--apply-s3` CLI mode requires an explicit trusted master `workflow_dispatch`
context; scheduled runs cannot enable it. It re-inventories the actual live site,
master and every open PR, checks all current objects, guards every exact-version
deletion and reconciles the result. No previous-PDF archive or age delay is added.
S3 and GitHub recovery jobs independently depend on the audit: denied S3 deletion
does not prevent verified GitHub cleanup. They share the writer concurrency group.

Public manifests/pages, source blobs, current-object HEADs and GitHub reference
reads retry only transient transport, timeout, rate-limit and gateway failures,
at most three times. Permission, TLS, metadata, integrity and reference races
still stop cleanup. GitHub DELETE requests are never automatically retried.
Upload errors retain a bounded HTTP status and recognized S3/network error code;
upstream messages, credentials and signed URLs are not logged.

The existing publisher account and `history-math-storage` environment are reused.
Before rollout, an administrator must read/back up the actual bucket policy.
The restored `DenyPublisherObjectDeletion` blocks the publisher even with
`storage.editor`; another allow cannot override it. Prepare a minimal reviewed
diff permitting the existing principal `b2ba989ikfe34gsbr49v` to delete versions
under `pdf/*`, `originals/*` and the two exact retired probe keys over HTTPS.
Preserve HTTPS enforcement, public reads, administrator access and deletion
protection for other prefixes. No Actions job changes bucket policy or IAM.
Re-read the accepted policy through the API; console validation is not evidence
that an API-supported HTTPS condition is invalid.

Merge through the owner-approved PR process only after source CI succeeds.
The next manual cleanup plan is based on its actual new live manifests,
not an old listing or a guessed age. If permissions prevent deletion, the
incremental journal records the real failure and the current site stays live.
Manual recovery instead protects the still-current live publication until a new
deployment has succeeded. Authenticated inventories are retained before deletion
and progress identifies the last completed audit stage even when a later read fails.

Actions retains compact plans and exact deletion journals, never PDF archives.
The maintenance reports expire after seven days, and superseded reports are
eligible for cleanup earlier. There is no S3 observation checkpoint. Reverting
code cannot undelete exact versions: recovery uses current source material and
republishing, not an automatically retained previous PDF.
