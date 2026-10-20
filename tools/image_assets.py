"""Build lightweight reading assets while preserving every original byte.

Authoring: python3 tools/image_assets.py --write (Pillow 12.3.0).
CI validation uses only the standard library: python3 tools/image_assets.py.
"""

import argparse
import base64
import hashlib
import io
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
MANIFEST = SITE / "_data/image_assets.json"
LOGOS = {
    "Math-with-Mansur.png": "Math with Mansur",
    "Math-with-Mansur-ru.png": "Математика с Мансур-абый",
    "Math-with-Mansur-logo.png": "Math with Mansur",
    "Math-with-Mansur-logo-ru.png": "Математика с Мансур-абый",
}
PRINT_MASTHEADS = {
    "/assets/images/Math-with-Mansur-print-ru.png",
    "/assets/images/Math-with-Mansur-print-en.png",
}
EXTERNAL_REPOSITORY = "Fuzzy-Technologies/history_math"
EXTERNAL_PATH = re.compile(r"/assets/images/([a-z0-9][a-z0-9-]*)/([a-z0-9][a-z0-9.-]*)\.(png|jpg|jpeg|webp|gif|svg)\Z")
SHA256 = re.compile(r"[a-f0-9]{64}\Z")
EXTERNAL_KEYS = {"api_url", "asset_id", "bytes", "release_tag", "sha256", "storage", "url"}


def positive_integer(value):
    return type(value) is int and 0 < value <= 9_007_199_254_740_991


def external_asset_name(path, sha256):
    match = EXTERNAL_PATH.fullmatch(path) if isinstance(path, str) else None
    if not match or ".." in path or not isinstance(sha256, str) or not SHA256.fullmatch(sha256):
        raise ValueError("Invalid external original identity")
    return f"{match[1]}-{match[2]}-{sha256}.{match[3]}"


def external_original(entry, path):
    """Accept only immutable, content-addressed assets in the approved repository."""
    if not isinstance(entry, dict) or "external_original" not in entry:
        return None
    external = entry["external_original"]
    name = external_asset_name(path, entry.get("sha256"))
    tag = f"article-originals-{entry['sha256'][0]}"
    valid = isinstance(external, dict) and set(external) == EXTERNAL_KEYS and external.get("storage") == "github-release" and \
        positive_integer(external.get("asset_id")) and \
        all(positive_integer(entry.get(key)) for key in ("bytes", "width", "height")) and \
        type(entry.get("logo")) is bool and external.get("sha256") == entry["sha256"] and \
        external.get("bytes") == entry["bytes"] and external.get("release_tag") == tag and \
        external.get("url") == f"https://github.com/{EXTERNAL_REPOSITORY}/releases/download/{tag}/{name}" and \
        external.get("api_url") == f"https://api.github.com/repos/{EXTERNAL_REPOSITORY}/releases/assets/{external.get('asset_id')}"
    if not valid:
        raise ValueError(f"Invalid external original descriptor: {path}")
    return external


def validate_external_previews(entry, site=None):
    site = SITE if site is None else Path(site)
    variants = entry.get("variants")
    if not isinstance(variants, list) or not variants:
        raise ValueError("Missing external original preview")
    paths = set()
    for variant in variants:
        path = variant.get("path") if isinstance(variant, dict) else None
        if not isinstance(path, str) or not re.fullmatch(r"/assets/images/previews/[a-z0-9-]+/[a-z0-9][a-z0-9._-]*", path) or \
                ".." in path or path in paths or not isinstance(variant.get("sha256"), str) or not SHA256.fullmatch(variant["sha256"]) or \
                not all(positive_integer(variant.get(key)) for key in ("bytes", "width", "height")) or \
                variant["width"] > entry["width"] or variant["height"] > entry["height"]:
            raise ValueError("Invalid external original preview")
        paths.add(path)
        target = (site / path.lstrip("/")).resolve(strict=True)
        if not target.is_relative_to(site.resolve()) or not target.is_file():
            raise ValueError(f"Unsafe image asset: {path}")
        if target.stat().st_size != variant["bytes"] or digest(target) != variant["sha256"]:
            raise ValueError(f"Changed external original preview: {path}")
    return variants


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def originals():
    return sorted(p for p in (SITE / "assets/images").rglob("*")
                  if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif"}
                  and "previews" not in p.relative_to(SITE / "assets/images").parts
                  and p.name != "favicon-m2-32.png")


def inventory():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for fragment in sorted((SITE / "_data/article_image_assets").glob("*.json")):
        entries = json.loads(fragment.read_text(encoding="utf-8"))
        assert not set(manifest).intersection(entries), "Duplicate image manifest entry"
        manifest.update(entries)
    return manifest


def url(path):
    return "/" + path.relative_to(SITE).as_posix()


