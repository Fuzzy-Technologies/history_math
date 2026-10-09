# ADR 0002: Review and publish directly through master

Status: accepted by owner instruction on 2026-10-09; effective when merged into master.

## Context

The journal has one production website and no separate integration environment. Keeping an approved change in develop requires another promotion PR before readers see it, without providing a distinct review or deployment boundary.

## Decision

Use master as the only permanent branch. Start short-lived feature/* branches from current master and open PRs directly into master. Keep owner review, current-head CI, editorial approval records, language suffixes, assignee and label requirements. The owner-approved merge is the publication decision; the existing master-only Pages workflow publishes it. Draft work stays in feature branches and draft PRs.

CI checks master and feature pushes and all PRs. Guarded cleanup handles merged feature PRs into master, retaining the existing repository, current-head and other-open-PR checks. No auto-merge or repository-wide automatic branch deletion is enabled.

## Transition

The transition PR starts from the complete develop tip and includes its unpublished changes together with this workflow update. Merge it into master using a merge commit to preserve ancestry. After the merge, fetch both branches, verify that the current develop tip is an ancestor of master, and verify that no open PR uses develop as its base or head before deleting develop. If develop has advanced, reconcile those commits first. Historical pilot records remain historical; their branch process is superseded by this decision.

## Consequences

One approved PR now delivers a change to readers. Independent unfinished articles remain isolated in their own branches. Validation, editorial review and production deployment restrictions remain unchanged.
