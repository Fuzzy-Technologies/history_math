import hashlib
import importlib.util
import io
from pathlib import Path
import unittest

from PIL import Image

spec = importlib.util.spec_from_file_location("publication_jpegs", Path(__file__).resolve().parents[1] / "scripts/publication_jpegs.py")
jpegs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(jpegs)


class PublicationJpegsTest(unittest.TestCase):
    def source(self, mode="RGB", transparent=False):
        image = Image.effect_noise((320, 240), 35).convert(mode)
        if transparent:
            image.putalpha(128)
        output = io.BytesIO()
        image.save(output, "PNG", compress_level=0)
        data = output.getvalue()
        return data, {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "width": 320, "height": 240}

    def test_full_resolution_quality_100_and_444(self):
        data, entry = self.source()
        encoded, quality = jpegs.encode_original(data, entry)
        self.assertEqual(quality, 100)
        with Image.open(io.BytesIO(encoded)) as image:
            self.assertEqual(image.size, (320, 240))
            self.assertTrue(all(layer[1:3] == (1, 1) for layer in image.layer))
        self.assertLess(len(encoded), len(data))

    def test_mutated_original_or_dimensions_fail_and_transparency_is_preserved(self):
        data, entry = self.source()
        for changed in [{**entry, "sha256": "0" * 64}, {**entry, "bytes": len(data) - 1}, {**entry, "width": 160}]:
            with self.assertRaises(ValueError):
                jpegs.encode_original(data, changed)
        data, entry = self.source("RGBA", transparent=True)
        self.assertEqual(jpegs.encode_original(data, entry), (None, "transparency"))

    def test_highest_fitting_quality_is_selected_without_resizing(self):
        data, entry = self.source()
        old_limit = jpegs.HARD_LIMIT
        try:
            jpegs.HARD_LIMIT = 20_000
            encoded, quality = jpegs.encode_original(data, entry)
            self.assertLess(quality, 100)
            self.assertLessEqual(len(encoded), 20_000)
            with Image.open(io.BytesIO(data)) as original:
                next_quality = io.BytesIO()
                original.convert("RGB").save(next_quality, "JPEG", quality=quality + 1, subsampling=0, optimize=True)
            self.assertGreater(len(next_quality.getvalue()), 20_000)
        finally:
            jpegs.HARD_LIMIT = old_limit


if __name__ == "__main__":
    unittest.main()
