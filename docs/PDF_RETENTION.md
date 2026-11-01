# Retention of previous publication PDFs

## Scope and retention period

Old publication builds consume space in **Object Storage**, under
`pdf/<sha256>/<filename>.pdf`. Deleting GitHub articles, Releases, source images
or Git history does not perform this cleanup. This maintenance job does not
change any of them and never deletes anything under `originals/`.

The retention period is **24 complete hours after the first successful,
authenticated observation that a version is unreferenced**. Object creation
time alone never establishes eligibility. The version itself must also be at
least 24 hours old. Missing state starts a new grace period; corrupt state stops
the job. There is no immediate purge on rollout.

The following remain protected regardless of age:

- Every PDF in both current public manifests, plus PDF links in the actual
  published article HTML. Every version of a protected content key is kept.
- PDF references in tracked UTF-8 files on current `master` and **every open
  same-repository PR**, including drafts, and in those PRs' descriptions.
  Tracked PDF bytes also protect their exact content-addressed S3 identity.
  PR code is read as bounded data and is never executed.
- The newest previous content key for each currently published PDF filename,
  providing one previous build for rollback. All versions of that key stay.
- Unknown or withdrawn filenames without a current published counterpart.
  These require manual review rather than automatic collection.

A literal S3 PDF URL or key in a tracked source file pins that content key.
A stable `/assets/pdf/en/<filename>.pdf` or `/assets/pdf/ru/<filename>.pdf`
reference conservatively pins **all** versions of that filename. Removing a
reference restarts the 24-hour clock on the next successful observation.
Reintroducing a reference clears its previous unreferenced observation.

Stable article/download pages continue to select the current PDF. Direct
immutable URLs to an otherwise unreferenced historical build can expire after
this policy's grace period. External bookmarks cannot be inventoried; pin an
old PDF in tracked source when it must remain available indefinitely.

## Scheduling and safety gates

`Audit PDF retention` runs weekly on Sunday at 01:17 UTC (04:17 Moscow).
It observes references and writes a small checkpoint; it **cannot delete**.
Manual dispatch defaults to `dry-run`, which writes only a local report.
`observe` records the grace period without deleting PDFs.

The `pdf_retention` job in `Publish approved master` runs only after successful
Pages deployment and oversized-media retirement. It shares the existing
`github-pages` concurrency lock, so publication cannot replace the site during
deletion. The independent weekly workflow uses another concurrency group to
avoid displacing a pending publication from GitHub's pending slot.

Deletion is disabled by default. Without the variable
`PDF_RETENTION_DELETE_ENABLED=true`, the post-deployment job only observes.
The CLI also rejects `--apply` outside an enabled trusted post-deployment
`master` push/manual context. No PR receives storage credentials.

Before observation or deletion, the job:

1. Completes paginated authenticated PDF version inventory and source trees.
   Fork PRs, truncated trees, submodules, symlinks, unavailable or oversized
   text blobs, corrupt PDF bytes and ambiguous identities stop maintenance.
2. Checks current article pages against their PDF manifest and the publication
   receipt. Full-view image URLs must point to verified S3 originals; reading
   previews remain on Pages. All current PDFs must pass anonymous HEAD status,
   size, MIME and stored SHA-256 metadata checks. Normal publication still
   performs full-byte integrity verification.
3. Pins `master`, open PR heads and description digests, and public manifest
   digests. It rereads these before recording state and immediately before
   **each exact `DeleteObject` request with a nonempty `VersionId`**. A change
   stops further deletion. It never issues a key-only delete or bulk purge.
4. Reconciles every remaining PDF version against the exact deletion journal,
   then rechecks all current public PDFs. Reports retain incremental results
   even when an S3 request fails partway through a batch.

There is no atomic transaction across GitHub, Pages and S3. The publication
lock prevents managed deployment races; immediate reference rechecks and the
24-hour grace reduce the remaining PR-edit race. Do not use an external bucket
cleanup process concurrently. No blanket Lifecycle expiration may target
`pdf/`: an old object can still be the current publication.

