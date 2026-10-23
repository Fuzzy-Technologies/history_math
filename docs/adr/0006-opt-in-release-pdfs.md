# Opt-in GitHub Release storage for generated PDFs

Status: proposed infrastructure candidate; PDF relocation is **not authorized or enabled** by this document. It requires a separate owner decision and explicit activation of the repository variable `ARTICLE_PDF_RELEASE_STORAGE=true` after code review.

## Contract

The default publication path continues generating, validating and publishing local PDFs. The existing warning at 800,000,000 bytes and hard block at 1,000,000,000 bytes remain unchanged. Source article text, translations, approval digests, PDF generation, reading images and the PDF cache are unchanged.

With the separate opt-in enabled, the trusted `master` build still generates and checks every local PDF first. A read-only plan hashes the complete built output, checks every PDF signature, identity and existing download control, and calculates a conservative final size. It rejects missing/orphaned PDFs, symbolic links, stale local references and a result that cannot meet the existing size limit. The full checked output, pinned plan and verified old-PDF cache pass between jobs through a one-day Actions artifact, never through a PR artifact or repository commit.

Only a separate `master` job has `contents: write`. It checks the repository, event, immutable commit, clean checked-out code and explicit opt-in again in Python. It uses the existing original-storage HTTP transport and credential-free download verifier. No PR code, dependencies or artifact-supplied executable is run in this job.

PDFs use sixteen prerelease storage containers, `article-pdfs-<first SHA-256 character>`. Tags must point to a commit in the current approved `master` ancestry. A pre-existing tag is checked before creating a missing Release, and the resulting tag is checked again afterward. Creation uses the current `master` commit, never a feature head. Assets contain the readable article identity, full SHA-256 and terminal language suffix. Existing assets are reused only when their provider state, URL, mandatory SHA-256 digest and size match. Assets are never overwritten or deleted. Full buckets stop publication rather than discard history.

For **every** PDF, the storage job checks both GitHub's provider digest/size and the SHA-256/size of an anonymous native Release download. It does not accept a provider digest alone, an API HTML/JSON response or a forged receipt as proof of public bytes. Until all files pass, the local output remains intact and its links remain local. Remote failure can leave unreferenced immutable assets for retry; it cannot produce a partially switched site.

After successful verification, the job copies the unchanged non-PDF files into a new temporary directory, checks their hashes, changes only the existing PDF button's `href` and `download` attributes, and writes a version-3 built PDF manifest. It never mutates the input directory or hardlinks mutable files. The new directory retains exactly the previously public PDFs listed in the pinned compatibility manifest, with their original bytes and paths; other generated PDFs use Release delivery. Descriptor/coverage/link checks, native RU/EN browser downloads with and without JavaScript, and the unchanged size gate run before the Pages artifact is uploaded. Deployment requires the selected local or external path to succeed; a failed, cancelled or unexpectedly skipped storage job cannot fall back to publishing missing PDFs.

## Existing direct URLs

`site/assets/pdf-compatibility.json` pins all 58 PDFs from the last successful live deployment, commit `ee813b940797237bf9fc36b36cd3ff2e4206a14c`, run `39802600955`, attempt `2`. It records the original public manifest SHA-256, every local path, exact live SHA-256 and byte size, and their 216,536,165-byte total. These are the downloaded live bytes, not regenerated PDFs from a different build origin. No absolute cache paths or private metadata are published.

The read-only fetch step checks the current public PDF inventory before and after anonymously fetching this cache. The storage job repeats the inventory check before any provider write. A newer local PDF URL outside the pinned list stops relocation until the compatibility list is reviewed and refreshed. On later external deployments, every previously retained path and hash must remain in the new list. Missing, changed or unsafe cache files, a changed public origin/base path, an omitted old catalogue identity, or a mismatch between retained output and its bound manifest blocks publication.

After all new external PDFs pass provider and anonymous verification, the output receives exact copies of these 58 old files at their unchanged `/assets/pdf/...` URLs. Thus an already shared direct URL still returns its original PDF while the article button can offer the newly generated version. There are no redirects or proxy pages. Final validators hash every retained file and reject extra or missing local PDFs; the native delivery gate requests every retained direct URL and checks its bytes. Future additions to this compatibility list need explicit review and consume Pages capacity.

