---
name: video-editing
description: Edit existing videos with FFmpeg — trim, cut, join clips with cross-fades, reframe 16:9 ↔ 9:16 ↔ 1:1 (crop or blurred background), add background music with auto-ducking under voice, normalize loudness, reduce noise, burn in subtitles (.srt), add a logo watermark, speed up / slow motion, export for Instagram Reels, TikTok, YouTube, WhatsApp (under 15 MB) or the web, and make thumbnails or contact sheets. Use for phone/product/factory footage and for finishing videos rendered with Remotion (animation-video skill).
---

# Video Editing (FFmpeg)

Scripts in `.claude/skills/video-editing/scripts/`. Each one prints `Output: <file> (WxH, duration, size)`.
Outputs go to an `edited/` folder next to the input unless an output path is given. **A script never overwrites its input.**

## Rules

1. **Probe first**: `probe.sh <video> --loudness` — size, orientation, fps, audio, loudness. Base every decision on it.
2. **Never touch the original.** Work on copies in `edited/`; chain steps by feeding one step's output into the next.
3. **Show before the long render**: for anything longer than ~30 s, trim a 5–10 s sample or grab frames with `thumbnail.sh` (single frame or `--sheet 4x3`) and show them to the user first.
4. **Order of steps**: trim → join → reframe → speed → watermark → subtitles → music → export. Export (loudness + platform settings) is always last.
5. **Report** the final file: resolution, duration, size, and loudness (`probe.sh --loudness`, target -14 LUFS for social media).
6. **Music rights**: only use music the user owns or that is royalty-free. Never suggest ripping songs from YouTube/Spotify. The `animation-video` project has original royalty-free stems in `aribs-story-video/public/music/`.
7. **Server load**: encoding is CPU-heavy. On a VPS that also serves a live site, run with `nice -n 19` and avoid `--smooth` slow motion on long clips.
8. Don't burn subtitles into a video that already has burned-in captions (e.g. the Remotion story video).

## Scripts

| Script | What it does | Example |
|---|---|---|
| `probe.sh <video> [--loudness]` | Inspect a file | `probe.sh clip.mp4 --loudness` |
| `trim.sh <video> <start> <end\|end> [out] [--fast]` | Cut a part; `--fast` = no re-encode (keyframe cuts) | `trim.sh clip.mp4 00:00:04.5 12` |
| `concat.sh <out> <clip>... [--size WxH] [--fps 30] [--xfade 0.5]` | Join clips of any size/fps; silent clips get a silent track | `concat.sh edited/all.mp4 a.mp4 b.mp4 --size 1080x1920 --xfade 0.4` |
| `reframe.sh <video> <9:16\|16:9\|1:1\|4:5> [out] [--mode blur\|crop\|pad] [--focus center\|left\|right\|0-1]` | Change aspect ratio | `reframe.sh wide.mp4 9:16 --mode crop --focus 0.3` |
| `audio.sh music <video> <music> [out] [--volume 0.25] [--duck] [--replace] [--fade-in 1] [--fade-out 2] [--music-start S]` | Background music, looped/cut to length; `--duck` dips it under speech (~10 dB) | `audio.sh music talk.mp4 bgm.mp3 --duck` |
| `audio.sh normalize <video> [out] [--target -14]` | Even loudness | |
| `audio.sh denoise <video> [out]` | Reduce wind/hiss/hum from phone recordings | |
| `audio.sh extract <video> [out.mp3]` / `audio.sh mute <video> [out]` | Save sound as MP3 / remove sound | |
| `subtitles.sh <video> <subs.srt> [out] [--style brand\|plain] [--size N] [--top]` | Burn in subtitles; `brand` = white on ARIBS dark green box; vertical videos stay above the bottom 250 px | `subtitles.sh reel.mp4 reel.srt` |
| `watermark.sh <video> <logo> [out] [--pos tr\|tl\|br\|bl\|center] [--size 0.14] [--opacity 0.9]` | Logo overlay (PNG/WebP with transparency); keeps out of Reels/TikTok UI zones | `watermark.sh reel.mp4 logo.png --pos br` |
| `speed.sh <video> <0.25–4> [out] [--smooth]` | Speed change, natural voice pitch; `--smooth` = interpolated slow motion | `speed.sh pour.mp4 0.5 --smooth` |
| `export.sh <video> <reel\|youtube\|whatsapp\|web> [out]` | Platform export, -14 LUFS | `export.sh final.mp4 whatsapp` |
| `thumbnail.sh <video> [out.jpg] [--at 5] [--sheet 4x3]` | Cover frame or review sheet | `thumbnail.sh final.mp4 --sheet 4x3` |

