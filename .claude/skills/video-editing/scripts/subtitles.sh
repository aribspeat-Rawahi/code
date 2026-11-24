#!/usr/bin/env bash
# Burn subtitles (.srt or .ass) into the picture, readable on a phone with the sound off.
# Usage: subtitles.sh <video> <subs.srt> [output] [--style brand|plain] [--size N] [--top]
#   brand : white bold text on a dark green box (ARIBS forest #14331d)
#   plain : white text with a black outline
#   --size: font size in subtitle units (default 10 for vertical, 14 for landscape)
#   --top : place at the top instead of the bottom
# Vertical videos keep the text above the bottom 250 px reserved by Reels/TikTok buttons.
source "$(dirname "$0")/_lib.sh"
IN="${1:?Usage: subtitles.sh <video> <subs.srt> [output] [--style brand|plain] [--size N] [--top]}"
SUBS="${2:?missing subtitle file}"
shift 2
OUT_ARG=""; STYLE=brand; SIZE=""; ALIGN=2
while [ $# -gt 0 ]; do
  case "$1" in
    --style) STYLE="$2"; shift 2 ;;
    --size) SIZE="$2"; shift 2 ;;
    --top) ALIGN=8; shift ;;
    *) OUT_ARG="$1"; shift ;;
  esac
done
require_file "$IN"; require_file "$SUBS"
OUT="$(out_path "$IN" subs mp4 "$OUT_ARG")"

WH="$(dims "$IN")"; W="${WH%x*}"; H="${WH#*x}"
if [ "$H" -gt "$W" ]; then SIZE="${SIZE:-10}"; MARGIN=40; else SIZE="${SIZE:-14}"; MARGIN=18; fi
case "$STYLE" in
  # ASS colours are &HAABBGGRR; with BorderStyle=3 the box takes OutlineColour
  brand) FS="FontName=DejaVu Sans,Bold=1,Fontsize=$SIZE,PrimaryColour=&H00FFFFFF,OutlineColour=&H201D3314,BackColour=&H201D3314,BorderStyle=3,Outline=1,Shadow=0,Alignment=$ALIGN,MarginV=$MARGIN,MarginL=20,MarginR=20" ;;
  plain) FS="FontName=DejaVu Sans,Bold=1,Fontsize=$SIZE,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1.5,Shadow=0,Alignment=$ALIGN,MarginV=$MARGIN" ;;
  *) die "unknown --style $STYLE (brand|plain)" ;;
esac

# Copy to a plain path: the subtitles filter needs special escaping for ':' and quotes
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
EXT="${SUBS##*.}"; cp "$SUBS" "$TMP/subs.$EXT"
"${FF[@]}" -i "$IN" -vf "subtitles=$TMP/subs.$EXT:force_style='$FS'" -map 0:v -map "0:a?" "${VCODEC[@]}" -c:a copy "$OUT"
done_msg "$OUT"
