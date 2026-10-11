#!/usr/bin/env python3
"""Plan and prepare article PRs using trusted code and pinned source commits."""

import argparse
import json
import os
from pathlib import Path
import re
from types import SimpleNamespace

from article_publish import GitHubAPI, GitReader, run_prepare


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
        if pr.get(ref, {}).get("repo", {}).get("full_name") != repository:
            raise ValueError("Privileged preparation does not accept fork PRs")
    sha = pr["head"].get("sha", "")
    if not SHA.fullmatch(sha):
        raise ValueError("Article source must be pinned to a commit")
    number = pr.get("number")
    if isinstance(number, bool) or not isinstance(number, int) or number <= 0:
        raise ValueError("Invalid PR number")
    return {"number": number, "branch": branch, "sha": sha, "id": match[1]}


def authorized_actor(actor, api, bulk=False):
    if actor == OWNER:
        return
    if bulk:
        raise ValueError("Only the owner can start repository-wide preparation")
    permission = api.get(repo_path(f"/collaborators/{actor}/permission")).get("permission")
    if permission not in ("write", "maintain", "admin"):
        raise ValueError("Preparation requires a repository writer")


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def plan(args, api):
    if args.repository != REPOSITORY or not SHA.fullmatch(args.base_sha):
        raise ValueError("Unexpected repository or unpinned trusted base")
    event = json.loads(Path(args.event_file).read_text(encoding="utf-8"))
    actor = os.environ.get("GITHUB_ACTOR", "")
    event_name = os.environ.get("GITHUB_EVENT_NAME", "")
    bootstrap = event_name == "push"
    if bootstrap:
        if os.environ.get("GITHUB_REF") != "refs/heads/feature/article-preparation-automation" or actor != OWNER:
            raise ValueError("Invalid bootstrap event")
        if os.environ.get("ARTICLE_ASSET_BOOTSTRAP_ENABLED") != "true":
            articles = []
        else:
            articles = list_articles(api, bootstrap=True)
    elif event_name == "pull_request_target":
        pr = event.get("pull_request", {})
        # Forks and unrelated PRs use ordinary read-only CI.
        if (not BRANCH.fullmatch(pr.get("head", {}).get("ref", "")) or
                pr.get("head", {}).get("repo", {}).get("full_name") != REPOSITORY or
                pr.get("base", {}).get("ref") != "master"):
            articles = []
        else:
            authorized_actor(actor, api)
            articles = [validate_pr(api.get(repo_path(f"/pulls/{pr['number']}")))]
    elif event_name == "workflow_dispatch":
        if os.environ.get("GITHUB_REF") != "refs/heads/master":
            raise ValueError("Manual preparation must use trusted master code")
        inputs = event.get("inputs", {})
        number = str(inputs.get("pr", "")).strip()
        if number and (not number.isdecimal() or int(number) <= 0):
            raise ValueError("Provide a positive PR number or leave it empty for owner-only bulk preparation")
        authorized_actor(actor, api, bulk=not number)
        articles = [validate_pr(api.get(repo_path(f"/pulls/{int(number)}")))] if number else list_articles(api)
    else:
        raise ValueError("Unsupported preparation event")
    result = {"plan_version": 1, "repository": REPOSITORY, "base_sha": args.base_sha,
              "apply": not bootstrap, "articles": articles}
    write_json(args.output, result)
    count = min(6, len(articles))
    matrix = {"include": [{"shard": i, "shards": count} for i in range(count)]}
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as stream:
            stream.write(f"count={len(articles)}\n")
            stream.write("matrix=" + json.dumps(matrix, separators=(",", ":")) + "\n")
    print(f"Pinned {len(articles)} article PRs; automatic branch update: {result['apply']}")
    return result


