"""Build lightweight reading assets while preserving every original byte.

Authoring: python3 tools/image_assets.py --write (Pillow 12.3.0).
CI validation uses only the standard library: python3 tools/image_assets.py.
"""

import argparse
import base64
import hashlib
import io
import json
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


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def originals():
    return sorted(p for p in (SITE / "assets/images").rglob("*")
                  if p.suffix.lower() in {".png", ".jpg", ".jpeg"}
                  and p.name != "favicon-m2-32.png")


def url(path):
    return "/" + path.relative_to(SITE).as_posix()


def generate():
    from PIL import Image, ImageOps

    manifest = {}
    for source in originals():
        image = ImageOps.exif_transpose(Image.open(source))
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        logo = source.name in LOGOS
        widths = ([480 if "-logo" in source.stem else 1440] if logo else [480, 960, 1440])
        variants = []
        for width in sorted({min(width, image.width) for width in widths}):
            height = round(image.height * width / image.width)
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            # Lossless encoding protects small numerical diagrams and portraits.
            lossless = not logo and source.suffix.lower() == ".png" and max(image.size) <= 800
            resized.save(buffer, format="WEBP", quality=86, method=6, lossless=lossless, exact=True)
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
        manifest[url(source)] = {"sha256": digest(source), "width": image.width, "height": image.height,
                                 "bytes": source.stat().st_size, "logo": logo, "variants": variants}
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def validate():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert set(manifest) == {url(p) for p in originals()}, "Image inventory changed; regenerate assets"
    for original, entry in manifest.items():
        assert digest(SITE / original.lstrip("/")) == entry["sha256"], f"Stale preview: {original}"
        assert entry["variants"], f"Missing preview: {original}"
        for variant in entry["variants"]:
            target = SITE / variant["path"].lstrip("/")
            assert target.resolve().is_relative_to(SITE.resolve())
            assert digest(target) == variant["sha256"], f"Changed derivative: {target}"
            assert variant["width"] <= entry["width"], f"Unexpected upscaling: {target}"
            assert target.stat().st_size == variant["bytes"]
            if entry["logo"]:
                assert "data:image/png" not in target.read_text()
                assert variant["bytes"] < 200_000, f"Logo exceeds transfer budget: {target}"
    total = sum(item["bytes"] for item in manifest.values())
    previews = sum(item["variants"][-1]["bytes"] for item in manifest.values())
    print(f"PASS: {len(manifest)} originals unchanged; largest reading assets {previews:,} vs {total:,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    if parser.parse_args().write:
        generate()
    validate()
