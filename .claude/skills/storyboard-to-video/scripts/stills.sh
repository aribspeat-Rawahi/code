#!/usr/bin/env bash
# Review a storyboard before the long render: one still per scene (after its labels are in),
# plus intro and outro, in both layouts, tiled into two contact sheets.
# Usage: stills.sh <project-dir> <storyboard-id>
# Output: <project>/out/review/<id>-vertical.jpg and <id>-landscape.jpg
set -euo pipefail
P="$(cd "${1:?Usage: stills.sh <project-dir> <storyboard-id>}" && pwd)"
ID="${2:?missing storyboard id}"
HERE="$(cd "$(dirname "$0")" && pwd)"
FRAMES=$(python3 -I - "$P/src/storyboards/$ID.json" "$HERE" <<'PY'
import json, sys
sys.path.insert(0, sys.argv[2])
from _timeline import INTRO, timeline
sb = json.load(open(sys.argv[1], encoding="utf-8"))
tl = timeline(sb)
intro = tl["starts"][0] - INTRO // 2
print(" ".join(str(f) for f in [intro] + [s + 150 for s in tl["starts"]] + [tl["total"] - 10]))
PY
)
N=$(echo "$FRAMES" | wc -w)
COLS=$(( N < 6 ? N : 6 )); ROWS=$(( (N + COLS - 1) / COLS ))
cd "$P"
for layout in vertical landscape; do
  COMP="$ID"; [ "$layout" = landscape ] && COMP="$ID-landscape"
  D="out/review/$COMP"; rm -rf "$D"; mkdir -p "$D"
  node scripts/stills.mjs "$COMP" "$D" $FRAMES >/dev/null
  W=360; [ "$layout" = landscape ] && W=480
  ffmpeg -hide_banner -loglevel error -y -framerate 1 -i "$D/%02d.png" -vf "scale=$W:-2,tile=${COLS}x${ROWS}:padding=6:color=white" -frames:v 1 "out/review/$ID-$layout.jpg"
  echo "Sheet: $P/out/review/$ID-$layout.jpg"
done
