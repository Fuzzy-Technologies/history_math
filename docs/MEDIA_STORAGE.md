# Publication media in Kazakhstan Object Storage

Publication remains a GitHub PR process. Source checks run on pull requests;
owner-approved merges to `master` run the existing publication workflow. No
workstation, local S3 key, new service account or manual file transfer is needed.

## Destination and authority

Both workflows use the existing `history-math-storage` environment, restricted
to `master`. Only the upload step receives `S3_ACCESS_KEY_ID` and
`S3_SECRET_ACCESS_KEY`. Its four environment variables must match:

| Variable | Value |
| --- | --- |
| `S3_ENDPOINT_URL` | `https://storage.yandexcloud.kz` |
| `S3_REGION` | `kz1` |
| `S3_BUCKET` | `history-math-media-kz` |
| `S3_PUBLIC_BASE_URL` | `https://storage.yandexcloud.kz/history-math-media-kz` |

The existing bucket-scoped publisher account requires object upload/read, with
public HTTPS object reads. It does not need deletion, bucket administration or
cloud/folder permissions. Bucket versioning and access policy are infrastructure
configuration; publication does not change them. Credentials are consumed by
the pinned AWS S3 SDK and never written to receipts or frontend assets.

Objects use `originals/<sha256>/<filename>` or `pdf/<sha256>/<filename>`.
Names identify immutable bytes. Existing objects are publicly reverified and
reused; a changed file gets a new address. Publication does not rotate or delete
objects. Key rotation remains: issue a replacement key, update the environment
Secrets, verify publication, then revoke the former key.

## Automatic publication

`Publish approved master` retains its existing source, render, PDF and browser
gates. After producing validated PDFs, it:

1. Copies and publicly verifies the exact PDFs of the currently deployed site
   if its manifest still uses local PDF URLs. This happens automatically on the
   first migration deployment. Once the deployed manifest uses S3 URLs, this
   compatibility copy is skipped; no manual migration is required for published
   articles.
2. Enumerates all source image manifests and every PDF in the actual built site,
   including legacy/static PDF files outside the current article PDF directory.
3. Uses the original bytes from the repository or the existing verified GitHub
   Releases descriptors. It preserves texts, translations, source manifests,
   review records, approval digests, dates and original image bytes.
4. Uploads missing objects using the deployment account. Every object, including
   an existing object, must pass an anonymous HTTPS GET, complete SHA-256 and
   size comparison, MIME and attachment header checks.
5. Only after all objects pass, rewrites generated HTML, CSS and URL fields in
   JSON. Current and legacy pages use external PDFs. Reading images stay local;
   the native image viewer requests the bucket original only after a click.
6. Removes migrated originals and PDFs from the disposable Pages build output.
   It never deletes repository sources, Releases, NAS originals or S3 objects.
7. Rechecks built URLs, catalogs, locale indexes and final Pages size. For code
   changes, browser tests exercise actual S3 zoom/downloads on old and current
   RU/EN pages, mobile and desktop, with analytics stubbed.
8. Uploads the lightweight Pages artifact and deploys it only after those gates.

Transfer or verification failures block the new Pages deployment. The current
site remains live. Partial uploads are safe to reuse on a later run. A failure
after output pruning affects only the temporary runner output. Earlier objects
remain available for the previous site's links and for rollback.

The pre-migration size gate moves after media finalization: a temporary build
containing local PDFs must not block a valid lightweight Pages publication.
PDF rendering and its cache remain local to the runner and run before media
finalization; they do not depend on bucket CORS or remote original downloads.

## One-time copy of existing publications and pending PR media

The first normal publication automatically copies existing published PDFs and
master originals. For an additional bulk copy covering pending article PRs,
**Backfill existing publication media to S3** is available in the GitHub Actions
UI with ref `master`. It is an upload-only workflow using the same existing
deployment account and shares the publication concurrency lock.

It downloads the current deployed PDF manifest and copies the exact existing
PDF bytes without rendering new PDFs. It also inventories originals on master
and open same-repository `feature/article-*` PRs targeting `master`, pins each
PR's SHA, reads its JSON manifests as data and detects tracked PDFs. It does not
check out or execute PR code, change their approval records, commit, push,
merge, change links or deploy Pages. Foreign repositories and closed PRs are
excluded; truncated inventories and concurrent PR changes fail closed.

The retained Actions artifact contains public object URLs, sizes and SHA-256
receipts, the source master SHA and inspected PR SHAs. A retry reuses verified
content-addressed objects. The normal publication workflow independently
verifies everything it needs before deploying the new links.

Open article PRs inherit the shared publication behavior when approved and
merged; do not duplicate workflow changes into each article branch or modify
their approved image descriptors. Future PDFs are generated on master and
uploaded automatically. Existing PDFs detected in a PR are copied by backfill;
normal publication also handles any PDF present in its build output.

PR #284 proposes the older GitHub Releases PDF alternative. It must be reconciled
or withdrawn separately; it should not be merged alongside this S3 contract.

## Verification and rollout limits

Source tests cover corrupt copies, forbidden access, missing/changed receipts,
changed local files, path traversal, foreign destinations, legacy links,
project base paths and preservation of source files. Workflow tests ensure
master-only secrets and the upload/verify/prune/check/Pages ordering. Browser
and PDF checks run in the owner-approved master publication as required by the
development protocol. Source tests do not prove a real bucket upload occurred.

The draft does not authorize deleting source originals from Git. If removing
them from the repository is desired after successful migration, prepare a
separate reviewed change with stored receipts and approval-digest compatibility.
Do not rewrite history to reduce repository size.
