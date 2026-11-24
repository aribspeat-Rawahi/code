#!/usr/bin/env bash
# Change aspect ratio: landscape → reel, reel → YouTube, square feed, etc.
# Usage: reframe.sh <video> <9:16|16:9|1:1|4:5> [output] [--mode crop|blur|pad] [--focus center|left|right|0.0-1.0] [--width 1080]
#   crop : fill the frame, cut the sides (or top/bottom). --focus picks which part stays.
#   blur : whole video fits, blurred copy fills the empty space (default, nothing lost)
#   pad  : whole video fits on a solid background (--color, default black)
source "$(dirname "$0")/_lib.sh"
IN="${1:?Usage: reframe.sh <video> <ratio> [output] [--mode crop|blur|pad] [--focus F] [--width W]}"
RATIO="${2:?missing ratio, e.g. 9:16}"
shift 2
OUT_ARG=""; MODE=blur; FOCUS=center; COLOR=black; WIDTH=""
while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="$2"; shift 2 ;;
    --focus) FOCUS="$2"; shift 2 ;;
    --color) COLOR="$2"; shift 2 ;;
    --width) WIDTH="$2"; shift 2 ;;
    *) OUT_ARG="$1"; shift ;;
  esac
done
require_file "$IN"
RW="${RATIO%:*}"; RH="${RATIO#*:}"
[[ "$RW" =~ ^[0-9]+$ && "$RH" =~ ^[0-9]+$ ]] || die "ratio must look like 9:16"
case "$FOCUS" in center) F=0.5 ;; left|top) F=0 ;; right|bottom) F=1 ;; *) F="$FOCUS" ;; esac
# Default: 1080 on the short side (1080x1920, 1920x1080, 1080x1080, 1080x1350)
if [ -z "$WIDTH" ]; then
  if [ "$RW" -le "$RH" ]; then WIDTH=1080; else WIDTH=$((1080 * RW / RH)); fi
fi
W=$(( WIDTH / 2 * 2 )); H=$(( (WIDTH * RH / RW) / 2 * 2 ))
OUT="$(out_path "$IN" "${RW}x${RH}-$MODE" mp4 "$OUT_ARG")"

case "$MODE" in
  crop) VF="scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H:(iw-ow)*$F:(ih-oh)*$F,setsar=1" ;;
  pad) VF="scale=$W:$H:force_original_aspect_ratio=decrease,pad=$W:$H:(ow-iw)/2:(oh-ih)/2:color=$COLOR,setsar=1" ;;
  blur) VF="split[a][b];[a]scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,gblur=sigma=40,eq=brightness=-0.08[bg];[b]scale=$W:$H:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1" ;;
  *) die "unknown --mode $MODE (crop|blur|pad)" ;;
esac
AUDIO=(-an); has_audio "$IN" && AUDIO=("${ACODEC[@]}")
"${FF[@]}" -i "$IN" -filter_complex "[0:v]$VF[v]" -map "[v]" -map "0:a?" "${VCODEC[@]}" "${AUDIO[@]}" "$OUT"
done_msg "$OUT"
