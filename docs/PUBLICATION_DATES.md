# Automatic publication dates

## Owner-authorized Teletype migration

The 2026-10-11 migration retains each article's visible Teletype date. Set
`original_publication.outlet: Teletype`, its verified visible `date`, and the
current HTTPS article `url`; `source_url` must match that URL. Only the
`teletype.in/@history_math/` archive qualifies. Store the same date in the
review derivative for previews. The original metadata timestamp may disagree
with the visible date and is not substituted. Other articles retain the
ordinary master-history rule below. The four earlier migrated articles use
the same exception; their existing editorial text and images are preserved.

For an explicit owner-authorized date correction outside that archive, set
`original_publication.preserve_date: true` alongside a valid original `date`.
On 2026-10-11 the owner requested 2024-03-25 for both Rumovsky versions
(`hm-0b1ea17c8b02`); their Telegram attribution is retained. The flag is opt-in:
other original outlet dates continue to use the ordinary rule below.

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
