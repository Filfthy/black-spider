# Run from the BlackSpider folder (after tools/cave-depth.py): python tools/cave-walk.py 0.13 26  - where spiders may walk in art/cave2.png: everything but the far, dark void
import numpy as np, sys
from PIL import Image, ImageFilter
S = r"C:/Users/davev/AppData/Local/Temp/claude/D--CodeGen-6axis/58f092d7-b1bb-4ee8-852d-358eaaa733e5/scratchpad/"
im = Image.open("art/cave2.png").convert("RGB")
d = np.load(S + "cave2_depth.npy")
lum = np.array(im.convert("L").filter(ImageFilter.GaussianBlur(5)), np.float32)
dfar, lmax = float(sys.argv[1]), float(sys.argv[2])
void = (d < dfar) & (lum < lmax)
walk = (~void).astype(np.uint8) * 255
w = Image.fromarray(walk).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
w.save(S + "cave2_walk.png")
over = Image.blend(im, Image.merge("RGB", [w, Image.new("L", w.size, 0), Image.new("L", w.size, 0)]), 0.35)
over.save(S + "cave2_walk_over.jpg", quality=80)
print("walkable %", int((np.array(w) > 0).mean() * 100))
