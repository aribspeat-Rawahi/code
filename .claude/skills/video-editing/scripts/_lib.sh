#!/usr/bin/env bash
# Shared helpers for the video-editing scripts. Source it, don't run it.
set -euo pipefail

command -v ffmpeg >/dev/null || { echo "Error: ffmpeg not found (sudo apt-get install -y ffmpeg)" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "Error: ffprobe not found" >&2; exit 1; }

die() { echo "Error: $*" >&2; exit 1; }

# H.264 + AAC that plays everywhere (phones, browsers, WhatsApp) and starts streaming fast.
VCODEC=(-c:v libx264 -preset medium -crf "${CRF:-20}" -pix_fmt yuv420p -movflags +faststart)
ACODEC=(-c:a aac -b:a 160k -ar 48000)
FF=(ffmpeg -hide_banner -loglevel error -stats -y)

require_file() { [ -f "$1" ] || die "file not found: $1"; }

# Default output: edited/<name>-<suffix>.<ext> next to the input. Never the input itself.
out_path() {
  local in="$1" suffix="$2" ext="${3:-mp4}" out="${4:-}"
  if [ -z "$out" ]; then
    local dir base
    dir="$(dirname "$in")"
    [ "$(basename "$dir")" = "edited" ] || dir="$dir/edited"
    base="$(basename "${in%.*}")"
    mkdir -p "$dir"
    out="$dir/$base-$suffix.$ext"
  else
    mkdir -p "$(dirname "$out")"
  fi
  [ "$(realpath -m "$out")" != "$(realpath -m "$in")" ] || die "output would overwrite the input: $in"
  echo "$out"
}

duration() { ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$1"; }
has_audio() { [ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1")" ]; }
dims() {
  # WIDTHxHEIGHT of the first video stream (some files add an empty extra field, so build it explicitly)
  local w h
  w="$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=nw=1:nk=1 "$1" | head -1)"
  h="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=nw=1:nk=1 "$1" | head -1)"
  [ -n "$w" ] && [ -n "$h" ] || return 1
  echo "${w}x${h}"
}
fps_of() { ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of default=nw=1:nk=1 "$1"; }

done_msg() {
  local out="$1"
  printf 'Output: %s  (%s, %ss, %s)\n' "$out" "$(dims "$out" 2>/dev/null || echo audio)" \
    "$(printf '%.2f' "$(duration "$out")")" "$(du -h "$out" | cut -f1)"
}
