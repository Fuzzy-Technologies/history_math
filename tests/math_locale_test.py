"""Verify rendered math routes and publication URL contracts with small fixtures."""

import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from scripts.check_site import CheckSite


class MathLocaleTest(unittest.TestCase):
    def check_page(self, route):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            page = root / route / 'index.html'
            page.parent.mkdir(parents=True, exist_ok=True)
            language = 'ru' if route.startswith('ru/') else 'en'
            page.write_text(f'<html lang="{language}"><link rel="canonical" href="https://fuzzy-technologies.github.io/history_math/{route}/">'
                            '<script src="/history_math/assets/katex.js"></script></html>')
            assets = root / 'assets'
            assets.mkdir()
            (assets / 'katex.js').write_text('')
            for language in ('ru', 'en'):
                for kind in ('search', 'discovery'):
                    (assets / f'{kind}-{language}.json').write_text(json.dumps([]))
            (root / 'sitemap.xml').write_text('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>')
            with contextlib.redirect_stdout(io.StringIO()):
                CheckSite(root, '/history_math', 'https://fuzzy-technologies.github.io')

    def test_renderer_is_allowed_on_both_article_routes_only(self):
        self.check_page('publications/example')
        self.check_page('ru/publications/example')
        for route in ('about', 'ru/about', 'articles', 'articles/example', 'ru/articles/example'):
            with self.assertRaisesRegex(SystemExit, 'unexpected math renderer'):
                self.check_page(route)


class PublicationDomainTest(unittest.TestCase):
    """Exercise canonical and local link checks for both journal addresses."""

    def WriteSite(self, root, base_path, site_origin):
        """Write bilingual output without rendering articles or a real site."""

        assets = root / "assets"
        assets.mkdir()

        for language in ("en", "ru"):
            route = "/ru/" if language == "ru" else "/"
            page = root / route.lstrip("/") / "index.html"
            page.parent.mkdir(parents=True, exist_ok=True)
            page.write_text(
                f'<html lang="{language}"><link rel="canonical" href="{site_origin}{base_path}{route}">'
                f'<link rel="alternate" hreflang="ru" href="{site_origin}{base_path}/ru/"></html>',
                encoding="utf-8",
            )

            for kind in ("search", "discovery"):
                (assets / f"{kind}-{language}.json").write_text("[]", encoding="utf-8")

        (root / "sitemap.xml").write_text(
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            f'<url><loc>{site_origin}{base_path}/</loc></url></urlset>', encoding="utf-8",
        )

    def test_AcceptConfiguredOriginsAndPaths(self):
        """Accept the custom root and project paths with exact bilingual canonicals."""

        for site_origin, base_path in (("https://history-math.org", ""),
                                       ("https://fuzzy-technologies.com", "/history_math"),
                                       ("https://fuzzy-technologies.github.io", "/history_math")):
            with self.subTest(site_origin=site_origin), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                self.WriteSite(root, base_path, site_origin)

                with contextlib.redirect_stdout(io.StringIO()):
                    CheckSite(root, base_path, site_origin)

    def test_RejectStaleCanonical(self):
        """Reject a deployment that still advertises the reference build origin."""

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.WriteSite(root, "", "https://fuzzy-technologies.github.io")

            with self.assertRaisesRegex(SystemExit, "wrong canonical"):
                CheckSite(root, "", "https://history-math.org")

    def test_RejectBrokenAbsoluteLocalLink(self):
        """Treat absolute links on the selected domain as local validation targets."""

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.WriteSite(root, "", "https://history-math.org")

            with (root / "index.html").open("a", encoding="utf-8") as page:
                page.write('<a href="https://history-math.org/missing/">Missing</a>')

            with self.assertRaisesRegex(SystemExit, "broken local URL"):
                CheckSite(root, "", "https://history-math.org")

    def test_AcceptLocalizedLegacyRedirectOnCustomDomain(self):
        """Validate old article paths against the new domain and localized target."""

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            site_origin = "https://history-math.org"
            self.WriteSite(root, "", site_origin)
            route = "/ru/articles/hm-012345abcdef"
            target = "/ru/publications/hm-012345abcdef-ru/"

            for path, redirect in ((route + "/", True), (route + "-ru/", True), (target, False)):
                page = root / path.lstrip("/") / "index.html"
                page.parent.mkdir(parents=True, exist_ok=True)
                metadata = (f'<meta name="article-redirect" content="{target}">'
                            '<meta name="robots" content="noindex, follow">') if redirect else ""
                page.write_text(f'<html lang="ru"><link rel="canonical" href="{site_origin}{target}">'
                                f'{metadata}</html>', encoding="utf-8")

            with contextlib.redirect_stdout(io.StringIO()):
                CheckSite(root, "", site_origin)

            alias = root / route.lstrip("/") / "index.html"
            alias.write_text(alias.read_text().replace(f'content="{target}"', f'content="{route}-ru/"'))
            with self.assertRaisesRegex(SystemExit, "invalid article redirect"):
                CheckSite(root, "", site_origin)
