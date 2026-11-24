"""Source palette consistency and rejection checks for rendered paper bands."""

import importlib.util
from pathlib import Path
import re
import unittest

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("pdf_colors", ROOT / "scripts/check_pdf_colors.py")
COLORS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COLORS)


class PdfColorsTest(unittest.TestCase):
    def test_print_palette_matches_the_sites_light_palette(self):
        screen = COLORS.light_palette((ROOT / "site/assets/style.css").read_text())
        css = (ROOT / "site/assets/article-print.css").read_text()
        printed = dict(re.findall(r"(--[a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;", css))
        self.assertEqual(printed, {key: screen[key] for key in printed})
        for key in ["--paper", "--ink", "--muted", "--copper", "--line"]:
            self.assertIn(key, printed)
        margins = re.findall(r"@(top-[\w-]+|bottom-[\w-]+|left-middle|right-middle)\s*\{([^}]+)\}", css)
        self.assertEqual({name for name, _ in margins}, {"top-left-corner", "top-center", "top-right-corner",
            "left-middle", "right-middle", "bottom-left-corner", "bottom-center", "bottom-right-corner"})
        for _, rule in margins:
            self.assertIn(f"background: {screen['--paper']}", rule)

    def test_rejects_white_edges_strips_corners_and_missing_ink(self):
        paper, ink = (244, 237, 223), (51, 39, 31)
        page = Image.new("RGB", (298, 421), paper)
        ImageDraw.Draw(page).rectangle((100, 100, 150, 150), fill=ink)
        COLORS.check_page(page, paper, ink)
        for box in [(0, 0, 297, 420), (0, 0, 297, 0), (0, 420, 297, 420),
                    (0, 0, 0, 420), (297, 0, 297, 420), (0, 0, 2, 2),
                    (10, 100, 12, 150), (100, 10, 150, 12)]:
            with self.subTest(box=box):
                damaged = page.copy()
                ImageDraw.Draw(damaged).rectangle(box, fill="white")
                with self.assertRaisesRegex(ValueError, "Paper mismatch"):
                    COLORS.check_page(damaged, paper, ink)
        with self.assertRaisesRegex(ValueError, "Missing.*ink"):
            COLORS.check_page(Image.new("RGB", page.size, paper), paper, ink)
        self.assertFalse(COLORS.check_page(Image.new("RGB", page.size, paper), paper, ink, require_ink=False),
                         "An illustration-only page need not contain body text")

    def test_paper_fill_cannot_obscure_the_footer_or_page_number(self):
        paper, ink, muted = (244, 237, 223), (51, 39, 31), (112, 96, 79)
        page = Image.new("RGB", (298, 421), paper)
        page.putpixel((100, 100), ink)
        for position in [(30, 410), (260, 410)]:
            page.putpixel(position, muted)
        COLORS.check_page(page, paper, ink, muted=muted)
        for position in [(30, 410), (260, 410)]:
            damaged = page.copy()
            damaged.putpixel(position, paper)
            with self.assertRaisesRegex(ValueError, "obscured.*footer"):
                COLORS.check_page(damaged, paper, ink, muted=muted)

    def test_rejects_a_white_seam_without_rejecting_white_figure_regions(self):
        paper = (244, 237, 223)
        strip = Image.new("RGB", (5, 100), paper)
        COLORS.CheckSeam(strip)
        ImageDraw.Draw(strip).rectangle((0, 10, 4, 70), fill="white")
        COLORS.CheckSeam(strip)
        for shade in [(255, 255, 255), (254, 254, 254)]:
            damaged = strip.copy()
            ImageDraw.Draw(damaged).line((2, 0, 2, 99), fill=shade)
            with self.assertRaisesRegex(ValueError, "seam"):
                COLORS.CheckSeam(damaged)


if __name__ == "__main__":
    unittest.main()
