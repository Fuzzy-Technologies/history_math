# Deployment and repository setup

## Branch contract

- `master`: default branch, approved production source.
- `develop`: integrated editorial preparation; never public deployment.
- `feature/*`: changes reviewed through PRs to `develop`.

`ci.yml` runs source, workflow, clean-build, output and browser checks and uploads prototype/evidence artifacts. PR checks never obtain Pages/id-token write permissions. `deploy.yml` triggers only on pushes to master or manual dispatch, and both build and deploy jobs explicitly reject any ref other than `refs/heads/master`. Deployments use the GitHub Pages environment. Changing any workflow can change its policy; the administrative environment branch restriction below is a second boundary.

## Administrative setup

These are actual GitHub settings, not README substitutes. Perform only the authorized changes below; do not enable auto-merge, change visibility, apply reviewer requirements that block the single owner, or enable global delete_branch_on_merge.

Repository Description:

> A multilingual journal of the history of mathematics: people, ideas, problems, and instruments. A Fuzzy Technologies knowledge project.

With an authenticated GitHub CLI that has repository administration permission:

```sh
gh auth status
gh repo edit Fuzzy-Technologies/history_math --description "A multilingual journal of the history of mathematics: people, ideas, problems, and instruments. A Fuzzy Technologies knowledge project." --default-branch master
gh api --method POST repos/Fuzzy-Technologies/history_math/pages -f build_type=workflow
```

If Pages already exists, inspect it first and use `PUT` to update build_type instead of creating it. In Settings → Environments → github-pages, allow deployment branches/tags only from branch `master`, without requiring an additional reviewer. In Settings → Pages choose **GitHub Actions**, not branch-based deployment. Setting Pages to Actions does not publish this feature prototype; production waits for a separately approved master merge.

The GitHub connector and CLI authentication are independent. If `gh auth status` is unauthenticated, the owner must complete the browser/device authorization started by `gh auth login --hostname github.com --git-protocol https --web`. Never provide a PAT in chat or echo credentials. A connector-only session may write code and PRs while lacking callable administration endpoints; in that case report Description/Pages setup as incomplete.

## Existing feature cleanup

`cleanup-merged-branch.yml` was installed on master before develop and feature branches were created. It uses `pull_request_target` only for closed PRs into develop. There is no checkout and no shell executing PR content. Eligibility is rechecked in the script: merged, same repository, `feature/*`, unchanged head, no other open PR. A final head recheck catches changes observed during cleanup; repeated runs and already-deleted refs are safe. GitHub's delete-ref API has no compare-and-delete parameter, so a commit racing after the final read cannot be atomically excluded. Contributors should stop pushing to a merged feature and use a new branch for follow-up work.

The tests execute the actual inline workflow script with mocks for eligible, unmerged, wrong-base, protected branch, fork, advanced-head, concurrent-head, other-open-PR and deleted-ref cases. These tests do not represent a real merge event; that remains an owner-approved integration check. No branch is deleted as part of preparing this PR.

## Version pinning and validation

All Actions are pinned to full upstream commit SHAs. The implementation audit resolves each listed tag through GitHub's Git ref API. Ruby dependencies are locked in `Gemfile.lock`, browser dependencies in `package-lock.json`, and KaTeX assets are vendored at 0.16.10 with notices.

| Action | Verified tag | Commit |
|---|---|---|
| actions/checkout | v4.2.2 | `11bd71901bbe5b1630ceea73d27597364c9af683` |
| ruby/setup-ruby | v1.207.0 | `4a9ddd6f338a97768b8006bf671dfbad383215f4` |
| actions/setup-node | v4.4.0 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| actions/upload-artifact | v4.6.2 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| actions/configure-pages | v5.0.0 | `983d7736d9b0ae728b81ab479565c72886d7745b` |
| actions/upload-pages-artifact | v3.0.1 | `56afc609e74202658d3ffba0e8f6dda462b719fa` |
| actions/deploy-pages | v4.0.5 | `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` |
| actions/github-script | v8.0.0 | `ed597411d8f924073f98dfc5c65a23a2325f34cd` |

Inspect the exact latest commit's CI run and downloadable artifacts before merge. A workflow file existing in Git does not prove a successful execution. No release/tag is required for publication.
