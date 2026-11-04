"""Split ONE voiceover recording of the whole storyboard into per-scene files.
Use it for any language or engine that produces one file: a vidIQ/ElevenLabs voiceover,
a human recording, etc. Read the scenes' "voiceover" texts in order, one after another.

Scene boundaries are matched to the pauses in the audio: the cut points are the pauses
closest to where each scene should end given its share of the text (dynamic programming).
Check the printed table: every scene's measured end should be close to its expected end.

Usage: python3 split-voiceover.py <project-dir> <storyboard-id> <full-voiceover.mp3>
Needs ffmpeg/ffprobe on PATH.
"""
import json
import re
import subprocess
import sys
from pathlib import Path


def silences(path):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "silencedetect=noise=-38dB:d=0.25", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
    return list(zip(starts, ends))


def duration(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                capture_output=True, text=True).stdout)


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    project, sid, full = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
    path = project / "src" / "storyboards" / f"{sid}.json"
    sb = json.loads(path.read_text(encoding="utf-8"))
    texts = [s["voiceover"] for s in sb["scenes"]]
    total = duration(full)
    sil = silences(full)
    mids = [(a + b) / 2 for a, b in sil]
    k = len(texts) - 1
    if len(mids) < k:
        sys.exit(f"Error: found only {len(mids)} pauses for {k} scene breaks; add pauses between scenes and record again")

    # Expected scene ends from each scene's share of the letters (diacritics and spaces ignored)
    w = [len(re.sub(r"[\sً-ْ]", "", t)) for t in texts]
    exp = [sum(w[: i + 1]) / sum(w) * total for i in range(k)]
    INF = float("inf")
    dp = [[INF] * len(mids) for _ in range(k)]
    bp = [[-1] * len(mids) for _ in range(k)]
    cost = lambda r, j: (mids[j] - exp[r]) ** 2 - 2 * (sil[j][1] - sil[j][0])  # prefer longer pauses
    for j in range(len(mids)):
        dp[0][j] = cost(0, j)
    for r in range(1, k):
        for j in range(len(mids)):
            for i in range(j):
                if dp[r - 1][i] + cost(r, j) < dp[r][j]:
                    dp[r][j], bp[r][j] = dp[r - 1][i] + cost(r, j), i
    j = min(range(len(mids)), key=lambda x: dp[k - 1][x])
    cuts = []
    for r in range(k - 1, -1, -1):
        cuts.append(mids[j])
        j = bp[r][j]
    bounds = [0.0] + cuts[::-1] + [total]

    out_dir = project / "public" / "vo" / sid
    out_dir.mkdir(parents=True, exist_ok=True)
    trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    print("scene   from     to   expected_end")
    for i, scene in enumerate(sb["scenes"]):
        target = out_dir / f"{i + 1:02d}.mp3"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{bounds[i]:.3f}", "-to", f"{bounds[i + 1]:.3f}", "-i", str(full),
                        "-af", trim + ",loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", "-b:a", "128k", str(target)], check=True)
        d = duration(target)
        scene["voFile"] = f"vo/{sid}/{i + 1:02d}.mp3"
        scene["captions"] = [{"text": scene["voiceover"], "start": 0.0, "end": round(d, 3)}]
        expected = exp[i] if i < k else total
        print(f"{i + 1:5d} {bounds[i]:6.2f} {bounds[i + 1]:6.2f}   {expected:6.2f}{'   <-- check' if abs(bounds[i + 1] - expected) > 1.0 else ''}")

    path.write_text(json.dumps(sb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {path}")


if __name__ == "__main__":
    main()
