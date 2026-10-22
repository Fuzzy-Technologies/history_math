"""Storage never changes the publication until all provider/public bytes pass."""
from copy import deepcopy
import contextlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import external_pdfs as pdf
from scripts.check_site import CheckSite


COMMIT = "a" * 40


def fixture(root):
    manifest = {"version": 2, "baseurl": "/base", "origin": "https://example.org", "articles": []}
    for language in ["en", "ru"]:
        article = {"url": f"/{'ru/' if language == 'ru' else ''}articles/example/", "lang": language,
                   "pdf_url": f"/assets/pdf/{language}/example-{language}.pdf", "title": "Пример"}
        manifest["articles"].append(article)
        path = root / article["pdf_url"].lstrip("/")
        path.parent.mkdir(parents=True)
        path.write_bytes(b"%PDF-" + language.encode() * 600)
        page = root / article["url"].lstrip("/") / "index.html"
        page.parent.mkdir(parents=True)
        label = "Скачать статью в PDF" if language == "ru" else "Download article as PDF"
        page.write_text(f'<html lang="{language}"><body><p>Unchanged reader</p><a class="button article-pdf" href="/base{article["pdf_url"]}" download="example-{language}.pdf" aria-label="{label}">PDF ↓</a></body></html>')
    (root / "assets/article-pdfs.json").write_bytes(pdf.encoded(manifest))
    (root / "assets/pdf-compatibility.json").write_bytes(pdf.encoded({
        "version": 1, "source_commit": COMMIT, "source_run": 1, "source_attempt": 1,
        "source_manifest_sha256": "b" * 64, "origin": manifest["origin"], "baseurl": manifest["baseurl"],
        "pdf_count": 0, "pdf_bytes": 0, "pdfs": []}))
    (root / "assets/style.css").write_text("body{color:brown}")
    return manifest


class FakeProvider:
    def __init__(self, failure_at=None, mutation=None):
        self.calls = 0
        self.failure_at, self.mutation = failure_at, mutation

    def ensure(self, article, record, path):
        self.calls += 1
        if self.calls == self.failure_at:
            raise ValueError("Simulated anonymous verification failure")
        if self.mutation:
            self.mutation(path)
        return pdf.descriptor(article, record, self.calls)


class ExternalPdfsTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name) / "source"
        self.root.mkdir()
        self.manifest = fixture(self.root)
        self.compatibility_patch = patch.object(pdf, "COMPATIBILITY_PATH", self.root / "assets/pdf-compatibility.json")
        self.compatibility_patch.start()
        self.addCleanup(self.compatibility_patch.stop)
        self.destination = Path(self.directory.name) / "external"

    def retained_fixture(self):
        cache = Path(self.directory.name) / "retained"
        compatibility = pdf.compatibility_manifest()
        for article in self.manifest["articles"]:
            path = cache / article["pdf_url"].lstrip("/")
            path.parent.mkdir(parents=True, exist_ok=True)
            # The old public bytes deliberately differ from the fresh build.
            path.write_bytes(b"%PDF-legacy-live-" + article["lang"].encode() * 700)
            compatibility["pdfs"].append({"path": article["pdf_url"], **pdf.digest(path)})
        compatibility["pdf_count"] = len(compatibility["pdfs"])
        compatibility["pdf_bytes"] = sum(record["bytes"] for record in compatibility["pdfs"])
        pdf.COMPATIBILITY_PATH.write_bytes(pdf.encoded(compatibility))
        return cache, compatibility

    def test_old_direct_urls_keep_exact_published_bytes_while_buttons_use_new_bytes(self):
        cache, compatibility = self.retained_fixture()
        (self.root / "shared.html").write_text('<a href="/base/assets/pdf/en/example-en.pdf">Shared direct URL</a>')
        before = pdf.inventory(self.root)
        plan = pdf.plan(self.root, COMMIT, cache)
        self.assertEqual(plan["capacity"]["retained_pdf_bytes"], compatibility["pdf_bytes"])
        receipt = pdf.externalize(self.root, self.destination, plan, FakeProvider(), COMMIT, cache)
        self.assertEqual(receipt["retained_pdf_count"], 2)
        self.assertEqual(before, pdf.inventory(self.root))
        output = json.loads((self.destination / "assets/article-pdfs.json").read_text())
        pdf.validate_pdf_output(self.destination, output)
        for article in output["articles"]:
            relative = article["pdf_url"].lstrip("/")
            self.assertEqual((self.destination / relative).read_bytes(), (cache / relative).read_bytes())
            self.assertNotEqual(pdf.digest(self.destination / relative)["sha256"], article["external_pdf"]["sha256"])
        self.assertEqual((self.destination / "shared.html").read_bytes(), (self.root / "shared.html").read_bytes())

    def test_missing_wrong_or_unsafe_retained_bytes_stop_before_any_upload(self):
        cache, compatibility = self.retained_fixture()
        before = pdf.inventory(self.root)
        path = cache / compatibility["pdfs"][0]["path"].lstrip("/")
        original = path.read_bytes()
        for mutation in [lambda: path.unlink(), lambda: path.write_bytes(original + b"changed"),
                         lambda: (path.unlink(), path.symlink_to(self.root / self.manifest["articles"][0]["pdf_url"].lstrip("/")))]:
            mutation()
            with self.assertRaisesRegex(ValueError, "missing, unsafe or differs"):
                pdf.plan(self.root, COMMIT, cache)
            if path.exists() or path.is_symlink():
                path.unlink()
            path.write_bytes(original)
        with self.assertRaisesRegex(ValueError, "previously published"):
            pdf.plan(self.root, COMMIT)
        self.assertEqual(before, pdf.inventory(self.root))
        self.assertFalse(self.destination.exists())

    def test_retained_mutation_during_provider_verification_or_copy_never_publishes(self):
        cache, compatibility = self.retained_fixture()
        path = cache / compatibility["pdfs"][0]["path"].lstrip("/")
        original = path.read_bytes()
        plan = pdf.plan(self.root, COMMIT, cache)
        provider = FakeProvider(mutation=lambda _: path.write_bytes(original + b"changed"))
        with self.assertRaisesRegex(ValueError, "missing, unsafe or differs"):
            pdf.externalize(self.root, self.destination, plan, provider, COMMIT, cache)
        self.assertFalse(self.destination.exists())
        path.write_bytes(original)
        copyfile = pdf.shutil.copyfile
        def changed_copy(source, target):
            if Path(source) == path:
                path.write_bytes(original + b"changed after pre-copy verification")
            return copyfile(source, target)
        with patch.object(pdf.shutil, "copyfile", side_effect=changed_copy), self.assertRaisesRegex(ValueError, "missing, unsafe or differs"):
            pdf.externalize(self.root, self.destination, plan, FakeProvider(), COMMIT, cache)
        self.assertFalse(self.destination.exists())
        self.assertFalse(list(self.destination.parent.glob(".pdf-stage-*")))

    def test_retained_policy_rejects_bad_identity_hash_count_and_total(self):
        _, compatibility = self.retained_fixture()
        for key, value in [("path", "/assets/pdf/en/../../private.pdf"), ("path", "/assets/pdf/en/example-ru.pdf"),
                           ("sha256", "f" * 63), ("bytes", True)]:
            changed = deepcopy(compatibility)
            changed["pdfs"][0][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                pdf.compatibility_manifest(changed)
        for changed in [dict(compatibility, pdf_count=1), dict(compatibility, pdf_bytes=0),
                        dict(compatibility, source_manifest_sha256=""), dict(compatibility, private_path="/tmp/cache"),
                        dict(compatibility, pdfs=compatibility["pdfs"] * 2)]:
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                pdf.compatibility_manifest(changed)

    def test_external_output_rejects_missing_extra_corrupt_retained_pdfs_and_changed_policy(self):
        cache, _ = self.retained_fixture()
        pdf.externalize(self.root, self.destination, pdf.plan(self.root, COMMIT, cache), FakeProvider(), COMMIT, cache)
        output = json.loads((self.destination / "assets/article-pdfs.json").read_text())
        path = self.destination / self.manifest["articles"][0]["pdf_url"].lstrip("/")
        original = path.read_bytes()
        path.unlink()
        with self.assertRaisesRegex(ValueError, "Missing or unlisted"):
            pdf.validate_pdf_output(self.destination, output)
        path.write_bytes(original + b"changed")
        with self.assertRaisesRegex(ValueError, "missing, unsafe or differs"):
            pdf.validate_pdf_output(self.destination, output)
        path.write_bytes(original)
        extra = path.with_name("unlisted-en.pdf")
        extra.write_bytes(original)
        with self.assertRaisesRegex(ValueError, "Missing or unlisted"):
            pdf.validate_pdf_output(self.destination, output)
        extra.unlink()
        extra.symlink_to(self.destination / "absent")
        with self.assertRaisesRegex(ValueError, "Symbolic link"):
            pdf.validate_pdf_output(self.destination, output)
        extra.unlink()
        policy = self.destination / "assets/pdf-compatibility.json"
        policy.write_bytes(policy.read_bytes() + b" ")
        with self.assertRaisesRegex(ValueError, "checksum differs"):
            pdf.validate_pdf_output(self.destination, output)

    def test_current_public_inventory_cannot_outgrow_or_drop_compatibility(self):
        _, compatibility = self.retained_fixture()
        pdf.verify_public_coverage(compatibility, lambda _: self.manifest)
        new = deepcopy(self.manifest)
        new["articles"][0].update(url="/articles/new/", pdf_url="/assets/pdf/en/new-en.pdf")
        with self.assertRaisesRegex(ValueError, "exceed the pinned"):
            pdf.verify_public_coverage(compatibility, lambda _: new)
        changed_origin = dict(self.manifest, origin="https://other.org")
        with self.assertRaisesRegex(ValueError, "origin/path"):
            pdf.verify_public_coverage(compatibility, lambda _: changed_origin)
        external = deepcopy(self.manifest)
        external.update(version=3, source_commit=COMMIT, compatibility_sha256=pdf.compatibility_hash(compatibility))
        for index, article in enumerate(external["articles"]):
            article["external_pdf"] = pdf.descriptor(article, pdf.digest(self.root / article["pdf_url"].lstrip("/")), index + 1)
        read = lambda url: compatibility if url.endswith("pdf-compatibility.json") else external
        pdf.verify_public_coverage(compatibility, read)
        changed = deepcopy(compatibility)
        changed["pdfs"][0]["sha256"] = "f" * 64
        with self.assertRaisesRegex(ValueError, "drops or changes"):
            pdf.verify_public_coverage(changed, read)

    def test_anonymous_legacy_fetch_verifies_bytes_and_cleans_failed_temporary_files(self):
        cache, compatibility = self.retained_fixture()
        destination = Path(self.directory.name) / "fetched"
        requests = []
        class Opener:
            corrupt = False
            def open(inner, request, timeout):
                requests.append(request)
                record = next(record for record in compatibility["pdfs"] if request.full_url.endswith(record["path"]))
                data = (cache / record["path"].lstrip("/")).read_bytes()
                return io.BytesIO(data + b"bad" if inner.corrupt else data)
        opener = Opener()
        pdf.fetch_compatibility(destination, compatibility, opener)
        pdf.verify_compatibility_files(destination, compatibility)
        self.assertTrue(all(not request.has_header("Authorization") for request in requests))
        requests.clear()
        pdf.fetch_compatibility(destination, compatibility, opener)
        self.assertFalse(requests, "Verified cached bytes should be reused")
        target = destination / compatibility["pdfs"][0]["path"].lstrip("/")
        target.unlink()
        opener.corrupt = True
        with self.assertRaisesRegex(ValueError, "exceeds its pinned size"):
            pdf.fetch_compatibility(destination, compatibility, opener)
        self.assertFalse(target.exists())
        self.assertFalse(list(destination.rglob(".retained-*")))
        target.symlink_to(destination / "absent")
        with self.assertRaisesRegex(ValueError, "missing, unsafe or differs"):
            pdf.fetch_compatibility(destination, compatibility, opener)

    def test_production_cannot_apply_compatibility_to_another_origin(self):
        compatibility = pdf.compatibility_manifest()
        compatibility["origin"] = "https://history-math.org"
        pdf.COMPATIBILITY_PATH.write_bytes(pdf.encoded(compatibility))
        self.assertFalse(pdf.plan(self.root)["compatibility_origin_matches_build"])
        with self.assertRaisesRegex(ValueError, "original public origin"):
            pdf.plan(self.root, COMMIT)

    def test_read_only_plan_and_separate_copy_preserve_all_original_bytes(self):
        before = pdf.inventory(self.root)
        plan = pdf.plan(self.root, COMMIT)
        self.assertEqual(before, pdf.inventory(self.root))
        self.assertEqual(plan["provider_verification"], "not_run")
        self.assertEqual(plan["capacity"]["pdf_count"], 2)
        receipt = pdf.externalize(self.root, self.destination, plan, FakeProvider(), COMMIT)
        self.assertEqual(receipt["anonymous_verification"], "pass")
        self.assertEqual(pdf.inventory(self.root), before)
        self.assertFalse((self.destination / "assets/pdf").exists())
        output = json.loads((self.destination / "assets/article-pdfs.json").read_text())
        pdf.validate_pdf_output(self.destination, output)
        self.assertEqual((self.destination / "assets/style.css").read_bytes(), (self.root / "assets/style.css").read_bytes())
        for article in output["articles"]:
            original = (self.root / article["url"].lstrip("/") / "index.html").read_text()
            changed = (self.destination / article["url"].lstrip("/") / "index.html").read_text()
            self.assertEqual(changed, pdf.button_html(original, article, "/base", article["external_pdf"]))
            self.assertIn("Unchanged reader", changed)
        self.assertLessEqual(receipt["output_bytes"], plan["capacity"]["projected_max_bytes"])

    def test_remote_failure_or_changed_local_input_leaves_source_and_destination_untouched(self):
        before = pdf.inventory(self.root)
        with self.assertRaisesRegex(ValueError, "anonymous"):
            pdf.externalize(self.root, self.destination, pdf.plan(self.root, COMMIT), FakeProvider(failure_at=2), COMMIT)
        self.assertEqual(pdf.inventory(self.root), before)
        self.assertFalse(self.destination.exists())
        plan = pdf.plan(self.root, COMMIT)
        provider = FakeProvider(mutation=lambda path: path.write_bytes(b"changed PDF"))
        with self.assertRaisesRegex(ValueError, "changed during"):
            pdf.externalize(self.root, self.destination, plan, provider, COMMIT)
        self.assertFalse(self.destination.exists())
        self.assertFalse(list(self.destination.parent.glob(".pdf-stage-*")))

    def test_plan_rejects_missing_orphaned_damaged_and_symlinked_files(self):
        path = self.root / self.manifest["articles"][0]["pdf_url"].lstrip("/")
        original = path.read_bytes()
        path.unlink()
        with self.assertRaisesRegex(ValueError, "Missing"):
            pdf.plan(self.root)
        path.write_bytes(b"not PDF" * 200)
        with self.assertRaisesRegex(ValueError, "signature"):
            pdf.plan(self.root)
        path.write_bytes(original)
        orphan = path.with_name("orphan.pdf")
        orphan.write_bytes(original)
        with self.assertRaisesRegex(ValueError, "orphaned"):
            pdf.plan(self.root)
        orphan.unlink()
        orphan.symlink_to(path)
        with self.assertRaisesRegex(ValueError, "Symbolic"):
            pdf.plan(self.root)

    def test_plan_rejects_changed_missing_or_duplicate_download_controls(self):
        article = self.manifest["articles"][0]
        path = self.root / article["url"].lstrip("/") / "index.html"
        original = path.read_text()
        for change in [original.replace("article-pdf", "missing"), original + original,
                       original.replace('href="/base/assets/pdf/', 'href="/other/assets/pdf/'),
                       original.replace('download="example-en.pdf"', 'download="wrong.pdf"'),
                       original.replace('download="', 'href="duplicate" download="')]:
            path.write_text(change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                pdf.plan(self.root)
        path.write_text(original)
        plan = pdf.plan(self.root, COMMIT)
        path.write_text(original.replace("reader", "revised"))
        with self.assertRaisesRegex(ValueError, "changed since"):
            pdf.externalize(self.root, self.destination, plan, FakeProvider(), COMMIT)

    def test_external_descriptor_rejects_foreign_urls_unknown_keys_hashes_sizes_and_ids(self):
        article = self.manifest["articles"][0]
        record = pdf.digest(self.root / article["pdf_url"].lstrip("/"))
        external = pdf.descriptor(article, record, 7)
        manifest = deepcopy(self.manifest)
        manifest.update(version=3, source_commit=COMMIT, compatibility_sha256=pdf.compatibility_hash(pdf.compatibility_manifest()))
        for index, item in enumerate(manifest["articles"]):
            item["external_pdf"] = pdf.descriptor(item, pdf.digest(self.root / item["pdf_url"].lstrip("/")), index + 7)
        pdf.validate_manifest(manifest)
        for change in [{"url": external["url"] + "?download=true"}, {"url": external["url"].replace(pdf.REPOSITORY, "other/repo")},
                       {"api_url": external["api_url"].replace("/7", "/8")}, {"release_tag": "article-originals-a"},
                       {"sha256": "b" * 64}, {"bytes": True}, {"asset_id": True}, {"asset_id": 0},
                       {"asset_id": pdf.MAX_ID + 1}, {"private_path": "/private/source"}]:
            changed = deepcopy(manifest)
            changed["articles"][0]["external_pdf"].update(change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                pdf.validate_manifest(changed)
        for version in [1, 4, "3"]:
            with self.subTest(version=version), self.assertRaises(ValueError):
                pdf.validate_manifest(dict(manifest, version=version))
        for change in [{"lang": "ru"}, {"pdf_url": "/assets/pdf/../private"}, {"title": ""}]:
            changed = deepcopy(self.manifest)
            changed["articles"][0].update(change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                pdf.validate_manifest(changed)

    def test_existing_destination_and_wrong_commit_fail_without_overwriting(self):
        plan = pdf.plan(self.root, COMMIT)
        self.destination.mkdir()
        marker = self.destination / "keep"
        marker.write_text("user content")
        with self.assertRaisesRegex(ValueError, "new, separate"):
            pdf.externalize(self.root, self.destination, plan, FakeProvider(), COMMIT)
        self.assertEqual(marker.read_text(), "user content")
        with self.assertRaisesRegex(ValueError, "changed since"):
            pdf.externalize(self.root, self.destination.with_name("other"), plan, FakeProvider(), "b" * 40)

    def test_delivery_validator_keeps_local_v2_and_external_v3_controls_strict(self):
        pdf.validate_pdf_output(self.root, self.manifest)
        article = self.manifest["articles"][0]
        page = self.root / article["url"].lstrip("/") / "index.html"
        original = page.read_text()
        page.write_text(original.replace('/base/assets/pdf/en/example-en.pdf', 'https://other.org/forged.pdf'))
        with self.assertRaisesRegex(ValueError, "differs"):
            pdf.validate_pdf_output(self.root, self.manifest)
        page.write_text(original)
        pdf.externalize(self.root, self.destination, pdf.plan(self.root, COMMIT), FakeProvider(), COMMIT)
        output = json.loads((self.destination / 'assets/article-pdfs.json').read_text())
        target = self.destination / article["url"].lstrip("/") / "index.html"
        target.write_text(target.read_text().replace('article-pdf', 'missing'))
        with self.assertRaisesRegex(ValueError, "altered"):
            pdf.validate_pdf_output(self.destination, output)

    def test_budget_cannot_be_bypassed_and_unrewritten_local_references_fail_before_upload(self):
        with patch.object(pdf, "LIMIT", 1000):
            with self.assertRaisesRegex(ValueError, "size limit"):
                pdf.plan(self.root)
        page = self.root / "other.html"
        page.write_text('<a href="https://example.org/base/assets/pdf/en/example-en.pdf">Old extra link</a>')
        with self.assertRaisesRegex(ValueError, "outside the download control"):
            pdf.plan(self.root)
        for reference in ['assets/pdf/en/example-en.pdf', './assets/pdf/en/example-en.pdf',
                          'assets/%70df/en/example-en.pdf']:
            page.write_text(f'<a href="{reference}">Relative PDF</a>')
            with self.subTest(reference=reference), self.assertRaisesRegex(ValueError, "outside the download control"):
                pdf.plan(self.root)
        page.write_text('<a href="https://other.org/base/assets/pdf/book.pdf">Unrelated external book</a>')
        pdf.plan(self.root)

    def test_site_gate_does_not_trust_an_external_button_without_its_manifest(self):
        for article in self.manifest["articles"]:
            page = self.root / article["url"].lstrip("/") / 'index.html'
            html = page.read_text().replace('<body>', f'<link rel="canonical" href="https://example.org/base{article["url"]}"><body>')
            page.write_text(html)
        for language in ['ru', 'en']:
            for kind in ['discovery', 'search']:
                (self.root / f'assets/{kind}-{language}.json').write_text('[]')
        (self.root / 'sitemap.xml').write_text('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>')
        pdf.externalize(self.root, self.destination, pdf.plan(self.root, COMMIT), FakeProvider(), COMMIT)
        with contextlib.redirect_stdout(io.StringIO()):
            CheckSite(self.destination, '/base', 'https://example.org')
        path = self.destination / 'assets/article-pdfs.json'
        valid = path.read_bytes()
        path.unlink()
        with self.assertRaisesRegex(SystemExit, 'Missing PDF manifest'):
            CheckSite(self.destination, '/base', 'https://example.org')
        path.write_bytes(valid)
        article = self.manifest['articles'][0]
        page = self.destination / article['url'].lstrip('/') / 'index.html'
        page.write_text(page.read_text().replace('href="https://github.com/', 'href="https://other.org/'))
        with self.assertRaisesRegex(SystemExit, 'Invalid PDF publication'):
            CheckSite(self.destination, '/base', 'https://example.org')

    def test_writes_require_separate_opt_in_real_master_and_allowed_event(self):
        env = {"GITHUB_ACTIONS": "true", "GITHUB_REPOSITORY": pdf.REPOSITORY,
               "GITHUB_REF": "refs/heads/master", "ARTICLE_PDF_RELEASE_STORAGE": "true",
               "GITHUB_EVENT_NAME": "push", "GITHUB_SHA": COMMIT}
        self.assertEqual(pdf.authorized_context(env), COMMIT)
        for key, value in [("GITHUB_ACTIONS", "false"), ("GITHUB_REPOSITORY", "other/repo"),
                           ("GITHUB_REF", "refs/heads/feature/example"), ("ARTICLE_PDF_RELEASE_STORAGE", "false"),
                           ("ARTICLE_PDF_RELEASE_STORAGE", ""), ("GITHUB_EVENT_NAME", "pull_request"),
                           ("GITHUB_EVENT_NAME", "pull_request_target"), ("GITHUB_SHA", "master")]:
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                pdf.authorized_context(dict(env, **{key: value}))
        with patch.dict(pdf.os.environ, {}, clear=True), patch.object(pdf.sys, "argv", [
                "external_pdfs.py", "store", "--report", str(self.destination.parent / "unauthorized.json")]), (
                patch.object(pdf, "verify_public_coverage", side_effect=AssertionError("Must not read live inventory"))), (
                patch.object(pdf, "github_provider", side_effect=AssertionError("Must not create write provider"))):
            with self.assertRaisesRegex(ValueError, "separately enabled"):
                pdf.main()

    def test_provider_requires_both_exact_github_metadata_and_anonymous_bytes(self):
        article = self.manifest["articles"][0]
        path = self.root / article["pdf_url"].lstrip("/")
        record = pdf.digest(path)
        external = pdf.descriptor(article, record, 7)
        name = pdf.asset_name(article, record["sha256"])
        asset = {"id": 7, "name": name, "state": "uploaded", "size": record["bytes"],
                 "digest": "sha256:" + record["sha256"], "browser_download_url": external["url"]}
        provider = pdf.github_provider("test-token-unused", COMMIT)
        provider.release = lambda tag: {"id": 1}
        provider.assets = lambda release_id: {name: asset}
        provider.request = lambda *args, **kwargs: self.fail("Existing asset must never be overwritten")
        provider.download_digest = lambda url: (record["sha256"], record["bytes"])
        self.assertEqual(provider.ensure(article, record, path), external)
        for change in [{"digest": None}, {"digest": "sha256:" + "f" * 64}, {"size": record["bytes"] + 1},
                       {"state": "new"}, {"browser_download_url": external["url"] + "?x=1"}, {"id": True}]:
            changed = dict(asset, **change)
            provider.assets = lambda release_id: {name: changed}
            with self.subTest(change=change), self.assertRaises(ValueError):
                provider.ensure(article, record, path)
        provider.assets = lambda release_id: {name: asset}
        for downloaded in [(record["sha256"], record["bytes"] + 1), ("f" * 64, record["bytes"])]:
            provider.download_digest = lambda url: downloaded
            with self.subTest(downloaded=downloaded), self.assertRaisesRegex(ValueError, "Anonymous"):
                provider.ensure(article, record, path)

    def test_storage_tag_must_point_to_an_existing_master_ancestor(self):
        provider = pdf.github_provider("test-token-unused", COMMIT)
        tag = "article-pdfs-a"
        release = {"id": 1, "tag_name": tag, "draft": False, "prerelease": True}
        for ref in [{"type": "tag", "sha": COMMIT}, {"type": "commit", "sha": "master"}]:
            provider.get = lambda endpoint: release if "/releases/tags/" in endpoint else {"object": ref}
            with self.subTest(ref=ref), self.assertRaisesRegex(ValueError, "commit anchor"):
                provider.release(tag)
        provider.get = lambda endpoint: release if "/releases/tags/" in endpoint else {"object": {"type": "commit", "sha": COMMIT}}
        with patch.object(pdf.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "git")):
            with self.assertRaises(subprocess.CalledProcessError):
                provider.release(tag)
        with patch.object(pdf.subprocess, "run") as git:
            self.assertEqual(provider.release(tag), release)
            self.assertEqual(git.call_args.args[0], ["git", "merge-base", "--is-ancestor", COMMIT, COMMIT])

    def test_bad_existing_tag_blocks_release_creation_before_post(self):
        pdf.github_provider("test-token-unused", COMMIT)  # Load the shared transport.
        from article_publish import ApiError
        for ref in [{"type": "tag", "sha": COMMIT}, {"type": "commit", "sha": "master"},
                    {"type": "commit", "sha": "b" * 40}]:
            provider = pdf.github_provider("test-token-unused", COMMIT)
            def get(endpoint):
                if "/releases/tags/" in endpoint:
                    raise ApiError(404, endpoint)
                return {"object": ref}
            provider.get = get
            provider.post = lambda *args: self.fail("An invalid existing tag must block POST")
            with self.subTest(ref=ref), patch.object(pdf.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "git")):
                with self.assertRaises((ValueError, subprocess.CalledProcessError)):
                    provider.release("article-pdfs-a")

    def test_missing_tag_creation_uses_exact_master_and_checks_resulting_anchor(self):
        provider = pdf.github_provider("test-token-unused", COMMIT)
        from article_publish import ApiError
        writes = []
        def get(endpoint):
            if "/releases/tags/" in endpoint or not writes:
                raise ApiError(404, endpoint)
            return {"object": {"type": "commit", "sha": COMMIT}}
        def post(endpoint, payload):
            writes.append((endpoint, payload))
            return {"id": 1, "tag_name": payload["tag_name"], "draft": False, "prerelease": True}
        provider.get, provider.post = get, post
        with patch.object(pdf.subprocess, "run") as git:
            provider.release("article-pdfs-a")
            self.assertEqual(len(writes), 1)
            self.assertEqual(writes[0][1]["target_commitish"], COMMIT)
            self.assertEqual(writes[0][1]["make_latest"], "false")
            self.assertEqual(git.call_args.args[0], ["git", "merge-base", "--is-ancestor", COMMIT, COMMIT])

    def test_new_upload_is_never_an_overwrite_and_full_buckets_stop(self):
        article = self.manifest["articles"][0]
        path = self.root / article["pdf_url"].lstrip("/")
        record = pdf.digest(path)
        external = pdf.descriptor(article, record, 7)
        name = pdf.asset_name(article, record["sha256"])
        asset = {"id": 7, "name": name, "state": "uploaded", "size": record["bytes"],
                 "digest": "sha256:" + record["sha256"], "browser_download_url": external["url"]}
        provider = pdf.github_provider("test-token-unused", COMMIT)
        provider.release = lambda tag: {"id": 1}
        assets, writes = {}, []
        provider.assets = lambda release_id: assets
        provider.download_digest = lambda url: (record["sha256"], record["bytes"])
        def upload(method, endpoint, **kwargs):
            writes.append((method, endpoint, kwargs))
            return asset
        provider.request = upload
        self.assertEqual(provider.ensure(article, record, path), external)
        self.assertEqual(len(writes), 1)
        self.assertEqual(writes[0][0], "POST")
        self.assertTrue(writes[0][1].startswith(f"https://uploads.github.com/repos/{pdf.REPOSITORY}/releases/1/assets?name="))
        self.assertEqual(writes[0][2]["data"], path.read_bytes())
        provider.ensure(article, record, path)
        self.assertEqual(len(writes), 1, "Reuse must not overwrite the immutable asset")
        assets.clear()
        assets.update({f"old-{i}": {} for i in range(1000)})
        with self.assertRaisesRegex(ValueError, "bucket is full"):
            provider.ensure(article, record, path)
        self.assertEqual(len(writes), 1)


if __name__ == "__main__":
    unittest.main()
