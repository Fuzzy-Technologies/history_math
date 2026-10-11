"""Publication preparation fails closed before leased branch history changes."""

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("article_publish", Path(__file__).parents[1] / "tools/article_publish.py")
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

ARTICLE = "hm-tt-example"
SOURCE = "1" * 40
BASE = "2" * 40
NEW = "3" * 40
TREE = "4" * 40
MASTER = "5" * 40
ORIGINAL = b"exact original bytes"
PREVIEW = b"small lossless reading preview"
ORIGINAL_SHA = hashlib.sha256(ORIGINAL).hexdigest()
PREVIEW_SHA = hashlib.sha256(PREVIEW).hexdigest()
LOGICAL = f"/assets/images/{ARTICLE}/figure-01.png"
PREVIEW_PATH = f"/assets/images/previews/{ARTICLE}/figure-01.png-960.webp"


def git_sha(data):
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def args_for(directory):
    return argparse.Namespace(repository=publisher.REPOSITORY, base_sha=BASE, source_sha=SOURCE,
                              branch=f"feature/article-{ARTICLE}-ru", pr=56, article_id=ARTICLE,
                              workspace=Path(directory), receipt_out=Path(directory) / "receipt.json",
                              prepare=True, dry_run=False, delivery_probe=True)


def descriptor():
    tag = f"article-originals-{ORIGINAL_SHA[0]}"
    name = f"{ARTICLE}-figure-01-{ORIGINAL_SHA}.png"
    return {"storage": "github-release", "url": f"https://github.com/{publisher.REPOSITORY}/releases/download/{tag}/{name}",
            "api_url": f"https://api.github.com/repos/{publisher.REPOSITORY}/releases/assets/17",
            "asset_id": 17, "release_tag": tag, "sha256": ORIGINAL_SHA, "bytes": len(ORIGINAL)}


def sample_manifest():
    return {LOGICAL: {"sha256": ORIGINAL_SHA, "bytes": len(ORIGINAL), "width": 1200, "height": 800,
                      "logo": False, "variants": [{"path": PREVIEW_PATH, "width": 960, "height": 640,
                      "sha256": PREVIEW_SHA, "bytes": len(PREVIEW)}]}}


class MemoryGit:
    def __init__(self):
        self.files = {
            f"site/_articles/{ARTICLE}.ru.md": "---\nlang: ru\n---\nOriginal author text $x+y$.\n".encode(),
            f"site/_articles/{ARTICLE}.en.md": "---\nlang: en\n---\nComplete adapted translation $x+y$.\n".encode(),
            f"reviews/{ARTICLE}.json": b'{"approval":{"status":"pending"}}',
            f"reviews/{ARTICLE}-en.json": b'{"approval":{"status":"pending"}}',
            f"site/_data/article_image_assets/{ARTICLE}.json": json.dumps(sample_manifest()).encode(),
            "site" + LOGICAL: ORIGINAL, "site" + PREVIEW_PATH: PREVIEW,
            "scripts/never-execute-pr-code.py": b"raise RuntimeError('untrusted')",
        }
        self.pushes = []

    def ensure(self, sha, full=False):
        pass

    def tree(self, sha):
        files = self.files if sha == SOURCE else {"README.md": b"trusted base"}
        return {path: {"mode": "100644", "type": "blob", "sha": git_sha(data)} for path, data in files.items()}

    def base_workspace(self, sha, destination):
        Path(destination).mkdir()
        (Path(destination) / "README.md").write_text("trusted base")

    def blob(self, sha, path, destination):
        Path(destination).parent.mkdir(parents=True, exist_ok=True)
        Path(destination).write_bytes(self.files[path])

    def tree_sha(self, sha):
        return TREE

    def parents(self, sha):
        return [BASE]

    def run(self, *args, **kwargs):
        self.pushes.append((args, kwargs))


class MemoryAPI:
    token = "test-only-secret-not-a-real-token"
    public_delivery_verified = True

    def __init__(self, fail_upload=False, fail_head_check=None):
        self.calls = []
        self.checks = 0
        self.fail_upload = fail_upload
        self.fail_head_check = fail_head_check

    def check_pr(self, args):
        self.checks += 1
        if self.checks == self.fail_head_check:
            raise publisher.PublishError("The article head changed")
        return MASTER

    def ensure_original(self, *args):
        if self.fail_upload:
            raise publisher.PublishError("Upload failed; keep the original branch")
        return descriptor()

    def post(self, path, payload):
        self.calls.append((path, payload))
        if path.endswith("/trees"):
            return {"sha": TREE, "truncated": False}
        if path.endswith("/commits"):
            return {"sha": NEW, "parents": [{"sha": BASE}]}
        raise AssertionError("An unexpected binary blob upload was attempted")


