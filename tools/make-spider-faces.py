# Run from the BlackSpider folder: python tools/make-spider-faces.py [debug.png]
#
# The card pictures from the user's art/spider1.png: its red body recoloured for each of the five colours (the gold
# outline stays gold; on yellow it's darkened to bronze so the two still part), its soft outer glow faded down so it
# doesn't muddy the parchment. Written to img/spider-<colour>.webp, 320 x 480.
import sys
import numpy as np
from PIL import Image

src = np.array(Image.open("art/spider1.png").convert("RGBA")).astype(np.float32)
rgb, a = src[..., :3], src[..., 3]
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
# the red body: red well above green and blue
# (how purely red: the orange where red meets gold only partly, so the edges don't turn pale)
red = np.clip(((r - g) / np.maximum(r, 1) - 0.45) / 0.25, 0, 1) * (r > 50)
# the outline and markings: gold (red and green both high, blue low)
gold = np.clip((g - b * 1.4 - 20) / 40, 0, 1) * (1 - red)
lum = rgb.mean(axis=2)
red_lum = float(np.median(lum[red > 0.9]))
# the glow: only a faint halo of it stays
alpha = np.where(a >= 250, a, a * 0.35)

COLOURS = {   # body colour, and the outline colour (None: as drawn)
    "red": ((150, 22, 24), None),
    "blue": ((18, 36, 104), None),
    "green": ((36, 112, 44), None),
    "purple": ((96, 30, 132), None),
    "black": ((34, 26, 22), None),
}
out = []
for name, (body, rim) in COLOURS.items():
    shade = np.clip(lum / red_lum, 0, 1.15)[..., None]     # keeps the body's own texture and shading
    col = rgb.copy()
    if name == "red": body = None
    if body: col = col * (1 - red[..., None]) + np.clip(np.array(body) * shade, 0, 255) * red[..., None]
    if rim:
        gl = (lum / max(1, float(np.median(lum[gold > 0.9]))))[..., None]
        col = col * (1 - gold[..., None]) + np.clip(np.array(rim) * gl * 1.1, 0, 255) * gold[..., None]
    img = Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha]).astype(np.uint8), "RGBA").resize((320, 480), Image.LANCZOS)
    img.save(f"img/spider-{name}.webp", "WEBP", quality=88, method=6)
    out.append(img)
    print(name, "ok")
if len(sys.argv) > 1:
    sheet = Image.new("RGB", (320 * 5, 480), (232, 204, 147))
    for i, im in enumerate(out): sheet.paste(im, (i * 320, 0), im)
    sheet.save(sys.argv[1])
