"""Prepare full-resolution JPEG downloads without changing reviewed source assets."""

import argparse
import concurrent.futures
import hashlib
import io
import json
import time
import urllib.error
import urllib.request
from pathlib import Path
import sys

from PIL import Image, ImageOps, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from image_assets import inventory, external_original  # noqa: E402

BASE = "https://storage.yandexcloud.kz/history-math-media-kz"
POLICY = "jpeg-max15mb-444-pillow-12.3.0-v1"
HARD_LIMIT = 15_000_000


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encode_original(data, entry):
    if len(data) != entry["bytes"] or digest(data) != entry["sha256"]:
        raise ValueError("Original image integrity mismatch")
    with Image.open(io.BytesIO(data)) as opened:
        if opened.format not in {"PNG", "JPEG", "WEBP", "GIF"} or getattr(opened, "is_animated", False):
            return None, "animated-or-unsupported-raster"
        image = ImageOps.exif_transpose(opened)
        if image.size != (entry["width"], entry["height"]):
            raise ValueError("Original image dimensions differ from its source manifest")
        if image.mode.startswith("I") or image.mode == "F":
            return None, "high-bit-depth"
        if "A" in image.getbands() or "transparency" in image.info:
            if image.convert("RGBA").getchannel("A").getextrema() != (255, 255):
                return None, "transparency"
        options = {"subsampling": 0, "optimize": True}
        if image.info.get("icc_profile"):
            options["icc_profile"] = image.info["icc_profile"]
        exif = image.getexif()
        if exif:
            options["exif"] = exif.tobytes()
        rgb = image.convert("RGB")
        for quality in range(100, 0, -1):
            buffer = io.BytesIO()
            rgb.save(buffer, format="JPEG", quality=quality, **options)
            encoded = buffer.getvalue()
            if len(encoded) <= HARD_LIMIT:
                break
        else:
            raise ValueError("JPEG cannot fit the hard limit without resizing")
    with Image.open(io.BytesIO(encoded)) as checked:
        checked.load()
        if checked.format != "JPEG" or checked.size != (entry["width"], entry["height"]):
            raise ValueError("JPEG dimensions changed")
        # Pillow represents 4:4:4 with sampling factor 1 for every component.
        if any(layer[1:3] != (1, 1) for layer in checked.layer):
            raise ValueError("JPEG chroma subsampling changed")
    return (encoded, quality) if len(encoded) < len(data) else (None, "jpeg-not-smaller")


def download(url, maximum):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=120) as response:
                data = response.read(maximum + 1)
            if len(data) > maximum:
                raise ValueError("Media download exceeds expected size")
            return data
        except urllib.error.HTTPError as error:
            if error.code not in (408, 429, 500, 502, 503, 504) or attempt == 2:
                raise
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == 2:
                raise
        time.sleep((1, 3)[attempt])


def cached_record(path, entry, previous):
    record = previous.get(path)
    if not isinstance(record, dict) or record.get("policy") != POLICY:
        return None
    if any(record.get(key) != value for key, value in {
        "source_sha256": entry["sha256"], "source_bytes": entry["bytes"],
        "width": entry["width"], "height": entry["height"],
        "filename": Path(path).stem + ".jpg",
    }.items()):
        return None
    sha = record.get("sha256")
    size = record.get("bytes")
    if not isinstance(sha, str) or len(sha) != 64 or any(c not in "0123456789abcdef" for c in sha) or \
            type(size) is not int or not 0 < size < entry["bytes"]:
        return None
    url = f"{BASE}/originals/{sha}/{record['filename']}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=30) as response:
            if int(response.headers["Content-Length"]) == size and \
                    response.headers.get_content_type() == "image/jpeg":
                return {key: value for key, value in record.items() if key != "file"}
    except (urllib.error.URLError, TimeoutError, ConnectionError, ValueError, KeyError):
        pass
    return None


