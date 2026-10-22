"""Prepare one bilingual publication package without changing editorial content.

The runtime is trusted repository code. ``--root`` is a data-only checkout;
scripts, workflows and dependencies in that checkout are never executed.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path, PurePosixPath
from typing import Iterable


RUNTIME_ROOT = Path(__file__).resolve().parents[1]
ARTICLE_ID = re.compile(r"[a-z0-9][a-z0-9-]{0,79}\Z")
SHA256 = re.compile(r"[a-f0-9]{64}\Z")
IMAGE_EXTENSIONS = frozenset({".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"})
RASTER_EXTENSIONS = IMAGE_EXTENSIONS - {".svg"}
CANONICAL_STEM = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
FRONT_MATTER = re.compile(r"\A---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)\Z")
ROLE_FIELDS = ("preview_image", "cover_image", "hero_image")

# The YAML/Ajv imports resolve against this trusted runtime, never --root.
YAML_PROGRAM = r"""
import {readFileSync} from 'node:fs';
import Ajv from 'ajv';
import {parseDocument} from 'yaml';
const payload = JSON.parse(readFileSync(0, 'utf8'));
const schema = JSON.parse(readFileSync('schemas/article-v1.schema.json', 'utf8'));
const validate = new Ajv({allErrors: true, strict: false}).compile(schema);
const results = payload.map(item => {
  const doc = parseDocument(item.frontmatter, {uniqueKeys: true, strict: true});
  if (doc.errors.length || doc.warnings.length) return {error: 'Invalid YAML front matter'};
  let data;
  try { data = doc.toJS({maxAliasCount: 20}); }
  catch { return {error: 'Invalid YAML alias expansion'}; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {error: 'Front matter must be an object'};
  for (const [oldPath, newPath] of Object.entries(item.rewrites || {})) {
    for (const key of ['preview_image', 'cover_image', 'hero_image']) {
      if (data[key] === oldPath) { doc.set(key, newPath); data[key] = newPath; }
    }
    for (let index = 0; index < (data.figures || []).length; index++) {
      if (data.figures[index].path === oldPath) {
        doc.setIn(['figures', index, 'path'], newPath);
        data.figures[index].path = newPath;
      }
    }
  }
  const valid = validate(data);
  return {data, frontmatter: Object.keys(item.rewrites || {}).length ? doc.toString() : item.frontmatter,
    errors: valid ? [] : validate.errors.map(error => `${error.instancePath || '/'} ${error.message}`)};
});
process.stdout.write(JSON.stringify(results));
"""


class PreparationError(ValueError):
    """A package cannot safely be prepared with the supplied data."""


def digest_file(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def digest_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def safe_relative(name: str) -> PurePosixPath:
    """Reject ambiguous paths before filesystem access or changed-file filtering."""
    if not isinstance(name, str) or not name or "\\" in name or "\0" in name:
        raise PreparationError("Package paths must be nonempty POSIX relative paths")
    path = PurePosixPath(name)
    if path.is_absolute() or any(part in {".", ".."} for part in name.split("/")):
        raise PreparationError(f"Unsafe package path: {name}")
    if path.as_posix() != name:
        raise PreparationError(f"Noncanonical package path: {name}")
    return path


def is_package_path(name: str, article_id: str) -> bool:
    """Whitelist the complete public derivative of exactly one article."""
    if not ARTICLE_ID.fullmatch(article_id):
        return False
    try:
        path = safe_relative(name)
    except PreparationError:
        return False
    if name in {
        f"site/_articles/{article_id}-ru.md", f"site/_articles/{article_id}-en.md",
        f"site/_articles/{article_id}.ru.md", f"site/_articles/{article_id}.en.md",
        f"site/_articles/ru/{article_id}.md", f"site/_articles/en/{article_id}-en.md",
        f"reviews/{article_id}.json", f"reviews/{article_id}-en.json",
        f"site/_data/article_image_assets/{article_id}.json",
    }:
        return True
    for folder in (f"site/assets/images/{article_id}", f"site/assets/images/previews/{article_id}"):
        if path.parent.as_posix() == folder and path.suffix.lower() in IMAGE_EXTENSIONS:
            return True
    return False


def safe_file(root: Path, name: str, *, required: bool = True) -> Path:
    path = root.joinpath(*safe_relative(name).parts)
    for component in (path, *path.parents):
        if component.is_symlink():
            raise PreparationError(f"Symbolic links are not supported: {name}")
        if component == root:
            break
    if not path.resolve().is_relative_to(root):
        raise PreparationError(f"Path leaves the package root: {name}")
    if required and not path.is_file():
        raise PreparationError(f"Missing regular package file: {name}")
    if path.exists() and not path.is_file():
        raise PreparationError(f"Package file is not regular: {name}")
    return path


def package_paths(root: Path, article_id: str) -> tuple[str, ...]:
    """Collect article-owned paths and reject unknown files within its folders."""
    if not ARTICLE_ID.fullmatch(article_id):
        raise PreparationError("Invalid article ID")
    editions = edition_specs(root, article_id)
    paths = {edition["path"] for edition in editions}
    paths.update(f"reviews/{edition['identity']}.json" for edition in editions)
    for name in (f"reviews/{article_id}.json", f"reviews/{article_id}-en.json"):
        if safe_file(root, name, required=False).exists() and name not in paths:
            raise PreparationError(f"Review record has no matching article edition: {name}")
    manifest = f"site/_data/article_image_assets/{article_id}.json"
    if safe_file(root, manifest, required=False).exists():
        paths.add(manifest)
    for folder, pattern in (("site/_articles", f"{article_id}.*"),
                            ("site/_articles", f"{article_id}-*"),
                            ("site/_articles/ru", f"{article_id}.*"),
                            ("site/_articles/en", f"{article_id}-en.*")):
        articles = root / folder
        if articles.exists():
            candidates = articles.glob(pattern)
        else:
            candidates = ()
        for path in candidates:
            name = path.relative_to(root).as_posix()
            if name not in paths:
                raise PreparationError(f"Unexpected article edition: {name}")
    for folder in (f"site/assets/images/{article_id}", f"site/assets/images/previews/{article_id}"):
        directory = root / folder
        if directory.is_symlink():
            raise PreparationError(f"Symbolic links are not supported: {folder}")
        if directory.exists() and not directory.is_dir():
            raise PreparationError(f"Expected an article asset directory: {folder}")
        if not directory.exists():
            continue
        for path in sorted(directory.rglob("*")):
            name = path.relative_to(root).as_posix()
            if path.is_symlink():
                raise PreparationError(f"Symbolic links are not supported: {name}")
            if not path.is_file() and not path.is_dir():
                raise PreparationError(f"Unsupported article asset: {name}")
            if path.is_dir():
                raise PreparationError(f"Nested article asset directories are not supported: {name}")
            if not is_package_path(name, article_id):
                raise PreparationError(f"Unexpected file in the article package: {name}")
            paths.add(name)
    for name in sorted(paths):
        safe_file(root, name)
    return tuple(sorted(paths))


def edition_specs(root: Path, article_id: str) -> list[dict]:
    """Read canonical language suffixes and unambiguous legacy article paths."""
    editions = []
    choices = {
        "ru": [(f"site/_articles/{article_id}-ru.md", article_id),
               (f"site/_articles/ru/{article_id}.md", article_id),
               (f"site/_articles/{article_id}.ru.md", article_id)],
        "en": [(f"site/_articles/{article_id}-en.md", article_id + "-en"),
               (f"site/_articles/en/{article_id}-en.md", article_id + "-en"),
               (f"site/_articles/{article_id}.en.md", article_id + "-en")],
    }
    for lang, candidates in choices.items():
        existing = [(name, identity) for name, identity in candidates
                    if safe_file(root, name, required=False).exists()]
        if len(existing) != 1:
            raise PreparationError(f"Exactly one {lang.upper()} edition is required for article {article_id}")
        name, identity = existing[0]
        editions.append({"lang": lang, "path": name, "identity": identity})
    return editions


def read_json(path: Path, description: str) -> dict:
    def unique_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise PreparationError(f"Duplicate key in {description}")
            result[key] = value
        return result

    try:
        data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_pairs)
    except (json.JSONDecodeError, UnicodeError) as error:
        raise PreparationError(f"Invalid {description}") from error
    if not isinstance(data, dict):
        raise PreparationError(f"{description.capitalize()} must be an object")
    return data


def load_inventory(root: Path, article_id: str) -> tuple[dict, bool]:
    """Read a private article fragment or a read-only published legacy inventory."""
    fragment = safe_file(root, f"site/_data/article_image_assets/{article_id}.json", required=False)
    central = safe_file(root, "site/_data/image_assets.json", required=False)
    prefix = f"/assets/images/{article_id}/"
    legacy = {path: entry for path, entry in read_json(central, "legacy image inventory").items()
              if path.startswith(prefix)} if central.exists() else {}
    if fragment.exists():
        entries = read_json(fragment, "article image inventory")
        if legacy.keys() & entries.keys():
            raise PreparationError("Duplicate article entries in legacy and per-article inventories")
        return entries, False
    return legacy, bool(legacy)


def parse_editions(root: Path, article_id: str, rewrites: dict[str, str] | None = None) -> list[dict]:
    editions = []
    for specification in edition_specs(root, article_id):
        name = specification["path"]
        text = safe_file(root, name).read_bytes().decode("utf-8")
        match = FRONT_MATTER.fullmatch(text)
        if not match:
            raise PreparationError(f"YAML front matter required: {name}")
        editions.append({**specification, "text": text,
                         "frontmatter": match[1], "body": match[2],
                         "rewrites": rewrites or {}})
    try:
        result = subprocess.run(
            ["node", "--input-type=module", "-e", YAML_PROGRAM], cwd=RUNTIME_ROOT,
            input=json.dumps(editions, ensure_ascii=False), capture_output=True,
            text=True, encoding="utf-8", check=True,
        )
        parsed = json.loads(result.stdout)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        raise PreparationError("Trusted Node YAML/Ajv dependencies are unavailable; run npm ci in the runtime") from error
    for edition, data in zip(editions, parsed, strict=True):
        if data.get("error"):
            raise PreparationError(f"{edition['path']}: {data['error']}")
        edition.update(data)
        if edition["data"].get("article_id") != edition["identity"] or edition["data"].get("lang") != edition["lang"]:
            raise PreparationError(f"Article ID or language does not match its filename: {edition['path']}")
        if edition["data"].get("translation_key") != article_id:
            raise PreparationError(f"Both editions must share the article translation key: {edition['path']}")
    return editions


def protected_lines(text: str):
    """Recognize literal code/math spans before any source whitespace cleanup."""
    fence = None
    display_math = False
    for line in text.splitlines(keepends=True):
        match = FENCE.match(line)
        protected = bool(fence or display_math) or line.startswith(("    ", "\t"))
        if match:
            marker = match.group(1)
            if fence is None:
                fence = (marker[0], len(marker))
            elif marker[0] == fence[0] and len(marker) >= fence[1] and not line[match.end():].strip():
                fence = None
            protected = True
        elif fence is None:
            # Dollar delimiters inside inline code or escaped dollar text are literal.
            outside_code = re.sub(r"`+[^`\n]*`+", "", line)
            delimiters = len(re.findall(r"(?<!\\)\$\$", outside_code))
            if delimiters:
                protected = True
                if delimiters % 2:
                    display_math = not display_math
            if re.search(r"(?<!\\)\$(?!\$)", outside_code):
                protected = True
        yield line, protected


def normalize_source(text: str, rewrites: dict[str, str] | None = None) -> str:
    """Normalize only insignificant source whitespace and generated asset links.

    Two trailing spaces have Markdown hard-break semantics and remain intact.
    Every line containing mathematics, fenced/indented code or inline code
    remains byte-for-byte unchanged, including its line ending.
    """
    output = []
    for line, protected in protected_lines(text):
        if protected or "`" in line:
            output.append(line)
            continue
        newline = "\n" if line.endswith(("\n", "\r")) else ""
        content = line.removesuffix("\n").removesuffix("\r")
        if not content.endswith("  "):
            content = content.rstrip(" \t")
        for old, new in (rewrites or {}).items():
            content = content.replace(old, new)
        output.append(content + newline)
    return "".join(output)


def canonical_names(paths: Iterable[str]) -> dict[str, str]:
    """Retain already readable names; disambiguate other stems deterministically."""
    paths = list(dict.fromkeys(paths))
    reserved = {PurePosixPath(name).name for name in paths
                if CANONICAL_STEM.fullmatch(PurePosixPath(name).stem)
                and len(PurePosixPath(name).stem) <= 64
                and PurePosixPath(name).suffix == PurePosixPath(name).suffix.lower()}
    rewrites = {}
    for index, name in enumerate(paths, 1):
        path = PurePosixPath(name)
        if path.name in reserved and name not in rewrites:
            continue
        stem = unicodedata.normalize("NFKD", path.stem).encode("ascii", "ignore").decode("ascii").lower()
        stem = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")[:48].rstrip("-") or f"figure-{index:02d}"
        target = stem + path.suffix.lower()
        if target in reserved:
            target = f"{stem}-{index:02d}{path.suffix.lower()}"
        counter = 2
        while target in reserved:
            target = f"{stem}-{index:02d}-{counter}{path.suffix.lower()}"
            counter += 1
        reserved.add(target)
        rewrites[name] = (path.parent / target).as_posix()
    return rewrites


def validate_external_original(path: str, entry: dict) -> None:
    module = trusted_image_assets()
    try:
        if module.external_original(entry, path) is None:
            raise PreparationError(f"Missing verified external original metadata: {path}")
    except ValueError as error:
        raise PreparationError(f"Invalid external original metadata: {path}") from error


def trusted_image_assets():
    spec = importlib.util.spec_from_file_location("trusted_image_assets", RUNTIME_ROOT / "tools/image_assets.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_inventory(root: Path, article_id: str, manifest: dict, references: set[str], *, allow_missing: bool = False) -> dict:
    """Verify all available original and preview bytes without decoding images."""
    prefix = f"/assets/images/{article_id}/"
    preview_prefix = f"/assets/images/previews/{article_id}/"
    originals = []
    previews = []
    needs_generation = False
    used_previews = set()
    for original, entry in manifest.items():
        if not isinstance(original, str) or not original.startswith(prefix) or "/" in original[len(prefix):]:
            raise PreparationError("Image manifest contains a foreign article path")
        if original not in references or PurePosixPath(original).suffix.lower() not in RASTER_EXTENSIONS:
            raise PreparationError(f"Image manifest contains an unreferenced original: {original}")
        if not isinstance(entry, dict) or not SHA256.fullmatch(str(entry.get("sha256", ""))):
            raise PreparationError(f"Invalid original checksum: {original}")
        if not isinstance(entry.get("bytes"), int) or isinstance(entry.get("bytes"), bool) or entry["bytes"] <= 0:
            raise PreparationError(f"Invalid original byte size: {original}")
        if any(type(entry.get(key)) is not int or entry[key] <= 0 for key in ("width", "height")):
            raise PreparationError(f"Invalid original dimensions: {original}")
        source = safe_file(root, "site" + original, required=False)
        external = entry.get("external_original") is not None
        if external:
            validate_external_original(original, entry)
            try:
                trusted_image_assets().validate_external_previews(entry, root / "site")
            except (ValueError, OSError) as error:
                raise PreparationError(f"Invalid external original reading previews: {original}") from error
        if source.exists():
            if digest_file(source) != entry["sha256"] or source.stat().st_size != entry["bytes"]:
                raise PreparationError(f"Original bytes differ from the image inventory: {original}")
        elif not external:
            raise PreparationError(f"Missing local or verified external original: {original}")
        variants = entry.get("variants")
        if not isinstance(variants, list) or not variants:
            if allow_missing and source.exists() and not external:
                needs_generation = True
                continue
            raise PreparationError(f"Missing reading previews: {original}")
        variant_paths = set()
        for variant in variants:
            path = variant.get("path") if isinstance(variant, dict) else None
            if not isinstance(path, str) or not (path.startswith(prefix) or path.startswith(preview_prefix)):
                raise PreparationError(f"Reading preview belongs to another article: {original}")
            path_prefix = preview_prefix if path.startswith(preview_prefix) else prefix
            if "/" in path[len(path_prefix):]:
                raise PreparationError(f"Nested reading preview path: {original}")
            preview = safe_file(root, "site" + path, required=False)
            if not preview.exists():
                if allow_missing and source.exists() and not external:
                    needs_generation = True
                    continue
                raise PreparationError(f"Missing reading preview: {path}")
            if not SHA256.fullmatch(str(variant.get("sha256", ""))) or digest_file(preview) != variant["sha256"]:
                raise PreparationError(f"Reading preview bytes differ from the image inventory: {path}")
            if preview.stat().st_size != variant.get("bytes"):
                raise PreparationError(f"Reading preview size differs from the image inventory: {path}")
            if any(type(variant.get(key)) is not int or variant[key] <= 0 or variant[key] > entry[key]
                   for key in ("width", "height")):
                raise PreparationError(f"Reading preview exceeds original dimensions: {path}")
            if path in variant_paths:
                raise PreparationError(f"Duplicate reading preview path: {path}")
            variant_paths.add(path)
            used_previews.add(path)
            previews.append({"path": path, "sha256": variant["sha256"], "bytes": variant["bytes"]})
        originals.append({"path": original, "sha256": entry["sha256"], "bytes": entry["bytes"], "external": external})
    for original in references:
        if PurePosixPath(original).suffix.lower() in RASTER_EXTENSIONS and original not in manifest:
            if allow_missing and safe_file(root, "site" + original, required=False).exists():
                needs_generation = True
            else:
                raise PreparationError(f"Raster original is missing its image inventory: {original}")
        elif PurePosixPath(original).suffix.lower() == ".svg":
            safe_file(root, "site" + original)
    folder = root / "site/assets/images/previews" / article_id
    if folder.exists():
        for path in folder.iterdir():
            logical = "/" + path.relative_to(root / "site").as_posix()
            if logical not in used_previews:
                raise PreparationError(f"Unreferenced reading preview: {logical}")
    return {"originals": sorted(originals, key=lambda row: row["path"]),
            "previews": sorted(previews, key=lambda row: row["path"]), "needs_generation": needs_generation}


def generate_previews(root: Path, article_id: str) -> None:
    """Run only the trusted image generator against an isolated package staging copy."""
    module = trusted_image_assets()
    module.ROOT = root
    module.SITE = root / "site"
    module.MANIFEST = module.SITE / "_data/image_assets.json"
    module.MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    module.MANIFEST.write_text("{}\n", encoding="utf-8")
    try:
        module.generate(article_id)
    except (ImportError, OSError, ValueError, AssertionError) as error:
        raise PreparationError("Reading preview generation failed; supply valid images and the Pillow authoring dependency") from error


def prepare_package(root: Path, article_id: str, *, write: bool = False,
                    changed_paths: Iterable[str] | None = None) -> dict:
    """Validate and, when requested, atomically plan scoped package normalization.

    Existing canonical packages return without touching any files. Original
    bytes are renamed, never converted or overwritten. Publishing originals
    and rewriting Git history are separate owner-authorized operations.
    """
    root = Path(root).absolute()
    if root.is_symlink() or not root.is_dir():
        raise PreparationError("Package root must be an existing directory without a symbolic link")
    root = root.resolve()
    if not ARTICLE_ID.fullmatch(article_id):
        raise PreparationError("Invalid article ID")
    if changed_paths is not None:
        for name in changed_paths:
            if not is_package_path(name, article_id):
                raise PreparationError(f"Changed path is outside this article package: {name}")
    paths = package_paths(root, article_id)
    editions = parse_editions(root, article_id)
    reviews = {}
    for edition in editions:
        identity = edition["identity"]
        review = read_json(safe_file(root, f"reviews/{identity}.json"), "article review record")
        if review.get("article_id") != identity:
            raise PreparationError("Review record article ID does not match the package")
        if not isinstance(review.get("approval"), dict) or review["approval"].get("status") not in {"pending", "approved"}:
            raise PreparationError("Review record must contain an explicit pending or approved human decision")
        reviews[identity] = review
    references = []
    for edition in editions:
        figures = edition["data"].get("figures", [])
        if not isinstance(figures, list):
            raise PreparationError(f"Figure inventory must be an array: {edition['path']}")
        for figure in figures:
            original = figure.get("path") if isinstance(figure, dict) else None
            prefix = f"/assets/images/{article_id}/"
            if not isinstance(original, str) or not original.startswith(prefix) or "/" in original[len(prefix):]:
                raise PreparationError(f"Figure path must belong to this article: {edition['path']}")
            if PurePosixPath(original).suffix.lower() not in IMAGE_EXTENSIONS:
                raise PreparationError(f"Unsupported original image type: {original}")
            safe_file(root, "site" + original, required=False)
            references.append(original)
        for field in ROLE_FIELDS:
            role = edition["data"].get(field)
            if role and role not in [figure.get("path") for figure in figures]:
                raise PreparationError(f"{field} must have a figure provenance record: {edition['path']}")
    references = list(dict.fromkeys(references))
    fragment_name = f"site/_data/article_image_assets/{article_id}.json"
    manifest, legacy_inventory = load_inventory(root, article_id)
    original_prefix = f"/assets/images/{article_id}/"
    local_aliases = {
        variant["path"] for entry in manifest.values() if isinstance(entry, dict)
        for variant in (entry.get("variants") if isinstance(entry.get("variants"), list) else [])
        if isinstance(variant, dict) and isinstance(variant.get("path"), str)
        and variant["path"].startswith(original_prefix)
    }
    for name in paths:
        if name.startswith(f"site/assets/images/{article_id}/") and name.removeprefix("site") not in set(references) | local_aliases:
            raise PreparationError(f"Unreferenced original image: {name}")
    inventory = validate_inventory(root, article_id, manifest, set(references), allow_missing=True)
    rewrites = canonical_names(references)
    if legacy_inventory and (rewrites or inventory["needs_generation"]):
        raise PreparationError("A legacy shared image inventory requires a separate owner-reviewed migration before asset changes")
    for path in rewrites:
        if manifest.get(path, {}).get("external_original") is not None:
            raise PreparationError(f"Normalize image names before externally publishing originals: {path}")
    updated_editions = parse_editions(root, article_id, rewrites) if rewrites else editions
    for edition in updated_editions:
        if edition["errors"]:
            raise PreparationError(f"{edition['path']}: {'; '.join(edition['errors'])}")
    moves = {edition["path"]: f"site/_articles/{article_id}-{edition['lang']}.md"
             for edition in editions
             if edition["path"] != f"site/_articles/{article_id}-{edition['lang']}.md"}
    article_moves = dict(moves)
    text_changes = {}
    body_checks = []
    for old, edition in zip(editions, updated_editions, strict=True):
        body = normalize_source(old["body"], rewrites)
        # Retain the complete source when there is no editorial-neutral change.
        if rewrites:
            header = normalize_source(edition["frontmatter"]).rstrip("\r\n")
            text = f"---\n{header}\n---\n{body}"
        elif body != old["body"]:
            split = len(old["text"]) - len(old["body"])
            text = old["text"][:split] + body
        else:
            text = old["text"]
        if text != old["text"]:
            text_changes[moves.get(old["path"], old["path"])] = text.encode("utf-8")
        body_checks.append({"path": old["path"], "before_sha256": digest_text(old["body"]),
                            "after_sha256": digest_text(body), "unchanged": body == old["body"]})
    updated_manifest = {}
    for original, entry in manifest.items():
        new_original = rewrites.get(original, original)
        updated_entry = copy.deepcopy(entry)
        if new_original != original:
            moves["site" + original] = "site" + new_original
            for variant in updated_entry.get("variants", []):
                old_preview = variant["path"]
                if old_preview == original:
                    new_preview = new_original
                else:
                    filename = f"{PurePosixPath(new_original).name}-{variant['width']}{PurePosixPath(old_preview).suffix.lower()}"
                    new_preview = (PurePosixPath(old_preview).parent / filename).as_posix()
                if old_preview != new_preview:
                    moves["site" + old_preview] = "site" + new_preview
                    variant["path"] = new_preview
        updated_manifest[new_original] = updated_entry
    for old, new in rewrites.items():
        if safe_file(root, "site" + old, required=False).exists():
            moves["site" + old] = "site" + new
    if len(set(moves.values())) != len(moves):
        raise PreparationError("Package normalization would create a filename collision")
    for old, new in moves.items():
        target = safe_file(root, new, required=False)
        if target.exists() and new not in moves:
            raise PreparationError(f"Package normalization would overwrite an existing file: {new}")
    if updated_manifest != manifest:
        text_changes[fragment_name] = (json.dumps(updated_manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    pending = bool(text_changes or moves or inventory["needs_generation"])
    report = {"preparation_version": 1, "article_id": article_id,
              "canonical": not pending, "written": False,
              "changed_paths": sorted(set(text_changes) | set(moves) | set(moves.values())),
              "renamed_assets": [{"from": old.removeprefix("site"), "to": new.removeprefix("site")}
                                 for old, new in sorted(moves.items()) if old not in article_moves],
              "renamed_articles": [{"from": old, "to": new} for old, new in sorted(article_moves.items())],
              "bodies": body_checks, "originals": inventory["originals"], "previews": inventory["previews"],
              "local_reading_aliases": sorted(local_aliases),
              "warnings": ["Legacy local reading aliases are retained until verified external publishing copies them into the preview folder"]
                          if local_aliases else [],
              "preview_generation_required": inventory["needs_generation"],
              "editorial_approval": "pending" if any(item["approval"]["status"] == "pending"
                                                     for item in reviews.values()) else "approved"}
    if not pending or not write:
        return report
    # Complete all generation and validation in an isolated copy before changing
    # the publication derivative. Hard links never modify original image bytes.
    with tempfile.TemporaryDirectory(prefix="article-prepare-") as directory:
        stage = Path(directory)
        for name in paths:
            source = safe_file(root, name)
            target = stage / moves.get(name, name)
            target.parent.mkdir(parents=True, exist_ok=True)
            if name.startswith(f"site/assets/images/{article_id}/"):
                try:
                    os.link(source, target)
                except OSError:
                    shutil.copyfile(source, target)
            else:
                shutil.copyfile(source, target)
        for name, data in text_changes.items():
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        if legacy_inventory:
            central = stage / "site/_data/image_assets.json"
            central.parent.mkdir(parents=True, exist_ok=True)
            central.write_text(json.dumps(manifest, ensure_ascii=False) + "\n", encoding="utf-8")
        if inventory["needs_generation"]:
            generate_previews(stage, article_id)
        staged_manifest, _ = load_inventory(stage, article_id)
        staged_references = {rewrites.get(path, path) for path in references}
        final_inventory = validate_inventory(stage, article_id, staged_manifest, staged_references)
        staged_paths = package_paths(stage, article_id)
        new_data = {}
        for name in staged_paths:
            target = root / name
            prepared = stage / name
            source_name = next((old for old, new in moves.items() if new == name), None)
            if source_name and digest_file(safe_file(root, source_name)) == digest_file(prepared):
                continue
            if not target.exists() or digest_file(target) != digest_file(prepared):
                new_data[name] = prepared.read_bytes()
        # Package files are moved through temporary names to handle safe cycles.
        temporary_moves = []
        for old, new in sorted(moves.items()):
            source = safe_file(root, old)
            temporary = source.with_name(source.name + ".article-prepare-tmp")
            if temporary.exists():
                raise PreparationError(f"Unfinished previous image rename: {old}")
            temporary_moves.append((source, temporary, root / new))
        for source, temporary, _ in temporary_moves:
            source.rename(temporary)
        for _, temporary, target in temporary_moves:
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary.rename(target)
        for name, data in sorted(new_data.items()):
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        report.update({"canonical": True, "written": True,
                       "changed_paths": sorted(set(report["changed_paths"]) | set(new_data)),
                       "originals": final_inventory["originals"], "previews": final_inventory["previews"],
                       "preview_generation_required": False})
    return report


def main(arguments: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True, help="Data-only checkout containing an article package")
    parser.add_argument("--article-id", required=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="Report required preparation without changing files")
    mode.add_argument("--write", action="store_true", help="Apply validated package preparation")
    parser.add_argument("--report", type=Path, help="Write the machine-readable report to this explicit destination")
    parser.add_argument("--changed-path", action="append", default=None,
                        help="Reject a changed PR path outside this article; may be repeated")
    options = parser.parse_args(arguments)
    try:
        report = prepare_package(options.root, options.article_id, write=options.write,
                                 changed_paths=options.changed_path)
        status = 0 if report["canonical"] else 1
    except (PreparationError, UnicodeError) as error:
        report = {"preparation_version": 1, "article_id": options.article_id,
                  "canonical": False, "written": False, "errors": [str(error)]}
        status = 1
    output = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if options.report:
        options.report.parent.mkdir(parents=True, exist_ok=True)
        options.report.write_text(output, encoding="utf-8")
    sys.stdout.write(output)
    return status


if __name__ == "__main__":
    raise SystemExit(main())
