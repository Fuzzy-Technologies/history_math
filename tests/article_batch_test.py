"""Authorization and source-pin mutation tests for trusted preparation."""

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
        self.posts = []

    def get(self, path):
        self.requests.append(path)
        if path.endswith("/permission"):
            return {"permission": self.permission}
        return self.pages[path.removeprefix(f"/repos/{batch.REPOSITORY}")]

    def post(self, path, payload):
        self.posts.append((path.removeprefix(f"/repos/{batch.REPOSITORY}"), payload))


class ArticleBatchTest(unittest.TestCase):
    def test_live_same_repository_source_is_pinned(self):
        result = batch.validate_pr(article())
        self.assertEqual(result["sha"], "a" * 40)
        self.assertEqual(result["id"], "hm-tt-56")

    def test_rejects_fork_master_closed_merged_and_unpinned_inputs(self):
        changes = [("head", "repo", {"full_name": "contributor/fork"}),
                   ("head", "repo", None), ("base", "repo", {"full_name": "other/repo"}),
                   ("head", "ref", "master"), ("base", "ref", "feature/other"),
                   ("head", "sha", "master"), (None, "state", "closed"),
                   (None, "merged", True), (None, "merged_at", "2026-10-11"),
                   (None, "number", True)]
        for section, key, value in changes:
            with self.subTest(section=section, key=key):
                pr = article()
                (pr[section] if section else pr)[key] = value
                with self.assertRaises(ValueError):
                    batch.validate_pr(pr)

    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        self.args = SimpleNamespace(repository=batch.REPOSITORY, base_sha="b" * 40,
                                    event_file=root / "event.json", plan=root / "plan.json",
                                    output=root / "plan.json", workspace=root)
        self.environment = {"GITHUB_ACTOR": "editor", "GITHUB_EVENT_NAME": "workflow_dispatch",
                            "GITHUB_REF": "refs/heads/master", "GITHUB_SHA": "b" * 40}
        self.api = FakeAPI("write", {"/pulls/56": article()})
        self.set_inputs({"pr": "56"})

    def set_inputs(self, inputs):
        self.args.event_file.write_text(json.dumps({"inputs": inputs}))

    def test_pins_one_open_pr_without_listing_or_mutation(self):
        with patch.dict(os.environ, self.environment, clear=True):
            batch.plan(self.args, self.api)
        data = json.loads(self.args.output.read_text())
        self.assertEqual(data["articles"], [batch.validate_pr(article())])
        self.assertEqual(data["base_sha"], self.environment["GITHUB_SHA"])
        self.assertEqual(self.api.requests, [batch.repo_path("/collaborators/editor/permission"),
                                            batch.repo_path("/pulls/56")])
        self.assertFalse(self.api.posts)

    def test_only_a_repository_writer_can_prepare(self):
        for permission in ("write", "maintain", "admin"):
            batch.authorized_actor("editor", FakeAPI(permission))
        with self.assertRaises(ValueError):
            batch.authorized_actor("reader", FakeAPI("read"))

    def test_rejects_invalid_dispatch_before_api_access(self):
        for inputs in ({}, {"pr": ""}, {"pr": 0}, {"pr": True}, {"pr": "0"}, {"pr": "-1"},
                       {"pr": "01"}, {"pr": "1,2"}, {"pr": "all"}, {"pr": "１２"}):
            with self.subTest(inputs=inputs), patch.dict(os.environ, self.environment, clear=True):
                self.set_inputs(inputs)
                with self.assertRaises(ValueError):
                    batch.plan(self.args, self.api)
        self.set_inputs({"pr": "56"})
        for key, value in (("GITHUB_EVENT_NAME", "pull_request_target"), ("GITHUB_EVENT_NAME", "push"),
                           ("GITHUB_REF", "refs/heads/feature/draft"), ("GITHUB_SHA", "c" * 40)):
            with self.subTest(key=key, value=value), patch.dict(os.environ, {**self.environment, key: value}, clear=True):
                with self.assertRaises(ValueError):
                    batch.plan(self.args, self.api)
        self.args.repository = "other/repo"
        with patch.dict(os.environ, self.environment, clear=True), self.assertRaises(ValueError):
            batch.plan(self.args, self.api)
        self.assertEqual(self.api.requests, [])
        self.assertFalse(self.args.output.exists())

    def test_worker_rechecks_dispatch_and_head_before_writing(self):
        with patch.dict(os.environ, self.environment, clear=True):
            batch.plan(self.args, self.api)
            plan = json.loads(self.args.plan.read_text())
            for change in ({"articles": []}, {"articles": plan["articles"] * 2},
                           {"base_sha": "c" * 40}, {"repository": "other/repo"}, {"apply": False},
                           {"articles": [batch.validate_pr(article(57))]}):
                with self.subTest(change=change):
                    self.args.plan.write_text(json.dumps({**plan, **change}))
                    with patch.object(batch, "GitReader") as reader, self.assertRaises(ValueError):
                        batch.prepare_article(self.args, self.api)
                    reader.assert_not_called()
            self.args.plan.write_text(json.dumps(plan))
            self.api.pages["/pulls/56"]["head"]["sha"] = "d" * 40
            with patch.object(batch, "GitReader") as reader, self.assertRaises(ValueError):
                batch.prepare_article(self.args, self.api)
            reader.assert_not_called()
        self.assertFalse(self.api.posts)

    def test_receipt_and_source_ci_use_only_the_applied_pr(self):
        for changed in (False, True):
            with self.subTest(changed=changed), patch.dict(os.environ, self.environment, clear=True):
                self.api.pages["/pulls/56"] = article()
                self.api.posts.clear()
                self.args.output = self.args.plan
                batch.plan(self.args, self.api)
                self.args.output = self.args.workspace / "receipts.json"

                def apply(receipt, **kwargs):
                    self.api.pages["/pulls/56"]["head"]["sha"] = ("d" if changed else "c") * 40
                    return {"new_sha": "c" * 40}

                with patch.object(batch, "GitReader"), patch.object(batch, "run_prepare",
                        return_value={"source_sha": "a" * 40}) as prepare, patch.object(batch, "apply_receipt", side_effect=apply):
                    self.assertEqual(batch.prepare_article(self.args, self.api), int(changed))
                    self.assertEqual(prepare.call_args.args[0].pr, 56)
                receipt, = json.loads(self.args.output.read_text())["receipts"]
                self.assertEqual(receipt["applied"]["new_sha"], "c" * 40)
                self.assertEqual(receipt["status"], "failed" if changed else "prepared")
                self.assertEqual(self.api.posts, [] if changed else [
                    ("/issues/56/assignees", {"assignees": [batch.OWNER]}),
                    ("/issues/56/labels", {"labels": ["documentation"]}),
                    ("/actions/workflows/ci.yml/dispatches", {"ref": article()["head"]["ref"]})])


if __name__ == "__main__":
    unittest.main()