### Export presets

| Preset | Size | Notes |
|---|---|---|
| `reel` | 1080 wide, ≤30 fps | Instagram Reels, TikTok, Facebook. Warns if the video isn't vertical — reframe first |
| `youtube` | source size | CRF 18, AAC 192k |
| `whatsapp` | short side ≤720 | Two-pass to fit under 15 MB; refuses if the clip is too long to look decent (trim it) |
| `web` | short side ≤720 | Small file with fast start, for a `<video>` tag on the website |

## Recipes

**Phone footage → Instagram Reel** (e.g. factory or product clips):
```bash
S=.claude/skills/video-editing/scripts
$S/probe.sh raw/factory1.mp4 --loudness
$S/trim.sh raw/factory1.mp4 3 11 edited/f1.mp4
$S/trim.sh raw/factory2.mp4 0 6 edited/f2.mp4
$S/concat.sh edited/joined.mp4 edited/f1.mp4 edited/f2.mp4 --xfade 0.4
$S/reframe.sh edited/joined.mp4 9:16 edited/vertical.mp4 --mode crop
$S/audio.sh denoise edited/vertical.mp4 edited/clean.mp4
$S/watermark.sh edited/clean.mp4 aribs-logo.png edited/logo.mp4 --pos tr
$S/audio.sh music edited/logo.mp4 music/hope.mp3 edited/music.mp4 --duck --volume 0.3
$S/thumbnail.sh edited/music.mp4 --sheet 4x3      # show the user before exporting
$S/export.sh edited/music.mp4 reel edited/factory-reel.mp4
```

**Remotion render → every platform**:
```bash
S=.claude/skills/video-editing/scripts
$S/export.sh out/aribs-story-vertical.mp4 reel
$S/export.sh out/aribs-story-landscape.mp4 youtube
$S/export.sh out/aribs-story-vertical.mp4 whatsapp
$S/export.sh out/aribs-story-landscape.mp4 web
$S/thumbnail.sh out/aribs-story-landscape.mp4 --at 30
```

## Choosing options

- **Reframe mode**: `crop` when the subject is in one area (use `--focus` to keep it); `blur` when nothing may be cut off (screen recordings, text, wide product shots); `pad` with `--color` for a clean branded border.
- **Music volume**: 0.2–0.3 under speech with `--duck`; 0.5–0.8 for music-only clips (`--replace`).
- **Trim**: default is frame-accurate. Use `--fast` only for rough cuts of long recordings.
- **Rotation**: phone clips with a `rotation` value in `probe.sh` are auto-rotated by FFmpeg during re-encode; `--fast` trims keep the rotation flag.

## Not included

- **Automatic captions (speech-to-text)** need a Whisper model (e.g. whisper.cpp), which is downloaded from HuggingFace — set it up on the VPS or a local machine, then pass the `.srt` it produces to `subtitles.sh`.
- Color grading, stabilization and multi-track timelines: use a desktop editor (DaVinci Resolve, CapCut) for those.

## Troubleshooting

- `Error: ffmpeg not found` → `sudo apt-get install -y ffmpeg` (needs libass for subtitles: `ffmpeg -filters | grep subtitles`).
- Subtitle boxes show squares instead of letters → install fonts on the server: `sudo apt-get install -y fonts-dejavu fonts-noto-core`.
- Out-of-sync audio after `--fast` trim → re-run without `--fast`.
- WhatsApp file still too large → trim the video; 15 MB fits about 1 min at good quality.
