#!/usr/bin/env bash
# Speed up or slow down (0.25x to 4x). Voice pitch stays natural.
# Usage: speed.sh <video> <factor> [output] [--smooth]
#   factor 2 = twice as fast, 0.5 = half speed (slow motion)
#   --smooth: interpolate new frames for smoother slow motion (much slower to render)
source "$(dirname "$0")/_lib.sh"
IN="${1:?Usage: speed.sh <video> <factor> [output] [--smooth]}"
FACTOR="${2:?missing factor, e.g. 0.5 or 2}"
shift 2
OUT_ARG=""; SMOOTH=0
for a in "$@"; do case "$a" in --smooth) SMOOTH=1 ;; *) OUT_ARG="$a" ;; esac; done
require_file "$IN"
awk "BEGIN{exit !($FACTOR >= 0.25 && $FACTOR <= 4)}" || die "factor must be between 0.25 and 4"
OUT="$(out_path "$IN" "x$FACTOR" mp4 "$OUT_ARG")"

VF="setpts=PTS/$FACTOR"
if [ "$SMOOTH" = 1 ]; then VF+=",minterpolate=fps=$(fps_of "$IN"):mi_mode=mci"; fi
# atempo works in 0.5..2 steps, so chain it for bigger changes
ATEMPO="$(awk "BEGIN{f=$FACTOR; s=\"\"; while (f>2) {s=s\"atempo=2,\"; f/=2} while (f<0.5) {s=s\"atempo=0.5,\"; f/=0.5} printf \"%satempo=%.4f\", s, f}")"
if has_audio "$IN"; then
  "${FF[@]}" -i "$IN" -filter_complex "[0:v]$VF[v];[0:a]$ATEMPO[a]" -map "[v]" -map "[a]" "${VCODEC[@]}" "${ACODEC[@]}" "$OUT"
else
  "${FF[@]}" -i "$IN" -vf "$VF" "${VCODEC[@]}" -an "$OUT"
fi
done_msg "$OUT"
