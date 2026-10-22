#!/usr/bin/env python3
"""Opt-in, post-build PDF storage. Planning is read-only and uses no network."""

import argparse
from copy import deepcopy
import hashlib
from html import unescape
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlencode, unquote, urljoin, urlsplit
from urllib.request import Request, build_opener


REPOSITORY = "Fuzzy-Technologies/history_math"
LIMIT = 1_000_000_000
MAX_ID = 9_007_199_254_740_991
SHA = re.compile(r"[a-f0-9]{40}\Z")
SHA256 = re.compile(r"[a-f0-9]{64}\Z")
ROOT = Path(__file__).resolve().parents[1]
COMPATIBILITY_PATH = ROOT / "site/assets/pdf-compatibility.json"


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def digest(path):
    checksum = hashlib.sha256()
    size = 0
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            checksum.update(chunk)
            size += len(chunk)
    return {"sha256": checksum.hexdigest(), "bytes": size}


def compatibility_manifest(value=None):
    value = json.loads(COMPATIBILITY_PATH.read_text("utf-8")) if value is None else value
    keys = {"version", "source_commit", "source_run", "source_attempt", "source_manifest_sha256", "origin", "baseurl", "pdf_count", "pdf_bytes", "pdfs"}
    if not isinstance(value, dict) or set(value) != keys or value.get("version") != 1 or (
            not isinstance(value.get("source_commit"), str) or not SHA.fullmatch(value["source_commit"]) or
            not isinstance(value.get("source_manifest_sha256"), str) or not SHA256.fullmatch(value["source_manifest_sha256"]) or
            any(type(value.get(key)) is not int or value[key] < 1 for key in ["source_run", "source_attempt"]) or
            not isinstance(value.get("pdfs"), list) or not re.fullmatch(r"https://[a-zA-Z0-9.-]+", value.get("origin", "")) or
            not re.fullmatch(r"(?:/[a-zA-Z0-9_-]+)*", value.get("baseurl", "INVALID"))):
        raise ValueError("Invalid pinned PDF compatibility manifest")
    paths, size = set(), 0
    for record in value["pdfs"]:
        path = record.get("path", "") if isinstance(record, dict) else ""
        match = re.fullmatch(r"/assets/pdf/(en|ru)/([a-z0-9-]+)-(en|ru)\.pdf", path)
        if not isinstance(record, dict) or set(record) != {"path", "sha256", "bytes"} or not match or (
                match[1] != match[3] or path in paths or not SHA256.fullmatch(record.get("sha256", "")) or
                type(record.get("bytes")) is not int or not 1000 <= record["bytes"] < 2 ** 31):
            raise ValueError("Invalid retained PDF identity, checksum or size")
        paths.add(path)
        size += record["bytes"]
    if type(value["pdf_count"]) is not int or value["pdf_count"] != len(paths) or (
            type(value["pdf_bytes"]) is not int or value["pdf_bytes"] != size):
        raise ValueError("Retained PDF count or byte total differs")
    return value


def compatibility_hash(value):
    return hashlib.sha256(encoded(compatibility_manifest(value))).hexdigest()


def verify_compatibility_files(directory, value):
    records = compatibility_manifest(value)["pdfs"]
    if records and directory is None:
        raise ValueError("Exact previously published PDF bytes are required")
    if directory is not None and Path(directory).is_symlink():
        raise ValueError("Unsafe retained PDF cache")
    root = Path(directory).resolve() if directory is not None else None
    for record in records:
        path = root / record["path"].lstrip("/")
        if any(item.is_symlink() for item in [path, *path.parents] if item.is_relative_to(root)) or not path.is_file() or not path.resolve().is_relative_to(root) or (
                digest(path) != {key: record[key] for key in ["sha256", "bytes"]}):
            raise ValueError("Retained PDF is missing, unsafe or differs from the pinned live bytes")
        with path.open("rb") as stream:
            if stream.read(5) != b"%PDF-":
                raise ValueError("Invalid retained PDF signature")
    return root


def anonymous_opener():
    sys.path.insert(0, str(ROOT / "tools"))
    from article_publish import SafeRedirect
    return build_opener(SafeRedirect())


def public_json(url, opener=None):
    with (opener or anonymous_opener()).open(Request(url, headers={"User-Agent": "history-math-pdf-compatibility"}), timeout=60) as response:
        raw = response.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError("Public PDF inventory exceeds the bounded response limit")
    return json.loads(raw)


