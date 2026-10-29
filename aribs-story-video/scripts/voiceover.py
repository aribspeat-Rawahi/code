"""Generate public/vo/01.mp3 ... 09.mp3 from scripts/voiceover.json with Kokoro TTS (Apache-2.0).
Also writes src/captions.json: per scene, each line with its start/end (seconds into that scene's voiceover).

Setup (once):
  python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile
  Download kokoro-v1.0.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Usage:
  .venv/bin/python scripts/voiceover.py <model-dir>
Requires ffmpeg on PATH.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "vo"


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Usage: voiceover.py <model-dir>")
    models = Path(sys.argv[1])
    kokoro = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))
    cfg = json.loads((ROOT / "scripts" / "voiceover.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    captions = []

    for i, lines in enumerate(cfg["scenes"], start=1):
        parts = []
        rate = 24000
        cues = []
        pos = 0
        for speaker, text in lines:
            v = cfg["voices"][speaker]
            samples, rate = kokoro.create(text, voice=v["voice"], speed=v["speed"], lang="en-us")
            cues.append({"speaker": v.get("label", ""), "text": text, "start": round(pos / rate, 3), "end": round((pos + len(samples)) / rate, 3)})
            pos += len(samples) + int(cfg["pause"] * rate)
            parts.append(samples)
            parts.append(np.zeros(int(cfg["pause"] * rate), dtype=samples.dtype))
        captions.append(cues)
        audio = np.concatenate(parts[:-1])  # drop the trailing pause

        with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
            sf.write(wav.name, audio, rate)
            target = OUT / f"{i:02d}.mp3"
            # Same loudness for every scene, 44.1 kHz mono MP3
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", wav.name, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                 "-ar", "44100", "-ac", "1", "-b:a", "128k", str(target)],
                check=True,
            )
        print(f"{target.relative_to(ROOT)}  {len(audio) / rate:.2f}s")

    (ROOT / "src" / "captions.json").write_text(json.dumps(captions, indent=2, ensure_ascii=False) + "\n")
    print("src/captions.json")


if __name__ == "__main__":
    main()