## Reader behaviour and limits

The existing visible, localized PDF control remains a normal link and works without JavaScript. Reading controls, article pages, canonical URLs and citations stay on the journal site. There is no site redirect page, client-side download rewrite, proxy, analytics or new storage service. GitHub handles its native attachment/CDN transport as it already does for archived original images.

GitHub's attachment response controls the suggested cross-origin download filename. The content-addressed filename retains the article identity and terminal `-ru.pdf` or `-en.pdf`, but adds the full checksum. The old byte-for-byte filename cannot be guaranteed without a proxy or one-release-per-version scheme. This is an explicit owner-review tradeoff, not a promise that an HTML `download` attribute overrides GitHub's response.

The version-2 manifest remains the local generation/cache/colour-QA input. Version 3 is a post-build delivery manifest only: it retains each logical PDF identity and binds its exact external descriptor and source commit. The final standard-library output validator accepts both versions, rejects unknown versions/fields and never treats arbitrary external URLs as verified storage. Native browser checks are a delivery gate, not a substitute for complete server-side byte verification. Feature source checks do not upload assets or render a website.

GitHub currently documents fewer than 2 GiB per asset and at most 1,000 assets per release. Those boundaries fail closed; the deployment ceiling is not raised. Provider availability and future policy changes remain external dependencies, as with existing original-image storage.

## Activation and migration

1. Review and merge the infrastructure separately, keeping the repository variable unset. The publication remains on the local path.
2. Check the last successful live deployment and refresh the pinned compatibility list if necessary. Fetch and verify the exact old public bytes, then review a private read-only plan against the actual approved build, including both new and retained PDF counts/hashes, HTML controls and projected size. The fetch step reads the public site; planning itself makes no network requests or writes.
3. Obtain the owner's separate decision covering relocation and the checksum-bearing download filenames. Only then enable `ARTICLE_PDF_RELEASE_STORAGE=true` and dispatch the guarded `master` publication.
4. The first real run must verify all provider/public bytes, native downloads, final URLs/assets and final size. Keep its plan and receipt. No local mock or dry run establishes real Release delivery or successful publication.

Planning example (the report stays outside public output):

```sh
python3 scripts/external_pdfs.py fetch --compatibility-dir test-results/pdf-compatibility-cache --report test-results/pdf-compatibility-fetch.json
python3 scripts/external_pdfs.py plan --site-dir _site-pages --compatibility-dir test-results/pdf-compatibility-cache --report test-results/pdf-storage-plan.json
```

The private 390-edition aggregate is a capacity upper bound, not an approved publication. Retaining old direct URLs adds 216.5 MB to the original external-only proposal and leaves roughly 56 MB below the unchanged 1 GB ceiling. The final exact plan is the authority for remaining headroom. The existing 800 MB warning still applies, and future catalogue growth can exhaust this reduced margin.

## Retry and rollback

A failed storage/verification job uploads no Pages artifact, so the last successful deployment remains live. Retry the same approved `master` revision: immutable matching assets are reused and downloaded again. Do not delete a suspicious asset or replace its bytes to make checks pass; investigate the mismatch.

Disabling the repository variable restores the local path for the next build. It can publish only if **all local PDFs plus the site fit the unchanged 1 GB gate**. For a larger catalogue, disabling storage deliberately blocks publication; it does not hide PDFs or silently restore oversized local output. Keep the last successful deployment while the owner chooses a reviewed rollback. A previously validated deployment artifact can be retained as rollback evidence under the normal Pages controls; do not bypass `master` approval or raise the budget. Retain existing Release assets so links from previously downloaded/shared pages continue to work. Preserve the pinned local compatibility PDFs when restoring a previous validated external artifact. Rebuilding from sources does not reproduce their exact old bytes, so keep the live-byte receipt and cache as rollback evidence. Reverting this infrastructure never changes article bodies or removes author originals.

## References

- [Release asset metadata and anonymous binary delivery](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28)
- [Release storage limits](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [GitHub-generated asset digests](https://github.blog/changelog/2025-06-03-releases-now-expose-digests-for-release-assets/)
