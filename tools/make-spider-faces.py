# Run from the BlackSpider folder: python tools/make-spider-faces.py [debug.png]
#
# The card pictures, one creature per number (PICTURES below; the 7s are the spider), from the user's art: each red body recoloured for each of the five colours (the gold
# outline stays gold; on yellow it's darkened to bronze so the two still part), its soft outer glow faded down so it
# doesn't muddy the parchment. Written to img/spider-<number>-<colour>.webp, 300 x 450.
import sys
import numpy as np
from PIL import Image

COLOURS = {   # body colour, and the outline colour (None: as drawn)
    "red": ((150, 22, 24), None),
    "blue": ((18, 36, 104), None),
    "green": ((36, 112, 44), None),
    "purple": ((96, 30, 132), None),
    "black": ((34, 26, 22), None),
}
# which picture each number shows: creepy-crawlies rising in menace, and the 7 - the Black Spider's number - a spider
PICTURES = {1: "fly", 2: "moth", 3: "earwig", 4: "cockroach", 5: "dragonfly", 6: "stag-beetle",
            7: "s3", 8: "centipede", 9: "wasp", 10: "praying-mantis", 11: "scorpion"}
out = []
for num in range(1, 12):
    src = np.array(Image.open(f"art/{PICTURES[num]}.png").convert("RGBA")).astype(np.float32)
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

    row = []
    for name, (body, rim) in COLOURS.items():
        shade = np.clip(lum / red_lum, 0, 1.15)[..., None]     # keeps the body's own texture and shading
        col = rgb.copy()
        if name == "red": body = None
        if body: col = col * (1 - red[..., None]) + np.clip(np.array(body) * shade, 0, 255) * red[..., None]
        if rim:
            gl = (lum / max(1, float(np.median(lum[gold > 0.9]))))[..., None]
            col = col * (1 - gold[..., None]) + np.clip(np.array(rim) * gl * 1.1, 0, 255) * gold[..., None]
        img = Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha]).astype(np.uint8), "RGBA").resize((300, 450), Image.LANCZOS)
        img.save(f"img/spider-{num}-{name}.webp", "WEBP", quality=85, method=6)
        row.append(img)
    out.append(row)
    print(num, "ok")
if len(sys.argv) > 1:
    sheet = Image.new("RGB", (150 * 11, 225 * 5), (232, 204, 147))
    for n, row in enumerate(out):
        for c, im in enumerate(row):
            t = im.resize((150, 225), Image.LANCZOS); sheet.paste(t, (n * 150, c * 225), t)
    sheet.save(sys.argv[1])
