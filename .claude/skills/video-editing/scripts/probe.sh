#!/usr/bin/env bash
# Show what a video is before editing it.
# Usage: probe.sh <video> [--loudness]
source "$(dirname "$0")/_lib.sh"
IN="${1:?Usage: probe.sh <video> [--loudness]}"
require_file "$IN"

PROBE_JSON="$(ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_type,codec_name,width,height,avg_frame_rate,sample_rate,channels:stream_side_data=rotation -of json "$IN")" \
  PROBE_FILE="$IN" python3 - <<'PY'
import json
import os

d = json.loads(os.environ["PROBE_JSON"])
f = d["format"]
print("File      : %s" % os.environ["PROBE_FILE"])
print("Duration  : %.2fs   Size: %.1f MB   Bitrate: %.0f kb/s" % (float(f["duration"]), int(f["size"]) / 1e6, int(f.get("bit_rate", 0)) / 1e3))
for s in d["streams"]:
    if s["codec_type"] == "video":
        num, _, den = s.get("avg_frame_rate", "0/1").partition("/")
        fps = float(num) / float(den) if float(den or 0) else 0.0
        rot = next((x["rotation"] for x in s.get("side_data_list", []) if "rotation" in x), None)
        w, h = s["width"], s["height"]
        shape = "vertical" if h > w else "square" if h == w else "landscape"
        print("Video     : %s %dx%d (%s) %.2f fps%s" % (s["codec_name"], w, h, shape, fps, "  rotation %s" % rot if rot else ""))
    elif s["codec_type"] == "audio":
        print("Audio     : %s %s Hz, %s ch" % (s["codec_name"], s.get("sample_rate"), s.get("channels")))
if not any(s["codec_type"] == "audio" for s in d["streams"]):
    print("Audio     : none")
PY

if [ "${2:-}" = "--loudness" ] && has_audio "$IN"; then
  ffmpeg -hide_banner -nostats -i "$IN" -af ebur128=framelog=quiet -f null - 2>&1 |
    awk '/Integrated loudness/{f=1} f&&/I:/{printf "Loudness  : %s %s (social media target -14 LUFS)\n",$2,$3; exit}'
fi