def verify_public_coverage(value, read_json=public_json):
    value = compatibility_manifest(value)
    prefix = value["origin"] + value["baseurl"]
    live = validate_manifest(read_json(prefix + "/assets/article-pdfs.json"))
    if any(live[key] != value[key] for key in ["origin", "baseurl"]):
        raise ValueError("Current live PDF publication origin/path differs from compatibility policy")
    pinned = {record["path"]: record for record in value["pdfs"]}
    if live["version"] == 2:
        if not {article["pdf_url"] for article in live["articles"]}.issubset(pinned):
            raise ValueError("Current live local PDF URLs exceed the pinned compatibility list; refresh it before relocation")
    else:
        previous = compatibility_manifest(read_json(prefix + "/assets/pdf-compatibility.json"))
        if compatibility_hash(previous) != live["compatibility_sha256"] or any(
                pinned.get(record["path"]) != record for record in previous["pdfs"]):
            raise ValueError("The new compatibility list drops or changes a previously retained PDF")


def fetch_compatibility(directory, value=None, opener=None):
    value = compatibility_manifest(value)
    if Path(directory).is_symlink():
        raise ValueError("Unsafe retained PDF cache")
    directory = Path(directory).resolve()
    opener = opener or anonymous_opener()
    for record in value["pdfs"]:
        path = directory / record["path"].lstrip("/")
        if path.exists() or path.is_symlink():
            verify_compatibility_files(directory, {**value, "pdfs": [record], "pdf_count": 1, "pdf_bytes": record["bytes"]})
            continue
        if any(item.is_symlink() for item in path.parents if item.is_relative_to(directory)) or not path.parent.resolve().is_relative_to(directory):
            raise ValueError("Unsafe retained PDF cache")
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".retained-", delete=False) as stream:
                temporary = Path(stream.name)
                url = value["origin"] + value["baseurl"] + record["path"]
                with opener.open(Request(url, headers={"User-Agent": "history-math-pdf-compatibility"}), timeout=180) as response:
                    size = 0
                    while chunk := response.read(1024 * 1024):
                        size += len(chunk)
                        if size > record["bytes"]:
                            raise ValueError("Retained PDF download exceeds its pinned size")
                        stream.write(chunk)
            if digest(temporary) != {key: record[key] for key in ["sha256", "bytes"]}:
                raise ValueError("Retained PDF download differs from its pinned live checksum or size")
            temporary.rename(path)
        finally:
            if temporary is not None and temporary.exists():
                temporary.unlink()
    verify_compatibility_files(directory, value)
    return directory


def pdf_path(article):
    url, language = article.get("url"), article.get("lang")
    match = isinstance(url, str) and re.fullmatch(r"/(ru/)?articles/([a-z0-9-]+)/", url)
    if not match or language not in {"en", "ru"} or bool(match[1]) != (language == "ru"):
        raise ValueError("Invalid PDF article identity")
    slug = match[2]
    if re.search(r"-(?:ru|en)-(?:ru|en)$", slug) or (
            re.fullmatch(r"hm-(?:tt-)?[0-9a-f]{12}-(?:ru|en)", slug) and not slug.endswith("-" + language)):
        raise ValueError("Invalid PDF language suffix")
    return f"/assets/pdf/{language}/{slug if slug.endswith('-' + language) else slug + '-' + language}.pdf"


def asset_name(article, checksum):
    if not isinstance(checksum, str) or not SHA256.fullmatch(checksum):
        raise ValueError("Invalid PDF checksum")
    filename = pdf_path(article).rsplit("/", 1)[1]
    stem = filename.removesuffix("-" + article["lang"] + ".pdf")
    name = f"{stem}-{checksum}-{article['lang']}.pdf"
    if len(name) > 240:
        raise ValueError("PDF asset filename exceeds safe storage length")
    return name


def descriptor(article, record, asset_id):
    if type(asset_id) is not int or not 0 < asset_id <= MAX_ID:
        raise ValueError("Invalid PDF asset identifier")
    if type(record.get("bytes")) is not int or not 1000 <= record["bytes"] < 2 ** 31:
        raise ValueError("PDF size is outside the storage contract")
    name = asset_name(article, record.get("sha256"))
    tag = "article-pdfs-" + record["sha256"][0]
    return {"storage": "github-release", "release_tag": tag, "asset_id": asset_id,
            "url": f"https://github.com/{REPOSITORY}/releases/download/{tag}/{name}",
            "api_url": f"https://api.github.com/repos/{REPOSITORY}/releases/assets/{asset_id}",
            "sha256": record["sha256"], "bytes": record["bytes"]}


