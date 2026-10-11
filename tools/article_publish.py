#!/usr/bin/env python3
"""Prepare an unmerged article without retaining its original binaries in Git.

Only trusted code runs. The PR contributes scoped publication data, never scripts
or workflow files. The default operation creates an unreferenced, single-parent
commit and a receipt; moving the existing PR branch is a separate leased action.
"""

import argparse
import base64
import hashlib
import json
import mimetypes
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


REPOSITORY = "Fuzzy-Technologies/history_math"
ROOT = Path(__file__).resolve().parents[1]
SHA = re.compile(r"[0-9a-f]{40}\Z")
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
ARTICLE = re.compile(r"[a-z0-9][a-z0-9-]{0,79}\Z")
IMAGE = re.compile(r"[a-z0-9][a-z0-9.-]*\.(?:png|jpe?g|webp|gif)\Z")
RASTER_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
PUBLIC_ORIGIN = "https://fuzzy-technologies.github.io"


class PublishError(RuntimeError):
    """An operation stopped before any branch could be changed."""


class ApiError(PublishError):
    def __init__(self, status, path, message=""):
        super().__init__(f"GitHub HTTP {status} for {path}: {message[:250]}")
        self.status = status


class SafeRedirect(HTTPRedirectHandler):
    """Never forward an API credential to a different host."""

    def __init__(self, cors_headers=None):
        super().__init__()
        self.cors_headers = cors_headers

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if self.cors_headers is not None:
            self.cors_headers.append(headers.get("Access-Control-Allow-Origin"))
        if urlsplit(newurl).scheme != "https":
            raise PublishError("An asset download redirected outside HTTPS")
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected is not None and urlsplit(req.full_url).netloc != urlsplit(newurl).netloc:
            redirected.remove_header("Authorization")
        return redirected


def file_digest(path):
    digest = hashlib.sha256()
    size = 0
    with Path(path).open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
            size += len(chunk)
    return digest.hexdigest(), size


def blob_digest(path):
    path = Path(path)
    digest = hashlib.sha1(f"blob {path.stat().st_size}\0".encode("ascii"))
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def safe_relative(path):
    candidate = PurePosixPath(path)
    if not path or candidate.is_absolute() or ".." in candidate.parts or "\\" in path:
        raise PublishError(f"Unsafe publication path: {path}")
    if candidate.as_posix() != path or any(part in {"", "."} for part in candidate.parts):
        raise PublishError(f"Noncanonical publication path: {path}")
    return path


def scoped_path(path, article_id):
    exact = {
        f"site/_articles/{article_id}.ru.md",
        f"site/_articles/{article_id}.en.md",
        f"site/_articles/ru/{article_id}.md",
        f"site/_articles/en/{article_id}-en.md",
        f"site/_articles/en/{article_id}.md",
        f"reviews/{article_id}.json",
        f"reviews/{article_id}-en.json",
        f"site/_data/article_image_assets/{article_id}.json",
    }
    return path in exact or path.startswith((
        f"site/assets/images/{article_id}/",
        f"site/assets/images/previews/{article_id}/",
    ))


def article_paths(article_id, paths):
    candidates = {
        "ru": (f"site/_articles/{article_id}.ru.md", f"site/_articles/ru/{article_id}.md"),
        "en": (f"site/_articles/{article_id}.en.md", f"site/_articles/en/{article_id}-en.md", f"site/_articles/en/{article_id}.md"),
    }
    selected = {}
    for lang, options in candidates.items():
        matches = [path for path in options if path in paths]
        if len(matches) != 1:
            raise PublishError(f"The article must have exactly one {lang.upper()} source file")
        selected[lang] = matches[0]
    return selected


def validate_inputs(args):
    if args.repository != REPOSITORY:
        raise PublishError("This owner-authorized migration is restricted to its repository")
    if not ARTICLE.fullmatch(args.article_id):
        raise PublishError("Invalid article identifier")
    if args.branch not in {f"feature/article-{args.article_id}-{lang}" for lang in ("ru", "en")}:
        raise PublishError("Only an existing article feature branch with a terminal language is eligible")
    if not SHA.fullmatch(args.base_sha) or not SHA.fullmatch(args.source_sha):
        raise PublishError("Base and source must be immutable commit SHAs")
    if isinstance(args.pr, bool) or not isinstance(args.pr, int) or args.pr < 1:
        raise PublishError("A positive existing PR number is required")


def validate_pr(pr, args):
    validate_inputs(args)
    if pr.get("number") != args.pr or pr.get("state") != "open" or pr.get("merged_at") or pr.get("merged"):
        raise PublishError("The existing article PR must be open and unmerged")
    head = pr.get("head") or {}
    base = pr.get("base") or {}
    if head.get("ref") != args.branch or head.get("sha") != args.source_sha:
        raise PublishError("The article head changed; retain the contributor's current branch")
    if base.get("ref") != "master":
        raise PublishError("The article PR must target master")
    if (head.get("repo") or {}).get("full_name") != args.repository or (base.get("repo") or {}).get("full_name") != args.repository:
        raise PublishError("Privileged preparation does not accept a fork or foreign repository")
    base_sha = base.get("sha", "")
    if not SHA.fullmatch(base_sha):
        raise PublishError("The live master commit is unavailable")
    return base_sha


