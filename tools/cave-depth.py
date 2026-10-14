# Run from the BlackSpider folder: python tools/cave-depth.py  - depth map of art/cave2.png (Depth Anything)
import numpy as np
from PIL import Image
from transformers import pipeline
im = Image.open("art/cave2.png").convert("RGB")
est = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")
d = np.array(est(im)["predicted_depth"].squeeze(), np.float32)
d = np.array(Image.fromarray(d).resize(im.size, Image.BILINEAR))
d = (d - d.min()) / (d.max() - d.min())          # 1 = near
Image.fromarray((d * 255).astype(np.uint8)).save(r"C:/Users/davev/AppData/Local/Temp/claude/D--CodeGen-6axis/58f092d7-b1bb-4ee8-852d-358eaaa733e5/scratchpad/cave2_depth.png")
np.save(r"C:/Users/davev/AppData/Local/Temp/claude/D--CodeGen-6axis/58f092d7-b1bb-4ee8-852d-358eaaa733e5/scratchpad/cave2_depth.npy", d)
print("ok")