def validate_manifest(manifest):
    if not isinstance(manifest, dict):
        raise ValueError("Invalid PDF manifest object")
    version = manifest.get("version")
    keys = {"version", "baseurl", "origin", "articles"} | ({"source_commit", "compatibility_sha256"} if version == 3 else set())
    if set(manifest) != keys or version not in {2, 3} or not isinstance(manifest.get("articles"), list):
        raise ValueError("Invalid PDF manifest")
    if not re.fullmatch(r"(?:/[a-zA-Z0-9_-]+)*", manifest.get("baseurl", "INVALID")) or not re.fullmatch(
            r"https://[a-zA-Z0-9.-]+(?::[0-9]+)?", manifest.get("origin", "")):
        raise ValueError("Invalid PDF publication origin/path")
    if version == 3 and not SHA.fullmatch(manifest.get("source_commit", "")):
        raise ValueError("Missing external PDF source commit")
    if version == 3 and not SHA256.fullmatch(manifest.get("compatibility_sha256", "")):
        raise ValueError("Missing retained PDF manifest checksum")
    paths, ids = set(), set()
    for article in manifest["articles"]:
        if not isinstance(article, dict):
            raise ValueError("Invalid PDF article object")
        expected_keys = {"url", "pdf_url", "lang", "title"} | ({"external_pdf"} if version == 3 else set())
        if set(article) != expected_keys or article.get("pdf_url") != pdf_path(article) or (
                not isinstance(article.get("title"), str) or not article["title"].strip() or article["pdf_url"] in paths):
            raise ValueError("Invalid or duplicate PDF article")
        paths.add(article["pdf_url"])
        if version == 3:
            external = article["external_pdf"]
            if not isinstance(external, dict) or external != descriptor(article, external, external.get("asset_id")):
                raise ValueError("Invalid external PDF descriptor")
            if external["asset_id"] in ids:
                raise ValueError("Duplicate PDF release asset identifier")
            ids.add(external["asset_id"])
    return manifest


