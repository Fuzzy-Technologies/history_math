"""External originals need immutable identities and complete local derivatives."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("image_assets", Path(__file__).parents[1] / "tools/image_assets.py")
assets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assets)


class ExternalOriginalsTest(unittest.TestCase):
    logical = "/assets/images/hm-tt-example/diagram.png"
    preview = "/assets/images/previews/hm-tt-example/diagram.png-20.webp"

    def fixture(self, directory):
        site = Path(directory) / "site"
        preview = site / self.preview.lstrip("/")
        preview.parent.mkdir(parents=True)
        preview.write_bytes(b"verified reading preview")
        original = b"exact archival original"
        sha = hashlib.sha256(original).hexdigest()
        tag = f"article-originals-{sha[0]}"
        entry = {"sha256": sha, "bytes": len(original), "width": 40, "height": 20, "logo": False,
                 "variants": [{"path": self.preview, "width": 20, "height": 10,
                               "sha256": assets.digest(preview), "bytes": preview.stat().st_size}],
                 "external_original": {"storage": "github-release", "release_tag": tag, "asset_id": 123,
                                       "url": f"https://github.com/Fuzzy-Technologies/history_math/releases/download/{tag}/hm-tt-example-diagram-{sha}.png",
                                       "api_url": "https://api.github.com/repos/Fuzzy-Technologies/history_math/releases/assets/123",
                                       "sha256": sha, "bytes": len(original)}}
        manifest = site / "_data/image_assets.json"
        manifest.parent.mkdir(parents=True)
        manifest.write_text("{}")
        fragment = site / "_data/article_image_assets/hm-tt-example.json"
        fragment.parent.mkdir()
        fragment.write_text(json.dumps({self.logical: entry}))
        return site, manifest, fragment, entry

    def test_valid_external_inventory_and_missing_or_stale_records_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            site, manifest, fragment, entry = self.fixture(directory)
            with patch.object(assets, "SITE", site), patch.object(assets, "MANIFEST", manifest):
                assets.validate()
                self.assertEqual(assets.external_original(entry, self.logical), entry["external_original"])
                missing = copy.deepcopy(entry)
                del missing["external_original"]
                fragment.write_text(json.dumps({self.logical: missing}))
                with self.assertRaisesRegex(AssertionError, "inventory changed"):
                    assets.validate()
                fragment.write_text(json.dumps({self.logical: entry}))
                (site / self.preview.lstrip("/")).write_bytes(b"changed")
                with self.assertRaisesRegex(ValueError, "Changed external original preview"):
                    assets.validate()

    def test_descriptor_rejects_other_origins_queries_mismatched_hashes_and_invalid_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            _site, _manifest, _fragment, entry = self.fixture(directory)
            external = entry["external_original"]
            for change in [
                {"storage": "raw-git"}, {"asset_id": 0}, {"asset_id": True}, {"asset_id": 9_007_199_254_740_992},
                {"sha256": "a" * 64}, {"bytes": entry["bytes"] + 1}, {"release_tag": "other"},
                {"url": external["url"] + "?raw=true"}, {"url": external["url"] + "#original"},
                {"url": external["url"].replace("https:", "http:")},
                {"url": external["url"].replace("github.com/", "user:secret@github.com/")},
                {"url": external["url"].replace("Fuzzy-Technologies", "someone")},
                {"api_url": external["api_url"].replace("/123", "/124")},
                {"private_source_path": "/private/archive"},
            ]:
                mutated = copy.deepcopy(entry)
                mutated["external_original"].update(change)
                with self.subTest(change=change), self.assertRaises(ValueError):
                    assets.external_original(mutated, self.logical)
            for change in [{"logo": "false"}, {"width": 0}, {"height": -1}, {"bytes": True}]:
                with self.subTest(change=change), self.assertRaises(ValueError):
                    assets.external_original(dict(entry, **change), self.logical)
            for path in [self.logical.replace("diagram.png", "../diagram.png"),
                         self.logical.replace("diagram.png", "Diagram.png"),
                         self.logical.replace(".png", ".exe")]:
                with self.subTest(path=path), self.assertRaises(ValueError):
                    assets.external_original(entry, path)

    def test_previews_require_exact_bytes_safe_paths_positive_dimensions_and_no_upscaling(self):
        with tempfile.TemporaryDirectory() as directory:
            site, _manifest, _fragment, entry = self.fixture(directory)
            variant = entry["variants"][0]
            for change in [{"bytes": variant["bytes"] + 1}, {"sha256": "a" * 64}, {"width": 41},
                           {"height": 21}, {"height": 0}, {"path": self.preview.replace("diagram", "../diagram")}]:
                mutated = dict(entry, variants=[dict(variant, **change)])
                with self.subTest(change=change), self.assertRaises(ValueError):
                    assets.validate_external_previews(mutated, site)
            with self.assertRaises(ValueError):
                assets.validate_external_previews(dict(entry, variants=[]), site)
            with self.assertRaises(ValueError):
                assets.validate_external_previews(dict(entry, variants=[variant, variant]), site)
            preview = site / self.preview.lstrip("/")
            preview.unlink()
            outside = site.parent / "outside.webp"
            outside.write_bytes(b"verified reading preview")
            preview.symlink_to(outside)
            with self.assertRaisesRegex(ValueError, "Unsafe image"):
                assets.validate_external_previews(entry, site)

    def test_generation_retains_external_entries_and_scopes_any_article_id_to_a_fragment(self):
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow authoring dependency unavailable")
        with tempfile.TemporaryDirectory() as directory:
            site, manifest, fragment, entry = self.fixture(directory)
            ordinary = site / "assets/images/ordinary/diagram.png"
            ordinary.parent.mkdir(parents=True)
            Image.new("RGB", (20, 10), "white").save(ordinary)
            with patch.object(assets, "SITE", site), patch.object(assets, "MANIFEST", manifest):
                assets.generate("hm-tt-example")
                self.assertEqual(json.loads(fragment.read_text()), {self.logical: entry})
                assets.generate("ordinary")
                ordinary_fragment = site / "_data/article_image_assets/ordinary.json"
                self.assertIn("/assets/images/ordinary/diagram.png", json.loads(ordinary_fragment.read_text()))
                self.assertEqual(json.loads(manifest.read_text()), {})
                assets.generate()
                self.assertEqual(json.loads(fragment.read_text()), {self.logical: entry})
                self.assertIn("/assets/images/ordinary/diagram.png", json.loads(ordinary_fragment.read_text()))
                assets.validate()


if __name__ == "__main__":
    unittest.main()
