# ARIBS Palm-to-Peat story video

Animated explainer (Remotion 4, TypeScript) of the ARIBS palm-to-peat story.
Kept outside the website repo on purpose: Remotion packages must not end up in the Hostinger build.

The drawings are ported from `aribs_Website` (`components/story/StoryArt.tsx`, `StoryLabels.tsx`, text from `lib/site.ts`),
same 400 × 400 viewBox, with every animation rewritten on `useCurrentFrame()` / `interpolate()` / `spring()`.

## Compositions

| id | size | use |
|---|---|---|
| `StoryLandscape` | 1920×1080, 30 fps | website, YouTube |
| `StoryVertical` | 1080×1920, 30 fps | Reels, TikTok, WhatsApp Status (120 px top / 250 px bottom safe area) |

About 58.5 s: intro 3 s, 9 scenes × 5.5 s, outro 6 s, 18-frame transitions
(circle reveal; slide after scenes 3 and 5).

## Commands

```bash
npm install
npm run dev               # Remotion Studio, edit text in the props panel
npm run stills            # one PNG per scene for both layouts → out/stills/
npm run render            # both MP4s → out/
```

To use an existing Chrome/Chromium instead of Remotion's download: `REMOTION_BROWSER=/path/to/chrome npm run render`.

## Editing

- All words: `src/story.ts` (zod schema, editable in Studio).
- Label positions: `src/art/Labels.tsx`. Drawings: `src/art/scenes.tsx`, farmer: `src/art/Farmer.tsx`.
- Layout boxes and font sizes: `src/components/layout.ts`. Timing: `src/timeline.ts`.

## Audio and captions

Every sound is original: voices from Kokoro TTS (Apache-2.0), music and effects synthesized in code, so the video is royalty-free.

- **Voiceover**: `public/vo/01.mp3` … `09.mp3`. Dialogue (narrator, farmer Abu Salim, ARIBS driver) in `scripts/voiceover.json`;
  regenerate with `scripts/voiceover.py` (setup at the top of the script). It also writes the caption timings to `src/captions.json`.
  Each scene lasts at least as long as its voiceover (`calculateMetadata`). A recorded human voice in the same files works the same way.
- **Music**: `public/music/tender.mp3` (A minor, intro to scene 2), `hope.mp3` (C major, scenes 3–6), `uplift.mp3` (scenes 7–9, outro),
  cross-faded at the turning points and ducked under the voice. Fade in 1 s, out 2 s. Props: `music.enabled`, `music.volume`.
- **Sound effects**: `public/sfx/` (whoosh/swoosh on transitions, pops for labels, trunk thuds, van engine and horn, factory hum,
  water drops, birds, chimes). Props: `sfx.enabled`, `sfx.volume`. Cues per scene in `src/components/Soundtrack.tsx`.
- Regenerate music and effects: `python3 scripts/audio.py` (needs numpy, soundfile, ffmpeg).
- **Captions**: burned in under the scene text (`captions` prop). `npm run transcript` writes `transcript/aribs-story.srt`
  (for YouTube/Facebook upload) and `transcript/aribs-story.txt`.

Fonts (Fraunces 600, Inter 400/600) load from Google Fonts at render time, so the render machine needs internet access.
