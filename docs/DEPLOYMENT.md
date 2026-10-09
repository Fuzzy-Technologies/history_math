# Deployment and repository setup

## Branch contract

- `master`: default branch, approved production source.
- `feature/*`: short-lived changes branched from `master`, reviewed through PRs directly to `master`.
- The owner-approved merge to `master` is also the publication decision. There is no permanent integration branch; see [ADR 0002](adr/0002-master-only-workflow.md).

`ci.yml` runs source, workflow, clean-build, output and browser checks and uploads only compact article reports. PR checks never obtain Pages/id-token write permissions. `deploy.yml` triggers only on pushes to master or manual dispatch, and both build and deploy jobs explicitly reject any ref other than `refs/heads/master`. Deployments use the GitHub Pages environment. Changing any workflow can change its policy; the administrative environment branch restriction below is a second boundary.

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

If Pages already exists, inspect it first and use `PUT` to update build_type instead of creating it. In Settings → Environments → github-pages, allow deployment branches/tags only from branch `master`, without requiring an additional reviewer. In Settings → Pages choose **GitHub Actions**, not branch-based deployment. Production changes require an owner-approved PR merge into master.

The GitHub connector and CLI authentication are independent. If `gh auth status` is unauthenticated, the owner must complete the browser/device authorization started by `gh auth login --hostname github.com --git-protocol https --web`. Never provide a PAT in chat or echo credentials. A connector-only session may write code and PRs while lacking callable administration endpoints; in that case report Description/Pages setup as incomplete.

## Existing feature cleanup

`cleanup-merged-branch.yml` uses `pull_request_target` only for closed PRs into master. There is no checkout and no shell executing PR content. Eligibility is rechecked in the script: merged, same repository, `feature/*`, unchanged head, no other open PR. A final head recheck catches changes observed during cleanup; repeated runs and already-deleted refs are safe. GitHub's delete-ref API has no compare-and-delete parameter, so a commit racing after the final read cannot be atomically excluded. Contributors should stop pushing to a merged feature and use a new branch for follow-up work.

The tests execute the actual inline workflow script with mocks for eligible, unmerged, wrong-base, protected branch, fork, advanced-head, concurrent-head, other-open-PR and deleted-ref cases. These tests do not represent a real merge event; that remains an owner-approved integration check. No branch is deleted as part of preparing this PR.

## Version pinning and validation

All Actions are pinned to full upstream commit SHAs. The implementation audit resolves each listed tag through GitHub's Git ref API. Ruby dependencies are locked in `Gemfile.lock`, browser dependencies in `package-lock.json`, and KaTeX assets are vendored at 0.16.10 with notices.

| Action                        | Verified tag | Commit                                     |
| ----------------------------- | ------------ | ------------------------------------------ |
| actions/checkout              | v7.0.1       | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| ruby/setup-ruby               | v1.327.0     | `14594264cd68ce8a2345dd349bc3d138a4ef85c8` |
| actions/setup-node            | v7.0.0       | `820762786026740c76f36085b0efc47a31fe5020` |
| actions/upload-artifact       | v7.0.1       | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| actions/configure-pages       | v6.0.0       | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` |
| actions/upload-pages-artifact | v5.0.0       | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| actions/deploy-pages          | v5.0.1       | `368f82528645a54fb793d4d04e342629a3f51346` |
| actions/github-script         | v9.0.0       | `d746ffe35508b1917358783b479e04febd2b8f71` |

Inspect the exact latest commit's CI run and compact report before merge. A workflow file existing in Git does not prove a successful execution. No release/tag is required for publication.