class GitHubAPI:
    """Authenticated REST writes and credential-free public asset verification."""

    def __init__(self, repository, token, max_wait_seconds=21600):
        if repository != REPOSITORY or not token:
            raise PublishError("A scoped GitHub Actions token is required")
        self.repository = repository
        self.token = token
        self.deadline = time.monotonic() + max_wait_seconds
        self.opener = build_opener(SafeRedirect())
        self.releases = {}
        self.release_assets = {}
        self.public_delivery_verified = False
        self.last_write = 0

    def _wait(self, seconds, reason):
        until = time.monotonic() + max(0, seconds)
        if until > self.deadline:
            raise PublishError(f"GitHub waiting budget exhausted ({reason})")
        while time.monotonic() < until:
            duration = min(50, until - time.monotonic())
            print(f"Waiting {round(duration)} seconds for GitHub ({reason}).", flush=True)
            time.sleep(duration)

    def request(self, method, path, payload=None, data=None, content_type=None):
        if path.startswith("https://"):
            url = path
            parsed = urlsplit(url)
            if (parsed.hostname != "uploads.github.com" or parsed.username or parsed.password or parsed.port
                    or not re.fullmatch(re.escape(f"/repos/{self.repository}/releases/") + r"[1-9][0-9]*/assets", parsed.path)):
                raise PublishError("Unexpected authenticated upload endpoint")
        else:
            if not path.startswith(f"/repos/{self.repository}/"):
                raise PublishError("Unexpected authenticated API endpoint")
            url = "https://api.github.com" + path
        if payload is not None and data is not None:
            raise PublishError("Conflicting HTTP bodies")
        body = json.dumps(payload).encode("utf-8") if payload is not None else data
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "history-math-article-preparation",
        }
        if body is not None:
            headers["Content-Type"] = content_type or "application/json"
        retries = 0
        while True:
            # Six workers stay below the documented short secondary write burst.
            # Longer secondary/hourly limits are handled by the response below.
            if method != "GET":
                elapsed = time.monotonic() - self.last_write
                if elapsed < 5:
                    self._wait(5 - elapsed, "write pacing")
                self.last_write = time.monotonic()
            request = Request(url, data=body, headers=headers, method=method)
            try:
                with self.opener.open(request, timeout=180) as response:
                    raw = response.read()
                    return json.loads(raw) if raw else None
            except HTTPError as error:
                raw = error.read(8192)
                try:
                    message = json.loads(raw).get("message", "")
                except (ValueError, AttributeError):
                    message = "The API request was rejected"
                remaining = error.headers.get("X-RateLimit-Remaining")
                reset = error.headers.get("X-RateLimit-Reset")
                retry_after = error.headers.get("Retry-After")
                if error.code in {403, 429} and remaining == "0" and reset:
                    self._wait(max(1, int(reset) - time.time() + 3), "primary rate limit")
                    continue
                if error.code in {403, 429} and (retry_after or "secondary rate limit" in message.lower()):
                    delay = float(retry_after) if retry_after else min(900, 60 * (2 ** min(retries, 4)))
                    self._wait(delay, "secondary rate limit")
                    retries += 1
                    continue
                if method == "GET" and error.code >= 500 and retries < 3:
                    self._wait(2 ** retries, "temporary API failure")
                    retries += 1
                    continue
                raise ApiError(error.code, urlsplit(url).path, message) from None
            except (URLError, TimeoutError) as error:
                if method == "GET" and retries < 3:
                    self._wait(2 ** retries, "temporary network failure")
                    retries += 1
                    continue
                raise PublishError(f"GitHub network request failed for {urlsplit(url).path}") from error

    def get(self, path):
        return self.request("GET", path)

    def post(self, path, payload):
        return self.request("POST", path, payload)

    def check_pr(self, args):
        pr = self.get(f"/repos/{self.repository}/pulls/{args.pr}")
        return validate_pr(pr, args)

    def ensure_release(self, tag, master_sha):
        if not re.fullmatch(r"article-originals-[0-9a-f]", tag) or not SHA.fullmatch(master_sha):
            raise PublishError("Invalid asset release anchor")
        if tag in self.releases:
            return self.releases[tag]
        path = f"/repos/{self.repository}/releases/tags/{tag}"
        try:
            release = self.get(path)
        except ApiError as error:
            if error.status != 404:
                raise
            try:
                release = self.post(f"/repos/{self.repository}/releases", {
                    "tag_name": tag,
                    # GITHUB_TOKEN cannot create tags pointing to changed workflows.
                    "target_commitish": master_sha,
                    "name": f"Article originals ({tag[-1]})",
                    "body": "Content-addressed article originals. Reading previews and editorial text are reviewed in article pull requests. These files preserve the original bytes.",
                    "draft": False, "prerelease": True, "make_latest": "false",
                    "generate_release_notes": False,
                })
            except ApiError as race:
                if race.status != 422:
                    raise
                release = self.get(path)
        if release.get("tag_name") != tag or release.get("draft") or not release.get("prerelease") or not isinstance(release.get("id"), int):
            raise PublishError("An existing release does not match the asset storage contract")
        self.releases[tag] = release
        return release

    def assets(self, release_id, refresh=False):
        if release_id not in self.release_assets or refresh:
            inventory = {}
            page = 1
            while True:
                records = self.get(f"/repos/{self.repository}/releases/{release_id}/assets?per_page=100&page={page}")
                if not isinstance(records, list):
                    raise PublishError("Invalid release asset listing")
                for asset in records:
                    name = asset.get("name")
                    if name in inventory:
                        raise PublishError("Duplicate names in an existing asset release")
                    inventory[name] = asset
                if len(records) < 100:
                    break
                page += 1
            self.release_assets[release_id] = inventory
        return self.release_assets[release_id]

    def download_digest(self, url, require_cors=False):
        parsed = urlsplit(url)
        allowed = {"github.com", "api.github.com"}
        if parsed.scheme != "https" or parsed.hostname not in allowed or parsed.username or parsed.password:
            raise PublishError("Unexpected public original URL")
        cors = [] if require_cors else None
        opener = build_opener(SafeRedirect(cors))
        headers = {"Accept": "application/octet-stream", "User-Agent": "history-math-original-verification"}
        if require_cors:
            headers["Origin"] = PUBLIC_ORIGIN
        retries = 0
        while True:
            digest = hashlib.sha256()
            size = 0
            try:
                with opener.open(Request(url, headers=headers), timeout=180) as response:
                    if require_cors:
                        cors.append(response.headers.get("Access-Control-Allow-Origin"))
                    while chunk := response.read(1024 * 1024):
                        digest.update(chunk)
                        size += len(chunk)
                if require_cors and any(value not in {"*", PUBLIC_ORIGIN} for value in cors):
                    raise PublishError("Public original delivery does not permit the site's browser origin")
                return digest.hexdigest(), size
            except (URLError, TimeoutError) as error:
                if retries >= 3:
                    raise PublishError("Public original download could not be verified") from error
                retries += 1
                if cors is not None:
                    cors.clear()
                self._wait(2 ** retries, "public download retry")

    def ensure_original(self, article_id, logical_path, entry, local_path, master_sha, delivery_probe=True):
        expected_sha = entry["sha256"]
        expected_size = entry["bytes"]
        original = PurePosixPath(logical_path).name
        stem, suffix = original.rsplit(".", 1)
        stem = stem[:max(1, 240 - len(article_id) - len(expected_sha) - len(suffix) - 3)]
        name = f"{article_id}-{stem}-{expected_sha}.{suffix}"
        tag = f"article-originals-{expected_sha[0]}"
        release = self.ensure_release(tag, master_sha)
        assets = self.assets(release["id"])
        asset = assets.get(name)
        if asset is None:
            if local_path is None:
                raise PublishError("An external original is unavailable in its declared release")
            upload = f"https://uploads.github.com/repos/{self.repository}/releases/{release['id']}/assets?{urlencode({'name': name})}"
            try:
                asset = self.request("POST", upload, data=Path(local_path).read_bytes(),
                                     content_type=mimetypes.guess_type(original)[0] or "application/octet-stream")
            except ApiError as error:
                # A parallel worker, or a response lost after upload, may have won.
                if error.status not in {422, 500, 502, 503, 504}:
                    raise
                asset = self.assets(release["id"], refresh=True).get(name)
                if asset is None:
                    raise
            assets[name] = asset
        expected_url = f"https://github.com/{self.repository}/releases/download/{tag}/{name}"
        asset_id = asset.get("id")
        if isinstance(asset_id, bool) or not isinstance(asset_id, int) or asset_id < 1:
            raise PublishError("An uploaded original has no valid asset identifier")
        if asset.get("name") != name or asset.get("state") != "uploaded" or asset.get("size") != expected_size:
            raise PublishError("An existing/uploaded original has different metadata")
        if asset.get("browser_download_url") != expected_url:
            raise PublishError("An uploaded original has an unexpected public URL")
        metadata_digest = asset.get("digest")
        if metadata_digest and metadata_digest != f"sha256:{expected_sha}":
            raise PublishError("An existing/uploaded original has a different GitHub digest")
        if self.download_digest(expected_url) != (expected_sha, expected_size):
            raise PublishError("Downloaded original checksum or size differs; keep the branch history")
        api_url = f"https://api.github.com/repos/{self.repository}/releases/assets/{asset_id}"
        if delivery_probe and not self.public_delivery_verified:
            if self.download_digest(api_url, require_cors=True) != (expected_sha, expected_size):
                raise PublishError("Public API delivery did not return the exact original bytes")
            self.public_delivery_verified = True
        return {
            "storage": "github-release", "url": expected_url, "api_url": api_url,
            "asset_id": asset_id, "release_tag": tag,
            "sha256": expected_sha, "bytes": expected_size,
        }


