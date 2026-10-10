# Automatic publication dates

The website publication date is the Moscow calendar day of the first commit on
`master`'s first-parent history whose article metadata has `status: published`.
For a normal PR merge or squash, this is the merge commit's committer timestamp,
not the author's timestamp or the time the article was prepared on a branch.
Direct commits to `master`, if used, follow the same rule. This does not claim to
record the later Pages deployment completion time.

The resolver keys records by `article_id` and `lang`. File moves, content edits,
removal/restoration, unpublishing/republishing and repeated builds retain the first
publication. Translations have independent publication dates. Drafts and demo
content do not establish publication. Keep article identities stable.

Omit `date` when preparing new articles. Legacy source dates remain intact for
editorial package hashes but are overridden in memory during a repository build.
`original_publication` and `updated` remain separate editorial metadata. The shared
Jekyll `date` reaches cards, search/discovery, article details, citations and the
HTML used to generate PDFs; changed print HTML invalidates the existing PDF cache.
No generated commits, API token, extra deployment or LLM is needed.

## Builds and previews

Run `npm ci` before Jekyll and use a full checkout (`fetch-depth: 0`). Repository
builds resolve `refs/remotes/origin/master` by default. Fetch `origin/master` before
local builds. Inspect the evidence with:

```sh
node scripts/publication-dates.mjs . refs/remotes/origin/master
```

Production pins `HISTORY_MATH_PUBLICATION_REF` to the exact deployed master SHA
and sets `HISTORY_MATH_PUBLICATION_STRICT=1`. Missing public identities, missing
refs, malformed historical metadata or shallow history stop publication. A
rebuild of an older master SHA therefore reproduces its dates, even if the branch
has advanced.

In PR previews, newly approved articles not yet in `master` retain Jekyll's
provisional date (an optional legacy source date, or the preview build date).
This is not their final publication date. Standalone preview/test fixtures without
Git use the same fallback; strict production never does. Existing articles in PR
previews use their real master publication dates. The current archive is restored
from history automatically, without rewriting approved Markdown or review hashes.

## Checks

`npm test` covers real temporary Git repositories: drafts, review branches,
merge/squash, batched articles, independent languages, Moscow midnight, stable
identities and missing/shallow history. `tests/publication_test.rb` also verifies
the actual Jekyll output and strict missing-publication failure.