## Checkpoint and evidence

The existing bucket stores only the maintenance checkpoint at
`maintenance/pdf-retention-v1.json`. It contains public keys, version IDs,
sizes and timestamps, never credentials or PR body text. Existing public-read
policy means this checkpoint is public; it contains no private source paths.

Updates use `If-Match` with the read ETag or `If-None-Match: *` on creation.
A concurrent write fails instead of overwriting another observation. These
headers are supported by [Yandex Object Storage PutObject](https://yandex.cloud/en/docs/storage/s3/api-ref/object/upload).
Bucket versioning also retains previous checkpoint versions; their small
size is not included in the PDF deletion scope. Do not reset the checkpoint
to accelerate cleanup.

Actions retains compact `plan.json`, `summary.json`, and, for an enabled
deletion, `retirement.json` and `inventory-after.json` artifacts for 90 days.
The plan includes retained reasons, exact candidate versions/bytes and the
inspected revision identities. Reports contain no PDF archives. A denied
request reports the actual status and advises checking IAM, explicit policy
denials and object locks; `storage.editor` alone cannot override a deny.

## Rollout using the existing account

No new server, account, key or paid service is required. Use the existing
`history-math-storage` environment and fixed Kazakhstan storage variables.

1. Merge the reviewed implementation through the normal owner-approved PR
   process. Leave `PDF_RETENTION_DELETE_ENABLED` unset. Follow its first
   observation report; check the 334-current-PDF baseline against the actual
   site, all open PR identities, retained reasons and zero first-run deletions.
   Counts can change as new articles are published.
2. Run the weekly audit manually in `dry-run` if a new report is needed. A
   failed/incomplete audit must be fixed; do not substitute a listing-only
   cleanup. The checkpoint starts aging candidates only in `observe`.
3. Before enabling deletion, an administrator with existing bucket-policy
   authority must read and back up the **actual** policy through the API.
   `DenyPublisherObjectDeletion` was restored after the 2026-11-01 cleanup;
   it currently blocks both deletion actions for publisher
   `b2ba989ikfe34gsbr49v` (`history-math-publisher`). Do not grant broad delete
   access or remove HTTPS enforcement. Prepare a reviewed minimal policy diff
   that permits that principal's `s3:DeleteObject` / `s3:DeleteObjectVersion`
   only for `arn:aws:s3:::history-math-media-kz/pdf/*` over HTTPS, retains an
   explicit deletion deny for `originals/*`, `maintenance/*` and **all other
   non-PDF prefixes in the complete bucket inventory**, and preserves the
   other five policy statements unchanged. An additional allow does not
   override the existing global deny. With bucket-scoped `storage.editor`,
   every non-PDF prefix must remain explicitly denied. Future non-PDF
   prefixes require the same infrastructure review.
4. Confirm checkpoint GetObject/conditional PutObject and ListBucketVersions
   permissions. The existing upload/read rule may already cover the new
   checkpoint; never expose additional credentials in the repo. Verify the
   accepted policy by rereading the API. If the cloud console rejects the
   spelling of `aws:SecureTransport`, do not delete working HTTPS conditions
   to satisfy its form validator; use the documented API representation.
5. After a complete report and the reviewed policy change, set environment
   variable `PDF_RETENTION_DELETE_ENABLED` to the exact string `true`. The
   next successful master publication can delete only matured candidates.
   There is no separate scheduled destructive job. If no publication occurs,
   eligible versions wait until the next publication.

To pause deletion, unset the enable variable; weekly observation can continue.
If necessary, restore the saved publisher deletion deny through the API.
Never automatically toggle bucket policy inside Actions. Deleted exact
versions cannot be undeleted by reverting this code; use protected rollback
PDFs and source material to republish when necessary.
