import hashlib
import importlib.util
import io
import json
import socket
import ssl
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
                    mock.patch.object(jpegs, "open_media", side_effect=[failure, response]) as read, \
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
                    mock.patch.object(jpegs, "open_media", side_effect=failure) as read, \
                    mock.patch.object(jpegs.time, "sleep"), \
                    mock.patch.object(jpegs, "download") as download:
                with self.assertRaises(type(failure)):
                    jpegs.prepare(path, entry, Path("unused"), {path: record})
                self.assertEqual(read.call_count, attempts)
                download.assert_not_called()

    def test_missing_or_changed_cached_jpeg_remains_a_real_cache_miss(self):
        entry, record, response = self.cache()
        path = "/assets/images/image.png"
        with mock.patch.object(jpegs, "open_media",
                               side_effect=urllib.error.HTTPError("https://example.invalid", 404, "Missing", {}, None)) as read:
            self.assertIsNone(jpegs.cached_record(path, entry, {path: record}))
            self.assertEqual(read.call_count, 1)
        response.__enter__.return_value.headers.replace_header("Content-Length", "31")
        with mock.patch.object(jpegs, "open_media", return_value=response):
            self.assertIsNone(jpegs.cached_record(path, entry, {path: record}))
        with mock.patch.object(jpegs, "open_media") as read:
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

    def test_public_connection_tries_only_ipv4_and_closes_failed_sockets(self):
        first, second = mock.Mock(), mock.Mock()
        first.connect.side_effect = OSError("unreachable")
        addresses = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("192.0.2.1", 443)),
                     (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("192.0.2.2", 443))]
        with mock.patch.object(jpegs.socket, "getaddrinfo", return_value=addresses) as lookup, \
                mock.patch.object(jpegs.socket, "socket", side_effect=[first, second]):
            self.assertIs(jpegs.ipv4_connection(("storage.yandexcloud.kz", 443), 30), second)
        lookup.assert_called_once_with("storage.yandexcloud.kz", 443, socket.AF_INET, socket.SOCK_STREAM)
        first.close.assert_called_once()
        second.settimeout.assert_called_once_with(30)
        second.connect.assert_called_once_with(("192.0.2.2", 443))
        second.close.assert_not_called()
        self.assertEqual(jpegs.PUBLIC_CONTEXT.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(jpegs.PUBLIC_CONTEXT.check_hostname)

    def test_only_fixed_anonymous_bucket_reads_use_the_public_transport(self):
        good = f"{jpegs.BASE}/originals/{'b' * 64}/image.jpg"
        request = jpegs.urllib.request.Request(good, method="HEAD")
        with mock.patch.object(jpegs.PUBLIC_OPENER, "open", return_value="public") as public, \
                mock.patch.object(jpegs.urllib.request, "urlopen", return_value="legacy") as legacy:
            self.assertEqual(jpegs.open_media(request, 30), "public")
            public.assert_called_once_with(request, timeout=30)
            for changed in [good.replace("https:", "http:"), good.replace("history-math-media-kz", "other-bucket"),
                            good.replace("https://", "https://user:secret@"), good + "?versionId=private", good + "#fragment",
                            jpegs.urllib.request.Request(good, method="DELETE"),
                            jpegs.urllib.request.Request(good, headers={"Authorization": "secret"}),
                            jpegs.urllib.request.Request(good, data=b"write")]:
                with self.subTest(request=str(changed)), self.assertRaises(ValueError):
                    jpegs.open_media(changed, 30)
            self.assertEqual(public.call_count, 1)
            legacy.assert_not_called()
            self.assertEqual(jpegs.open_media("https://history-math.org/assets/publication-media.json", 120), "legacy")
            legacy.assert_called_once()
        self.assertIsNone(jpegs.NoPublicRedirect().redirect_request(request, None, 302, "Found", {}, "https://example.invalid"))

    def test_proxy_connections_retain_the_standard_proxy_transport(self):
        observed = []
        def connect(connection):
            observed.append(connection._create_connection)
        with mock.patch.object(jpegs.http.client.HTTPSConnection, "connect", connect):
            direct = jpegs.PublicHTTPSConnection("storage.yandexcloud.kz", timeout=30)
            direct.connect()
            proxied = jpegs.PublicHTTPSConnection("proxy.invalid", timeout=30)
            proxied.set_tunnel("storage.yandexcloud.kz")
            proxied.connect()
        self.assertEqual(observed, [jpegs.ipv4_connection, jpegs.socket.create_connection])

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
