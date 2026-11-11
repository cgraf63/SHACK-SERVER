#!/usr/bin/env python3
"""
SHACK-SERVER logo as vector files (static version of shack-server-about.svg).

Writes into the folder given as argument:
  shack-server-logo.svg                  glow, dark background (screen, banner)
  shack-server-logo-transparent.svg      glow, no background
  shack-server-logo-flat.svg             pure vector, no glow / gradients /
                                         transparency (T-shirt, screen print),
                                         for dark material
  shack-server-logo-flat-light.svg       same for light material (dark text)
Text is converted to outlines (no font needed at the print shop).
"""

import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"  # Arial metrics

R = 180
D = 127.28  # 180 / sqrt(2)
NODES = [  # (x, y, colour), clockwise from the top
    (0, -R, "#00c8ff"), (D, -D, "#ff6500"), (R, 0, "#ffc400"), (D, D, "#00e85a"),
    (0, R, "#00c8ff"), (-D, D, "#b000ff"), (-R, 0, "#ffc400"), (-D, -D, "#00c8ff"),
]
DOT = 0.6          # white dots: same place on every ray
TEXT = "SHACK-SERVER"
TEXT_SIZE = 42
TEXT_TRACKING = 7
TEXT_BASELINE = 305

# view: square-ish like the cover (logo centre at 0,0)
VIEW = (-275, -285, 550, 640)


def text_path(text, size, tracking, baseline, colour):
    font = TTFont(FONT)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = size / font["head"].unitsPerEm
    hmtx = font["hmtx"]

    names = [cmap[ord(c)] for c in text]
    width = sum(hmtx[n][0] * scale for n in names) + tracking * (len(names) - 1)
    x = -width / 2
    parts = []
    for name in names:
        pen = SVGPathPen(glyph_set)
        glyph_set[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        parts.append(pen.getCommands())
        x += hmtx[name][0] * scale + tracking
    return f'<path fill="{colour}" d="{" ".join(parts)}"/>'


def svg(content, background=None):
    x, y, w, h = VIEW
    bg = ""
    if background:
        bg = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{background}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" '
            f'width="{w * 10}" height="{h * 10}">\n'
            f'<title>SHACK-SERVER</title>\n{bg}\n{content}\n</svg>\n')


def glow_version(with_background):
    defs = """<defs>
  <radialGradient id="bg" cx="50%" cy="42%" r="70%">
    <stop offset="0" stop-color="#101b2b"/><stop offset=".55" stop-color="#060b14"/><stop offset="1" stop-color="#020409"/>
  </radialGradient>
  <radialGradient id="core"><stop offset="0" stop-color="#fff7b0"/><stop offset=".25" stop-color="#ffd000"/>
    <stop offset=".65" stop-color="#ff8a00"/><stop offset="1" stop-color="#ff4d00"/></radialGradient>
  <filter id="halo5" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="halo6" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="halo10" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="10"/></filter>
</defs>"""
    x, y, w, h = VIEW
    parts = [defs]
    if with_background:
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#bg)"/>')
        parts.append('<g fill="none" stroke="#163047" opacity=".45">'
                     '<circle r="205"/><circle r="230"/><circle r="255"/></g>')
        parts.append('<circle r="245" fill="none" stroke="#00c8ff" stroke-width="1" '
                     'stroke-dasharray="4 24" opacity=".45"/>')
    parts.append('<g fill="none" stroke-width="4" stroke-linecap="round">' + "".join(
        f'<line x1="0" y1="0" x2="{nx}" y2="{ny}" stroke="{c}"/>' for nx, ny, c in NODES) + "</g>")
    # glow = a blurred copy UNDER the sharp shape: in a PDF only the soft
    # halo becomes a picture, the shapes stay vectors (sharp at any size)
    dots = "".join(f'<circle cx="{nx * DOT:.2f}" cy="{ny * DOT:.2f}" r="4"/>' for nx, ny, _ in NODES)
    nodes = "".join(f'<circle cx="{nx}" cy="{ny}" r="17" fill="{c}"/>' for nx, ny, c in NODES)
    parts.append(f'<g fill="#ffffff" filter="url(#halo5)">{dots}</g>')
    parts.append(f'<g fill="#ffffff" opacity=".9">{dots}</g>')
    parts.append(f'<g filter="url(#halo6)">{nodes}</g>')
    parts.append(f'<g>{nodes}</g>')
    parts.append('<circle r="42" fill="#ff9d00" opacity=".18" filter="url(#halo10)"/>'
                 '<circle r="31" fill="url(#core)" filter="url(#halo10)"/>'
                 '<circle r="31" fill="url(#core)"/>'
                 '<circle r="16" fill="#fff4b0"/><circle r="8" fill="#ffffff"/>'
                 '<circle r="48" fill="none" stroke="#ffb000" stroke-width="2" opacity=".35"/>')
    parts.append(text_path(TEXT, TEXT_SIZE, TEXT_TRACKING, TEXT_BASELINE, "#ffffff"))
    return svg("\n".join(parts))


def flat_version(text_colour, dot_colour):
    """Solid colours only: what a screen printer / vinyl cutter needs."""
    parts = []
    parts.append('<g fill="none" stroke-width="4" stroke-linecap="round">' + "".join(
        f'<line x1="0" y1="0" x2="{nx}" y2="{ny}" stroke="{c}"/>' for nx, ny, c in NODES) + "</g>")
    parts.append(f'<g fill="{dot_colour}">' + "".join(
        f'<circle cx="{nx * DOT:.2f}" cy="{ny * DOT:.2f}" r="4.5"/>' for nx, ny, _ in NODES) + "</g>")
    parts.append("<g>" + "".join(
        f'<circle cx="{nx}" cy="{ny}" r="17" fill="{c}"/>' for nx, ny, c in NODES) + "</g>")
    parts.append('<circle r="40" fill="none" stroke="#ffb000" stroke-width="3"/>'
                 '<circle r="31" fill="#ff6a00"/><circle r="23" fill="#ffb000"/>'
                 '<circle r="16" fill="#fff4b0"/><circle r="8" fill="#ffffff"/>')
    parts.append(text_path(TEXT, TEXT_SIZE, TEXT_TRACKING, TEXT_BASELINE, text_colour))
    return svg("\n".join(parts))


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    out.mkdir(parents=True, exist_ok=True)
    files = {
        "shack-server-logo.svg": glow_version(True),
        "shack-server-logo-transparent.svg": glow_version(False),
        "shack-server-logo-flat.svg": flat_version("#ffffff", "#ffffff"),
        "shack-server-logo-flat-light.svg": flat_version("#0b1622", "#0b1622"),
    }
    for name, content in files.items():
        (out / name).write_text(content, encoding="utf-8")
        print(name, len(content))


if __name__ == "__main__":
    main()
