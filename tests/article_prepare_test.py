"""Prove scoped preparation preserves editorial text and immutable asset bytes."""

import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tools import article_prepare as prepare


def sha(data):
    return hashlib.sha256(data).hexdigest()


class ArticlePrepareTest(unittest.TestCase):
    article_id = "hm-tt-preparation"

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.original = f"/assets/images/{self.article_id}/figure-01.png"
        self.preview = f"/assets/images/previews/{self.article_id}/figure-01.png-32.webp"
        self.original_bytes = b"original image bytes"
        self.preview_bytes = b"reading image bytes"
        self.manifest = {
            self.original: {"sha256": sha(self.original_bytes), "bytes": len(self.original_bytes),
                            "width": 32, "height": 24, "logo": False,
                            "variants": [{"path": self.preview, "sha256": sha(self.preview_bytes),
                                          "bytes": len(self.preview_bytes), "width": 32, "height": 24}]}
        }
        self.body = "Author paragraph with $x^2$.\n\n$$\nx + y = z\n$$\n\n{% include article-figure.html id=\"fig-1\" %}\n"
        self.write("site" + self.original, self.original_bytes)
        self.write("site" + self.preview, self.preview_bytes)
        self.write_manifest()
        self.write_review()
        self.write_editions()

    def write(self, name, data):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data if isinstance(data, bytes) else data.encode("utf-8"))
        return path

    def write_manifest(self):
        return self.write(f"site/_data/article_image_assets/{self.article_id}.json",
                          json.dumps(self.manifest, ensure_ascii=False, indent=2) + "\n")

    def write_review(self, status="pending"):
        for identity in (self.article_id, self.article_id + "-en"):
            self.write(f"reviews/{identity}.json", json.dumps({
                "review_version": 1, "article_id": identity, "approval": {"status": status},
                "questions": [{"id": "unresolved", "question": "Human review is pending.",
                               "blocking": True, "state": "open"}]
            }, indent=2) + "\n")

    def metadata(self, lang):
        return {"schema_version": 1, "article_id": self.article_id + ("-en" if lang == "en" else ""), "source_work_id": self.article_id,
                "layout": "article", "title": "Author title", "authors": ["Author name"],
                "author": "Author name", "lang": lang, "translation_key": self.article_id,
                "description": "Original author description.", "type": "essay", "tags": ["history", "math"],
                "math": True, "status": "draft", "date": "2024-03-25",
                "original_publication": {"outlet": "Teletype", "date": "2024-03-25", "preserve_date": True},
                "permalink": f"/{'ru/' if lang == 'ru' else ''}articles/{self.article_id}/",
                "rights_basis": "Owner-supplied source; no new license is asserted.",
                "figures": [{"id": "fig-1", "path": self.original, "alt": "Author alternative text.",
                             "caption": "Author caption.", "source": "Author source attribution.",
                             "rights_basis": "Owner-supplied illustration."}],
                "preview_image": self.original, "cover_image": self.original}

    def write_editions(self, body=None, mutation=None):
        for lang in ("ru", "en"):
            metadata = self.metadata(lang)
            if mutation:
                mutation(metadata)
            # JSON is valid YAML; fixtures need no additional Python dependency.
            self.write(f"site/_articles/{self.article_id}-{lang}.md",
                       "---\n" + json.dumps(metadata, ensure_ascii=False, indent=2) + "\n---\n" +
                       (self.body if body is None else body))

    def snapshot(self):
        return {path.relative_to(self.root).as_posix(): path.read_bytes()
                for path in self.root.rglob("*") if path.is_file()}

    def test_canonical_package_is_byte_identical_and_idempotent(self):
        before = self.snapshot()
        result = prepare.prepare_package(self.root, self.article_id, write=True)
        self.assertTrue(result["canonical"])
        self.assertFalse(result["written"])
        self.assertEqual(result["changed_paths"], [])
        self.assertTrue(all(body["unchanged"] for body in result["bodies"]))
        self.assertEqual(result["editorial_approval"], "pending")
        self.assertEqual(before, self.snapshot())
        self.assertEqual(result, prepare.prepare_package(self.root, self.article_id, write=True))

    def test_archival_language_folders_are_normalized_without_changing_bytes(self):
        for lang in ("ru", "en"):
            old = self.root / f"site/_articles/{self.article_id}-{lang}.md"
            new = self.root / f"site/_articles/{lang}/{self.article_id}{'-en' if lang == 'en' else ''}.md"
            new.parent.mkdir(parents=True, exist_ok=True)
            old.rename(new)
        before = self.snapshot()
        result = prepare.prepare_package(self.root, self.article_id, write=True)
        self.assertTrue(result["written"])
        expected = {name: data for name, data in before.items() if not name.startswith("site/_articles/")}
        for lang in ("ru", "en"):
            old = f"site/_articles/{lang}/{self.article_id}{'-en' if lang == 'en' else ''}.md"
            expected[f"site/_articles/{self.article_id}-{lang}.md"] = before[old]
        self.assertEqual(expected, self.snapshot())
        paths = prepare.package_paths(self.root, self.article_id)
        self.assertIn(f"site/_articles/{self.article_id}-ru.md", paths)
        self.assertIn(f"site/_articles/{self.article_id}-en.md", paths)
        self.assertIn(f"reviews/{self.article_id}-en.json", paths)

    def test_dot_suffix_migration_is_byte_exact_idempotent_and_keeps_approval(self):
        self.write_review(status="approved")
        before = self.snapshot()
        for lang in ("ru", "en"):
            (self.root / f"site/_articles/{self.article_id}-{lang}.md").rename(
                self.root / f"site/_articles/{self.article_id}.{lang}.md")
        result = prepare.prepare_package(self.root, self.article_id, write=True)
        self.assertEqual(len(result["renamed_articles"]), 2)
        self.assertEqual(result["editorial_approval"], "approved")
        self.assertEqual(before, self.snapshot())
        self.assertFalse(prepare.prepare_package(self.root, self.article_id, write=True)["written"])

    def test_legacy_move_also_applies_source_normalization(self):
        for lang in ("ru", "en"):
            old = self.root / f"site/_articles/{self.article_id}-{lang}.md"
            old.write_text(old.read_text().replace("Author paragraph",
                                                   "Plain text paragraph. \n\nAuthor paragraph"))
            old.rename(self.root / f"site/_articles/{self.article_id}.{lang}.md")
        prepare.prepare_package(self.root, self.article_id, write=True)
        self.assertTrue(all(edition["body"] == "Plain text paragraph.\n\n" + self.body for edition in
                            prepare.parse_editions(self.root, self.article_id)))

    def test_canonical_and_legacy_duplicate_editions_fail_without_changes(self):
        original = self.root / f"site/_articles/{self.article_id}-ru.md"
        self.write(f"site/_articles/{self.article_id}.ru.md", original.read_bytes())
        before = self.snapshot()
        with self.assertRaisesRegex(prepare.PreparationError, "Exactly one RU edition"):
            prepare.prepare_package(self.root, self.article_id, write=True)
        self.assertEqual(before, self.snapshot())

    def test_legacy_shared_inventory_is_read_without_migrating_it(self):
        old = self.root / f"site/_data/article_image_assets/{self.article_id}.json"
        old.rename(self.root / "site/_data/image_assets.json")
        before = self.snapshot()
        self.assertFalse(prepare.prepare_package(self.root, self.article_id, write=True)["written"])
        self.assertEqual(before, self.snapshot())
        self.write_editions(body="Normalizable paragraph. \n" + self.body)
        central = (self.root / "site/_data/image_assets.json").read_bytes()
        self.assertTrue(prepare.prepare_package(self.root, self.article_id, write=True)["written"])
        self.assertEqual((self.root / "site/_data/image_assets.json").read_bytes(), central)
        self.assertFalse((self.root / f"site/_data/article_image_assets/{self.article_id}.json").exists())

    def test_names_and_all_roles_are_normalized_without_reencoding(self):
        (self.root / ("site" + self.original)).unlink()
        (self.root / ("site" + self.preview)).unlink()
        old = self.original
        self.original = f"/assets/images/{self.article_id}/My Big Image.PNG"
        self.preview = f"/assets/images/previews/{self.article_id}/My Big Image.PNG-32.webp"
        entry = self.manifest.pop(old)
        entry["variants"][0]["path"] = self.preview
        self.manifest[self.original] = entry
        self.write("site" + self.original, self.original_bytes)
        self.write("site" + self.preview, self.preview_bytes)
        self.write_manifest()
        self.write_editions()
        before_review = (self.root / f"reviews/{self.article_id}.json").read_bytes()
        check = prepare.prepare_package(self.root, self.article_id)
        self.assertFalse(check["canonical"])
        self.assertFalse(check["written"])
        self.assertTrue((self.root / ("site" + self.original)).exists())
        result = prepare.prepare_package(self.root, self.article_id, write=True)
        self.assertTrue(result["written"])
        new = f"/assets/images/{self.article_id}/my-big-image.png"
        self.assertEqual((self.root / ("site" + new)).read_bytes(), self.original_bytes)
        self.assertEqual((self.root / f"site/assets/images/previews/{self.article_id}/my-big-image.png-32.webp").read_bytes(), self.preview_bytes)
        self.assertFalse((self.root / ("site" + self.original)).exists())
        for edition in prepare.parse_editions(self.root, self.article_id):
            self.assertEqual(edition["data"]["figures"][0]["path"], new)
            self.assertEqual(edition["data"]["preview_image"], new)
            self.assertEqual(edition["data"]["cover_image"], new)
            self.assertEqual(edition["data"]["tags"], ["history", "math"])
            self.assertEqual(edition["data"]["date"], "2024-03-25")
            self.assertEqual(edition["data"]["figures"][0]["caption"], "Author caption.")
            self.assertEqual(edition["body"], self.body)
        self.assertEqual((self.root / f"reviews/{self.article_id}.json").read_bytes(), before_review)
        self.assertFalse(prepare.prepare_package(self.root, self.article_id, write=True)["written"])

    def test_literal_code_math_and_markdown_hard_breaks_are_preserved(self):
        source = ("Paragraph. \r\n" "Hard break.  \r\n"
                  "```text\r\n" "literal spaces  \r\n" "```\r\n"
                  "$$\r\n" "x^2 + y^2 = z^2  \r\n" "$$\r\n"
                  "Inline $x^2$. \r\n" "Inline `literal`. \r\n" "    code  \r\n")
        normalized = prepare.normalize_source(source)
        self.assertTrue(normalized.startswith("Paragraph.\nHard break.  \n"))
        self.assertIn("```text\r\nliteral spaces  \r\n```\r\n", normalized)
        self.assertIn("$$\r\nx^2 + y^2 = z^2  \r\n$$\r\n", normalized)
        self.assertIn("Inline $x^2$. \r\n", normalized)
        self.assertIn("Inline `literal`. \r\n", normalized)
        self.assertIn("    code  \r\n", normalized)
        self.assertEqual(prepare.normalize_source(normalized), normalized)

    def test_scope_rejects_scripts_foreign_assets_and_traversal(self):
        for name in (".github/workflows/unsafe.yml", "tools/unsafe.py", "site/assets/images/other/figure.png",
                     f"site/assets/images/{self.article_id}/../other.png",
                     f"site/assets/images/{self.article_id}/nested/figure.png",
                     f"site/assets/images/{self.article_id}/figure.png\\extra"):
            with self.subTest(name=name), self.assertRaisesRegex(prepare.PreparationError, "outside"):
                prepare.prepare_package(self.root, self.article_id, changed_paths=[name])
        self.write(f"site/assets/images/{self.article_id}/run.py", "raise RuntimeError('must never execute')")
        with self.assertRaisesRegex(prepare.PreparationError, "Unexpected file"):
            prepare.prepare_package(self.root, self.article_id, write=True)

    def test_foreign_figure_symlink_and_unknown_language_are_rejected(self):
        self.write_editions(mutation=lambda data: data["figures"][0].update(path="/assets/images/another/figure.png"))
        with self.assertRaisesRegex(prepare.PreparationError, "belong to this article"):
            prepare.prepare_package(self.root, self.article_id)
        self.write_editions()
        original = self.root / ("site" + self.original)
        original.unlink()
        original.symlink_to(self.root / ("site" + self.preview))
        with self.assertRaisesRegex(prepare.PreparationError, "Symbolic"):
            prepare.prepare_package(self.root, self.article_id)
        original.unlink()
        self.write("site" + self.original, self.original_bytes)
        self.write(f"site/_articles/{self.article_id}.fr.md", "Unexpected third edition")
        with self.assertRaisesRegex(prepare.PreparationError, "Unexpected article edition"):
            prepare.prepare_package(self.root, self.article_id)

    def test_modified_original_or_preview_fails_without_partial_writes(self):
        self.write_editions(body="A normalizable paragraph. \n" + self.body)
        for name in ("site" + self.original, "site" + self.preview):
            with self.subTest(name=name):
                current = (self.root / name).read_bytes()
                self.write(name, b"modified")
                before = self.snapshot()
                with self.assertRaisesRegex(prepare.PreparationError, "bytes differ"):
                    prepare.prepare_package(self.root, self.article_id, write=True)
                self.assertEqual(before, self.snapshot())
                self.write(name, current)

    def test_pending_decision_and_questions_are_not_automatically_approved(self):
        before = (self.root / f"reviews/{self.article_id}.json").read_bytes()
        self.write_editions(body="A normalizable paragraph. \n" + self.body)
        result = prepare.prepare_package(self.root, self.article_id, write=True)
        self.assertEqual(result["editorial_approval"], "pending")
        self.assertEqual((self.root / f"reviews/{self.article_id}.json").read_bytes(), before)
        self.assertTrue(all(edition["data"]["status"] == "draft"
                            for edition in prepare.parse_editions(self.root, self.article_id)))

    def test_missing_previews_require_preparation(self):
        (self.root / ("site" + self.preview)).unlink()
        report = prepare.prepare_package(self.root, self.article_id)
        self.assertFalse(report["canonical"])
        self.assertTrue(report["preview_generation_required"])

    def test_verified_local_reading_alias_is_preserved_until_publishing(self):
        alias = f"/assets/images/{self.article_id}/reading-copy.png"
        (self.root / ("site" + self.preview)).unlink()
        self.write("site" + alias, self.preview_bytes)
        self.manifest[self.original]["variants"][0]["path"] = alias
        self.write_manifest()
        before = self.snapshot()
        for write in (False, True):
            report = prepare.prepare_package(self.root, self.article_id, write=write)
            self.assertTrue(report["canonical"])
            self.assertFalse(report["written"])
            self.assertEqual(report["local_reading_aliases"], [alias])
            self.assertTrue(report["warnings"])
            self.assertEqual(before, self.snapshot())
        self.write("site" + alias, b"unverified replacement")
        with self.assertRaisesRegex(prepare.PreparationError, "bytes differ"):
            prepare.prepare_package(self.root, self.article_id, write=True)

    def test_failed_generation_cannot_change_existing_preview_bytes(self):
        entry = self.manifest[self.original]
        entry["variants"].append({
            "path": f"/assets/images/previews/{self.article_id}/figure-01.png-16.webp",
            "sha256": sha(b"not generated yet"), "bytes": len(b"not generated yet"),
            "width": 16, "height": 12,
        })
        self.write_manifest()
        before = self.snapshot()

        def failing_generator(stage, article_id):
            (stage / ("site" + self.preview)).write_bytes(b"partial replacement")
            raise prepare.PreparationError("Generation failed before validation")

        with patch.object(prepare, "generate_previews", failing_generator):
            with self.assertRaisesRegex(prepare.PreparationError, "Generation failed"):
                prepare.prepare_package(self.root, self.article_id, write=True)
        self.assertEqual(before, self.snapshot())

    def test_verified_external_original_is_retained_without_local_original(self):
        entry = self.manifest[self.original]
        digest = entry["sha256"]
        tag = f"article-originals-{digest[0]}"
        name = prepare.trusted_image_assets().external_asset_name(self.original, digest)
        entry["external_original"] = {"storage": "github-release", "sha256": digest, "bytes": entry["bytes"],
                                      "asset_id": 123, "release_tag": tag,
                                      "url": f"https://github.com/Fuzzy-Technologies/history_math/releases/download/{tag}/{name}",
                                      "api_url": "https://api.github.com/repos/Fuzzy-Technologies/history_math/releases/assets/123"}
        self.write_manifest()
        (self.root / ("site" + self.original)).unlink()
        before = self.snapshot()
        self.assertFalse(prepare.prepare_package(self.root, self.article_id, write=True)["written"])
        self.assertEqual(before, self.snapshot())
        entry["external_original"]["url"] = "https://example.com/unverified.png"
        self.write_manifest()
        with self.assertRaisesRegex(prepare.PreparationError, "Invalid external original"):
            prepare.prepare_package(self.root, self.article_id)

    def test_new_previews_use_trusted_generator_and_preserve_source_bytes(self):
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow authoring dependency unavailable")
        (self.root / ("site" + self.preview)).unlink()
        (self.root / f"site/_data/article_image_assets/{self.article_id}.json").unlink()
        source = self.root / ("site" + self.original)
        image = Image.new("RGB", (32, 24), "white")
        image.putpixel((2, 3), (0, 0, 0))
        image.save(source)
        original = source.read_bytes()
        self.write("tools/image_assets.py", "raise RuntimeError('untrusted PR code')")
        result = prepare.prepare_package(self.root, self.article_id, write=True)
        self.assertTrue(result["written"])
        self.assertFalse(result["preview_generation_required"])
        self.assertEqual(source.read_bytes(), original)
        self.assertEqual(len(result["previews"]), 1)
        self.assertFalse(prepare.prepare_package(self.root, self.article_id, write=True)["written"])


if __name__ == "__main__":
    unittest.main()