class ExistingAssetAPI(publisher.GitHubAPI):
    def __init__(self):
        super().__init__(publisher.REPOSITORY, "test-token")
        self.asset = {"id": 17, "name": f"{ARTICLE}-figure-01-{ORIGINAL_SHA}.png", "state": "uploaded",
                      "size": len(ORIGINAL), "browser_download_url": descriptor()["url"],
                      "digest": "sha256:" + ORIGINAL_SHA}
        self.uploads = []
        self.downloads = []
        self.download_result = (ORIGINAL_SHA, len(ORIGINAL))

    def ensure_release(self, tag, master_sha):
        return {"id": 8}

    def assets(self, release_id, refresh=False):
        return {self.asset["name"]: self.asset} if self.asset else {}

    def request(self, method, path, **kwargs):
        self.uploads.append((method, path))
        raise publisher.ApiError(503, path, "upload failed")

    def download_digest(self, url, require_cors=False):
        self.downloads.append((url, require_cors))
        return self.download_result


class ArticlePublishTest(unittest.TestCase):
    def test_preparation_reuses_previews_keeps_prose_and_has_one_clean_parent(self):
        with tempfile.TemporaryDirectory() as directory:
            args = args_for(directory)
            api, reader = MemoryAPI(), MemoryGit()
            with patch.object(publisher, "run_trusted_checks") as checks:
                receipt = publisher.run_prepare(args, api=api, reader=reader)
            checks.assert_called_once()
            self.assertEqual(receipt["source_sha"], SOURCE)
            self.assertEqual(receipt["new_sha"], NEW)
            self.assertEqual(receipt["release_target_sha"], MASTER)
            self.assertFalse(receipt["branch_updated"])
            self.assertEqual(reader.pushes, [])
            entries = {item["path"]: item for item in api.calls[0][1]["tree"]}
            self.assertNotIn("site" + LOGICAL, entries)
            self.assertNotIn("scripts/never-execute-pr-code.py", entries)
            self.assertEqual(entries["site" + PREVIEW_PATH]["sha"], git_sha(PREVIEW))
            for language in ("ru", "en"):
                path = f"site/_articles/{ARTICLE}.{language}.md"
                self.assertEqual(entries[path]["sha"], git_sha(reader.files[path]))
            manifest = json.loads(entries[f"site/_data/article_image_assets/{ARTICLE}.json"]["content"])
            self.assertEqual(manifest[LOGICAL]["external_original"], descriptor())
            self.assertEqual(api.calls[1][1]["parents"], [BASE])
            self.assertEqual(json.loads(args.receipt_out.read_text()), receipt)
            self.assertEqual(reader.files["site" + LOGICAL], ORIGINAL)
            self.assertFalse((Path(directory) / f"staging-{ARTICLE}").exists())

    def test_failed_upload_creates_neither_commit_nor_success_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            args, api, reader = args_for(directory), MemoryAPI(fail_upload=True), MemoryGit()
            with patch.object(publisher, "run_trusted_checks"), self.assertRaisesRegex(publisher.PublishError, "Upload failed"):
                publisher.run_prepare(args, api=api, reader=reader)
            self.assertEqual(api.calls, [])
            self.assertEqual(reader.pushes, [])
            self.assertFalse(args.receipt_out.exists())
            self.assertEqual(reader.files["site" + LOGICAL], ORIGINAL)

    def test_actual_migration_folder_layout_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            args, api, reader = args_for(directory), MemoryAPI(), MemoryGit()
            for language, name in (("ru", ARTICLE), ("en", ARTICLE + "-en")):
                reader.files[f"site/_articles/{language}/{name}.md"] = reader.files.pop(f"site/_articles/{ARTICLE}.{language}.md")
            with patch.object(publisher, "run_trusted_checks"):
                receipt = publisher.run_prepare(args, api=api, reader=reader)
            self.assertEqual(set(receipt["prepared_article_blobs"]), {
                f"site/_articles/ru/{ARTICLE}.md", f"site/_articles/en/{ARTICLE}-en.md"})

    def test_small_original_preview_is_copied_without_an_extra_blob_upload(self):
        with tempfile.TemporaryDirectory() as directory:
            args, api, reader = args_for(directory), MemoryAPI(), MemoryGit()
            manifest = sample_manifest()
            manifest[LOGICAL]["variants"] = [{"path": LOGICAL, "width": 1200, "height": 800,
                                               "sha256": ORIGINAL_SHA, "bytes": len(ORIGINAL)}]
            reader.files[f"site/_data/article_image_assets/{ARTICLE}.json"] = json.dumps(manifest).encode()
            del reader.files["site" + PREVIEW_PATH]
            with patch.object(publisher, "run_trusted_checks"):
                receipt = publisher.run_prepare(args, api=api, reader=reader)
            self.assertEqual(len(api.calls), 2)
            copied = f"site/assets/images/previews/{ARTICLE}/figure-01-png-reading-1200-{ORIGINAL_SHA[:12]}.png"
            self.assertEqual(receipt["preview_blobs"][copied], git_sha(ORIGINAL))
            entries = {item["path"]: item for item in api.calls[0][1]["tree"]}
            self.assertEqual(entries[copied]["sha"], git_sha(ORIGINAL))
            self.assertNotIn("site" + LOGICAL, entries)

    def test_original_folder_alias_is_copied_and_unreferenced_staging_alias_removed(self):
        with tempfile.TemporaryDirectory() as directory:
            args, api, reader = args_for(directory), MemoryAPI(), MemoryGit()
            alias = f"/assets/images/{ARTICLE}/old-reading-copy.jpeg"
            reader.files["site" + alias] = PREVIEW
            manifest = sample_manifest()
            manifest[LOGICAL]["variants"][0]["path"] = alias
            reader.files[f"site/_data/article_image_assets/{ARTICLE}.json"] = json.dumps(manifest).encode()
            del reader.files["site" + PREVIEW_PATH]
            with patch.object(publisher, "run_trusted_checks"):
                receipt = publisher.run_prepare(args, api=api, reader=reader)
            copied = f"site/assets/images/previews/{ARTICLE}/figure-01-png-reading-960-{PREVIEW_SHA[:12]}.jpeg"
            self.assertEqual(receipt["preview_blobs"][copied], git_sha(PREVIEW))
            entries = {item["path"]: item for item in api.calls[0][1]["tree"]}
            self.assertNotIn("site" + alias, entries)
            self.assertEqual(reader.files["site" + alias], PREVIEW)
            self.assertEqual(len(api.calls), 2)

    def test_shared_preview_is_fetched_as_pinned_data_and_reused_as_own_preview(self):
        with tempfile.TemporaryDirectory() as directory:
            args, api, reader = args_for(directory), MemoryAPI(), MemoryGit()
            shared = "/assets/images/previews/shared/arifmometr-123456789abc-960.webp"
            reader.files["site" + shared] = PREVIEW
            manifest = sample_manifest()
            manifest[LOGICAL]["variants"][0]["path"] = shared
            reader.files[f"site/_data/article_image_assets/{ARTICLE}.json"] = json.dumps(manifest).encode()
            del reader.files["site" + PREVIEW_PATH]
            with patch.object(publisher, "run_trusted_checks"):
                receipt = publisher.run_prepare(args, api=api, reader=reader)
            copied = f"site/assets/images/previews/{ARTICLE}/figure-01-png-reading-960-{PREVIEW_SHA[:12]}.webp"
            self.assertEqual(receipt["preview_blobs"][copied], git_sha(PREVIEW))
            entries = {item["path"]: item for item in api.calls[0][1]["tree"]}
            self.assertNotIn("site" + shared, entries)
            self.assertEqual(len(api.calls), 2)

    def test_invalid_alias_checksum_stops_before_an_upload(self):
        with tempfile.TemporaryDirectory() as directory:
            args, api, reader = args_for(directory), MemoryAPI(), MemoryGit()
            alias = f"/assets/images/{ARTICLE}/reading.jpeg"
            reader.files["site" + alias] = b"different reading bytes"
            manifest = sample_manifest()
            manifest[LOGICAL]["variants"][0]["path"] = alias
            reader.files[f"site/_data/article_image_assets/{ARTICLE}.json"] = json.dumps(manifest).encode()
            with self.assertRaisesRegex(publisher.PublishError, "alias differs"):
                publisher.run_prepare(args, api=api, reader=reader)
            self.assertEqual(api.calls, [])

    def test_exported_source_gets_a_markdown_only_index_without_binary_objects(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            markdown = root / "article.md"
            markdown.write_text("Literal $x+y$ remains unchanged.\n")
            binary = root / "original.bin"
            binary.write_bytes(ORIGINAL)
            self.assertFalse((root / ".git").exists())
            publisher.init_markdown_index(root)
            tracked = subprocess.run(["git", "-C", str(root), "ls-files", "--stage"], check=True,
                                     capture_output=True, text=True).stdout
            self.assertIn("article.md", tracked)
            self.assertNotIn("original.bin", tracked)
            self.assertNotEqual(subprocess.run(["git", "-C", str(root), "cat-file", "-e", git_sha(ORIGINAL)],
                                              capture_output=True).returncode, 0)
            checked = subprocess.run(["python3", str(publisher.ROOT / "tools/markdown_tables.py")],
                                     cwd=root, capture_output=True, text=True)
            self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)
            self.assertEqual(binary.read_bytes(), ORIGINAL)

    def test_real_trusted_source_checks_accept_an_export_without_git(self):
        if not (publisher.ROOT / "node_modules/yaml").is_dir():
            self.skipTest("Trusted Node authoring dependencies unavailable")
        with tempfile.TemporaryDirectory() as directory:
            stage = Path(directory) / "export"
            stage.mkdir()
            for name in ("site", "reviews", "schemas", "templates", "tools"):
                shutil.copytree(publisher.ROOT / name, stage / name,
                                ignore=shutil.ignore_patterns("__pycache__"))
            reader = MemoryGit()
            for language in ("ru", "en"):
                identity = ARTICLE + ("-en" if language == "en" else "")
                metadata = {"schema_version": 1, "article_id": identity, "source_work_id": ARTICLE,
                            "layout": "article", "title": "Fixture author title", "authors": ["Fixture author"],
                            "author": "Fixture author", "lang": language, "translation_key": ARTICLE,
                            "description": "Fixture description for exported source validation.", "type": "essay",
                            "tags": ["history", "math"], "math": True, "status": "draft", "date": "2024-03-25",
                            "permalink": f"/{'ru/' if language == 'ru' else ''}articles/{ARTICLE}/",
                            "rights_basis": "Owner-supplied fixture; editorial approval remains pending.",
                            "original_publication": {"outlet": "Teletype", "date": "2024-03-25", "preserve_date": True},
                            "figures": [{"id": "fig-1", "path": LOGICAL, "alt": "Fixture image.",
                                         "caption": "Fixture caption.", "source": "Fixture author source.",
                                         "rights_basis": "Owner-supplied fixture image."}],
                            "preview_image": LOGICAL, "cover_image": LOGICAL}
                reader.files[f"site/_articles/{ARTICLE}.{language}.md"] = (
                    "---\n" + json.dumps(metadata, indent=2) + "\n---\n" +
                    'Literal $x+y$ author formula.\n\n{% include article-figure.html id="fig-1" %}\n').encode()
                reader.files[f"reviews/{identity}.json"] = json.dumps({"review_version": 1, "article_id": identity,
                                                                       "approval": {"status": "pending"}, "questions": []}).encode()
            for path in reader.files:
                if publisher.scoped_path(path, ARTICLE):
                    reader.blob(SOURCE, path, stage / path)
            self.assertFalse((stage / ".git").exists())
            result = publisher.run_trusted_checks(stage, args_for(directory))
            self.assertEqual(result["editorial_approval"], "pending")
            self.assertTrue(all(body["unchanged"] for body in result["bodies"]))
            source_report = json.loads((stage / "test-results/article-report.json").read_text())
            self.assertEqual(source_report["result"], "pass")

    def test_contributor_race_after_upload_blocks_commit_and_branch_update(self):
        with tempfile.TemporaryDirectory() as directory:
            args, api, reader = args_for(directory), MemoryAPI(fail_head_check=2), MemoryGit()
            with patch.object(publisher, "run_trusted_checks"), self.assertRaisesRegex(publisher.PublishError, "head changed"):
                publisher.run_prepare(args, api=api, reader=reader)
            self.assertEqual(api.calls, [])
            self.assertEqual(reader.pushes, [])
            self.assertFalse(args.receipt_out.exists())

    def test_plan_does_not_upload_or_create_git_objects(self):
        with tempfile.TemporaryDirectory() as directory:
            args, api = args_for(directory), MemoryAPI(fail_upload=True)
            args.dry_run = True
            with patch.object(publisher, "run_trusted_checks"):
                result = publisher.run_prepare(args, api=api, reader=MemoryGit())
            self.assertEqual(result["mode"], "plan")
            self.assertEqual(result["planned_originals"], 1)
            self.assertNotIn("new_sha", result)
            self.assertEqual(api.calls, [])

    def test_foreign_pr_master_branch_and_changed_source_are_rejected(self):
        args = args_for("unused")
        pr = {"number": 56, "state": "open", "merged_at": None,
              "head": {"ref": args.branch, "sha": SOURCE, "repo": {"full_name": publisher.REPOSITORY}},
              "base": {"ref": "master", "sha": MASTER, "repo": {"full_name": publisher.REPOSITORY}}}
        self.assertEqual(publisher.validate_pr(pr, args), MASTER)
        pr["head"]["repo"]["full_name"] = "outsider/fork"
        with self.assertRaisesRegex(publisher.PublishError, "fork"):
            publisher.validate_pr(pr, args)
        pr["head"]["repo"]["full_name"] = publisher.REPOSITORY
        pr["head"]["sha"] = NEW
        with self.assertRaisesRegex(publisher.PublishError, "head changed"):
            publisher.validate_pr(pr, args)
        args.branch = "master"
        with self.assertRaisesRegex(publisher.PublishError, "feature branch"):
            publisher.validate_pr(pr, args)

    def test_future_safe_ids_and_english_branch_are_eligible(self):
        args = args_for("unused")
        args.article_id = "future-article-12"
        args.branch = "feature/article-future-article-12-en"
        publisher.validate_inputs(args)
        args.article_id = "../../master"
        with self.assertRaisesRegex(publisher.PublishError, "identifier"):
            publisher.validate_inputs(args)

    def test_wrong_existing_asset_digest_is_never_overwritten(self):
        api = ExistingAssetAPI()
        api.asset["digest"] = "sha256:" + "0" * 64
        with self.assertRaisesRegex(publisher.PublishError, "different GitHub digest"):
            api.ensure_original(ARTICLE, LOGICAL, sample_manifest()[LOGICAL], None, MASTER)
        self.assertEqual(api.uploads, [])
        self.assertEqual(api.downloads, [])

    def test_download_checksum_mismatch_blocks_external_descriptor(self):
        api = ExistingAssetAPI()
        api.download_result = ("0" * 64, len(ORIGINAL))
        with self.assertRaisesRegex(publisher.PublishError, "Downloaded original checksum"):
            api.ensure_original(ARTICLE, LOGICAL, sample_manifest()[LOGICAL], None, MASTER)
        self.assertEqual(api.uploads, [])

    def test_existing_asset_is_download_verified_and_public_api_probed_once(self):
        api = ExistingAssetAPI()
        for _ in range(2):
            self.assertEqual(api.ensure_original(ARTICLE, LOGICAL, sample_manifest()[LOGICAL], None, MASTER), descriptor())
        self.assertEqual(api.uploads, [])
        self.assertEqual(sum(cors for _, cors in api.downloads), 1)

    def test_symlink_executable_and_unmanifested_original_data_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            args, reader = args_for(directory), MemoryGit()
            original_tree = reader.tree
            def executable_tree(sha):
                tree = original_tree(sha)
                if sha == SOURCE:
                    tree[f"site/_articles/{ARTICLE}.ru.md"]["mode"] = "100755"
                return tree
            reader.tree = executable_tree
            with self.assertRaisesRegex(publisher.PublishError, "nonexecutable"):
                publisher.run_prepare(args, api=MemoryAPI(), reader=reader)
        with tempfile.TemporaryDirectory() as directory:
            args, reader = args_for(directory), MemoryGit()
            reader.files[f"site/assets/images/{ARTICLE}/unlisted.png"] = b"unlisted original"
            with patch.object(publisher, "run_trusted_checks"), self.assertRaisesRegex(publisher.PublishError, "absent from.*manifest"):
                publisher.run_prepare(args, api=MemoryAPI(), reader=reader)

    def test_unsafe_paths_and_authenticated_upload_hosts_are_rejected(self):
        for path in ("../escape", "/absolute", "folder/../escape", "folder\\escape", "a//b"):
            with self.subTest(path=path), self.assertRaises(publisher.PublishError):
                publisher.safe_relative(path)
        api = publisher.GitHubAPI(publisher.REPOSITORY, "test-token")
        for url in ("https://attacker.invalid/assets", "https://uploads.github.com/elsewhere", "https://user@uploads.github.com/repos/Fuzzy-Technologies/history_math/releases/1/assets"):
            with self.subTest(url=url), self.assertRaisesRegex(publisher.PublishError, "upload endpoint"):
                api.request("POST", url, data=b"never send")


if __name__ == "__main__":
    unittest.main()
