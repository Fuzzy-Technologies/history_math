"""Authorization and source-pin mutation tests for trusted preparation."""

from copy import deepcopy
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))
spec = importlib.util.spec_from_file_location("article_batch", TOOLS / "article_batch.py")
batch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(batch)


def article(number=56):
    return {"number": number, "state": "open", "merged": False, "merged_at": None,
            "head": {"ref": f"feature/article-hm-tt-{number}-ru", "sha": "a" * 40,
                     "repo": {"full_name": batch.REPOSITORY}},
            "base": {"ref": "master", "repo": {"full_name": batch.REPOSITORY}}}


class FakeAPI:
    def __init__(self, permission="read", pages=None):
        self.permission = permission
        self.pages = pages or {}
        self.requests = []

    def get(self, path):
        self.requests.append(path)
        if path.endswith("/permission"):
            return {"permission": self.permission}
        return self.pages[path.removeprefix(f"/repos/{batch.REPOSITORY}")]


class ArticleBatchTest(unittest.TestCase):
    def test_live_same_repository_source_is_pinned(self):
        result = batch.validate_pr(article())
        self.assertEqual(result["sha"], "a" * 40)
        self.assertEqual(result["id"], "hm-tt-56")

    def test_rejects_fork_master_closed_merged_and_unpinned_inputs(self):
        changes = [("head", "repo", {"full_name": "contributor/fork"}),
                   ("head", "ref", "master"), ("base", "ref", "feature/other"),
                   ("head", "sha", "master"), (None, "state", "closed"),
                   (None, "merged", True), (None, "merged_at", "2026-10-11"),
                   (None, "number", True)]
        for section, key, value in changes:
            with self.subTest(section=section, key=key):
                pr = deepcopy(article())
                (pr[section] if section else pr)[key] = value
                with self.assertRaises(ValueError):
                    batch.validate_pr(pr)

    def test_readers_cannot_prepare_and_only_owner_can_start_bulk(self):
        with self.assertRaises(ValueError):
            batch.authorized_actor("reader", FakeAPI())
        with self.assertRaises(ValueError):
            batch.authorized_actor("writer", FakeAPI("write"), bulk=True)
        batch.authorized_actor("writer", FakeAPI("write"))
        owner_api = FakeAPI()
        batch.authorized_actor(batch.OWNER, owner_api, bulk=True)
        self.assertEqual(owner_api.requests, [])

    def test_disabled_bootstrap_has_no_asset_or_pr_requests(self):
        with tempfile.TemporaryDirectory() as temporary:
            event = Path(temporary) / "event.json"
            event.write_text("{}", encoding="utf-8")
            args = SimpleNamespace(repository=batch.REPOSITORY, base_sha="b" * 40,
                                   event_file=event, output=Path(temporary) / "plan.json")
            api = FakeAPI()
            environment = {"GITHUB_ACTOR": batch.OWNER, "GITHUB_EVENT_NAME": "push",
                           "GITHUB_REF": "refs/heads/feature/article-preparation-automation",
                           "ARTICLE_ASSET_BOOTSTRAP_ENABLED": "false"}
            with patch.dict(os.environ, environment, clear=True):
                result = batch.plan(args, api)
            self.assertFalse(result["apply"])
            self.assertEqual(result["articles"], [])
            self.assertEqual(api.requests, [])

    def test_bulk_bootstrap_rejects_incomplete_migration(self):
        api = FakeAPI(pages={"/pulls?state=open&per_page=100&page=1": [article()]})
        with self.assertRaises(ValueError):
            batch.list_articles(api, bootstrap=True)

    def test_fork_event_does_not_start_privileged_preparation(self):
        with tempfile.TemporaryDirectory() as temporary:
            pr = article()
            pr["head"]["repo"]["full_name"] = "contributor/fork"
            event = Path(temporary) / "event.json"
            event.write_text(json.dumps({"pull_request": pr}), encoding="utf-8")
            args = SimpleNamespace(repository=batch.REPOSITORY, base_sha="b" * 40,
                                   event_file=event, output=Path(temporary) / "plan.json")
            api = FakeAPI()
            with patch.dict(os.environ, {"GITHUB_ACTOR": batch.OWNER,
                                         "GITHUB_EVENT_NAME": "pull_request_target"}, clear=True):
                result = batch.plan(args, api)
            self.assertEqual(result["articles"], [])
            self.assertEqual(api.requests, [])

    def test_shards_cover_every_article_once(self):
        numbers = list(range(56, 246))
        shards = [numbers[shard::6] for shard in range(6)]
        flattened = [number for shard in shards for number in shard]
        self.assertEqual(sorted(flattened), numbers)
        self.assertEqual(len(set(flattened)), 190)
        self.assertLessEqual(max(map(len, shards)) - min(map(len, shards)), 1)

    def test_invalid_manual_number_cannot_fall_back_to_bulk(self):
        with tempfile.TemporaryDirectory() as temporary:
            event = Path(temporary) / "event.json"
            event.write_text(json.dumps({"inputs": {"pr": "garbage"}}), encoding="utf-8")
            args = SimpleNamespace(repository=batch.REPOSITORY, base_sha="b" * 40,
                                   event_file=event, output=Path(temporary) / "plan.json")
            api = FakeAPI("write")
            environment = {"GITHUB_ACTOR": "writer", "GITHUB_EVENT_NAME": "workflow_dispatch",
                           "GITHUB_REF": "refs/heads/master"}
            with patch.dict(os.environ, environment, clear=True), self.assertRaises(ValueError):
                batch.plan(args, api)
            self.assertEqual(api.requests, [])

    def test_manual_preparation_rejects_feature_code(self):
        with tempfile.TemporaryDirectory() as temporary:
            event = Path(temporary) / "event.json"
            event.write_text(json.dumps({"inputs": {"pr": "56"}}), encoding="utf-8")
            args = SimpleNamespace(repository=batch.REPOSITORY, base_sha="b" * 40,
                                   event_file=event, output=Path(temporary) / "plan.json")
            api = FakeAPI()
            environment = {"GITHUB_ACTOR": batch.OWNER, "GITHUB_EVENT_NAME": "workflow_dispatch",
                           "GITHUB_REF": "refs/heads/feature/unsafe"}
            with patch.dict(os.environ, environment, clear=True), self.assertRaises(ValueError):
                batch.plan(args, api)
            self.assertEqual(api.requests, [])


if __name__ == "__main__":
    unittest.main()
