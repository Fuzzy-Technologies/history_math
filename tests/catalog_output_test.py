"""Prove the cheap output gate detects lost articles without a browser or site build."""

import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from scripts.check_site import CheckSite


class CatalogOutputTest(unittest.TestCase):
    def fixture(self, root, mutation=None):
        origin = "https://history-math.org"
        assets = root / "assets"
        assets.mkdir()
        records = [{"url": f"/articles/example-{index}/", "language": "en", "status": "published"} for index in range(21)]

        def page(route, content):
            path = root / route.strip("/") / "index.html"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(f'<html lang="en"><link rel="canonical" href="{origin}{route}">{content}</html>')

        for record in records:
            page(record["url"], '<article class="reading-layout">Article body</article>')
        for number in (1, 2):
            entries = records[(number - 1) * 20:number * 20]
            if mutation == "lost-card" and number == 2:
                entries = []
            if mutation == "duplicate" and number == 2:
                entries = [records[0]]
            cards = ''.join(f'<article><h3><a href="{entry["url"]}">Title</a></h3></article>' for entry in entries)
            page("/materials/" if number == 1 else "/materials/page/2/", '<section class="catalog-list">' + cards + '</section>')
        discovery = [dict(record) for record in records]
        search = [{**record, "text": "Article body"} for record in records]
        if mutation == "missing-index":
            discovery.pop()
            search.pop()
        if mutation == "full-discovery":
            discovery[0]["text"] = "Too heavy"
        if mutation == "missing-text":
            search[0].pop("text")
        if mutation == "missing-search":
            search.pop()
        for language in ("en", "ru"):
            for kind, values in (("search", search), ("discovery", discovery)):
                (assets / f"{kind}-{language}.json").write_text(json.dumps(values if language == "en" else []))
        (root / "sitemap.xml").write_text('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>')

    def test_all_articles_remain_available_once_across_static_pages(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            with contextlib.redirect_stdout(io.StringIO()):
                CheckSite(root, "", "https://history-math.org")

    def test_gate_rejects_lost_cards_indexes_duplicates_and_heavy_metadata(self):
        for mutation, message in (("lost-card", "Static catalog loses"), ("duplicate", "Static catalog loses"),
                                  ("missing-index", "Rendered articles missing"), ("full-discovery", "Full text in lightweight"),
                                  ("missing-text", "Missing full text"), ("missing-search", "Search/discovery coverage differs")):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                self.fixture(root, mutation)
                with self.assertRaisesRegex(SystemExit, message):
                    CheckSite(root, "", "https://history-math.org")
