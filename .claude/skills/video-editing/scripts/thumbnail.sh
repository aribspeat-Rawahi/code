#!/usr/bin/env bash
# Grab a still frame, or a contact sheet to review a whole video at a glance.
# Usage: thumbnail.sh <video> [output.jpg] [--at 5] [--sheet 3x3]
#   --at    : time in seconds or HH:MM:SS (default: 1/3 into the video)
#   --sheet : grid of evenly spaced frames instead of one frame
source "$(dirname "$0")/_lib.sh"
IN="${1:?Usage: thumbnail.sh <video> [output.jpg] [--at T] [--sheet CxR]}"
shift
OUT_ARG=""; AT=""; SHEET=""
while [ $# -gt 0 ]; do
  case "$1" in
    --at) AT="$2"; shift 2 ;;
    --sheet) SHEET="$2"; shift 2 ;;
    *) OUT_ARG="$1"; shift ;;
  esac
done
require_file "$IN"
D="$(duration "$IN")"
if [ -n "$SHEET" ]; then
  C="${SHEET%x*}"; R="${SHEET#*x}"; N=$((C * R))
  OUT="$(out_path "$IN" "sheet-$SHEET" jpg "$OUT_ARG")"
  # One frame every D/N seconds, starting half a step in
  "${FF[@]}" -ss "$(awk "BEGIN{print $D/$N/2}")" -i "$IN" -vf "fps=$N/$D,scale=480:-2,tile=${C}x${R}:padding=6:margin=6:color=white" -frames:v 1 -q:v 3 "$OUT"
else
  AT="${AT:-$(awk "BEGIN{print $D/3}")}"
  OUT="$(out_path "$IN" thumb jpg "$OUT_ARG")"
  "${FF[@]}" -ss "$AT" -i "$IN" -frames:v 1 -q:v 2 "$OUT"
fi
echo "Output: $OUT ($(dims "$OUT"), $(du -h "$OUT" | cut -f1))"
