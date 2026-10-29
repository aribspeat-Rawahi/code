#!/usr/bin/env bash
# Cut out one part of a video.
# Usage: trim.sh <video> <start> <end> [output] [--fast]
#   start/end: seconds (12.5) or timestamps (00:01:05.200). end may be "end".
#   --fast: no re-encode (instant, but cuts snap to the nearest keyframe)
source "$(dirname "$0")/_lib.sh"
IN="${1:?Usage: trim.sh <video> <start> <end> [output] [--fast]}"
START="${2:?missing start}"
END="${3:?missing end}"
shift 3
OUT_ARG=""; FAST=0
for a in "$@"; do case "$a" in --fast) FAST=1 ;; *) OUT_ARG="$a" ;; esac; done
require_file "$IN"
OUT="$(out_path "$IN" trim mp4 "$OUT_ARG")"

TO=(); [ "$END" = "end" ] || TO=(-to "$END")
if [ "$FAST" = 1 ]; then
  "${FF[@]}" -ss "$START" "${TO[@]}" -i "$IN" -c copy -avoid_negative_ts make_zero "$OUT"
else
  # -ss/-to after -i = frame-accurate
  "${FF[@]}" -i "$IN" -ss "$START" "${TO[@]}" "${VCODEC[@]}" "${ACODEC[@]}" "$OUT"
fi
done_msg "$OUT"