class PdfButtons(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.buttons = []
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "a" and "article-pdf" in attrs.get("class", "").split():
            if len(attrs) != len(attributes):
                raise ValueError("Duplicate PDF button attribute")
            self.buttons.append((attrs, self.get_starttag_text()))


def button_html(html, article, baseurl, external=None):
    buttons = PdfButtons(html).buttons
    if len(buttons) != 1:
        raise ValueError("Article must retain exactly one PDF download control")
    attrs, tag = buttons[0]
    if attrs.get("href") != baseurl + article["pdf_url"] or attrs.get("download") != article["pdf_url"].rsplit("/", 1)[1]:
        raise ValueError("PDF control differs from the local manifest")
    if not external:
        return html
    changed = tag
    for key, value in {"href": external["url"], "download": external["url"].rsplit("/", 1)[1]}.items():
        pattern = rf"(\s{key}=)([\"'])(.*?)\2"
        if len(re.findall(pattern, changed)) != 1:
            raise ValueError("Unsupported PDF button attribute markup")
        changed = re.sub(pattern, lambda match: match[1] + match[2] + value + match[2], changed)
    if html.count(tag) != 1:
        raise ValueError("Ambiguous PDF control markup")
    return html.replace(tag, changed, 1)


def inventory(root):
    root = Path(root).resolve()
    files = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise ValueError("Symbolic link in publication input")
        if path.is_file():
            files[path.relative_to(root).as_posix()] = digest(path)
        elif not path.is_dir():
            raise ValueError("Nonregular publication input")
    return files


def removed_pdf_reference(html, manifest, retained=(), page_path="index.html"):
    for value in re.findall(r"\b(?:href|src|data)=[\"']([^\"']+)", html):
        base = manifest["origin"] + manifest["baseurl"] + "/" + page_path
        parts = urlsplit(urljoin(base, unquote(unescape(value))))
        if parts.netloc and parts.netloc != urlsplit(manifest["origin"]).netloc:
            continue
        path = parts.path
        if path.startswith(manifest["baseurl"] + "/assets/pdf/") and path[len(manifest["baseurl"]):] not in retained:
            return True
    return False


def plan(root, commit=None, compatibility_dir=None):
    root = Path(root).resolve()
    files = inventory(root)
    manifest = validate_manifest(json.loads((root / "assets/article-pdfs.json").read_text("utf-8")))
    if manifest["version"] != 2 or not manifest["articles"]:
        raise ValueError("Storage requires a fresh local PDF build")
    if commit is not None and not SHA.fullmatch(commit):
        raise ValueError("Invalid publication commit")
    compatibility = compatibility_manifest()
    verify_compatibility_files(compatibility_dir, compatibility)
    retained = {record["path"] for record in compatibility["pdfs"]}
    if not retained.issubset({article["pdf_url"] for article in manifest["articles"]}):
        raise ValueError("A previously public PDF is absent from the current catalogue; review its compatibility policy")
    origin_matches = all(manifest[key] == compatibility[key] for key in ["origin", "baseurl"])
    if commit is not None and not origin_matches:
        raise ValueError("Production PDF compatibility requires the original public origin and base path")
    expected = {article["pdf_url"].lstrip("/") for article in manifest["articles"]}
    if expected != {name for name in files if name.startswith("assets/pdf/")}:
        raise ValueError("Missing, orphaned or extra PDF output")
    upper_manifest = deepcopy(manifest)
    upper_manifest.update(version=3, source_commit=commit or "0" * 40, compatibility_sha256=compatibility_hash(compatibility))
    html_delta = 0
    changed_pages = {}
    for index, article in enumerate(upper_manifest["articles"]):
        path = article["pdf_url"].lstrip("/")
        with (root / path).open("rb") as stream:
            if stream.read(5) != b"%PDF-":
                raise ValueError("Invalid local PDF signature")
        # Maximum safe integer IDs bound unknown future descriptor length.
        external = descriptor(article, files[path], MAX_ID - index)
        page = root / article["url"].lstrip("/") / "index.html"
        html = page.read_text("utf-8")
        changed = button_html(html, article, manifest["baseurl"], external)
        changed_pages[page.relative_to(root).as_posix()] = changed
        html_delta += len(changed.encode("utf-8")) - files[page.relative_to(root).as_posix()]["bytes"]
        article["external_pdf"] = external
    for name in files:
        if name.endswith(".html") and removed_pdf_reference(
                changed_pages.get(name, (root / name).read_text("utf-8")), manifest, retained, name):
            raise ValueError("A built link outside the download control needs local PDFs")
    before = sum(record["bytes"] for record in files.values())
    pdf_bytes = sum(files[name]["bytes"] for name in expected)
    compatibility_delta = len(encoded(compatibility)) - files.get("assets/pdf-compatibility.json", {"bytes": 0})["bytes"]
    upper = before - pdf_bytes + compatibility["pdf_bytes"] + compatibility_delta + html_delta + len(encoded(upper_manifest)) - files["assets/article-pdfs.json"]["bytes"]
    if upper >= LIMIT:
        raise ValueError("PDF relocation cannot meet the unchanged Pages size limit")
    return {"version": 1, "source_commit": commit, "manifest": manifest, "files": files, "compatibility": compatibility,
            "capacity": {"before_bytes": before, "pdf_bytes": pdf_bytes, "non_pdf_bytes": before - pdf_bytes,
                         "projected_max_bytes": upper, "limit_bytes": LIMIT, "pdf_count": len(expected),
                         "retained_pdf_bytes": compatibility["pdf_bytes"], "retained_pdf_count": compatibility["pdf_count"],
                         "remaining_headroom_bytes": LIMIT - upper, "warning": upper >= 800_000_000},
            "compatibility_origin_matches_build": origin_matches,
            "mode": "read-only-plan", "provider_verification": "not_run", "anonymous_verification": "not_run"}


def validate_pdf_output(root, manifest):
    validate_manifest(manifest)
    root = Path(root)
    pdf_root = root / "assets/pdf"
    if any(path.is_symlink() for path in [pdf_root, *pdf_root.parents] if path.is_relative_to(root)) or any(
            path.is_symlink() for path in pdf_root.rglob("*")):
        raise ValueError("Symbolic link in PDF output")
    expected_pages = set()
    retained = set()
    if manifest["version"] == 2:
        expected = {article["pdf_url"].lstrip("/") for article in manifest["articles"]}
        actual = {path.relative_to(root).as_posix() for path in (root / "assets/pdf").rglob("*") if path.is_file()}
        if expected != actual:
            raise ValueError("Missing or orphaned local PDFs")
        for article in manifest["articles"]:
            page = root / article["url"].lstrip("/") / "index.html"
            expected_pages.add(page.resolve())
            button_html(page.read_text("utf-8"), article, manifest["baseurl"])
            path = root / article["pdf_url"].lstrip("/")
            with path.open("rb") as stream:
                if path.stat().st_size < 1000 or stream.read(5) != b"%PDF-":
                    raise ValueError("Missing or invalid local PDF")
    else:
        path = root / "assets/pdf-compatibility.json"
        compatibility = compatibility_manifest(json.loads(path.read_text("utf-8")))
        if any(manifest[key] != compatibility[key] for key in ["origin", "baseurl"]):
            raise ValueError("Retained PDF publication origin/path differs")
        if hashlib.sha256(path.read_bytes()).hexdigest() != manifest["compatibility_sha256"]:
            raise ValueError("Retained PDF manifest checksum differs")
        retained = {record["path"] for record in compatibility["pdfs"]}
        if not retained.issubset({article["pdf_url"] for article in manifest["articles"]}):
            raise ValueError("Retained PDF identity is absent from the catalogue")
        actual = {"/" + path.relative_to(root).as_posix() for path in (root / "assets/pdf").rglob("*") if path.is_file()}
        if actual != retained:
            raise ValueError("Missing or unlisted retained local PDF")
        verify_compatibility_files(root, compatibility)
    for article in manifest["articles"] if manifest["version"] == 3 else []:
        page = root / article["url"].lstrip("/") / "index.html"
        expected_pages.add(page.resolve())
        buttons = PdfButtons(page.read_text("utf-8")).buttons
        external = article["external_pdf"]
        if len(buttons) != 1 or buttons[0][0].get("href") != external["url"] or (
                buttons[0][0].get("download") != external["url"].rsplit("/", 1)[1]):
            raise ValueError("Missing or altered external PDF control")
    for page in root.rglob("*.html"):
        text = page.read_text("utf-8")
        if page.resolve() not in expected_pages and PdfButtons(text).buttons:
            raise ValueError("PDF control absent from the public PDF manifest")
        if manifest["version"] == 3 and removed_pdf_reference(text, manifest, retained, page.relative_to(root).as_posix()):
            raise ValueError("A built link still points to removed local PDFs")


def authorized_context(environment):
    if any(environment.get(key) != value for key, value in {
            "GITHUB_ACTIONS": "true", "GITHUB_REPOSITORY": REPOSITORY,
            "GITHUB_REF": "refs/heads/master", "ARTICLE_PDF_RELEASE_STORAGE": "true"}.items()) or (
            environment.get("GITHUB_EVENT_NAME") not in {"push", "workflow_dispatch"}):
        raise ValueError("PDF writes require separately enabled, trusted master publication")
    commit = environment.get("GITHUB_SHA", "")
    if not SHA.fullmatch(commit):
        raise ValueError("PDF storage requires an immutable master commit")
    return commit


def github_provider(token, commit):
    # Reuse the original-storage transport, retry/pacing and credential-free
    # native download path. Its article tags/branch mutation methods are unused.
    sys.path.insert(0, str(ROOT / "tools"))
    from article_publish import GitHubAPI, ApiError

    class PdfReleaseAPI(GitHubAPI):
        def verify_anchor(self, tag, allow_missing=False):
            try:
                ref = self.get(f"/repos/{REPOSITORY}/git/ref/tags/{tag}").get("object", {})
            except ApiError as error:
                if allow_missing and error.status == 404:
                    return
                raise
            if ref.get("type") != "commit" or not SHA.fullmatch(ref.get("sha", "")):
                raise ValueError("PDF storage tag is not a commit anchor")
            subprocess.run(["git", "merge-base", "--is-ancestor", ref["sha"], commit], cwd=ROOT, check=True, capture_output=True)

        def release(self, tag):
            if not re.fullmatch(r"article-pdfs-[0-9a-f]", tag):
                raise ValueError("Invalid PDF storage tag")
            if tag in self.releases:
                return self.releases[tag]
            endpoint = f"/repos/{REPOSITORY}/releases/tags/{tag}"
            try:
                release = self.get(endpoint)
            except ApiError as error:
                if error.status != 404:
                    raise
                # An existing tag wins over target_commitish. Reject a foreign
                # anchor before creating a Release, then verify again afterward.
                self.verify_anchor(tag, allow_missing=True)
                try:
                    release = self.post(f"/repos/{REPOSITORY}/releases", {
                        "tag_name": tag, "target_commitish": commit, "name": f"Article PDFs ({tag[-1]})",
                        "body": "Content-addressed publication PDFs. These storage containers do not grant editorial approval.",
                        "draft": False, "prerelease": True, "make_latest": "false", "generate_release_notes": False})
                except ApiError as race:
                    if race.status != 422:
                        raise
                    release = self.get(endpoint)
            if release.get("tag_name") != tag or release.get("draft") is not False or release.get("prerelease") is not True or (
                    type(release.get("id")) is not int or release["id"] <= 0):
                raise ValueError("Invalid PDF storage release")
            self.verify_anchor(tag)
            self.releases[tag] = release
            return release

        def ensure(self, article, record, path):
            if digest(path) != record:
                raise ValueError("PDF bytes changed before upload")
            template = descriptor(article, record, 1)
            name = asset_name(article, record["sha256"])
            release = self.release(template["release_tag"])
            assets = self.assets(release["id"])
            asset = assets.get(name)
            if asset is None:
                if len(assets) >= 1000:
                    raise ValueError("PDF release bucket is full; never delete/replace existing assets")
                endpoint = f"https://uploads.github.com/repos/{REPOSITORY}/releases/{release['id']}/assets?{urlencode({'name': name})}"
                try:
                    asset = self.request("POST", endpoint, data=path.read_bytes(), content_type="application/pdf")
                except ApiError as error:
                    if error.status not in {422, 500, 502, 503, 504}:
                        raise
                    asset = self.assets(release["id"], refresh=True).get(name)
                    if asset is None:
                        raise
                assets[name] = asset
            result = descriptor(article, record, asset.get("id"))
            # Unlike legacy originals, a missing provider SHA is not accepted.
            if asset.get("name") != name or asset.get("state") != "uploaded" or (
                    asset.get("size") != record["bytes"] or asset.get("digest") != "sha256:" + record["sha256"] or
                    asset.get("browser_download_url") != result["url"]):
                raise ValueError("PDF provider SHA, size, state or URL differs")
            if self.download_digest(result["url"]) != (record["sha256"], record["bytes"]):
                raise ValueError("Anonymous PDF SHA or size differs")
            return result

    return PdfReleaseAPI(REPOSITORY, token)


def externalize(source, destination, input_plan, provider, commit, compatibility_dir=None):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if destination.exists() or source == destination or source in destination.parents or destination in source.parents:
        raise ValueError("A new, separate publication destination is required")
    if input_plan != plan(source, commit, compatibility_dir):
        raise ValueError("Publication input changed since its pinned plan")
    manifest = deepcopy(input_plan["manifest"])
    compatibility = input_plan["compatibility"]
    manifest.update(version=3, source_commit=commit, compatibility_sha256=compatibility_hash(compatibility))
    for article in manifest["articles"]:
        relative = article["pdf_url"].lstrip("/")
        result = provider.ensure(article, input_plan["files"][relative], source / relative)
        if result != descriptor(article, input_plan["files"][relative], result.get("asset_id")):
            raise ValueError("Provider returned an invalid PDF identity")
        article["external_pdf"] = result
    # All remote bytes are verified before excluding any PDF or changing a link.
    if input_plan["files"] != inventory(source):
        raise ValueError("Publication changed during PDF verification")
    destination.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".pdf-stage-", dir=destination.parent))
    try:
        for relative, record in input_plan["files"].items():
            if relative.startswith("assets/pdf/"):
                continue
            target = stage / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / relative, target)  # Never hardlink mutable output.
            if digest(target) != record:
                raise ValueError("Publication copy differs from its verified input")
        for article in manifest["articles"]:
            page = stage / article["url"].lstrip("/") / "index.html"
            page.write_text(button_html(page.read_text("utf-8"), article, manifest["baseurl"], article["external_pdf"]), "utf-8")
        (stage / "assets/article-pdfs.json").write_bytes(encoded(manifest))
        (stage / "assets/pdf-compatibility.json").write_bytes(encoded(compatibility))
        verify_compatibility_files(compatibility_dir, compatibility)
        for record in compatibility["pdfs"]:
            target = stage / record["path"].lstrip("/")
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(Path(compatibility_dir) / record["path"].lstrip("/"), target)
        validate_pdf_output(stage, manifest)
        size = sum(item["bytes"] for item in inventory(stage).values())
        if size >= LIMIT or size > input_plan["capacity"]["projected_max_bytes"]:
            raise ValueError("External PDF output exceeds its unchanged capacity gate")
        stage.rename(destination)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return {"version": 1, "source_commit": commit, "manifest_sha256": hashlib.sha256(encoded(manifest)).hexdigest(),
            "input_plan_sha256": hashlib.sha256(encoded(input_plan)).hexdigest(),
            "source_manifest_sha256": input_plan["files"]["assets/article-pdfs.json"]["sha256"],
            "provider_verification": "pass", "anonymous_verification": "pass", "pdf_count": len(manifest["articles"]),
            "stored_pdf_bytes": input_plan["capacity"]["pdf_bytes"],
            "retained_pdf_count": compatibility["pdf_count"], "retained_pdf_bytes": compatibility["pdf_bytes"],
            "compatibility_sha256": compatibility_hash(compatibility),
            "output_bytes": size, "articles": manifest["articles"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["fetch", "plan", "store"])
    parser.add_argument("--site-dir", type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--plan", type=Path)
    parser.add_argument("--destination", type=Path)
    parser.add_argument("--compatibility-dir", type=Path)
    args = parser.parse_args()
    report = args.report.resolve()
    if any(path and (report == path.resolve() or path.resolve() in report.parents)
           for path in [args.site_dir, args.destination]):
        raise ValueError("Private plan/receipts must remain outside publication output")
    if args.compatibility_dir and any(path and (args.compatibility_dir.resolve() == path.resolve() or
            path.resolve() in args.compatibility_dir.resolve().parents or args.compatibility_dir.resolve() in path.resolve().parents)
            for path in [args.site_dir, args.destination]):
        raise ValueError("The retained PDF cache must remain separate from publication input/output")
    if args.mode == "fetch":
        if not args.compatibility_dir:
            raise ValueError("Fetching retained PDFs requires a separate compatibility cache")
        compatibility = compatibility_manifest()
        verify_public_coverage(compatibility)
        fetch_compatibility(args.compatibility_dir, compatibility)
        # Check coverage again in case publication changed during the downloads.
        verify_public_coverage(compatibility)
        result = {"version": 1, "compatibility_sha256": compatibility_hash(compatibility),
                  "retained_pdf_count": compatibility["pdf_count"], "retained_pdf_bytes": compatibility["pdf_bytes"],
                  "anonymous_legacy_verification": "pass", "live_coverage": "pass"}
    elif args.mode == "plan":
        if not args.site_dir:
            raise ValueError("Planning requires a local site directory")
        result = plan(args.site_dir, os.environ.get("GITHUB_SHA"), args.compatibility_dir)
    else:
        commit = authorized_context(os.environ)
        if subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip() != commit or (
                subprocess.check_output(["git", "status", "--porcelain", "--untracked-files=no"], cwd=ROOT, text=True).strip()):
            raise ValueError("PDF writes require clean checked-out master code")
        if not args.site_dir or not args.plan or not args.destination:
            raise ValueError("Storage requires a pinned plan and new destination")
        # Recheck the actual live inventory before any provider write, including
        # on a retry after another successful publication.
        verify_public_coverage(compatibility_manifest())
        result = externalize(args.site_dir, args.destination, json.loads(args.plan.read_text("utf-8")),
                             github_provider(os.environ.get("GITHUB_TOKEN", ""), commit), commit, args.compatibility_dir)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_bytes(encoded(result))
    print(json.dumps(result.get("capacity", {key: result[key] for key in (
        "pdf_count", "stored_pdf_bytes", "output_bytes", "retained_pdf_count", "retained_pdf_bytes",
        "provider_verification", "anonymous_verification", "anonymous_legacy_verification", "live_coverage") if key in result}), sort_keys=True))


if __name__ == "__main__":
    main()
