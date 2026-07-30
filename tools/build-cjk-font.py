#!/usr/bin/env python3
"""
Build the subset CJK webfonts used by css/style.css.

Two things happen here, and the second one is the reason this script exists
rather than a plain `pyftsubset` command line:

1. SUBSET to the characters the site actually uses (~250 KB per weight
   instead of ~2.6 MB). The full fonts stay in /fonts as a fallback family
   for any character added later — see the @font-face block in style.css.

2. BASELINE CORRECTION. Xiangcui Chaoxisong draws every glyph below the
   baseline: flat-bottomed capitals (H E I L T) sit at ymin = -160 (W15) /
   -127 (W40) where every normal font has them at exactly 0. Latin text on
   the page comes from Anton / Work Sans / IBM Plex Mono, which follow the
   convention, so in a mixed line the Chinese rendered ~0.15em lower than
   the Latin next to it — the visible stagger in "AI 相关". CSS cannot fix
   this: ascent-override and descent-override resize the line box, they do
   not move glyphs relative to the baseline. So the outlines are shifted at
   build time instead, using the font's own capital baseline as the anchor.

Usage:  python3 build-cjk-font.py <W15.ttf> <W40.ttf> <out-dir> [source-dir]

The character set is every non-ASCII codepoint appearing in the repo's
.html/.js files, plus ASCII, Latin-1 and the punctuation blocks as margin.
Re-run it after a large content change; skipping it is safe (missing glyphs
fall through to the full font), it just costs one extra download.
"""
import glob
import os
import shutil
import sys

from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

# Flat-bottomed capitals: in a correctly built font every one of these has
# ymin == 0. Whatever they share here is exactly how far the font is off.
BASELINE_PROBES = "HEILT"


def collect_charset(source_dir):
    files = []
    for pattern in ("*.html", "*/*.html", "js/*.js", "cloudflare-worker/*.js"):
        files += glob.glob(os.path.join(source_dir, pattern))
    chars = set()
    for path in files:
        with open(path, encoding="utf-8", errors="ignore") as fh:
            chars.update(fh.read())
    chars = {c for c in chars if c.isprintable() or c == " "}
    margin = (
        list(range(0x20, 0x7F))        # ASCII
        + list(range(0xA0, 0x100))     # Latin-1
        + list(range(0x2000, 0x2070))  # general punctuation
        + list(range(0x2190, 0x21A0))  # arrows
        + list(range(0x2600, 0x2650))  # misc symbols
        + list(range(0x3000, 0x3040))  # CJK punctuation
        + list(range(0xFF00, 0xFFF0))  # fullwidth forms
    )
    return len(files), sorted({ord(c) for c in chars} | set(margin))


def baseline_offset(font):
    """How far the font's capitals sit below the baseline, in font units."""
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    mins = []
    for ch in BASELINE_PROBES:
        name = cmap.get(ord(ch))
        if not name:
            continue
        pen = BoundsPen(glyphs)
        glyphs[name].draw(pen)
        if pen.bounds:
            mins.append(pen.bounds[1])
    if not mins:
        return 0
    # They should all agree; take the median so one odd glyph can't skew it.
    mins.sort()
    return mins[len(mins) // 2]


def shift_glyphs(font, dy):
    """Move every outline up by dy font units.

    Only *simple* glyphs are touched. Composite glyphs are built from the
    glyphs they reference, which have already moved, so shifting their
    component offsets too would apply the correction twice.
    """
    glyf = font["glyf"]
    moved = 0
    for name in font.getGlyphOrder():
        glyph = glyf[name]
        if glyph.isComposite() or not getattr(glyph, "numberOfContours", 0):
            continue
        coords = glyph.coordinates
        for i in range(len(coords)):
            x, y = coords[i]
            coords[i] = (x, y + dy)
        glyph.recalcBounds(glyf)
        moved += 1
    return moved


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        return 1
    w15_src, w40_src, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    source_dir = sys.argv[4] if len(sys.argv) > 4 else "."
    os.makedirs(out_dir, exist_ok=True)

    scanned, unicodes = collect_charset(source_dir)
    print("scanned %d files -> %d codepoints" % (scanned, len(unicodes)))

    # The full fonts get the same baseline correction as the subsets. They are
    # the fallback family for characters the subset lacks, and a fallback that
    # renders 0.15em lower than everything around it would reintroduce exactly
    # the bug this script exists to fix — just rarely enough to be baffling.
    jobs = [
        (w15_src, "XiangcuiChaoxisong-W15.subset.woff2", True),
        (w40_src, "XiangcuiChaoxisong-W40.subset.woff2", True),
        (w15_src, "XiangcuiChaoxisong-W15.woff2", False),
        (w40_src, "XiangcuiChaoxisong-W40.woff2", False),
    ]
    for src, out_name, do_subset in jobs:
        tmp = os.path.join(out_dir, "_tmp.ttf")
        if do_subset:
            subset.main([
                src,
                "--unicodes=" + ",".join("U+%04X" % u for u in unicodes),
                "--output-file=" + tmp,
                "--layout-features=*",
                "--no-hinting",
                "--desubroutinize",
                "--name-IDs=*",
                "--notdef-outline",
            ])
        else:
            shutil.copy(src, tmp)

        font = TTFont(tmp)
        dy = -baseline_offset(font)
        moved = shift_glyphs(font, dy)
        font["head"].recalcBounds = True
        font.flavor = "woff2"
        out_path = os.path.join(out_dir, out_name)
        font.save(out_path)
        os.remove(tmp)

        check = TTFont(out_path)
        after = baseline_offset(check)
        print("%-40s %7d bytes | shifted %+d units across %d glyphs | cap baseline now %d"
              % (out_name, os.path.getsize(out_path), dy, moved, after))
    return 0


if __name__ == "__main__":
    sys.exit(main())
