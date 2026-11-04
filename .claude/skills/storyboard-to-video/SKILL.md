---
name: storyboard-to-video
description: Turn a storyboard (one square image + title + narration + optional pop-up labels per scene) into a finished animated explainer/ad film with Remotion — camera moves, labels, particles and effects, transitions, voiceover (Kokoro for English, or any single recording/vidIQ voice for Arabic and other languages, split per scene automatically), mood-based music that ducks under the voice, burned-in captions, cover thumbnail, intro and outro — rendered in 1080x1920 and 1920x1080 and exported for YouTube, Reels/TikTok and WhatsApp with SRT subtitles. Use when the user has (or wants) a scene-by-scene storyboard, AI-generated 3D/cartoon stills, or asks to "make a video from these images/scenes/storyboard".
---

# Storyboard → Video

Scripts: `.claude/skills/storyboard-to-video/scripts/`. Template project: `.claude/skills/storyboard-to-video/template/`.
One project can hold many storyboards; each storyboard becomes two Remotion compositions: `<id>` (1080x1920) and `<id>-landscape` (1920x1080).

## Workflow

1. **Project** (once): `scripts/new-project.sh <dir>` (copies the template, runs `npm ci`).
2. **Images** → `<dir>/public/<folder>/`. Square (1:1), at least ~1250 px, no text baked in that must be translated. Logo (PNG/WebP with transparency). Optional cover thumbnails 16:9 and 9:16.
3. **Storyboard JSON** (format below). Write it with the user: hook in scene 1, problem → turning point → solution → result → call to action in the last scene and outro. Keep each scene's narration to 1–2 sentences (≈4–9 s).
4. **Install**: `python3 scripts/add-storyboard.py <dir> <storyboard.json>` — validates fields, files and label coordinates, and registers the compositions.
5. **Voiceover** (pick one):
   - English, free, offline: `.venv/bin/python scripts/voiceover-kokoro.py <dir> <id> <models-dir>` (setup at the top of the script). One caption per sentence.
   - Any language / any engine (vidIQ ElevenLabs voices incl. Arabic, a human recording): produce **one** file reading all scenes in order, then `python3 scripts/split-voiceover.py <dir> <id> <full.mp3>`. Check the printed table: each scene's end should be within ~0.5 s of its expected end (a `<-- check` mark means listen to that cut). One caption per scene.
   - Paid voices: tell the user the cost before generating (vidIQ: 14 credits per 1000 characters — generate the whole script in one call, never per scene).
6. **Review before the long render**: `scripts/stills.sh <dir> <id>` → `out/review/<id>-vertical.jpg` and `<id>-landscape.jpg`. Look at both sheets: labels must not cover faces, logos or each other, nothing cut at the edges, RTL text right-aligned. Adjust `x`/`y`, `frame.verticalLeft`, `camera`, then re-run `add-storyboard.py` and `stills.sh`.
7. **Render + export**: `scripts/render.sh <dir> <id> [both|vertical|landscape]` → `out/final/<id>-youtube-1920x1080.mp4`, `<id>-reel-1080x1920.mp4`, `<id>-whatsapp.mp4` (< 15 MB), `<id>.srt`, `<id>.txt`. Uses the `video-editing` skill's `export.sh` (-14 LUFS) when present. ~10 min per 90 s film per layout; run in the background and on a live server with `nice -n 19`.
8. **Report**: durations, sizes, loudness; remind the user you cannot hear audio — they must listen to voice and pronunciation (and have a native speaker check non-English scripts).

## Storyboard format

The `//` comments below are explanations only; JSON files must not contain them. A working example is in `template/src/storyboards/example.json`.

