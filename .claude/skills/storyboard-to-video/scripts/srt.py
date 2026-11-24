"""Write out/<id>.srt and out/<id>.txt for a storyboard's film (timing mirrors src/story.ts).
Usage: python3 srt.py <project-dir> <storyboard-id>
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _timeline import FPS, VO_AT, timeline  # noqa: E402


def ts(s):
    ms = round(s * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    project, sid = Path(sys.argv[1]), sys.argv[2]
    sb = json.loads((project / "src" / "storyboards" / f"{sid}.json").read_text(encoding="utf-8"))
    tl = timeline(sb)
    cues = []
    for start, scene in zip(tl["starts"], sb["scenes"]):
        base = (start + VO_AT) / FPS
        cues += [(base + c["start"], base + c["end"], c["text"]) for c in scene.get("captions") or []]
    out = project / "out"
    out.mkdir(exist_ok=True)
    (out / f"{sid}.srt").write_text("\n".join(f"{i}\n{ts(a)} --> {ts(b)}\n{t}\n" for i, (a, b, t) in enumerate(cues, 1)), encoding="utf-8")
    (out / f"{sid}.txt").write_text("\n".join(f"[{ts(a)[3:8]}] {t}" for a, _, t in cues) + "\n", encoding="utf-8")
    print(f"out/{sid}.srt  ({len(cues)} cues, film {tl['total'] / FPS:.1f} s)")


if __name__ == "__main__":
    main()
