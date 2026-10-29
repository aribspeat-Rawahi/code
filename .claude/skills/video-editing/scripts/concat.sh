#!/usr/bin/env bash
# Join clips into one video. Clips may differ in size, fps or audio: each is fitted
# (letterboxed, not stretched) to the first clip's size unless --size is given.
# Usage: concat.sh <output> <clip1> <clip2> [...] [--size 1080x1920] [--fps 30] [--xfade 0.5]
#   --xfade: cross-fade seconds between clips (0 = hard cut)
source "$(dirname "$0")/_lib.sh"
OUT="${1:?Usage: concat.sh <output> <clip1> <clip2> [...] [--size WxH] [--fps N] [--xfade S]}"
shift
CLIPS=(); SIZE=""; FPS=30; XF=0
while [ $# -gt 0 ]; do
  case "$1" in
    --size) SIZE="$2"; shift 2 ;;
    --fps) FPS="$2"; shift 2 ;;
    --xfade) XF="$2"; shift 2 ;;
    *) require_file "$1"; CLIPS+=("$1"); shift ;;
  esac
done
[ ${#CLIPS[@]} -ge 2 ] || die "need at least two clips"
for c in "${CLIPS[@]}"; do [ "$(realpath -m "$c")" != "$(realpath -m "$OUT")" ] || die "output would overwrite $c"; done
mkdir -p "$(dirname "$OUT")"
[ -n "$SIZE" ] || SIZE="$(dims "${CLIPS[0]}")"
W="${SIZE%x*}"; H="${SIZE#*x}"

INPUTS=(); FILTER=""; n=${#CLIPS[@]}
for i in "${!CLIPS[@]}"; do
  c="${CLIPS[$i]}"
  INPUTS+=(-i "$c")
  FILTER+="[$i:v]scale=$W:$H:force_original_aspect_ratio=decrease,pad=$W:$H:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=$FPS,format=yuv420p[v$i];"
  if has_audio "$c"; then
    FILTER+="[$i:a]aformat=sample_rates=48000:channel_layouts=stereo,asetpts=PTS-STARTPTS[a$i];"
  else
    # Silent track so clips without sound still line up
    FILTER+="anullsrc=r=48000:cl=stereo,atrim=duration=$(duration "$c")[a$i];"
  fi
done

if awk "BEGIN{exit !($XF > 0)}"; then
  # Chain xfade/acrossfade; each fade starts XF seconds before the running end
  offset=0; prev_v="v0"; prev_a="a0"
  for ((i = 1; i < n; i++)); do
    d_prev="$(duration "${CLIPS[$((i - 1))]}")"
    offset="$(awk "BEGIN{print $offset + $d_prev - $XF}")"
    FILTER+="[$prev_v][v$i]xfade=transition=fade:duration=$XF:offset=$offset[xv$i];"
    FILTER+="[$prev_a][a$i]acrossfade=d=$XF[xa$i];"
    prev_v="xv$i"; prev_a="xa$i"
  done
  MAP=(-map "[$prev_v]" -map "[$prev_a]")
else
  for ((i = 0; i < n; i++)); do FILTER+="[v$i][a$i]"; done
  FILTER+="concat=n=$n:v=1:a=1[v][a];"
  MAP=(-map "[v]" -map "[a]")
fi

"${FF[@]}" "${INPUTS[@]}" -filter_complex "${FILTER%;}" "${MAP[@]}" "${VCODEC[@]}" "${ACODEC[@]}" "$OUT"
done_msg "$OUT"
