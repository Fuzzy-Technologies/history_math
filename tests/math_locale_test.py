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
                CheckSite(root, '/history_math')

    def test_renderer_is_allowed_on_both_article_routes_only(self):
        self.check_page('articles/example')
        self.check_page('ru/articles/example')
        for route in ('about', 'ru/about', 'articles'):
            with self.assertRaisesRegex(SystemExit, 'unexpected math renderer'):
                self.check_page(route)
