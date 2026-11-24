#!/usr/bin/env bash
# Sound for a video.
# Usage:
#   audio.sh music <video> <music-file> [output] [--volume 0.25] [--duck] [--replace] [--fade-in 1] [--fade-out 2] [--music-start 0]
#       Add background music (looped/cut to the video length).
#       --duck    : music dips automatically whenever the video's own audio (voice) is loud
#       --replace : drop the video's own sound, keep only the music
#   audio.sh normalize <video> [output] [--target -14]   Even loudness (-14 LUFS = Instagram/YouTube/TikTok)
#   audio.sh denoise <video> [output]                    Reduce hiss/wind/hum in phone recordings
#   audio.sh extract <video> [output.mp3]                Save the sound as MP3
#   audio.sh mute <video> [output]                       Remove all sound
# Only use music you have the rights to (royalty-free or your own).
source "$(dirname "$0")/_lib.sh"
CMD="${1:?Usage: audio.sh music|normalize|denoise|extract|mute <video> ...}"
IN="${2:?missing video}"
shift 2
require_file "$IN"

case "$CMD" in
  music)
    MUSIC="${1:?missing music file}"; shift
    require_file "$MUSIC"
    OUT_ARG=""; VOL=0.25; DUCK=0; REPLACE=0; FI=1; FO=2; MSTART=0
    while [ $# -gt 0 ]; do
      case "$1" in
        --volume) VOL="$2"; shift 2 ;;
        --duck) DUCK=1; shift ;;
        --replace) REPLACE=1; shift ;;
        --fade-in) FI="$2"; shift 2 ;;
        --fade-out) FO="$2"; shift 2 ;;
        --music-start) MSTART="$2"; shift 2 ;;
        *) OUT_ARG="$1"; shift ;;
      esac
    done
    OUT="$(out_path "$IN" music mp4 "$OUT_ARG")"
    D="$(duration "$IN")"
    FOST="$(awk "BEGIN{v=$D-$FO; print (v<0?0:v)}")"
    M="[1:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start=$MSTART,asetpts=PTS-STARTPTS,atrim=duration=$D,volume=$VOL,afade=t=in:d=$FI,afade=t=out:st=$FOST:d=$FO"
    if [ "$REPLACE" = 1 ] || ! has_audio "$IN"; then
      FILTER="$M[a]"
    elif [ "$DUCK" = 1 ]; then
      FILTER="$M[m];[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit[v1][v2];[m][v1]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450[md];[v2][md]amix=inputs=2:duration=first:normalize=0[a]"
    else
      FILTER="$M[m];[0:a]aformat=sample_rates=48000:channel_layouts=stereo[v];[v][m]amix=inputs=2:duration=first:normalize=0[a]"
    fi
    "${FF[@]}" -i "$IN" -stream_loop -1 -i "$MUSIC" -filter_complex "$FILTER" -map 0:v -map "[a]" -c:v copy "${ACODEC[@]}" -shortest "$OUT"
    ;;
  normalize)
    OUT_ARG=""; TARGET=-14
    while [ $# -gt 0 ]; do case "$1" in --target) TARGET="$2"; shift 2 ;; *) OUT_ARG="$1"; shift ;; esac; done
    has_audio "$IN" || die "video has no audio"
    OUT="$(out_path "$IN" loud mp4 "$OUT_ARG")"
    "${FF[@]}" -i "$IN" -map 0:v? -map 0:a -c:v copy -af "loudnorm=I=$TARGET:TP=-1.5:LRA=11" "${ACODEC[@]}" "$OUT"
    ;;
  denoise)
    has_audio "$IN" || die "video has no audio"
    OUT="$(out_path "$IN" clean mp4 "${1:-}")"
    "${FF[@]}" -i "$IN" -map 0:v? -map 0:a -c:v copy -af "highpass=f=80,afftdn=nf=-25,lowpass=f=12000" "${ACODEC[@]}" "$OUT"
    ;;
  extract)
    has_audio "$IN" || die "video has no audio"
    OUT="$(out_path "$IN" audio mp3 "${1:-}")"
    "${FF[@]}" -i "$IN" -vn -c:a libmp3lame -b:a 192k "$OUT"
    ;;
  mute)
    OUT="$(out_path "$IN" muted mp4 "${1:-}")"
    "${FF[@]}" -i "$IN" -map 0:v -c:v copy -an "$OUT"
    ;;
  *) die "unknown command: $CMD (music|normalize|denoise|extract|mute)" ;;
esac
done_msg "$OUT"
