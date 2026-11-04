"""Generate the voiceover for every scene of a storyboard with Kokoro TTS (Apache-2.0, offline).
Each sentence becomes one caption; the files land in public/vo/<id>/NN.mp3 and the storyboard
JSON gets "voFile" and "captions" per scene.

Setup (once):  python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile
               download kokoro-v1.0.onnx + voices-v1.0.bin from
               https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
Storyboard:    "voice": {"voice": "bf_emma", "lang": "en-gb", "speed": 0.95}
               (English only; for Arabic and other languages use split-voiceover.py)
Usage:         .venv/bin/python voiceover-kokoro.py <project-dir> <storyboard-id> <models-dir>
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

PAUSE = 0.4


def sentences(text):
    parts = re.split(r"(?<=[.!?؟])\s+", text.strip())
    return [p for p in parts if p]


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    project, sid, models = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
    path = project / "src" / "storyboards" / f"{sid}.json"
    sb = json.loads(path.read_text(encoding="utf-8"))
    v = {"voice": "bf_emma", "lang": "en-gb", "speed": 0.95, **(sb.get("voice") or {})}
    kokoro = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))
    out_dir = project / "public" / "vo" / sid
    out_dir.mkdir(parents=True, exist_ok=True)

    for i, scene in enumerate(sb["scenes"], start=1):
        parts, cues, pos, rate = [], [], 0, 24000
        for line in sentences(scene["voiceover"]):
            audio, rate = kokoro.create(line, voice=v["voice"], speed=v["speed"], lang=v["lang"])
            cues.append({"text": line, "start": round(pos / rate, 3), "end": round((pos + len(audio)) / rate, 3)})
            pos += len(audio) + int(PAUSE * rate)
            parts += [audio, np.zeros(int(PAUSE * rate), dtype=audio.dtype)]
        target = out_dir / f"{i:02d}.mp3"
        with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
            sf.write(wav.name, np.concatenate(parts[:-1]), rate)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav.name, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                            "-ar", "44100", "-ac", "1", "-b:a", "128k", str(target)], check=True)
        scene["voFile"] = f"vo/{sid}/{i:02d}.mp3"
        scene["captions"] = cues
        print(f"{scene['voFile']}  {cues[-1]['end']:.2f}s")

    path.write_text(json.dumps(sb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {path}")


if __name__ == "__main__":
    main()
