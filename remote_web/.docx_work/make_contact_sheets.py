from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import sys

source = Path(sys.argv[1])
output = Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
files = sorted(source.glob("page-*.png"))
cols, rows = 4, 4
cell_w, cell_h = 330, 470
for sheet_index in range(0, len(files), cols * rows):
    canvas = Image.new("RGB", (cols * cell_w, rows * cell_h), "#D7D7D7")
    draw = ImageDraw.Draw(canvas)
    for position, path in enumerate(files[sheet_index:sheet_index + cols * rows]):
        image = Image.open(path).convert("RGB")
        image.thumbnail((cell_w - 16, cell_h - 30))
        x = (position % cols) * cell_w + (cell_w - image.width) // 2
        y = (position // cols) * cell_h + 22
        canvas.paste(image, (x, y))
        draw.text((position % cols * cell_w + 8, position // cols * cell_h + 5), path.stem, fill="black")
    canvas.save(output / f"sheet-{sheet_index // (cols * rows) + 1}.png")
