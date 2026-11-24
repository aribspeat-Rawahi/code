#!/usr/bin/env bash
# Final export for a platform.
# Usage: export.sh <video> <reel|youtube|whatsapp|web> [output]
#   reel     : Instagram Reels / TikTok / Facebook. 1080 wide, ≤30 fps, -14 LUFS
#   youtube  : same size as the source, high quality, -14 LUFS
#   whatsapp : fits under 15 MB (two-pass), 720p, for sending directly in chats/Status
#   web      : small file for a website <video> tag, 720p, fast start
source "$(dirname "$0")/_lib.sh"
IN="${1:?Usage: export.sh <video> <reel|youtube|whatsapp|web> [output]}"
PRESET="${2:?missing preset: reel|youtube|whatsapp|web}"
require_file "$IN"
OUT="$(out_path "$IN" "$PRESET" mp4 "${3:-}")"
WH="$(dims "$IN")"; W="${WH%x*}"; H="${WH#*x}"
LOUD=(); has_audio "$IN" && LOUD=(-af "loudnorm=I=-14:TP=-1.5:LRA=11")
# Scale so the short side is at most N px (never upscale)
short_side() { echo "scale='if(gt(iw,ih),-2,min($1,iw))':'if(gt(iw,ih),min($1,ih),-2)',fps='min(30,source_fps)'"; }
X264=(-c:v libx264 -preset medium -pix_fmt yuv420p -movflags +faststart)

case "$PRESET" in
  reel)
    [ "$H" -gt "$W" ] || echo "Warning: video is not vertical; run reframe.sh <video> 9:16 first for a full-screen reel" >&2
    "${FF[@]}" -i "$IN" -vf "scale=1080:-2,fps='min(30,source_fps)'" "${X264[@]}" -crf 21 -maxrate 10M -bufsize 20M "${LOUD[@]}" -c:a aac -b:a 128k -ar 48000 "$OUT"
    ;;
  youtube)
    "${FF[@]}" -i "$IN" "${X264[@]}" -crf 18 "${LOUD[@]}" -c:a aac -b:a 192k -ar 48000 "$OUT"
    ;;
  web)
    "${FF[@]}" -i "$IN" -vf "$(short_side 720)" "${X264[@]}" -crf 26 "${LOUD[@]}" -c:a aac -b:a 96k -ar 48000 "$OUT"
    ;;
  whatsapp)
    D="$(duration "$IN")"
    # 15 MB budget minus 96 kb/s audio, capped at 2.5 Mb/s
    VB="$(awk "BEGIN{b=int(15*8192/$D - 96); if (b>2500) b=2500; print b}")"
    [ "$VB" -ge 250 ] || die "video is too long for 15 MB (${D}s); trim it or send as a document"
    PASSLOG="$(mktemp -d)/pass"
    "${FF[@]}" -i "$IN" -vf "$(short_side 720)" "${X264[@]}" -b:v "${VB}k" -pass 1 -passlogfile "$PASSLOG" -an -f mp4 /dev/null
    "${FF[@]}" -i "$IN" -vf "$(short_side 720)" "${X264[@]}" -b:v "${VB}k" -pass 2 -passlogfile "$PASSLOG" "${LOUD[@]}" -c:a aac -b:a 96k -ar 48000 "$OUT"
    rm -rf "$(dirname "$PASSLOG")"
    ;;
  *) die "unknown preset: $PRESET (reel|youtube|whatsapp|web)" ;;
esac
done_msg "$OUT"