def prepare(path, entry, directory, previous):
    cached = cached_record(path, entry, previous)
    if cached:
        return path, cached, None
    local = ROOT / "site" / path.lstrip("/")
    if local.is_file():
        data = local.read_bytes()
    else:
        external = external_original(entry, path)
        if not external:
            raise ValueError(f"Missing image source: {path}")
        try:
            data = download(f"{BASE}/originals/{entry['sha256']}/{Path(path).name}", entry["bytes"])
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
            data = download(external["url"], entry["bytes"])
    encoded, quality = encode_original(data, entry)
    if encoded is None:
        return path, None, quality
    sha = digest(encoded)
    filename = Path(path).stem + ".jpg"
    target = directory / sha / filename
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(encoded)
    return path, {"policy": POLICY, "source_sha256": entry["sha256"],
                  "source_bytes": entry["bytes"], "width": entry["width"], "height": entry["height"],
                  "sha256": sha, "bytes": len(encoded), "filename": filename,
                  "quality": quality, "file": str(target)}, None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    parser.add_argument("--previous", default="https://history-math.org/assets/publication-media.json")
    parser.add_argument("--include-pending")
    parser.add_argument("--write-registry")
    parser.add_argument("--registry")
    options = parser.parse_args()
    if pillow_version != "12.3.0":
        raise ValueError("Publication JPEGs require pinned Pillow 12.3.0")
    output = Path(options.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    previous = {}
    try:
        previous = json.loads(download(options.previous, 12_000_000)).get("jpeg_originals", {})
    except (urllib.error.URLError, TimeoutError, ConnectionError, ValueError):
        pass  # A missing receipt is a cache miss, never permission to skip verification.
    originals = inventory()
    if options.include_pending:
        for pr in json.loads(Path(options.include_pending).read_text()):
            for path, entry in pr["inventory"].items():
                if path in originals and originals[path] != entry:
                    raise ValueError("Conflicting pending original identity")
                originals[path] = entry
    registry = json.loads(Path(options.registry).read_text()) if options.registry else None
    if registry:
        originals = {path: record["source"] for path, record in registry["replacements"].items()}
        previous = registry["replacements"]
    entries = [(path, entry) for path, entry in originals.items()
               if Path(path).suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif"}
               and not entry.get("logo") and entry["bytes"] >= 13_000_000]
    replacements, retained = {}, {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(prepare, path, entry, output.parent, previous) for path, entry in entries]
        for done, future in enumerate(concurrent.futures.as_completed(futures), 1):
            path, record, reason = future.result()
            if record:
                if registry:
                    expected = registry["replacements"][path]
                    if any(record[key] != expected[key] for key in ("sha256", "bytes", "quality", "width", "height")):
                        raise ValueError(f"JPEG differs from the pinned conversion: {path}")
                replacements[path] = record
            else:
                retained[path] = reason
            if done % 25 == 0 or done == len(entries):
                print(f"Prepared JPEG originals {done}/{len(entries)}", flush=True)
    result = {"version": 1, "policy": POLICY, "replacements": dict(sorted(replacements.items())),
              "retained": dict(sorted(retained.items()))}
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    if options.write_registry:
        for path, record in replacements.items():
            record.pop("file", None)
            record["source"] = originals[path]
            if record["bytes"] >= 13_000_000:
                record["exception"] = {"sha256": record["sha256"], "bytes": record["bytes"], "one_use": True,
                    "note_url": "https://github.com/Fuzzy-Technologies/history_math/pull/293",
                    "reason": "Owner-authorized one-use maximum-quality original; unchanged pixel dimensions."}
        Path(options.write_registry).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    summary = {"converted": len(replacements), "retained": len(retained),
               "source_bytes": sum(record["source_bytes"] for record in replacements.values()),
               "jpeg_bytes": sum(record["bytes"] for record in replacements.values())}
    print(json.dumps(summary), flush=True)


if __name__ == "__main__":
    main()
