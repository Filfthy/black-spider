# Run from the BlackSpider folder: python tools/make-placeholder-spiders.py
#
# Placeholder spider pictures (until the real art arrives): one SVG <symbol> per card number, sp-1 .. sp-11, written
# into index.html between the PLACEHOLDER-SPIDERS markers. Plain ink spiders in the poses of the card list; the parts
# drawn with class "hl" take the card's colour (CSS: --hl), as the real art's magenta areas will.
import math, re

INK = "#1c130c"

def leg(x, y, ang, l1, l2, bend):
    """a leg from the body at (x, y): out at angle `ang` (degrees), then bending by `bend`"""
    a = math.radians(ang); b = math.radians(ang + bend)
    x1, y1 = x + math.cos(a) * l1, y + math.sin(a) * l1
    x2, y2 = x1 + math.cos(b) * l2, y1 + math.sin(b) * l2
    return f'<polyline points="{x:.1f},{y:.1f} {x1:.1f},{y1:.1f} {x2:.1f},{y2:.1f}" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'

def spider(cx, cy, s=1.0, rot=0, legs=None, hourglass=True, extra_hl=""):
    """a spider facing up (head at the top), scaled by s, turned by rot degrees about its middle"""
    # legs: four each side, as (angle, bend); the defaults splay out like a resting spider
    L = legs or [(-150, -35), (-170, 30), (170, 40), (140, 45)]
    parts = []
    for ang, bend in L:   # left side
        parts.append(leg(-3, -6, ang, 13, 15, bend))
    for ang, bend in L:   # mirrored to the right
        parts.append(leg(3, -6, 180 - ang, 13, 15, -bend))
    parts.append(f'<ellipse cx="0" cy="8" rx="9" ry="12" fill="{INK}"/>')          # abdomen
    parts.append(f'<circle cx="0" cy="-8" r="6" fill="{INK}"/>')                    # head
    for ex in (-2.4, 2.4):
        parts.append(f'<circle cx="{ex}" cy="-10" r="1.2" fill="#f3e2b8"/>')
    if hourglass:
        parts.append('<path class="hl" d="M-3.5 2 L3.5 2 L0 8 Z M-3.5 14 L3.5 14 L0 8 Z"/>')
    parts.append(extra_hl)
    return f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s})">' + "".join(parts) + "</g>"

def web(cx, cy, r, spokes=12, rings=5, arc=(0, 360)):
    out = []
    a0, a1 = arc
    for k in range(spokes + 1):
        a = math.radians(a0 + (a1 - a0) * k / spokes)
        out.append(f'<line x1="{cx}" y1="{cy}" x2="{cx + math.cos(a) * r:.1f}" y2="{cy + math.sin(a) * r:.1f}" stroke="{INK}" stroke-width="0.7" opacity="0.7"/>')
    for i in range(1, rings + 1):
        rr = r * i / rings
        pts = []
        for k in range(spokes + 1):
            a = math.radians(a0 + (a1 - a0) * k / spokes)
            pts.append(f"{cx + math.cos(a) * rr:.1f},{cy + math.sin(a) * rr:.1f}")
        out.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{INK}" stroke-width="0.7" opacity="0.7"/>')
    return "".join(out)

def thread(x1, y1, x2, y2):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="1" />'

S = {}
# 1 Dangling from a single thread
S[1] = thread(50, 0, 50, 52) + spider(50, 74, 1.15, 180, [(-130, -50), (-160, 35), (160, 50), (125, 60)])
# 2 Climbing up the thread
S[2] = thread(50, 0, 50, 140) + spider(50, 78, 1.15, 0, [(-115, -30), (-150, 15), (165, 30), (120, 50)])
# 3 Spinning a web
S[3] = web(32, 40, 34, 8, 5, (-20, 110)) + '<path class="hl-line" d="M66 100 C55 80 45 70 38 56" fill="none" stroke-width="1.6"/>' + spider(68, 102, 1.0, -25)
# 4 Juggling with four legs
S[4] = "".join(f'<circle class="hl" cx="{50 + 26 * math.cos(math.radians(a)):.1f}" cy="{58 + 22 * math.sin(math.radians(a)):.1f}" r="5"/>' for a in (200, 245, 295, 340)) + \
       spider(50, 100, 1.15, 0, [(-120, -60), (-140, -55), (165, 35), (125, 45)])
