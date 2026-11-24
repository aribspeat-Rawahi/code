"""Cut a storyboard sheet (one image with a grid of panels) into one image per panel.

Usage: python3 slice-sheet.py <sheet.png> <cols> <rows> <out-dir> [--margin PX] [--gutter PX]
  --margin  border around the whole grid in pixels (default 0)
  --gutter  space between panels in pixels (default 0)
Panels are written left-to-right, top-to-bottom as panel-01.png, panel-02.png, ...
Then run from-images.py on <out-dir>. Needs ffmpeg/ffprobe.
"""
import argparse
import subprocess
from pathlib import Path


def main():
    ap = argparse.ArgumentParser(usage=__doc__)
    ap.add_argument("sheet")
    ap.add_argument("cols", type=int)
    ap.add_argument("rows", type=int)
    ap.add_argument("out")
    ap.add_argument("--margin", type=int, default=0)
    ap.add_argument("--gutter", type=int, default=0)
    a = ap.parse_args()
    size = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", a.sheet],
                          capture_output=True, text=True, check=True).stdout.strip().split("x")
    W, H = int(size[0]), int(size[1])
    pw = (W - 2 * a.margin - (a.cols - 1) * a.gutter) // a.cols
    ph = (H - 2 * a.margin - (a.rows - 1) * a.gutter) // a.rows
    if pw < 64 or ph < 64:
        raise SystemExit("Error: panels would be smaller than 64 px; check cols/rows/margin/gutter")
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    n = 0
    for r in range(a.rows):
        for c in range(a.cols):
            n += 1
            x, y = a.margin + c * (pw + a.gutter), a.margin + r * (ph + a.gutter)
            target = out / f"panel-{n:02d}.png"
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a.sheet, "-vf", f"crop={pw}:{ph}:{x}:{y}", "-frames:v", "1", str(target)], check=True)
    print(f"{n} panels of {pw}x{ph} → {out}")


if __name__ == "__main__":
    main()
