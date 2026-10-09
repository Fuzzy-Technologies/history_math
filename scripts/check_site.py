"""Validate the actual static output using only the Python standard library."""

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs
from xml.etree import ElementTree


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.language = None
        self.links = []
        self.ids = set()
        self.canonical = []
        self.alternates = []
        self.scripts = []
        self.externalAnchors = []
        self.templateLanguages = []

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == "html":
            self.language = attributes.get("lang")
        if tag == "template":
            self.templateLanguages.append("ru" if attributes.get("id") == "russian-error-page" else self.language)
        if tag == "a" and attributes.get("href"):
            language = self.templateLanguages[-1] if self.templateLanguages else self.language
            self.externalAnchors.append((attributes["href"], language))
        if attributes.get("id"):
            self.ids.add(attributes["id"])
        for name in ("href", "src", "poster", "data-original"):
            if attributes.get(name):
                self.links.append(attributes[name])
        if tag == "img" and attributes.get("srcset"):
            self.links.extend(item.strip().split()[0] for item in attributes["srcset"].split(","))
        if tag == "link" and attributes.get("rel") == "canonical":
            self.canonical.append(attributes.get("href"))
        if tag == "link" and attributes.get("rel") == "alternate":
            self.alternates.append((attributes.get("hreflang"), attributes.get("href")))
        if tag == "script" and attributes.get("src"):
            self.scripts.append(attributes["src"])

    def handle_endtag(self, tag):
        if tag == "template" and self.templateLanguages:
            self.templateLanguages.pop()


def ExternalLocaleError(url, language):
    parts = urlsplit(url)
    query = parse_qs(parts.query)
    if parts.hostname == "fuzzy-technologies.github.io" and parts.path in ("", "/", "/ru/"):
        return parts.path != ("/ru/" if language == "ru" else "/")
    if parts.hostname == "history-math.blogspot.com":
        return query.get("hl") != [language]
    if parts.hostname == "commons.wikimedia.org" and parts.path.startswith("/wiki/"):
        return query.get("uselang") != [language]
    if parts.hostname == "creativecommons.org" and re.fullmatch(r"/licenses/[^/]+/\d+(?:\.\d+)?/(?:deed(?:\.[a-z-]+)?)?", parts.path):
        return not parts.path.endswith("/deed." + language)
    return False


def CheckSite(sitePath, basePath):
    sitePath = Path(sitePath).resolve()
    errors = []
    parsed = {}
    for path in sitePath.rglob("*.html"):
        page = PageParser()
        page.feed(path.read_text(encoding="utf-8"))
        parsed[path] = page

    def Resolve(url, source):
        parts = urlsplit(url)
        if parts.scheme or parts.netloc:
            if parts.netloc != "fuzzy-technologies.github.io":
                return None
            if not parts.path.startswith(basePath + "/") and basePath:
                return None
        path = unquote(parts.path)
        if not path:
            destination = source
        elif path.startswith("/"):
            if basePath and not (path.startswith(basePath + "/") or path == basePath):
                errors.append(f"{source}: missing project base path: {url}")
                return None
            destination = sitePath / path[len(basePath):].lstrip("/")
        else:
            destination = source.parent / path
        if path.endswith("/") or destination.is_dir():
            destination /= "index.html"
        destination = destination.resolve()
        if not destination.is_relative_to(sitePath) or not destination.is_file():
            errors.append(f"{source}: broken local URL: {url}")
        elif parts.fragment and destination in parsed and unquote(parts.fragment) not in parsed[destination].ids:
            errors.append(f"{source}: missing anchor: {url}")
        return destination

    for path, page in parsed.items():
        relative = path.relative_to(sitePath).as_posix()
        expectedLanguage = "ru" if relative.startswith("ru/") else "en"
        if page.language != expectedLanguage:
            errors.append(f"{path}: wrong document language")
        if relative == "index.html":
            publicPath = "/"
        elif relative.endswith("/index.html"):
            publicPath = "/" + relative.removesuffix("index.html")
        else:
            publicPath = "/" + relative
        expectedCanonical = "https://fuzzy-technologies.github.io" + basePath + publicPath
        if page.canonical != [expectedCanonical]:
            errors.append(f"{path}: wrong canonical {page.canonical}")
        for url, language in page.externalAnchors:
            if ExternalLocaleError(url, language):
                errors.append(f"{path}: wrong external link language ({language}): {url}")
        for url in page.links:
            Resolve(url, path)
        for language, url in page.alternates:
            target = Resolve(url, path)
            if target in parsed and parsed[target].language != language:
                errors.append(f"{path}: wrong alternate language")
        if not relative.startswith("ru/articles/") and any("katex" in script for script in page.scripts):
            errors.append(f"{path}: unexpected math renderer")

    for path in sitePath.rglob("*.css"):
        for url in re.findall(r"url\(['\"]?([^)'\"]+)", path.read_text(encoding="utf-8")):
            if not url.startswith("data:"):
                Resolve(url, path)
    for language in ("en", "ru"):
        for kind in ("search", "discovery"):
            records = json.loads((sitePath / "assets" / f"{kind}-{language}.json").read_text(encoding="utf-8"))
            if len({record["url"] for record in records}) != len(records):
                errors.append(f"Duplicate {kind} record")
            for record in records:
                if record["language"] != language or record["status"] not in ("published", "demo"):
                    errors.append(f"Non-public or wrong-language {kind} record")
                if kind == "search" and record.get("translation_notice"):
                    errors.append("Translation notice in article-only search index")
                Resolve(record["url"], sitePath / "index.html")
                if record.get("preview_image"):
                    Resolve(record["preview_image"], sitePath / "index.html")
    sitemap = ElementTree.parse(sitePath / "sitemap.xml")
    for loc in sitemap.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
        Resolve(loc.text, sitePath / "index.html")
    forbidden = [path for path in sitePath.rglob("*") if path.suffix in (".md", ".rb", ".py", ".sqlite3") or
                 path.name in ("Gemfile", "package.json", "AGENTS.md", ".felab.json")]
    errors.extend(f"Unexpected output file: {path}" for path in forbidden)
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"PASS: {len(parsed)} HTML pages, local URLs/assets/anchors, canonical/hreflang, language indexes and sitemap ({basePath or 'root domain'})")


if __name__ == "__main__":
    CheckSite(sys.argv[1] if len(sys.argv) > 1 else "_site", sys.argv[2] if len(sys.argv) > 2 else "/history_math")
