"""Reject stale or incomplete reading assets before publication."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("image_assets", Path(__file__).parents[1] / "tools/image_assets.py")
assets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assets)


class ImageAssetsTest(unittest.TestCase):
    def test_migration_preview_is_lossless_and_animation_retains_frames(self):
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow authoring dependency unavailable")
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            folder = site / "assets/images/hm-tt-test"
            folder.mkdir(parents=True)
            original = folder / "diagram.png"
            image = Image.new("RGB", (32, 24), "white")
            image.putpixel((4, 5), (0, 0, 0))
            image.save(original)
            animation = folder / "movement.gif"
            image.save(animation, save_all=True, append_images=[Image.new("RGB", image.size, "red")], duration=100, loop=0)
            manifest = site / "_data/image_assets.json"
            manifest.parent.mkdir(parents=True)
            manifest.write_text("{}")
            with patch.object(assets, "SITE", site), patch.object(assets, "MANIFEST", manifest):
                assets.generate()
                assets.validate()
                entry = assets.inventory()["/assets/images/hm-tt-test/diagram.png"]
                preview = Image.open(site / entry["variants"][-1]["path"].lstrip("/"))
                self.assertEqual(image.tobytes(), preview.convert("RGB").tobytes())
                entry = assets.inventory()["/assets/images/hm-tt-test/movement.gif"]
                preview = Image.open(site / entry["variants"][-1]["path"].lstrip("/"))
                self.assertEqual(preview.n_frames, 2)

    def test_independent_article_fragments_are_validated_and_duplicates_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            original = site / "assets/images/hm-tt-example/figure.webp"
            original.parent.mkdir(parents=True)
            original.write_bytes(b"original")
            preview = site / "assets/images/previews/hm-tt-example/figure.webp-480.webp"
            preview.parent.mkdir(parents=True)
            preview.write_bytes(b"preview")
            manifest = site / "_data/image_assets.json"
            manifest.parent.mkdir(parents=True)
            manifest.write_text("{}")
            fragment = site / "_data/article_image_assets/hm-tt-example.json"
            fragment.parent.mkdir(parents=True)
            entry = {"sha256": assets.digest(original), "bytes": 8, "width": 640,
                     "logo": False, "variants": [{"path": "/assets/images/previews/hm-tt-example/figure.webp-480.webp",
                     "width": 480, "bytes": 7, "sha256": assets.digest(preview)}]}
            fragment.write_text(json.dumps({"/assets/images/hm-tt-example/figure.webp": entry}))
            with patch.object(assets, "SITE", site), patch.object(assets, "MANIFEST", manifest):
                assets.validate()
                preview.write_bytes(b"changed")
                with self.assertRaisesRegex(AssertionError, "Changed derivative"):
                    assets.validate()
                manifest.write_text(fragment.read_text())
                with self.assertRaisesRegex(AssertionError, "Duplicate"):
                    assets.inventory()

    def test_original_and_derivative_changes_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            original = site / "assets/images/example.png"
            original.parent.mkdir(parents=True)
            original.write_bytes(b"original")
            preview = site / "assets/images/previews/example-480.webp"
            preview.parent.mkdir(parents=True)
            preview.write_bytes(b"preview")
            manifest = site / "manifest.json"
            entry = {"sha256": assets.digest(original), "bytes": 8, "width": 640,
                     "logo": False, "variants": [{"path": "/assets/images/previews/example-480.webp", "width": 480,
                     "bytes": 7, "sha256": assets.digest(preview)}]}
            manifest.write_text(json.dumps({"/assets/images/example.png": entry}))
            with patch.object(assets, "SITE", site), patch.object(assets, "MANIFEST", manifest):
                assets.validate()
                original.write_bytes(b"changed")
                with self.assertRaisesRegex(AssertionError, "Stale preview"):
                    assets.validate()
                original.write_bytes(b"original")
                preview.write_bytes(b"changed")
                with self.assertRaisesRegex(AssertionError, "Changed derivative"):
                    assets.validate()
                preview.write_bytes(b"preview")
                (original.parent / "new.png").write_bytes(b"new")
                with self.assertRaisesRegex(AssertionError, "inventory changed"):
                    assets.validate()


if __name__ == "__main__":
    unittest.main()