class GitReader:
    """Read pinned public Git objects without spending REST request quota."""

    def __init__(self, directory, repository):
        if repository != REPOSITORY:
            raise PublishError("Unexpected Git repository")
        self.directory = Path(directory).resolve()
        self.repository = repository
        self.directory.parent.mkdir(parents=True, exist_ok=True)
        if not self.directory.exists():
            subprocess.run(["git", "init", "--bare", str(self.directory)], check=True, capture_output=True)
            self.run("remote", "add", "origin", f"https://github.com/{repository}.git")
            self.run("config", "remote.origin.promisor", "true")
            self.run("config", "remote.origin.partialclonefilter", "blob:none")
        if self.run("remote", "get-url", "origin").strip() != f"https://github.com/{repository}.git":
            raise PublishError("The public Git reader has an unexpected remote")
        self.trees = {}

    def run(self, *arguments, output=None, env=None, authenticated=False):
        settings = dict(os.environ if env is None else env)
        settings.update({"GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull, "GIT_TERMINAL_PROMPT": "0"})
        command = ["git", "-c", "core.hooksPath=" + os.devnull, "-c", "credential.helper=", "--git-dir", str(self.directory)]
        if not authenticated:
            command[1:1] = ["-c", "http.extraheader="]
        result = subprocess.run(command + list(arguments), env=settings, stdout=output or subprocess.PIPE,
                                stderr=subprocess.PIPE, timeout=1800)
        if result.returncode:
            raise PublishError(f"Public Git operation failed ({arguments[0]}): {result.stderr.decode('utf-8', 'replace')[-500:]}")
        return result.stdout.decode("utf-8") if output is None else None

    def ensure(self, sha, full=False):
        if not SHA.fullmatch(sha):
            raise PublishError("Git reads require an immutable commit SHA")
        try:
            self.run("cat-file", "-e", sha + "^{commit}")
            return
        except PublishError:
            options = [] if full else ["--filter=blob:none"]
            self.run("fetch", "--depth=1", "--no-tags", *options, "origin", sha)
        if self.run("rev-parse", sha + "^{commit}").strip() != sha:
            raise PublishError("Fetched commit differs from its immutable source pin")

    def tree(self, sha):
        if sha not in self.trees:
            self.ensure(sha)
            records = {}
            for item in self.run("ls-tree", "-r", "-z", sha).split("\0"):
                if not item:
                    continue
                metadata, path = item.split("\t", 1)
                mode, kind, object_sha = metadata.split(" ")
                safe_relative(path)
                records[path] = {"mode": mode, "type": kind, "sha": object_sha}
            self.trees[sha] = records
        return self.trees[sha]

    def blob(self, sha, path, destination):
        safe_relative(path)
        destination = Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("wb") as output:
            self.run("show", f"{sha}:{path}", output=output)

    def base_workspace(self, sha, destination):
        self.ensure(sha, full=True)
        destination = Path(destination)
        destination.mkdir(parents=True, exist_ok=False)
        archive = self.directory.parent / f"trusted-{sha}.tar"
        if not archive.exists():
            with archive.open("wb") as output:
                self.run("archive", "--format=tar", sha, output=output)
        with tarfile.open(archive) as source:
            for member in source:
                relative = member.name.rstrip("/")
                if not relative:
                    continue
                safe_relative(relative)
                target = destination / relative
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                elif member.isfile():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with source.extractfile(member) as incoming, target.open("wb") as outgoing:
                        shutil.copyfileobj(incoming, outgoing)
                    target.chmod(0o755 if member.mode & 0o111 else 0o644)
                else:
                    raise PublishError("Trusted base contains an unsupported archive entry")

    def tree_sha(self, sha):
        return self.run("rev-parse", sha + "^{tree}").strip()

    def parents(self, sha):
        return [line.split(" ", 1)[1] for line in self.run("cat-file", "commit", sha).splitlines() if line.startswith("parent ")]


def copy_original_reading_previews(stage, article_id, reader=None, source_sha=None, source_tree=None):
    """Keep original aliases and shared reading blobs in the article folder."""
    fragment = Path(stage) / f"site/_data/article_image_assets/{article_id}.json"
    try:
        manifest = json.loads(fragment.read_text("utf-8"))
    except (OSError, ValueError) as error:
        raise PublishError("The article image manifest is unavailable or invalid") from error
    if not isinstance(manifest, dict):
        raise PublishError("The article image manifest must be an object")
    changed = False
    old_reading_paths = set()
    imported_reading_paths = set()
    actual_original_paths = set(manifest)
    # A declared figure/cover remains an original, even if a malformed inventory
    # omitted it. The trusted preparer will reject that omission without deletion.
    referenced_original_paths = set()
    for path in article_paths(article_id, {
            file.relative_to(stage).as_posix() for file in Path(stage).rglob("*.md")}).values():
        text = (Path(stage) / path).read_text("utf-8")
        referenced_original_paths.update(re.findall(r"/assets/images/" + re.escape(article_id) + r"/[a-z0-9.-]+", text))
    for logical, entry in manifest.items():
        for variant in entry.get("variants", []) if isinstance(entry, dict) else []:
            if not isinstance(variant, dict):
                raise PublishError("A reading preview descriptor is invalid")
            source_path = variant.get("path")
            own_preview_prefix = f"/assets/images/previews/{article_id}/"
            if isinstance(source_path, str) and source_path.startswith(own_preview_prefix):
                continue
            prefix = f"/assets/images/{article_id}/"
            if not logical.startswith(prefix) or not IMAGE.fullmatch(logical[len(prefix):]):
                raise PublishError("A reading original is outside the article's own asset folder")
            if not isinstance(source_path, str) or not source_path.startswith((prefix, "/assets/images/previews/shared/")):
                raise PublishError("A reading preview is outside eligible original/shared folders")
            relative = safe_relative("site" + source_path)
            filename = PurePosixPath(source_path).name
            if PurePosixPath(source_path).parent.as_posix() not in {prefix.rstrip("/"), "/assets/images/previews/shared"} or not re.fullmatch(r"[a-z0-9][a-z0-9.-]*\.(png|jpe?g|webp|gif)", filename):
                raise PublishError("A reading source has an unsafe filename")
            original = Path(stage) / relative
            if not original.exists() and reader is not None:
                record = (source_tree or {}).get(relative)
                if not record or record.get("type") != "blob" or record.get("mode") != "100644":
                    raise PublishError("A shared reading source is absent from the pinned regular Git blobs")
                reader.blob(source_sha, relative, original)
                imported_reading_paths.add(source_path)
            if not original.is_file() or original.is_symlink():
                raise PublishError("The reading source is unavailable")
            checksum, size = file_digest(original)
            if checksum != variant.get("sha256") or size != variant.get("bytes"):
                raise PublishError("A reading alias differs from its manifest checksum or size")
            stem = PurePosixPath(logical).stem
            suffix = PurePosixPath(source_path).suffix.lstrip(".")
            original_suffix = PurePosixPath(logical).suffix.lstrip(".")
            width = variant.get("width")
            if isinstance(width, bool) or not isinstance(width, int) or width < 1:
                raise PublishError("The reading preview width is invalid")
            height = variant.get("height")
            if isinstance(height, bool) or not isinstance(height, int) or height < 1:
                raise PublishError("The reading preview height is invalid")
            path = f"{own_preview_prefix}{stem}-{original_suffix}-reading-{width}-{checksum[:12]}.{suffix}"
            target = Path(stage) / "site" / path.lstrip("/")
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists() and file_digest(target) != file_digest(original):
                raise PublishError("A generated reading preview would replace different existing data")
            if not target.exists():
                shutil.copyfile(original, target)
            variant["path"] = path
            old_reading_paths.add(source_path)
            changed = True
    for source_path in old_reading_paths - actual_original_paths - referenced_original_paths:
        if source_path.startswith(f"/assets/images/{article_id}/") or source_path in imported_reading_paths:
            (Path(stage) / "site" / source_path.lstrip("/")).unlink()
    if changed:
        fragment.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8")


def manifest_entries(stage, article_id):
    fragment = Path(stage) / f"site/_data/article_image_assets/{article_id}.json"
    try:
        manifest = json.loads(fragment.read_text("utf-8"))
    except (OSError, ValueError) as error:
        raise PublishError("The article image manifest is unavailable or invalid") from error
    if not isinstance(manifest, dict):
        raise PublishError("The article image manifest must be an object")
    originals = set()
    for logical, entry in manifest.items():
        prefix = f"/assets/images/{article_id}/"
        if not logical.startswith(prefix) or not IMAGE.fullmatch(logical[len(prefix):]):
            raise PublishError("An original image is outside the article's own asset folder")
        if not isinstance(entry, dict) or not SHA256.fullmatch(str(entry.get("sha256", ""))):
            raise PublishError("An original image has no SHA-256 digest")
        size = entry.get("bytes")
        if isinstance(size, bool) or not isinstance(size, int) or size < 1 or size >= 2 * 1024 ** 3:
            raise PublishError("An original image has an invalid release asset size")
        for dimension in ("width", "height"):
            value = entry.get(dimension)
            if isinstance(value, bool) or not isinstance(value, int) or value < 1:
                raise PublishError("An original image has invalid dimensions")
        original = Path(stage) / "site" / logical.lstrip("/")
        if original.exists():
            if original.is_symlink() or file_digest(original) != (entry["sha256"], size):
                raise PublishError("An original file differs from its declared checksum or size")
        elif "external_original" not in entry:
            raise PublishError("An original is missing before external verification")
        variants = entry.get("variants")
        if not isinstance(variants, list) or not variants:
            raise PublishError("Each external original needs a local reading preview")
        preview_paths = set()
        for variant in variants:
            path = variant.get("path", "") if isinstance(variant, dict) else ""
            if not path.startswith(f"/assets/images/previews/{article_id}/"):
                raise PublishError("A reading preview is outside the article's own folder")
            relative = safe_relative("site" + path)
            if relative in preview_paths:
                raise PublishError("Duplicate reading preview path")
            preview_paths.add(relative)
            preview = Path(stage) / relative
            if not preview.is_file() or preview.is_symlink() or file_digest(preview) != (variant.get("sha256"), variant.get("bytes")):
                raise PublishError("A reading preview differs from its declared checksum or size")
        originals.add("site" + logical)
    folder = Path(stage) / f"site/assets/images/{article_id}"
    actual = {path.relative_to(stage).as_posix() for path in folder.rglob("*")
              if path.is_file() and path.suffix.lower() in RASTER_SUFFIXES} if folder.exists() else set()
    if actual - originals:
        raise PublishError("An original raster is absent from the article image manifest")
    return fragment, manifest


def init_markdown_index(stage):
    """Give the trusted formatter a Markdown-only index in an exported tree."""
    environment = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    environment.update({"GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull, "GIT_TERMINAL_PROMPT": "0"})
    common = ["git", "-c", "core.hooksPath=" + os.devnull, "-c", "core.fsmonitor=false", "-C", str(stage)]
    for parameters in (["init", "--quiet"], ["add", "--intent-to-add", "--", "*.md"]):
        result = subprocess.run(common + parameters, env=environment, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, timeout=180)
        if result.returncode:
            raise PublishError("The isolated Markdown validation index could not be created")


def run_trusted_checks(stage, args):
    init_markdown_index(stage)
    report = Path(args.workspace).resolve() / f"{args.article_id}-prepare-report.json"
    commands = [
        [sys.executable, str(ROOT / "tools/article_prepare.py"), "--root", str(stage), "--article-id", args.article_id,
         "--write", "--report", str(report)],
        ["node", str(ROOT / "scripts/check-articles.mjs"), "--source-only", "--branch", args.branch,
         "--commit", args.source_sha],
    ]
    environment = dict(os.environ)
    environment.pop("GITHUB_TOKEN", None)
    for command in commands:
        result = subprocess.run(command, cwd=stage, env=environment, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, timeout=600)
        if result.returncode:
            source_report = Path(stage) / "test-results/article-report.json"
            if command[0] == "node" and source_report.is_file():
                try:
                    findings = json.loads(source_report.read_text("utf-8")).get("findings", [])
                    blocking = [{key: finding.get(key) for key in ("code", "file", "detail") if finding.get(key) is not None}
                                for finding in findings if finding.get("severity") == "error"]
                except (OSError, ValueError, AttributeError, TypeError):
                    blocking = []
                if blocking:
                    raise PublishError("Trusted source checks failed: " + json.dumps(blocking, ensure_ascii=False)[:6000])
            raise PublishError(f"Trusted source preparation failed: {result.stdout.decode('utf-8', 'replace')[-1500:]}")
    try:
        preparation = json.loads(report.read_text("utf-8"))
    except (OSError, ValueError) as error:
        raise PublishError("Trusted preparation did not produce its required report") from error
    if preparation.get("canonical") is not True or preparation.get("article_id") != args.article_id:
        raise PublishError("Trusted preparation did not confirm a canonical article package")
    return {key: preparation.get(key) for key in ("bodies", "renamed_assets", "editorial_approval")}


def run_prepare(args, api=None, reader=None):
    """Return a verified receipt; do not update the original PR branch."""
    validate_inputs(args)
    api = api or GitHubAPI(args.repository, os.environ.get("GITHUB_TOKEN", ""))
    workspace = Path(args.workspace).resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    reader = reader or GitReader(workspace / "git", args.repository)
    master_sha = api.check_pr(args)
    reader.ensure(args.base_sha, full=True)
    reader.ensure(args.source_sha)
    base = reader.tree(args.base_sha)
    source = reader.tree(args.source_sha)
    if any(scoped_path(path, args.article_id) for path in base):
        raise PublishError("This migration does not replace an article already in the trusted base")
    article_source = {path: record for path, record in source.items() if scoped_path(path, args.article_id)}
    language_paths = article_paths(args.article_id, article_source)
    required = {
        *language_paths.values(),
        f"reviews/{args.article_id}.json", f"reviews/{args.article_id}-en.json",
        f"site/_data/article_image_assets/{args.article_id}.json",
    }
    if not required.issubset(article_source):
        raise PublishError("The pinned article must include both language versions, review records and image manifest")
    for path, record in article_source.items():
        safe_relative(path)
        if record["type"] != "blob" or record["mode"] != "100644":
            raise PublishError("Untrusted article data must be regular, nonexecutable files")
    stage = workspace / f"staging-{args.article_id}"
    if stage.exists():
        raise PublishError("The staging folder already exists; use an isolated workspace")
    reader.base_workspace(args.base_sha, stage)
    try:
        for path in article_source:
            reader.blob(args.source_sha, path, stage / path)
        copy_original_reading_previews(stage, args.article_id, reader=reader, source_sha=args.source_sha, source_tree=source)
        preparation = run_trusted_checks(stage, args) if getattr(args, "prepare", True) else None
        fragment, manifest = manifest_entries(stage, args.article_id)
        remaining = {path.relative_to(stage).as_posix() for path in stage.rglob("*") if path.is_file()}
        if set(article_paths(args.article_id, remaining).values()) != set(language_paths.values()) or not required.issubset(remaining):
            raise PublishError("Preparation must retain both source language files and review records")
        receipt = {
            "version": 1, "repository": args.repository, "pr": args.pr, "article_id": args.article_id,
            "branch": args.branch, "source_sha": args.source_sha, "base_sha": args.base_sha,
            "release_target_sha": master_sha, "source_checks": "pass" if getattr(args, "prepare", True) else "not_run",
            "source_article_blobs": {path: article_source[path]["sha"] for path in sorted(required) if path.endswith(".md")},
            "prepared_article_blobs": {},
            "originals": [], "removed_original_bytes": 0, "preview_blobs": {}, "branch_updated": False,
        }
        if isinstance(preparation, dict):
            receipt["preparation"] = preparation
        if getattr(args, "dry_run", False):
            receipt["mode"] = "plan"
            receipt["planned_originals"] = len(manifest)
            receipt["planned_original_bytes"] = sum(entry["bytes"] for entry in manifest.values())
            return write_receipt(receipt, args.receipt_out)
        for logical, entry in sorted(manifest.items()):
            original = stage / "site" / logical.lstrip("/")
            descriptor = api.ensure_original(args.article_id, logical, entry,
                                             original if original.exists() else None, master_sha,
                                             getattr(args, "delivery_probe", True))
            entry["external_original"] = descriptor
            # This deletes only the expendable staging copy after verified upload.
            # The published commit has no ancestor containing the original binary.
            if original.exists():
                original.unlink()
                receipt["removed_original_bytes"] += entry["bytes"]
            receipt["originals"].append({"path": logical, **descriptor, "verified": True})
        fragment.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8")
        manifest_entries(stage, args.article_id)
        tree_entries = []
        known_blob_shas = {record["sha"] for record in source.values() if record["type"] == "blob"}
        for path in sorted(stage.rglob("*")):
            if not path.is_file():
                continue
            relative = path.relative_to(stage).as_posix()
            if not scoped_path(relative, args.article_id):
                continue
            if path.is_symlink():
                raise PublishError("Prepared article output cannot contain symbolic links")
            object_sha = blob_digest(path)
            item = {"path": relative, "mode": "100644", "type": "blob"}
            if object_sha in known_blob_shas:
                item["sha"] = object_sha
            elif path.suffix in {".md", ".json"}:
                item["content"] = path.read_text("utf-8")
            else:
                uploaded = api.post(f"/repos/{args.repository}/git/blobs", {
                    "content": base64.b64encode(path.read_bytes()).decode("ascii"), "encoding": "base64",
                })
                if uploaded.get("sha") != object_sha:
                    raise PublishError("Prepared derivative blob checksum differs")
                item["sha"] = object_sha
            tree_entries.append(item)
            if relative in receipt["source_article_blobs"]:
                receipt["prepared_article_blobs"][relative] = object_sha
            if relative.startswith(f"site/assets/images/previews/{args.article_id}/"):
                receipt["preview_blobs"][relative] = object_sha
        # Assets may have been uploaded while a contributor edited the PR. Never
        # replace that newer head or create a receipt claiming it was unchanged.
        api.check_pr(args)
        tree = api.post(f"/repos/{args.repository}/git/trees", {"base_tree": reader.tree_sha(args.base_sha), "tree": tree_entries})
        if not SHA.fullmatch(tree.get("sha", "")) or tree.get("truncated"):
            raise PublishError("GitHub did not return a complete prepared tree")
        commit = api.post(f"/repos/{args.repository}/git/commits", {
            "message": f"Prepare bilingual article {args.article_id} with verified external originals",
            "tree": tree["sha"], "parents": [args.base_sha],
        })
        if not SHA.fullmatch(commit.get("sha", "")):
            raise PublishError("GitHub did not return a prepared commit")
        returned_parents = [parent.get("sha") for parent in commit.get("parents", [])]
        if returned_parents != [args.base_sha]:
            raise PublishError("The prepared commit must have only the trusted clean base as parent")
        api.check_pr(args)
        receipt.update({"mode": "prepared", "new_sha": commit["sha"], "tree_sha": tree["sha"],
                        "public_api_delivery": "pass" if api.public_delivery_verified else ("not_required" if not manifest else "not_run")})
        return write_receipt(receipt, args.receipt_out)
    finally:
        shutil.rmtree(stage)


def write_receipt(receipt, destination):
    if destination:
        output = Path(destination)
        output.parent.mkdir(parents=True, exist_ok=True)
        temporary = output.with_suffix(output.suffix + ".tmp")
        temporary.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", "utf-8")
        temporary.replace(output)
    return receipt


def apply_receipt(receipt, api, reader):
    """Move only the existing article branch, using an atomic Git head lease."""
    args = argparse.Namespace(repository=receipt.get("repository"), base_sha=receipt.get("base_sha"),
                              source_sha=receipt.get("source_sha"), branch=receipt.get("branch"),
                              pr=receipt.get("pr"), article_id=receipt.get("article_id"))
    validate_inputs(args)
    new_sha = receipt.get("new_sha", "")
    if receipt.get("mode") != "prepared" or not SHA.fullmatch(new_sha) or receipt.get("source_checks") != "pass":
        raise PublishError("Only a checked preparation receipt can update a branch")
    if any(original.get("verified") is not True for original in receipt.get("originals", [])):
        raise PublishError("An unverified original blocks branch cleanup")
    api.check_pr(args)
    reader.ensure(new_sha)
    if reader.parents(new_sha) != [args.base_sha] or reader.tree_sha(new_sha) != receipt.get("tree_sha"):
        raise PublishError("The prepared commit differs from its receipt or clean parent")
    tree = reader.tree(new_sha)
    base_tree = reader.tree(args.base_sha)
    if any(not scoped_path(path, args.article_id) and base_tree.get(path) != record for path, record in tree.items()):
        raise PublishError("The prepared commit changes files outside its article")
    if any(not scoped_path(path, args.article_id) and tree.get(path) != record for path, record in base_tree.items()):
        raise PublishError("The prepared commit removes files outside its article")
    expected_articles = set(article_paths(args.article_id, tree).values())
    if set(receipt.get("prepared_article_blobs", {})) != expected_articles:
        raise PublishError("Both checked language versions are required by the receipt")
    for path, sha in receipt["prepared_article_blobs"].items():
        if (tree.get(path) or {}).get("sha") != sha:
            raise PublishError("A prepared language version differs from its receipt")
    manifest_path = f"site/_data/article_image_assets/{args.article_id}.json"
    if manifest_path not in tree:
        raise PublishError("The prepared image manifest is missing")
    manifest_file = reader.directory.parent / f"apply-{args.article_id}-manifest.json"
    reader.blob(new_sha, manifest_path, manifest_file)
    try:
        manifest = json.loads(manifest_file.read_text("utf-8"))
    except (OSError, ValueError) as error:
        raise PublishError("The prepared image manifest is invalid") from error
    finally:
        manifest_file.unlink(missing_ok=True)
    originals = receipt.get("originals", [])
    evidence = {original.get("path"): original for original in originals}
    if len(evidence) != len(originals) or set(evidence) != set(manifest):
        raise PublishError("The original verification evidence does not match the prepared manifest")
    if manifest and receipt.get("public_api_delivery") != "pass":
        raise PublishError("Public original delivery was not verified")
    external_keys = {"storage", "url", "api_url", "asset_id", "release_tag", "sha256", "bytes"}
    for logical, entry in manifest.items():
        external = entry.get("external_original") if isinstance(entry, dict) else None
        if not isinstance(external, dict) or set(external) != external_keys:
            raise PublishError("An external original descriptor is incomplete")
        if external != {key: evidence[logical].get(key) for key in external_keys}:
            raise PublishError("An external original differs from its verified receipt")
        if external.get("sha256") != entry.get("sha256") or external.get("bytes") != entry.get("bytes"):
            raise PublishError("An external original differs from its original manifest")
    for original in receipt.get("originals", []):
        if "site" + original["path"] in tree:
            raise PublishError("The prepared commit still contains an original binary")
    for path, sha in receipt.get("preview_blobs", {}).items():
        if (tree.get(path) or {}).get("sha") != sha:
            raise PublishError("The prepared reading preview differs from its receipt")
    environment = dict(os.environ)
    for key in list(environment):
        if key.startswith("GIT_CONFIG_"):
            del environment[key]
    credential = base64.b64encode(f"x-access-token:{api.token}".encode("utf-8")).decode("ascii")
    environment.update({"GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "http.https://github.com/.extraheader",
                        "GIT_CONFIG_VALUE_0": "Authorization: Basic " + credential})
    # The credential is an environment value, never a URL, argument or log.
    reader.run("push", f"--force-with-lease=refs/heads/{args.branch}:{args.source_sha}", "origin",
               f"{new_sha}:refs/heads/{args.branch}", env=environment, authenticated=True)
    result = {"pr": args.pr, "article_id": args.article_id, "branch": args.branch,
              "source_sha": args.source_sha, "new_sha": new_sha, "branch_updated": True}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", default=REPOSITORY)
    parser.add_argument("--base-sha", required=True)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--pr", type=int, required=True)
    parser.add_argument("--article-id", required=True)
    parser.add_argument("--workspace", type=Path, required=True)
    parser.add_argument("--receipt-out", type=Path, required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        receipt = run_prepare(args)
        print(json.dumps({key: receipt.get(key) for key in ("mode", "pr", "article_id", "source_sha", "new_sha", "removed_original_bytes")}, ensure_ascii=False))
    except (PublishError, OSError, subprocess.TimeoutExpired) as error:
        parser.exit(1, f"Article preparation stopped: {error}\n")


if __name__ == "__main__":
    main()
