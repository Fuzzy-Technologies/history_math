# Publication media in Kazakhstan Object Storage

Publication remains a GitHub PR process. Source checks run on pull requests;
owner-approved merges to `master` run the existing publication workflow. No
workstation, local S3 key, new service account or manual file transfer is needed.

## Destination and authority

Media workflows use the existing `history-math-storage` environment, restricted
to `master`. Only designated storage steps receive `S3_ACCESS_KEY_ID` and
`S3_SECRET_ACCESS_KEY`. Its four environment variables must match:

| Variable             | Value                                                  |
| -------------------- | ------------------------------------------------------ |
| `S3_ENDPOINT_URL`    | `https://storage.yandexcloud.kz`                       |
| `S3_REGION`          | `kz1`                                                  |
| `S3_BUCKET`          | `history-math-media-kz`                                |
| `S3_PUBLIC_BASE_URL` | `https://storage.yandexcloud.kz/history-math-media-kz` |

The upload path requires object upload/read, with public HTTPS object reads.
The separate owner-authorized cleanup also needs scoped version deletion for
managed media. It does not need bucket administration or cloud/folder
permissions. Bucket versioning and access policy are infrastructure
configuration; publication does not change them. Credentials are consumed by
the pinned AWS S3 SDK and never written to receipts or frontend assets.

Objects use `originals/<sha256>/<filename>`, `pdf/<sha256>/<filename>` and
`previews/<sha256>/<filename>`.
Names identify immutable bytes. Publication reuses the recorded delivery identity of each existing object. A changed file gets a new address. Cleanup runs on explicit dispatch.
Key rotation remains: issue a replacement key, update the environment
Secrets, verify publication, then revoke the former key.

[Current media cleanup](MEDIA_CLEANUP.md) keeps the current site's and open
drafts' required PDFs/images. There is no previous-build archive or grace-period
timer. It also removes verified GitHub migration copies, old Actions artifacts
and superseded PDF caches. Bucket policy remains an infrastructure responsibility.

## Automatic publication

The master build compares the current tree with the last successfully deployed revision. It reads a single JSON receipt from GitHub Pages. On the first incremental release it also imports the preview inventory retained by GitHub from verified publication #677. A missing, incomplete or stale receipt stops the build before any bucket operations. The receipt travels with the Pages deployment, independently of Actions cache and artifact expiry after cutover.

Unchanged editions keep their published PDF URLs. A new article, revised text or a changed article image can produce a new PDF. The renderer uses local reading assets. The publisher builds the current link manifest locally and reuses confirmed originals, PDFs and reading previews without a GET, HEAD or LIST against storage.

For each new content-addressed key the publisher validates local SHA-256, size and the existing file budget. It sends a conditional PUT with Content-MD5 and confirms public availability once with a bodyless HEAD. The check compares length, type, filename and SHA-256 metadata. A retry after an interrupted release can receive HTTP 412 for its own immutable key and complete the same metadata check. Failure stops the Pages upload. The workflow logs counts of reused keys, PUTs and HEADs separately for publication media and reading previews.

Output validation, URL rewriting and size checks run on the runner. The published receipt records the commit and the new active identities. A source-only PR, a rebuild of unchanged material and preparation of a previously published original do not download bucket objects. Storage inventories, cleanup and bulk integrity checks are explicit maintenance operations.

## One-time copy of existing publications and pending PR media

For an explicitly requested bulk copy covering published material or pending article PRs,
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
content-addressed objects. Ordinary publication consumes the receipts of the last deployed site.

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

Cleanup deletes verified redundant Release binaries, not Git history or the
unchanged source descriptors bound to editorial approval. Current reading images,
logos and print assets remain in Git. Do not rewrite history to reduce size.

## Bounded original downloads

The 2026-10-30 owner instruction supersedes preservation of oversized PNG bytes in public downloads. `docs/IMAGE_SIZE_POLICY.md` sets a 10 MB recommendation, a 13 MB critical warning with an exact-object PR exception, and a non-overridable 15 MB ceiling. All upload paths enforce that ceiling, including manual backfill.

`site/_data/image_publication.json` pins each authorized PNG-to-JPEG conversion by source hash, source size, unchanged dimensions, exact JPEG hash/size and quality. The pinned Pillow encoder uses 4:4:4 sampling and tries quality 100 first. The registry includes pending article packages; their JPEG downloads can be prepared without publishing their articles. Existing reading previews and editorial source evidence remain intact.

The master workflow prepares missing JPEG bytes, checks them against the registry, uploads and publicly verifies them, and rewrites full-view/download controls to the JPEG's S3 URL and filename. Previously verified JPEG objects are reused. A complete authenticated object/version inventory is available through manual maintenance. Upload-only publication does not claim that old versions were deleted: retirement requires separate deletion rights and verification that live links have switched.

## Reading previews in Object Storage

The `history-math-storage` environment setting `PREVIEW_DELIVERY_BASE_URL` selects
where the production build serves WebP and JPEG article previews. Set it to
`https://storage.yandexcloud.kz/history-math-media-kz` for direct delivery from
the existing bucket. An empty setting builds a self-contained Pages preview
tree. Any other destination stops publication.

After PDF rendering and WebP optimization, publication computes the SHA-256 of
each final file. Missing objects are uploaded under `previews/<sha256>/<filename>`
with the matching `image/webp` or `image/jpeg` MIME type, inline disposition
and immutable cache headers. Unchanged WebP and JPEG keys reuse their published receipts. Each new immutable key receives a conditional upload and a single public HEAD before its links are published.

The build rewrites article and catalog markup, responsive image candidates,
social metadata and discovery/search indexes. SVGs stay at their existing paths.
PDF rendering and local source checks still use the byte-pinned repository
previews. Roll back by clearing `PREVIEW_DELIVERY_BASE_URL` and redeploying
`master`. Existing bucket URLs also continue working after rollback.