# 5 Tightrope walking on a strand
S[5] = f'<line x1="0" y1="104" x2="100" y2="98" stroke="{INK}" stroke-width="1.1"/>' + \
       '<line class="hl-line" x1="12" y1="62" x2="88" y2="62" stroke-width="3" stroke-linecap="round"/>' + \
       spider(50, 82, 1.0, 0, [(-115, -55), (-150, 20), (160, 55), (125, 70)])
# 6 Swinging on a thread like a trapeze
S[6] = thread(30, 0, 38, 50) + thread(70, 0, 62, 50) + '<line class="hl-line" x1="34" y1="50" x2="66" y2="50" stroke-width="3.2" stroke-linecap="round"/>' + \
       spider(50, 78, 1.1, 180, [(-150, 20), (-170, 30), (-110, 40), (-80, 20)])
# 7 Wrapping a fly
fly = ('<g transform="translate(70 60)"><ellipse cx="0" cy="0" rx="7" ry="10" fill="#3a2a1c"/><ellipse cx="-8" cy="-6" rx="7" ry="4" fill="none" stroke="' + INK + '" stroke-width="0.8"/>'
       '<ellipse cx="8" cy="-6" rx="7" ry="4" fill="none" stroke="' + INK + '" stroke-width="0.8"/>'
       '<path class="hl-line" d="M-8 -6 L8 -2 L-8 2 L8 6 L-8 10" fill="none" stroke-width="2"/></g>')
S[7] = fly + spider(42, 92, 1.05, 30, [(-100, -60), (-130, -40), (165, 30), (125, 45)])
# 8 Abseiling down with a pack on its back
S[8] = thread(78, 0, 60, 62) + spider(54, 82, 1.1, -25, None, False, '<rect class="hl" x="-7" y="0" width="14" height="14" rx="3"/><line x1="-6" y1="2" x2="6" y2="2" stroke="' + INK + '" stroke-width="1"/>')
# 9 A tower of spiders
S[9] = "".join(spider(50, 122 - k * 22, 0.62, 0, [(-160, 10), (-175, 25), (170, 30), (150, 30)], k == 4) for k in range(5))
# 10 Knitting a web with all eight legs
S[10] = ('<line class="hl-line" x1="22" y1="50" x2="66" y2="86" stroke-width="2.4" stroke-linecap="round"/>'
         '<line class="hl-line" x1="78" y1="50" x2="34" y2="86" stroke-width="2.4" stroke-linecap="round"/>') + \
        web(50, 112, 26, 10, 4, (200, 340)).replace('opacity="0.7"', 'opacity="0.55"') + \
        spider(50, 56, 1.15, 0, [(-145, -60), (-165, -40), (160, 40), (125, 50)])
# 11 Sitting enthroned at the centre of a web
S[11] = web(50, 70, 48, 16, 6) + spider(50, 74, 1.15, 0, None, True,
        '<path class="hl" d="M-6 -13 L-6 -18 L-3 -15 L0 -20 L3 -15 L6 -18 L6 -13 Z"/>')

symbols = "\n".join(f'    <symbol id="sp-{n}" viewBox="0 0 100 140">{S[n]}</symbol>' for n in range(1, 12))
# a small solid spider, for counts and messages (its hourglass red)
symbols += "\n" + '    <symbol id="sp-icon" viewBox="-30 -32 60 60">' + spider(0, 0, 1.0, 0).replace(INK, '#e9d8b0').replace('class="hl"', 'fill="#c8261e"') + '</symbol>'
p = "index.html"
html = open(p, encoding="utf-8").read()
block = f"<!-- PLACEHOLDER-SPIDERS (tools/make-placeholder-spiders.py) -->\n{symbols}\n    <!-- /PLACEHOLDER-SPIDERS -->"
if "<!-- PLACEHOLDER-SPIDERS" in html:
    html = re.sub(r"<!-- PLACEHOLDER-SPIDERS.*?<!-- /PLACEHOLDER-SPIDERS -->", lambda m: block, html, flags=re.S)
else:
    html = html.replace("  </defs></svg>", "    " + block + "\n  </defs></svg>", 1)
open(p, "w", encoding="utf-8").write(html)
print("ok", len(symbols) // 1024, "KB")
