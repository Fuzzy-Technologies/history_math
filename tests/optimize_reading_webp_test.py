import io
from pathlib import Path
from random import Random
import tempfile
import unittest

from PIL import Image

from scripts.optimize_reading_webp import optimize_output, optimized_webp


def sample_webp():
    rng = Random(41)
    im = Image.new("RGBA", (450, 360))
    pixels = []
    for y in range(im.height):
        for x in range(im.width):
            level = 50 + x // 3 + rng.randrange(-4, 5)
            pixels.append((level, level, level, 210 if y < 120 else 255))
    im.putdata(pixels)
    buffer = io.BytesIO()
    im.save(buffer, "WEBP", lossless=True)
    return buffer.getvalue()


class ReadingWebpTest(unittest.TestCase):
    def test_browser_output_only_and_idempotent(self):
        data = sample_webp()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            preview = root / "assets/images/previews/example/figure.webp"
            preview.parent.mkdir(parents=True)
            preview.write_bytes(data)
            original = preview.parents[2] / "original.webp"
            original.write_bytes(data)
            pdf = root / "article.pdf"
            pdf.write_bytes(b"%PDF-1.7")
            dry_run = optimize_output(root, dry_run=True)
            self.assertEqual(preview.read_bytes(), data)
            self.assertEqual(optimize_output(root), dry_run)
            encoded = preview.read_bytes()
            self.assertLess(len(encoded), len(data) * 0.9)
            with Image.open(io.BytesIO(data)) as before, Image.open(io.BytesIO(encoded)) as after:
                self.assertEqual(before.size, after.size)
                self.assertEqual(before.getchannel("A").tobytes(), after.getchannel("A").tobytes())
            self.assertEqual(original.read_bytes(), data)
            self.assertEqual(pdf.read_bytes(), b"%PDF-1.7")
            self.assertEqual(optimize_output(root)["optimized"], 0)

    def test_animation_is_preserved(self):
        buffer = io.BytesIO()
        frames = [Image.new("RGB", (32, 32), color) for color in ("black", "white")]
        frames[0].save(buffer, "WEBP", save_all=True, append_images=frames[1:], duration=[30, 80], loop=2)
        data = buffer.getvalue()
        self.assertEqual(optimized_webp(data), data)