def list_articles(api, bootstrap=False):
    articles = []
    page = 1
    while True:
        prs = api.get(repo_path(f"/pulls?state=open&per_page=100&page={page}"))
        for pr in prs:
            if BRANCH.fullmatch(pr.get("head", {}).get("ref", "")):
                item = validate_pr(pr)
                if not bootstrap or 56 <= item["number"] <= 245:
                    articles.append(item)
        if len(prs) < 100:
            break
        page += 1
    articles.sort(key=lambda item: item["number"])
    if bootstrap and ({item["number"] for item in articles} != set(range(56, 246)) or
                      any(not item["id"].startswith("hm-tt-") for item in articles)):
        raise ValueError("The authorized migration must contain exactly PRs #56–#245")
    return articles


def prepare_batch(args, api):
    data = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    if (data.get("plan_version") != 1 or data.get("repository") != REPOSITORY or
            not SHA.fullmatch(data.get("base_sha", "")) or args.repository != REPOSITORY):
        raise ValueError("Invalid pinned preparation plan")
    if not 0 <= args.shard < args.shards <= 6:
        raise ValueError("Invalid preparation shard")
    reader = GitReader(Path(args.workspace) / "git", REPOSITORY)
    receipts = []
    selected = data["articles"][args.shard::args.shards]
    for index, item in enumerate(selected, 1):
        receipt_path = Path(args.workspace) / "receipts" / f"{item['number']}.json"
        options = SimpleNamespace(repository=REPOSITORY, base_sha=data["base_sha"],
                                  source_sha=item["sha"], branch=item["branch"],
                                  pr=item["number"], article_id=item["id"],
                                  workspace=Path(args.workspace) / str(item["number"]),
                                  receipt_out=receipt_path, prepare=True,
                                  delivery_probe=True, dry_run=False)
        try:
            receipt = run_prepare(options, api=api, reader=reader)
            if data.get("apply"):
                from article_publish import apply_receipt
                receipt["applied"] = apply_receipt(receipt, api=api, reader=reader)
                current = api.get(repo_path(f"/pulls/{item['number']}"))
                if OWNER not in [a["login"] for a in current.get("assignees", [])]:
                    api.post(repo_path(f"/issues/{item['number']}/assignees"), {"assignees": [OWNER]})
                if "documentation" not in [label["name"] for label in current.get("labels", [])]:
                    api.post(repo_path(f"/issues/{item['number']}/labels"), {"labels": ["documentation"]})
                # GITHUB_TOKEN ref changes do not trigger ordinary push/PR workflows.
                api.post(repo_path("/actions/workflows/ci.yml/dispatches"), {"ref": item["branch"]})
            receipt["status"] = "prepared"
            write_json(receipt_path, receipt)
            receipts.append(receipt)
            print(f"[{index}/{len(selected)}] PR #{item['number']}: prepared", flush=True)
        except Exception as error:
            failure = {**item, "source_sha": item["sha"], "status": "failed", "error": str(error)[:1500]}
            receipts.append(failure)
            write_json(receipt_path, failure)
            print(f"[{index}/{len(selected)}] PR #{item['number']}: failed: {error}", flush=True)
        write_json(args.output, {"receipt_version": 1, "repository": REPOSITORY,
                                "base_sha": data["base_sha"], "shard": args.shard, "receipts": receipts})
    failures = sum(receipt["status"] == "failed" for receipt in receipts)
    print(f"Prepared {len(receipts) - failures}/{len(selected)} article PRs in shard {args.shard}")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", default=REPOSITORY)
    parser.add_argument("--base-sha")
    parser.add_argument("--event-file")
    parser.add_argument("--plan")
    parser.add_argument("--output", required=True)
    parser.add_argument("--shard", type=int, default=0)
    parser.add_argument("--shards", type=int, default=6)
    parser.add_argument("--workspace", default="test-results/article-preparation")
    args = parser.parse_args()
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise SystemExit("GITHUB_TOKEN is required for trusted preparation")
    api = GitHubAPI(args.repository, token, max_wait_seconds=21600)
    if args.event_file:
        plan(args, api)
        return 0
    if not args.plan:
        raise SystemExit("Provide --event-file to plan or --plan to prepare")
    return prepare_batch(args, api)


if __name__ == "__main__":
    raise SystemExit(main())
