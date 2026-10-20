"""Wrap the owner's full-resolution print PNGs in self-contained SVGs.

The PNG files are authoritative artwork. This tool never edits or regenerates
them: --write updates only their lossless SVG containers and inventory entries.
Screen mastheads and circular logos remain independent of these print assets.
"""

import argparse
import base64
import hashlib
import json
from pathlib import Path
import struct
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "site/assets/images"
MANIFEST = ROOT / "site/_data/image_assets.json"
WIDTH = 4344
HEIGHT = 724
MAX_SVG_BYTES = 6_000_000
NAMES = {"ru": "Математика с Мансур-абый", "en": "Math with Mansur"}


def PngDimensions(data):
    if len(data) < 33 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[8:16] != b"\0\0\0\rIHDR":
        raise ValueError("Invalid print PNG header")
    dimensions = struct.unpack(">II", data[16:24])
    if dimensions != (WIDTH, HEIGHT):
        raise ValueError(f"Print PNG must retain {WIDTH} x {HEIGHT} pixels")
    return dimensions


def BuildSvg(language):
    data = (IMAGES / f"Math-with-Mansur-print-{language}.png").read_bytes()
    width, height = PngDimensions(data)
    encoded = base64.b64encode(data).decode("ascii")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">
<title id="title">{NAMES[language]}</title>
<desc>Owner-edited print masthead; the complete original PNG is embedded without recompression or resampling.</desc>
<image width="{width}" height="{height}" xlink:href="data:image/png;base64,{encoded}"/>
</svg>
'''


def Digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def Generate():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for language in NAMES:
        name = f"Math-with-Mansur-print-{language}"
        pngPath = IMAGES / f"{name}.png"
        svgPath = IMAGES / f"{name}.svg"
        svgPath.write_text(BuildSvg(language), encoding="utf-8")
        manifest[f"/assets/images/{name}.png"] = {
            "sha256": Digest(pngPath), "width": WIDTH, "height": HEIGHT,
            "bytes": pngPath.stat().st_size, "logo": True,
            "variants": [{"path": f"/assets/images/{name}.svg", "width": WIDTH,
                          "height": HEIGHT, "sha256": Digest(svgPath), "bytes": svgPath.stat().st_size}],
        }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def Validate():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for language in NAMES:
        name = f"Math-with-Mansur-print-{language}"
        svgPath = IMAGES / f"{name}.svg"
        pngPath = IMAGES / f"{name}.png"
        svg = svgPath.read_text(encoding="utf-8")
        if svg != BuildSvg(language):
            raise ValueError(f"Stale lossless print SVG: {svgPath}")
        root = ElementTree.fromstring(svg)
        if root.attrib.get("viewBox") != f"0 0 {WIDTH} {HEIGHT}" or "<text" in svg:
            raise ValueError("The print SVG must preserve the owner's full-resolution artwork")
        entry = manifest[f"/assets/images/{name}.png"]
        if entry["sha256"] != Digest(pngPath) or entry["variants"][0]["sha256"] != Digest(svgPath):
            raise ValueError(f"Stale print image manifest: {name}")
        if svgPath.stat().st_size > MAX_SVG_BYTES:
            raise ValueError("Print-only SVG exceeds the full-resolution transfer budget")
    print("PASS: owner-edited print PNGs, byte-identical SVG payloads and image inventory")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    if parser.parse_args().write:
        Generate()
    Validate()
