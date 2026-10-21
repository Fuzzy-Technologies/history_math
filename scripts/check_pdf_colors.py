"""Check the light-theme paper and ink in actual Chromium PDF output."""

import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile

from PIL import Image


def light_palette(css):
    root = re.search(r":root\s*\{([^}]+)\}", css)
    if not root:
        raise ValueError("Missing light palette")
    return dict(re.findall(r"(--[a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;", root[1]))


def check_page(image, paper, ink, require_ink=True, muted=None):
    """Scan whole margin bands, including all four corners and page edges."""
    image = image.convert("RGB")
    width, height = image.size
    # Stay outside article content and the page-number footer on an A4 sheet.
    side = max(1, int(width * 16 / 210))
    top = max(1, int(height * 14 / 297))
    bottom = max(1, int(height * 4 / 297))
    bands = [(0, 0, side, height), (width - side, 0, width, height),
             (0, 0, width, top), (0, height - bottom, width, height)]
    for box in bands:
        for pixel in image.crop(box).get_flattened_data():
            if any(abs(channel - expected) > 1 for channel, expected in zip(pixel, paper)):
                raise ValueError(f"Paper mismatch in margin band {box}: {pixel}, expected {paper}")
    has_ink = ink in set(image.get_flattened_data())
    if require_ink and not has_ink:
        raise ValueError("Missing light-theme body/title ink")
    if muted is not None:
        footer_top, footer_bottom = int(height * (1 - 16 / 297)), height - bottom
        for left, right in [(side, width // 2), (width // 2, width - side)]:
            if muted not in set(image.crop((left, footer_top, right, footer_bottom)).get_flattened_data()):
                raise ValueError("Missing or obscured light-theme footer label/page number")
    return has_ink


def CheckSeam(image):
    """Reject a near-white column along the content/paper join, allowing figures."""
    image = image.convert("RGB")
    for x in range(image.width):
        whitePixels = sum(all(channel > 250 for channel in image.getpixel((x, y))) for y in range(image.height))
        if whitePixels >= image.height * 0.95:
            raise ValueError("White seam at the content/paper join")


def check_site(site):
    palette = light_palette((site / "assets/style.css").read_text())
    rgb = lambda key: tuple(bytes.fromhex(palette[key][1:]))
    manifest = json.loads((site / "assets/article-pdfs.json").read_text())
    pages = 0
    for article in manifest["articles"]:
        pdf = site / article["pdf_url"].lstrip("/")
        with tempfile.TemporaryDirectory(prefix="pdf-paper-") as directory:
            prefix = Path(directory) / "page"
            # Bounded, low-resolution checks; no article or PDF regeneration.
            subprocess.run(["pdftoppm", "-r", "36", "-aa", "no", "-aaVector", "no",
                            str(pdf), str(prefix)], check=True, capture_output=True, timeout=120)
            images = sorted(Path(directory).glob("page-*.ppm"))
            if not images:
                raise ValueError(f"No PDF pages: {pdf.name}")
            has_ink = False
            for path in images:
                try:
                    with Image.open(path) as image:
                        has_ink |= check_page(image, rgb("--paper"), rgb("--ink"), require_ink=False, muted=rgb("--muted"))
                except ValueError as error:
                    raise ValueError(f"{pdf.name}, {path.stem}: {error}") from error
            pages += len(images)
            if not has_ink:
                raise ValueError(f"Missing light-theme body/title ink: {pdf.name}")
            # A 0.75pt join can disappear at 36 dpi. Rasterize only a five-pixel
            # strip around the right content edge at 100 dpi, without rebuilding.
            seamPrefix = Path(directory) / "seam"
            subprocess.run(["pdftoppm", "-r", "100", "-x", "750", "-y", "67", "-W", "5", "-H", "1024",
                            str(pdf), str(seamPrefix)], check=True, capture_output=True, timeout=120)
            seamImages = sorted(Path(directory).glob("seam-*.ppm"))
            if len(seamImages) != len(images):
                raise ValueError(f"Missing seam checks: {pdf.name}")
            for path in seamImages:
                try:
                    with Image.open(path) as image:
                        CheckSeam(image)
                except ValueError as error:
                    raise ValueError(f"{pdf.name}, {path.stem}: {error}") from error
    if not pages:
        raise ValueError("No admitted PDF pages")
    print(f"PASS: light-theme ink and full-sheet paper in {pages} pages / {len(manifest['articles'])} PDFs")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path)
    check_site(parser.parse_args().site)