def generate(article_id=None):
    if article_id is not None and (not isinstance(article_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", article_id)):
        raise ValueError("Invalid article image identity")
    from PIL import Image, ImageOps, ImageSequence

    global_previous = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    fragment_previous = {path.stem: json.loads(path.read_text(encoding="utf-8"))
                         for path in sorted((SITE / "_data/article_image_assets").glob("*.json"))}
    previous = dict(global_previous)
    owners = {}
    for identity, entries in fragment_previous.items():
        if set(previous).intersection(entries):
            raise ValueError("Duplicate image manifest entry")
        previous.update(entries)
        owners.update({path: identity for path in entries})
    manifest = dict(global_previous) if article_id is not None else {}
    fragments = {}
    # An external original cannot be regenerated from an absent local file. Keep
    # its verified derivatives and descriptor in their existing inventory.
    for path, entry in previous.items():
        identity = path.split("/")[3]
        if article_id is not None and identity != article_id:
            continue
        if external_original(entry, path):
            if not (SITE / path.lstrip("/")).exists():
                validate_external_previews(entry)
            destination = fragments.setdefault(article_id or owners.get(path, identity), {}) \
                if article_id is not None or path in owners else manifest
            destination[path] = entry
            if destination is not manifest:
                manifest.pop(path, None)
    for source in originals():
        relative = source.relative_to(SITE / "assets/images")
        if article_id is not None and relative.parts[0] != article_id:
            continue
        migration = relative.parts[0].startswith("hm-tt-")
        identity = article_id or owners.get(url(source), relative.parts[0])
        destination = fragments.setdefault(identity, {}) if article_id is not None or migration or url(source) in owners else manifest
        if destination is not manifest:
            manifest.pop(url(source), None)
        old = previous.get(url(source))
        if old and old["sha256"] == digest(source) and all(
                (SITE / v["path"].lstrip("/")).exists() and digest(SITE / v["path"].lstrip("/")) == v["sha256"]
                for v in old["variants"]):
            destination[url(source)] = old
            continue
        opened = Image.open(source)
        image = ImageOps.exif_transpose(opened)
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        logo = source.name in LOGOS
        widths = ([480 if "-logo" in source.stem else 1440] if logo else ([960] if migration else [480, 960, 1440]))
        variants = []
        for width in sorted({min(width, image.width) for width in widths}):
            height = round(image.height * width / image.width)
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            # Lossless encoding protects small numerical diagrams and portraits.
            lossless = migration or (not logo and source.suffix.lower() == ".png" and max(image.size) <= 800)
            animation = {}
            if getattr(opened, "is_animated", False):
                frames = [frame.convert("RGBA").resize((width, height), Image.Resampling.LANCZOS)
                          for frame in ImageSequence.Iterator(opened)]
                durations = [frame.info.get("duration", 100) for frame in ImageSequence.Iterator(opened)]
                resized = frames[0]
                animation = {"save_all": True, "append_images": frames[1:], "duration": durations,
                             "loop": opened.info.get("loop", 0)}
            resized.save(buffer, format="WEBP", quality=86, method=4 if migration else 6,
                         lossless=lossless, exact=True, **animation)
            if logo:
                target = source.with_suffix(".svg")
                encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
                target.write_text(
                    f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
                    f'viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">\n'
                    f'<title id="title">{LOGOS[source.name]}</title>\n'
                    f'<image width="{width}" height="{height}" href="data:image/webp;base64,{encoded}"/>\n</svg>\n',
                    encoding="utf-8")
            else:
                relative = source.relative_to(SITE / "assets/images")
                target = SITE / "assets/images/previews" / relative.parent / f"{source.name}-{width}.webp"
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(buffer.getvalue())
            variants.append({"path": url(target), "width": width, "height": height,
                             "sha256": digest(target), "bytes": target.stat().st_size})
        destination[url(source)] = {"sha256": digest(source), "width": image.width, "height": image.height,
                                 "bytes": source.stat().st_size, "logo": logo, "variants": variants}
    if article_id is None or manifest != global_previous:
        MANIFEST.parent.mkdir(parents=True, exist_ok=True)
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for identity, entries in fragments.items():
        target = SITE / "_data/article_image_assets" / f"{identity}.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def validate():
    manifest = inventory()
    external = {path for path, entry in manifest.items() if external_original(entry, path)}
    local = {url(p) for p in originals()}
    assert set(manifest) == local | external, "Image inventory changed; regenerate assets"
    for original, entry in manifest.items():
        target = SITE / original.lstrip("/")
        if original in external:
            validate_external_previews(entry)
        if target.exists():
            assert target.resolve().is_relative_to(SITE.resolve()), f"Unsafe original: {original}"
            assert digest(target) == entry["sha256"], f"Stale preview: {original}"
            assert target.stat().st_size == entry["bytes"], f"Changed original size: {original}"
        assert entry["variants"], f"Missing preview: {original}"
        for variant in entry["variants"]:
            target = SITE / variant["path"].lstrip("/")
            assert target.resolve().is_relative_to(SITE.resolve())
            assert digest(target) == variant["sha256"], f"Changed derivative: {target}"
            assert variant["width"] <= entry["width"], f"Unexpected upscaling: {target}"
            assert target.stat().st_size == variant["bytes"]
            if entry["logo"] and original in PRINT_MASTHEADS:
                # Print-only SVGs contain the owner's full PNG losslessly.
                # Screen logos keep their independent lightweight asset budget.
                assert variant["bytes"] <= 6_000_000, f"Print masthead exceeds transfer budget: {target}"
            elif entry["logo"]:
                assert "data:image/png" not in target.read_text()
                assert variant["bytes"] < 200_000, f"Logo exceeds transfer budget: {target}"
    total = sum(item["bytes"] for item in manifest.values())
    previews = sum(item["variants"][-1]["bytes"] for item in manifest.values())
    print(f"PASS: {len(manifest)} original records, {len(external)} external; largest reading assets {previews:,} vs {total:,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    if parser.parse_args().write:
        generate()
    validate()
