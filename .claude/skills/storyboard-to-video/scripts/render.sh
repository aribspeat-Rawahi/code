#!/usr/bin/env bash
# Render a storyboard's film and export it for every platform.
# Usage: render.sh <project-dir> <storyboard-id> [both|vertical|landscape]
# Output in <project>/out/final/:
#   <id>-youtube-1920x1080.mp4, <id>-reel-1080x1920.mp4, <id>-whatsapp.mp4, <id>.srt, <id>.txt
# Exports use the video-editing skill when it is installed next to this one (-14 LUFS, WhatsApp < 15 MB).
# Set REMOTION_BROWSER=/path/to/chrome to use a system browser. Heavy on CPU: on a live server run with nice -n 19.
set -euo pipefail
P="$(cd "${1:?Usage: render.sh <project-dir> <storyboard-id> [both|vertical|landscape]}" && pwd)"
ID="${2:?missing storyboard id}"
WHICH="${3:-both}"
HERE="$(cd "$(dirname "$0")" && pwd)"
EXPORT="$HERE/../../video-editing/scripts/export.sh"
cd "$P"; mkdir -p out/final

render() { npx remotion render src/index.ts "$1" "out/$1.mp4" --codec=h264 --crf=20 >"out/$1.log" 2>&1 || { tail -20 "out/$1.log"; exit 1; }; echo "Rendered out/$1.mp4"; }

if [ "$WHICH" != vertical ]; then
  render "$ID-landscape"
  if [ -x "$EXPORT" ]; then "$EXPORT" "out/$ID-landscape.mp4" youtube "out/final/$ID-youtube-1920x1080.mp4" 2>&1 | tr "\r" "\n" | grep -E "^(Output|Error)"
  else cp "out/$ID-landscape.mp4" "out/final/$ID-youtube-1920x1080.mp4"; fi
fi
if [ "$WHICH" != landscape ]; then
  render "$ID"
  if [ -x "$EXPORT" ]; then
    "$EXPORT" "out/$ID.mp4" reel "out/final/$ID-reel-1080x1920.mp4" 2>&1 | tr "\r" "\n" | grep -E "^(Output|Error)"
    "$EXPORT" "out/$ID.mp4" whatsapp "out/final/$ID-whatsapp.mp4" 2>&1 | tr "\r" "\n" | grep -E "^(Output|Error)"
  else cp "out/$ID.mp4" "out/final/$ID-reel-1080x1920.mp4"; fi
fi
python3 "$HERE/srt.py" "$P" "$ID"
cp "out/$ID.srt" "out/$ID.txt" out/final/
echo "Done: $P/out/final/"
