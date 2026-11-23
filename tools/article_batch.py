#!/usr/bin/env python3
"""Prepare one article PR from an explicit dispatch on the trusted master branch."""

import argparse
import json
import os
from pathlib import Path
import re
from types import SimpleNamespace

from article_publish import GitHubAPI, GitReader, apply_receipt, run_prepare


REPOSITORY = "Fuzzy-Technologies/history_math"
OWNER = "Tim55667757"
BRANCH = re.compile(r"^feature/article-([a-z0-9][a-z0-9-]*)-(ru|en)$")
SHA = re.compile(r"^[a-f0-9]{40}$")


def repo_path(path):
    return f"/repos/{REPOSITORY}{path}"


def validate_pr(pr, repository=REPOSITORY):
    """Accept only live, same-repository article PR data, never PR code."""
    branch = pr.get("head", {}).get("ref", "")
    match = BRANCH.fullmatch(branch)
    if not match or pr.get("state") != "open" or pr.get("merged") or pr.get("merged_at"):
        raise ValueError("Expected an open, unmerged article PR")
    if pr.get("base", {}).get("ref") != "master":
        raise ValueError("Article PR must target master")
    for ref in ("head", "base"):
        if (pr.get(ref, {}).get("repo") or {}).get("full_name") != repository:
            raise ValueError("Privileged preparation does not accept fork PRs")
    sha = pr["head"].get("sha", "")
    if not SHA.fullmatch(sha):
        raise ValueError("Article source must be pinned to a commit")
    number = pr.get("number")
    if isinstance(number, bool) or not isinstance(number, int) or number <= 0:
        raise ValueError("Invalid PR number")
    return {"number": number, "branch": branch, "sha": sha, "id": match[1]}


def authorized_actor(actor, api):
    if actor == OWNER:
        return
    permission = api.get(repo_path(f"/collaborators/{actor}/permission")).get("permission")
    if permission not in ("write", "maintain", "admin"):
        raise ValueError("Preparation requires a repository writer")


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def requested_article(args, api):
    if (args.repository != REPOSITORY or os.environ.get("GITHUB_EVENT_NAME") != "workflow_dispatch"
            or os.environ.get("GITHUB_REF") != "refs/heads/master"):
        raise ValueError("Preparation requires a workflow dispatch on master")
    if not SHA.fullmatch(args.base_sha or "") or args.base_sha != os.environ.get("GITHUB_SHA"):
        raise ValueError("Preparation requires the immutable dispatch commit")
    event = json.loads(Path(args.event_file).read_text(encoding="utf-8"))
    number = event.get("inputs", {}).get("pr")
    if not isinstance(number, str) or not re.fullmatch(r"[1-9][0-9]*", number):
        raise ValueError("Provide one positive article PR number")
    authorized_actor(os.environ.get("GITHUB_ACTOR", ""), api)
    item = validate_pr(api.get(repo_path(f"/pulls/{number}")))
    if item["number"] != int(number):
        raise ValueError("GitHub returned a different PR")
    return item


def plan(args, api):
    item = requested_article(args, api)
    result = {"plan_version": 1, "repository": REPOSITORY, "base_sha": args.base_sha,
              "apply": True, "articles": [item]}
    write_json(args.output, result)
    print(f"Pinned PR #{item['number']} at {item['sha']}")


def prepare_article(args, api):
    data = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    item = requested_article(args, api)
    if (data.get("plan_version") != 1 or data.get("repository") != REPOSITORY
            or data.get("base_sha") != args.base_sha or data.get("apply") is not True
            or data.get("articles") != [item]):
        raise ValueError("The plan must match this dispatch and the live article head")

    number = item["number"]
    reader = GitReader(Path(args.workspace) / "git", REPOSITORY)
    options = SimpleNamespace(repository=REPOSITORY, base_sha=args.base_sha, source_sha=item["sha"],
                              branch=item["branch"], pr=number, article_id=item["id"],
                              workspace=Path(args.workspace) / str(number),
                              receipt_out=Path(args.workspace) / "receipts" / f"{number}.json",
                              prepare=True, delivery_probe=True, dry_run=False)
    receipt = {**item, "source_sha": item["sha"]}
    try:
        receipt = run_prepare(options, api=api, reader=reader)
        receipt["applied"] = apply_receipt(receipt, api=api, reader=reader)
        current = api.get(repo_path(f"/pulls/{number}"))
        if validate_pr(current)["sha"] != receipt["applied"]["new_sha"]:
            raise ValueError("The prepared head changed before CI dispatch")
        if OWNER not in [a["login"] for a in current.get("assignees", [])]:
            api.post(repo_path(f"/issues/{number}/assignees"), {"assignees": [OWNER]})
        if "documentation" not in [label["name"] for label in current.get("labels", [])]:
            api.post(repo_path(f"/issues/{number}/labels"), {"labels": ["documentation"]})
        api.post(repo_path("/actions/workflows/ci.yml/dispatches"), {"ref": item["branch"]})
        receipt["status"] = "prepared"
    except Exception as error:
        receipt.update(status="failed", error=str(error)[:1500])
        print(f"PR #{number}: {error}", flush=True)

    # Preserve the receipt format consumed by existing preparation reports.
    write_json(args.output, {"receipt_version": 1, "repository": REPOSITORY,
                             "base_sha": args.base_sha, "shard": 0, "receipts": [receipt]})
    print(f"PR #{number}: {receipt['status']}", flush=True)
    return 0 if receipt["status"] == "prepared" else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", default=REPOSITORY)
    parser.add_argument("--base-sha", required=True)
    parser.add_argument("--event-file", required=True)
    parser.add_argument("--plan")
    parser.add_argument("--output", required=True)
    parser.add_argument("--workspace", default="test-results/article-preparation")
    args = parser.parse_args()
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise SystemExit("GITHUB_TOKEN is required for trusted preparation")
    api = GitHubAPI(args.repository, token, max_wait_seconds=21600)
    if args.plan:
        return prepare_article(args, api)
    plan(args, api)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
