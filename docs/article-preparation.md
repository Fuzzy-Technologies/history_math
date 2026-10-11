# Automated article preparation

One article remains one branch and one PR into `master`. The owner-authorized
2026-10-11 preparation adds external original-image storage to the existing
article template. NAS/FELab remain the editorial source of truth. Automation
does not grant editorial approval, translate prose or change mathematics.

## Contributor workflow

1. Copy the article template and fill the Russian and English editions. Use
   `site/_articles/ru/<id>.md` and `site/_articles/en/<id>-en.md`. Their
   `article_id` values are `<id>` and `<id>-en`; both `translation_key` and
   `source_work_id` identify `<id>`. Keep `status: draft` during preparation.
2. Put the shared original images in `site/assets/images/<id>/`. Images may
   arrive with their original names. Set the figures and image roles in both
   editions to those exact paths; retain captions, attribution and rights
   information. The existing root-level `<id>.ru.md` / `<id>.en.md` layout is
   also accepted without moving articles or changing their URLs.
3. Include `reviews/<id>.json` and `reviews/<id>-en.json` with an explicit
   `approval.status: pending` and any editorial questions. Use existing tags;
   automated preparation never invents a topic, license, source or date.
4. Open the article PR into `master`. Preparation validates the package,
   chooses short lowercase image names where needed, updates both editions'
   image paths, and generates missing reading previews. The existing assignee
   and label rules still apply. Contributors keep working in the same branch
   and PR after preparation.

Published legacy inventories remain compatible with site checks. New article
packages use their own
`site/_data/article_image_assets/<id>.json` inventory, so independent PRs do
not modify a shared image registry.

## Preparation command

Install dependencies in the trusted automation checkout with `npm ci`. Image
generation additionally uses the pinned authoring dependencies in
`tools/requirements-images.txt`. Run the CLI from that trusted checkout:

```sh
python3 tools/article_prepare.py --root /path/to/article-checkout \
  --article-id hm-tt-example --check --report /path/to/private-report.json
python3 tools/article_prepare.py --root /path/to/article-checkout \
  --article-id hm-tt-example --write --report /path/to/private-report.json
```

`--check` writes no publication files and exits unsuccessfully when preparation
is needed or package data are invalid. `--write` prepares the publication
derivative after validating its scope and bytes. A canonical package remains
byte-for-byte identical on every run. Optional repeated `--changed-path`
arguments let a caller reject PR changes outside this one article's files.

The JSON report contains original and preview SHA-256 digests, before/after
body digests, renamed assets, changed paths, preparation state and the existing
human decision. Store processing reports and source receipts outside public
Git. Reports are technical evidence, not a publication or scientific review.

The `--root` checkout is read as data. Its scripts, workflows, package files and
dependencies are never executed. YAML and schema validation resolve from the
trusted runtime. Unknown files, symlinks, nested asset directories, traversal,
foreign article paths, duplicate metadata keys, stale bytes and unsupported
image types are rejected with an explicit diagnostic; nothing is silently
discarded.

## Preserved content and image delivery

Preparation preserves titles, prose, formulas, dates, tags, captions, notes,
attribution, rights statements and review decisions. It normalizes only
insignificant source line endings/trailing whitespace outside literal code and
mathematics. Markdown hard breaks retain their spaces. Existing readable image
names, original image bytes and valid reading previews remain unchanged.
Renames update figure records and cover/preview/hero roles together in both
languages. Missing previews use the site's trusted image generator; originals
are never recompressed. Animation remains animation.

The external publishing step is separate from this formatter. It uploads an
original under an immutable checksum name, verifies the uploaded bytes and
records its `external_original` descriptor in the article inventory. The
logical `/assets/images/<id>/...` figure path remains stable. Reading previews
stay in the article's Git branch; opening or downloading the original resolves
to the verified external asset. An existing external descriptor is validated
and preserved, never replaced by an unverified URL.

After upload verification, the authorized migration reconstructs the unmerged
article branch from the current trusted base with the prepared files. It uses
an expected-head check so another contributor's intervening changes are never
overwritten. Deleting an image in a later ordinary commit would leave its
bytes in history; rebuilding the unmerged branch avoids that ancestry. The PR
number and discussion remain. GitHub may retain earlier PR references, so this
does not promise immediate deletion of every server-side object.

PDFs are build outputs rather than committed authoring files. Generate them
after the owner approves the article and merges into `master`; PR preparation
uses source checks without a local site build or browser session. The owner
reviews the complete bilingual article, images and any open editorial questions
before deciding whether to publish.
