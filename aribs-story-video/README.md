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

## Audio (optional)

- Background music: put a royalty-free track at `public/music.mp3` (`music.enabled` prop). Fades in over 1 s, out over the last 2 s.
- Voiceover: `public/vo/01.mp3` … `09.mp3` (included). Dialogue lives in `scripts/voiceover.json`
  (narrator, farmer Abu Salim, ARIBS driver); regenerate with Kokoro TTS (Apache-2.0) via `scripts/voiceover.py`
  (setup steps at the top of the script). For the final ad, a recorded human voice in the same files works the same way.
  When present, each scene lasts at least as long as its voiceover
  (detected in `calculateMetadata`). Without files the video renders silently.

Fonts (Fraunces 600, Inter 400/600) load from Google Fonts at render time, so the render machine needs internet access.
