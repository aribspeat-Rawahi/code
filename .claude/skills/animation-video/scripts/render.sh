#!/usr/bin/env bash
# Render a Remotion composition to MP4 (or a single PNG still with --still).
# Usage:
#   render.sh <project-dir> <composition-id> [props.json] [--still <frame>]
# Env:
#   REMOTION_BROWSER  path to a Chrome/Chromium binary (skips Remotion's own download)
#   CONCURRENCY       render threads (default: Remotion picks)
set -euo pipefail

PROJECT_DIR="${1:?Usage: render.sh <project-dir> <composition-id> [props.json] [--still <frame>]}"
COMP_ID="${2:?Missing composition id, e.g. ProductPromoReel}"
shift 2

PROPS_FILE=""
STILL_FRAME=""
while [ $# -gt 0 ]; do
  case "$1" in
    --still) STILL_FRAME="${2:?--still needs a frame number}"; shift 2 ;;
    *) PROPS_FILE="$(realpath "$1")"; shift ;;
  esac
done

cd "$PROJECT_DIR"
mkdir -p out

ARGS=()
[ -n "$PROPS_FILE" ] && ARGS+=("--props=$PROPS_FILE")
[ -n "${REMOTION_BROWSER:-}" ] && ARGS+=("--browser-executable=$REMOTION_BROWSER")
[ -n "${CONCURRENCY:-}" ] && ARGS+=("--concurrency=$CONCURRENCY")

STAMP="$(date +%Y%m%d-%H%M%S)"
if [ -n "$STILL_FRAME" ]; then
  OUT="out/${COMP_ID}-frame${STILL_FRAME}-${STAMP}.png"
  npx remotion still src/index.ts "$COMP_ID" "$OUT" --frame="$STILL_FRAME" ${ARGS[@]+"${ARGS[@]}"}
else
  OUT="out/${COMP_ID}-${STAMP}.mp4"
  npx remotion render src/index.ts "$COMP_ID" "$OUT" --codec=h264 --crf=20 ${ARGS[@]+"${ARGS[@]}"}
fi

echo "Output: $PROJECT_DIR/$OUT"
