#!/usr/bin/env bash
# Put a logo on the video.
# Usage: watermark.sh <video> <logo.png|webp> [output] [--pos tr|tl|br|bl|center] [--size 0.14] [--opacity 0.9] [--margin 0.03]
#   --size   : logo width as a fraction of the video width
#   --margin : distance from the edges as a fraction of the video width
source "$(dirname "$0")/_lib.sh"
IN="${1:?Usage: watermark.sh <video> <logo> [output] [--pos tr|tl|br|bl|center] [--size F] [--opacity F] [--margin F]}"
LOGO="${2:?missing logo file}"
shift 2
OUT_ARG=""; POS=tr; SIZE=0.14; OP=0.9; MARGIN=0.03
while [ $# -gt 0 ]; do
  case "$1" in
    --pos) POS="$2"; shift 2 ;;
    --size) SIZE="$2"; shift 2 ;;
    --opacity) OP="$2"; shift 2 ;;
    --margin) MARGIN="$2"; shift 2 ;;
    *) OUT_ARG="$1"; shift ;;
  esac
done
require_file "$IN"; require_file "$LOGO"
OUT="$(out_path "$IN" logo mp4 "$OUT_ARG")"
WH="$(dims "$IN")"; W="${WH%x*}"; H="${WH#*x}"
LW="$(awk "BEGIN{print int($W*$SIZE/2)*2}")"
M="$(awk "BEGIN{print int($W*$MARGIN)}")"
# Vertical videos: keep clear of the top 120 px and bottom 250 px app overlays
TOPM=$M; BOTM=$M
if [ "$H" -gt "$W" ]; then TOPM=$(( M > 120 ? M : 120 )); BOTM=$(( M > 250 ? M : 250 )); fi
case "$POS" in
  tl) XY="$M:$TOPM" ;;
  tr) XY="W-w-$M:$TOPM" ;;
  bl) XY="$M:H-h-$BOTM" ;;
  br) XY="W-w-$M:H-h-$BOTM" ;;
  center) XY="(W-w)/2:(H-h)/2" ;;
  *) die "unknown --pos $POS (tl|tr|bl|br|center)" ;;
esac
"${FF[@]}" -i "$IN" -i "$LOGO" -filter_complex "[1:v]scale=$LW:-1,format=rgba,colorchannelmixer=aa=$OP[lg];[0:v][lg]overlay=$XY:format=auto,format=yuv420p[v]" \
  -map "[v]" -map "0:a?" "${VCODEC[@]}" -c:a copy "$OUT"
done_msg "$OUT"
