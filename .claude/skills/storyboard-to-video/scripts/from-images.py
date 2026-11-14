"""Start a storyboard from a folder of images (any aspect ratio, sorted by file name).

Every image becomes a square 1600x1600 scene still in <project>/public/<id>/: square images are
scaled; wider or taller ones are fitted whole on a blurred copy of themselves (--fit blur, default,
nothing cut off) or cropped from the centre (--fit crop, no blurred bands; the edges are lost).
Writes <project>/<id>.storyboard.json with one scene per image and placeholder text ("TODO") —
fill in titles, narration (voiceover), labels and brand, then run add-storyboard.py.

Usage: python3 from-images.py <project-dir> <images-dir> <storyboard-id> [--lang en] [--logo path] [--fit blur|crop]
Needs ffmpeg.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

EXT = {".jpg", ".jpeg", ".png", ".webp"}
FIT = ("split[a][b];[a]scale=1600:1600:force_original_aspect_ratio=increase,crop=1600:1600,gblur=sigma=40,eq=brightness=-0.06[bg];"
       "[b]scale=1600:1600:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2")
CROP = "scale=1600:1600:force_original_aspect_ratio=increase,crop=1600:1600"


def natural(p):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.name)]


def main():
    ap = argparse.ArgumentParser(usage=__doc__)
    ap.add_argument("project")
    ap.add_argument("images")
    ap.add_argument("id")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--logo", default="")
    ap.add_argument("--fit", choices=["blur", "crop"], default="blur")
    a = ap.parse_args()
    if not re.fullmatch(r"[a-z0-9-]+", a.id):
        raise SystemExit('Error: id must use only a-z, 0-9 and "-"')
    images = sorted((p for p in Path(a.images).iterdir() if p.suffix.lower() in EXT), key=natural)
    if not images:
        raise SystemExit(f"Error: no images in {a.images}")
    project = Path(a.project)
    out = project / "public" / a.id
    out.mkdir(parents=True, exist_ok=True)
    scenes = []
    for n, img in enumerate(images, start=1):
        target = out / f"scene{n:02d}.jpg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(img), "-filter_complex", FIT if a.fit == "blur" else CROP, "-frames:v", "1", "-q:v", "2", str(target)], check=True)
        scenes.append({
            "image": f"{a.id}/{target.name}",
            "title": "TODO title",
            "voiceover": "TODO narration for this scene.",
            "mood": "tender" if n <= max(1, len(images) // 4) else "uplift" if n > len(images) * 3 // 4 else "hope",
            "labels": [],
            "particles": "dust",
            "_source": img.name,
        })
        print(f"{img.name} → public/{a.id}/{target.name}")
    logo = a.logo
    if logo:
        dst = out / ("logo" + Path(logo).suffix)
        dst.write_bytes(Path(logo).read_bytes())
        logo = f"{a.id}/{dst.name}"
    sb = {
        "id": a.id,
        "lang": a.lang,
        "brand": {"logo": logo or "example/logo.png", "dark": "#14331d", "mid": "#2c6b3f", "accent": "#66d154", "light": "#e3f6dc"},
        "intro": {"title": "TODO intro title"},
        "outro": {"headline": "TODO brand — tagline", "subline": "", "contacts": []},
        "voice": {"voice": "bf_emma", "lang": "en-gb", "speed": 0.95},
        "scenes": scenes,
    }
    path = project / f"{a.id}.storyboard.json"
    path.write_text(json.dumps(sb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Draft storyboard: {path}  ({len(scenes)} scenes) — fill in the TODOs, then add-storyboard.py")


if __name__ == "__main__":
    main()
