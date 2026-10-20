"""Recompose the existing journal artwork into deterministic wide print banners.

The original embedded WebP pixels are reused without regeneration: only the
parchment/frame extent and the positions of clipped artwork regions change.
Authoring uses the repository's pinned Playwright; validation is standard-library only.
"""

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "site/assets/images"
MANIFEST = ROOT / "site/_data/image_assets.json"
WIDTH = 2880
HEIGHT = 480
NAMES = {"ru": "Математика с Мансур-абый", "en": "Math with Mansur"}


def SourceData(language):
    source = IMAGES / ("Math-with-Mansur-ru.svg" if language == "ru" else "Math-with-Mansur.svg")
    data = re.search(r'href="(data:image/webp;base64,[^"]+)"', source.read_text(encoding="utf-8"))
    if data is None:
        raise ValueError(f"Existing embedded brand artwork not found: {source}")
    return data[1]


def Pieces(language):
    # Crop rectangles are expressed in the immutable 1440 x 480 source artwork.
    common = [
        ("portrait", (0, 0, 500, 480), (0, 0)),
        ("corner-top-right", (1380, 0, 60, 43), (WIDTH - 60, 0)),
        ("edge-right", (1415, 43, 25, 390), (WIDTH - 25, 43)),
        ("corner-bottom-right", (1380, 433, 60, 47), (WIDTH - 60, 433)),
        ("constants", (1210, 35, 185, 58), (WIDTH - 235, 35)),
        ("math-emblems", (940, 360, 465, 85), (WIDTH - 505, 360)),
    ]
    if language == "ru":
        return common + [
            ("title-first", (575, 85, 760, 106), (852, 142)),
            ("title-second", (520, 194, 865, 113), (1612, 151)),
            ("divider-emblem", (884, 300, 70, 28), (1630, 270)),
            ("tagline", (575, 333, 730, 29), (1300, 315)),
        ]
    return common + [
        ("title", (499, 126, 906, 133), (1212, 119)),
        ("divider-emblem", (884, 267, 70, 29), (1630, 270)),
        ("tagline", (577, 306, 722, 30), (1304, 315)),
    ]


def BuildSvg(language):
    source = SourceData(language)
    pieces = Pieces(language)
    definitions = []
    layers = []
    for name, (left, top, width, height), (targetX, targetY) in pieces:
        definitions.append(f'<clipPath id="crop-{name}"><rect x="{targetX}" y="{targetY}" width="{width}" height="{height}"/></clipPath>')
        # Feather only empty parchment margins; portrait, symbols and lettering
        # stay in the fully opaque interior and retain their exact source pixels.
        mask = ""
        if name == "portrait":
            definitions.append(f'<linearGradient id="portrait-fade"><stop offset="0" stop-color="white"/><stop offset="97.2%" stop-color="white"/><stop offset="100%" stop-color="black"/></linearGradient><radialGradient id="portrait-outline"><stop offset="94%" stop-color="white"/><stop offset="100%" stop-color="black"/></radialGradient><mask id="blend-portrait" maskUnits="userSpaceOnUse" x="0" y="0" width="{width}" height="{height}"><rect width="45" height="{height}" fill="white"/><rect width="{width}" height="43" fill="url(#portrait-fade)"/><rect y="433" width="{width}" height="47" fill="url(#portrait-fade)"/><ellipse cx="264" cy="232" rx="238" ry="225" fill="url(#portrait-outline)"/></mask>')
            mask = ' mask="url(#blend-portrait)"'
        if name == "math-emblems":
            horizontal = 100 * 8 / width
            vertical = 100 * 4 / height
            definitions.append(f'<linearGradient id="emblems-x"><stop offset="0" stop-color="black"/><stop offset="{horizontal}%" stop-color="white"/><stop offset="{100 - horizontal}%" stop-color="white"/><stop offset="100%" stop-color="black"/></linearGradient><linearGradient id="emblems-y" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="black"/><stop offset="{vertical}%" stop-color="white"/><stop offset="{100 - vertical}%" stop-color="white"/><stop offset="100%" stop-color="black"/></linearGradient><mask id="blend-emblems-y" maskUnits="userSpaceOnUse" x="{targetX}" y="{targetY}" width="{width}" height="{height}"><rect x="{targetX}" y="{targetY}" width="{width}" height="{height}" fill="url(#emblems-y)"/></mask><mask id="blend-emblems" maskUnits="userSpaceOnUse" x="{targetX}" y="{targetY}" width="{width}" height="{height}"><rect x="{targetX}" y="{targetY}" width="{width}" height="{height}" fill="url(#emblems-x)" mask="url(#blend-emblems-y)"/></mask>')
            mask = ' mask="url(#blend-emblems)"'
        layers.append(f'<g clip-path="url(#crop-{name})"{mask}><use href="#source-artwork" x="{targetX - left}" y="{targetY - top}"/></g>')
    title = NAMES[language]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title">
<title id="title">{title}</title>
<desc>Wide print composition of the existing journal artwork; original portrait, lettering and mathematical emblems are preserved.</desc>
<defs>
<image id="source-artwork" width="1440" height="480" href="{source}"/>
<pattern id="parchment" width="190" height="35" patternUnits="userSpaceOnUse"><use href="#source-artwork" x="-500" y="-37"/></pattern>
{''.join(definitions)}
</defs>
<rect width="{WIDTH}" height="{HEIGHT}" fill="url(#parchment)"/>
<path d="M 42 15 H {WIDTH - 42} M 42 20 H {WIDTH - 42} M 42 452 H {WIDTH - 42} M 42 457 H {WIDTH - 42}" fill="none" stroke="#6b3515" stroke-width="2"/>
<path d="M 555 284 H 1625 M 1705 284 H {WIDTH - 65}" fill="none" stroke="#5a2d10" stroke-width="2"/>
{''.join(layers)}
</svg>
'''


def Digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def Generate():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for language in NAMES:
        name = f"Math-with-Mansur-print-{language}"
        svgPath = IMAGES / f"{name}.svg"
        svgPath.write_text(BuildSvg(language), encoding="utf-8")
    subprocess.run(["node", str(ROOT / "tools/render_pdf_mastheads.mjs")], cwd=ROOT, check=True)
    for language in NAMES:
        name = f"Math-with-Mansur-print-{language}"
        svgPath = IMAGES / f"{name}.svg"
        pngPath = IMAGES / f"{name}.png"
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
            raise ValueError(f"Stale wide print artwork: {svgPath}")
        root = ElementTree.fromstring(svg)
        if root.attrib.get("viewBox") != f"0 0 {WIDTH} {HEIGHT}" or "<text" in svg:
            raise ValueError("The print artwork must preserve source lettering and dimensions")
        entry = manifest[f"/assets/images/{name}.png"]
        if entry["sha256"] != Digest(pngPath) or entry["variants"][0]["sha256"] != Digest(svgPath):
            raise ValueError(f"Stale print image manifest: {name}")
        if svgPath.stat().st_size >= 200_000:
            raise ValueError("Print SVG exceeds the existing logo transfer budget")
    print("PASS: bilingual wide print artwork, exact source crops and image inventory")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    if parser.parse_args().write:
        Generate()
    Validate()
