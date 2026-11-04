"""Encode smaller browser previews in the disposable Pages output."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import json
from pathlib import Path
from tempfile import NamedTemporaryFile

from PIL import Image, ImageChops

MIN_BYTES = 32_000
# 39 dB on RGB channels, measured against the existing reading preview.
MAX_MSE = 255**2 / 10**3.9


def lossless_webp(data):
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("Invalid WebP preview")
    offset = 12
    while offset + 8 <= len(data):
        kind = data[offset:offset + 4]
        size = int.from_bytes(data[offset + 4:offset + 8], "little")
        offset += 8 + size + (size & 1)
        if offset > len(data):
            raise ValueError("Truncated WebP preview")
        if kind in (b"VP8L", b"VP8 ", b"ANIM"):
            return kind == b"VP8L"
    raise ValueError("Missing WebP image data")


def acceptable(reference, encoded):
    with Image.open(BytesIO(encoded)) as output:
        if output.size != reference.size:
            return False
        if "A" in reference.getbands() and reference.getchannel("A").tobytes() != output.convert("RGBA").getchannel("A").tobytes():
            return False
        difference = ImageChops.difference(reference.convert("RGB"), output.convert("RGB"))
    histogram = difference.histogram()
    mse = sum((index % 256)**2 * count for index, count in enumerate(histogram)) / (reference.width * reference.height * 3)
    return mse <= MAX_MSE


def optimized_webp(data):
    if not lossless_webp(data) or len(data) < MIN_BYTES:
        return data
    with Image.open(BytesIO(data)) as reference:
        metadata = {key: reference.info[key] for key in ("icc_profile", "exif", "xmp") if reference.info.get(key)}
        for quality in (86, 92):
            buffer = BytesIO()
            reference.save(buffer, "WEBP", quality=quality, method=4, exact=True, **metadata)
            encoded = buffer.getvalue()
            if len(encoded) <= len(data) * 0.9 and acceptable(reference, encoded):
                return encoded
    return data


def optimize_output(output, *, dry_run=False):
    output = Path(output).resolve(strict=True)
    source = (Path(__file__).resolve().parents[1] / "site").resolve()
    if output == source or output.is_relative_to(source):
        raise ValueError("Expected a disposable Pages build directory")
    previews = output / "assets/images/previews"
    if not previews.is_dir() or previews.resolve() != previews:
        raise ValueError("Invalid Pages reading preview directory")
    files = sorted(previews.rglob("*"))
    if any(path.is_symlink() for path in files):
        raise ValueError("Symlink in Pages reading previews")

    def process(path):
        original = path.read_bytes()
        encoded = optimized_webp(original)
        if not dry_run and encoded is not original:
            with NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
                replacement = Path(temporary.name)
                try:
                    temporary.write(encoded)
                    temporary.close()
                    replacement.chmod(path.stat().st_mode & 0o777)
                    replacement.replace(path)
                finally:
                    replacement.unlink(missing_ok=True)
        return len(original), len(encoded)

    with ThreadPoolExecutor(max_workers=6) as pool:
        sizes = list(pool.map(process, (path for path in files if path.is_file() and path.suffix == ".webp")))
    return {
        "files": len(sizes),
        "optimized": sum(after < before for before, after in sizes),
        "before_bytes": sum(before for before, _ in sizes),
        "after_bytes": sum(after for _, after in sizes),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site_dir")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    print(json.dumps(optimize_output(args.site_dir, dry_run=args.dry_run)))
