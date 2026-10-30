# Public image size budget

The owner approved these final thresholds on 2026-10-30. They apply to every image format, every public original and reading derivative, existing publications, and unmerged article PRs. Units are decimal MB (1 MB = 1,000,000 bytes).

| File size            | Required handling                                                       |
| -------------------- | ----------------------------------------------------------------------- |
| Below 10 MB          | Preferred; retain the existing format when appropriate.                 |
| 10 MB to below 13 MB | Recommendation to reduce transfer/storage size; not a blocking finding. |
| 13 MB through 15 MB  | Critical warning; block without a one-use exception recorded in the PR. |
| Above 15 MB          | Hard failure; no exception or approval can bypass it.                   |

A critical exception identifies the exact public image SHA-256, byte count, reason and PR note. It applies only to that immutable object. A different hash or larger size needs a new review note. Never silently turn a critical warning into a general project exemption.

## Normalization

For oversized raster originals, produce a JPEG at the same pixel dimensions. Use quality 100 first, 4:4:4 chroma sampling, and reduce quality only as far as necessary to fit 15,000,000 bytes. Preserve ICC color profiles and orientation. Verify the decoded JPEG dimensions and complete SHA-256 before upload and after public download. Never call JPEG lossless.

Preserve transparency, animation and high-bit-depth data explicitly; do not silently flatten or discard them. If an oversized file cannot meet the contract safely, fail with the exact file and reason. Smaller original formats may remain unchanged. Reading previews do not need to be enlarged or regenerated solely because the download format changes.

## Migration and review

Inventory the complete bucket, including noncurrent versions and historical PDF objects, as well as all published and pending article image manifests. Preserve a mapping from each replaced object's original SHA-256 to the new JPEG identity. Existing PDF documents above the bucket's 15 MB ceiling must be optimized while preserving their pages and content; changing their filename is insufficient.

Upload and verify replacements, update full-view and original-download URLs, and verify publication before retiring oversized objects. A versioning delete marker alone does not remove a stored noncurrent version. Do not report the bucket clean until an authenticated, fully paginated inventory of objects and versions contains zero files above 15,000,000 bytes.

All pending PRs retain their draft/publication status and unresolved editorial questions. Technical normalization is authorized by the owner's explicit instruction; it is not an editorial `Approved`. Their review reports and PR notes must show any size recommendation, critical exception, or blocking oversize file.
