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
    def test_original_and_derivative_changes_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            original = site / "assets/images/example.png"
            original.parent.mkdir(parents=True)
            original.write_bytes(b"original")
            preview = original.with_suffix(".webp")
            preview.write_bytes(b"preview")
            manifest = site / "manifest.json"
            entry = {"sha256": assets.digest(original), "bytes": 8, "width": 640,
                     "logo": False, "variants": [{"path": "/assets/images/example.webp", "width": 480,
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
