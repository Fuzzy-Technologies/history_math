import hashlib
import importlib.util
import io
import json
import tempfile
import urllib.error
from email.message import Message
from pathlib import Path
import unittest
from unittest import mock

from PIL import Image

spec = importlib.util.spec_from_file_location("publication_jpegs", Path(__file__).resolve().parents[1] / "scripts/publication_jpegs.py")
jpegs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(jpegs)


class PublicationJpegsTest(unittest.TestCase):
    def cache(self):
        entry = {"sha256": "a" * 64, "bytes": 50, "width": 1, "height": 1}
        record = {"policy": jpegs.POLICY, "source_sha256": entry["sha256"],
                  "source_bytes": 50, "width": 1, "height": 1,
                  "filename": "image.jpg", "sha256": "b" * 64, "bytes": 30,
                  "quality": 100}
        headers = Message()
        headers["Content-Length"] = "30"
        headers["Content-Type"] = "image/jpeg"
        response = mock.MagicMock()
        response.__enter__.return_value.headers = headers
        return entry, record, response

    def test_cached_jpeg_reconnects_without_fetching_retired_source(self):
        entry, record, response = self.cache()
        path = "/assets/images/image.png"
        for failure in [TimeoutError(), urllib.error.URLError("connection reset"),
                        urllib.error.HTTPError("https://example.invalid", 503, "Unavailable", {}, None)]:
            with self.subTest(error=type(failure).__name__), \
                    mock.patch.object(jpegs.urllib.request, "urlopen", side_effect=[failure, response]) as read, \
                    mock.patch.object(jpegs.time, "sleep") as pause, \
                    mock.patch.object(jpegs, "download") as download:
                self.assertEqual(jpegs.prepare(path, entry, Path("unused"), {path: record}),
                                 (path, record, None))
                self.assertEqual(read.call_count, 2)
                self.assertEqual(read.call_args.args[0].get_method(), "HEAD")
                pause.assert_called_once_with(1)
                download.assert_not_called()

    def test_exhausted_or_forbidden_cache_reads_do_not_fall_back_to_retired_sources(self):
        entry, record, _ = self.cache()
        path = "/assets/images/image.png"
        for failure, attempts in [(TimeoutError(), 3),
                                  (urllib.error.HTTPError("https://example.invalid", 403, "Forbidden", {}, None), 1)]:
            with self.subTest(error=type(failure).__name__), \
                    mock.patch.object(jpegs.urllib.request, "urlopen", side_effect=failure) as read, \
                    mock.patch.object(jpegs.time, "sleep"), \
                    mock.patch.object(jpegs, "download") as download:
                with self.assertRaises(type(failure)):
                    jpegs.prepare(path, entry, Path("unused"), {path: record})
                self.assertEqual(read.call_count, attempts)
                download.assert_not_called()

    def test_missing_or_changed_cached_jpeg_remains_a_real_cache_miss(self):
        entry, record, response = self.cache()
        path = "/assets/images/image.png"
        with mock.patch.object(jpegs.urllib.request, "urlopen",
                               side_effect=urllib.error.HTTPError("https://example.invalid", 404, "Missing", {}, None)) as read:
            self.assertIsNone(jpegs.cached_record(path, entry, {path: record}))
            self.assertEqual(read.call_count, 1)
        response.__enter__.return_value.headers.replace_header("Content-Length", "31")
        with mock.patch.object(jpegs.urllib.request, "urlopen", return_value=response):
            self.assertIsNone(jpegs.cached_record(path, entry, {path: record}))
        with mock.patch.object(jpegs.urllib.request, "urlopen") as read:
            self.assertIsNone(jpegs.cached_record(path, {**entry, "sha256": "c" * 64}, {path: record}))
            read.assert_not_called()

    def test_pinned_registry_does_not_fetch_unused_remote_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            registry = Path(directory) / "registry.json"
            output = Path(directory) / "plan.json"
            registry.write_text(json.dumps({"replacements": {}}))
            with mock.patch.object(jpegs.sys, "argv", ["publication_jpegs.py", "--registry", str(registry), "--output", str(output)]), \
                    mock.patch.object(jpegs, "pillow_version", "12.3.0"), \
                    mock.patch.object(jpegs, "inventory", return_value={}), \
                    mock.patch.object(jpegs, "download") as download:
                jpegs.main()
            self.assertEqual(json.loads(output.read_text())["replacements"], {})
            download.assert_not_called()

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