```jsonc
{
  "id": "aribs-en",                       // a-z 0-9 - only; becomes the composition name
  "lang": "en",                           // ar/fa/ur/he → right-to-left + Cairo font automatically
  "fonts": { "title": "Fraunces", "body": "Inter" },   // optional: Fraunces, Inter, Cairo
  "brand": { "logo": "aribs/logo.webp", "dark": "#14331d", "mid": "#2c6b3f", "accent": "#66d154", "light": "#e3f6dc" },
  "cover": { "landscape": "aribs/cover-landscape.jpg", "vertical": "aribs/cover-vertical.jpg" },  // optional 1.5 s opening card
  "intro": { "title": "From burden to better soil" },
  "outro": { "headline": "ARIBS Palm Peat — Made in Oman", "subline": "100% natural organic soil improver",
             "contacts": ["WhatsApp / Call: +968 9566 4574", "aribs.net"] },
  "voice": { "voice": "bf_emma", "lang": "en-gb", "speed": 0.95 },  // used by voiceover-kokoro.py
  "scenes": [
    {
      "image": "aribs/scene1.jpg",
      "title": "Old palms, no fruit",
      "voiceover": "What happens to a date palm when it stops giving fruit? For Abu Salim, it was the start of a very hard season.",
      "hook": "phone",                      // phone (default for scene 1) | reveal
      "transitionIn": "fade",               // fade (default scene 1) | circle (default) | slide (use for movement, e.g. vehicles)
      "mood": "tender",                     // tender | hope | uplift → public/music/<mood>.mp3, cross-faded where it changes
      "frame": { "verticalLeft": -220 },    // 9:16 crop: image drawn 1600 px wide; window = 1080 px from -verticalLeft
      "camera": { "origin": "35% 40%", "zoom": 1.12, "drift": -30 },  // slow push towards origin, drift in px
      "labels": [
        { "kind": "thought", "text": "No dates this year…", "x": 0.35, "y": 0.225, "delay": 2.2 },
        { "kind": "tag", "text": "No fruit", "x": 0.65, "y": 0.706, "delay": 3.0, "dot": "#e0513d" }
      ],
      "particles": "leaves"                 // leaves | dust | vanDust (+ "vanDust": {x,y}) | none
    }
  ]
}
```

Labels: `thought` (bubble with dots, down-left), `speech` (`tail`: left|right — point it at the speaker), `tag` (pill with `dot` colour), `sign` (`tone`: road|wood|banner). `x`,`y` = centre as fractions of the image; `delay` in seconds (labels land after the ~0.6 s transition). In RTL, put a directional arrow first with U+200F: `"→‏ إلى المزرعة"`.

Extras per scene: `"thuds": [0.7, 1.0]` (camera shake + thud), `"sfx": [{"name": "horn", "at": 1.8, "volume": 0.25}]` (birds, chime, drop, engine, horn, hum, pop, swoosh, thud, whoosh), `"steam": {x,y}`, `"sparkles": {x,y,w,h}`, `"gauge": {x,y}` (fills 12%→88%). Pops and the transition whoosh are added automatically.

Timing: scene = max(9 s, 1.4 s + voiceover + 0.8 s); 18-frame transitions; intro 3 s; outro 6 s; cover 1.5 s. Python mirror in `scripts/_timeline.py` — keep it in sync with `template/src/story.ts`.

## Rules

- **Rights**: use only images, music and voices the user owns or may use commercially. Template music/SFX are original (synthesized by `scripts/audio.py`), Kokoro is Apache-2.0. Never copy another brand's footage, characters or logos.
- **No claims you can't back**: no invented numbers ("saves 50% water") in narration or labels unless the user supplies the source.
- **Images**: AI stills often contain fake text or watermarks — check every image; fix small defects (e.g. paint out smoke/marks) and keep the original next to it (`*-original.jpg`). Keep faces consistent by generating every scene from one character reference image.
- Re-run `add-storyboard.py` after every JSON edit; re-run the voiceover script after changing any `voiceover` text.
- Never overwrite the user's source files; renders go to `out/`.

## Troubleshooting

- Fonts fail to load (`ERR_CERT_AUTHORITY_INVALID` / timeouts on fonts.gstatic.com): render with a full Chrome/Chromium via `REMOTION_BROWSER=/path/to/chrome`, or give the machine internet access.
- A label sits on a face/logo → move `x`/`y`; cut off in 9:16 → change `frame.verticalLeft` or move the label towards the centre.
- Subject darkened at the left edge in 16:9 → the subject is too far left in the image; regenerate with the subject centred-right, or crop the image.
- Split-voiceover cuts in the wrong place → record clearer pauses (≥0.6 s) between scenes, or record scenes separately and place them at `public/vo/<id>/NN.mp3` with `voFile` + `captions` set by hand.
