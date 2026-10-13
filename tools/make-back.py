# Run from the BlackSpider folder: python tools/make-back.py
# The card back from the user's art/cardback.png: the black outside its rounded corners made transparent, saved as
# back-spider.webp (300 x 419). Bump back-spider.webp?v= in bs.css and bs-app.js afterwards.
from PIL import Image, ImageDraw, ImageFilter

im = Image.open("art/cardback.png").convert("RGB")
work = im.copy()
for xy in [(0, 0), (im.width - 1, 0), (0, im.height - 1), (im.width - 1, im.height - 1)]:
    ImageDraw.floodfill(work, xy, (255, 0, 255), thresh=60)
mask = Image.new("L", im.size, 255)
px, m = work.load(), mask.load()
for y in range(im.height):
    for x in range(im.width):
        if px[x, y] == (255, 0, 255): m[x, y] = 0
out = im.convert("RGBA"); out.putalpha(mask.filter(ImageFilter.GaussianBlur(1.2)))
out.resize((300, 419), Image.LANCZOS).save("back-spider.webp", "WEBP", quality=88, method=6)
print("ok", im.size)
