---
name: ai-video-prompts
description: Write shot-by-shot prompts for AI video generators — Google Flow (Veo), OpenArt, Kling, Runway, Hailuo/MiniMax, vidIQ generate_video — from a storyboard or scene stills, with character consistency, camera language and clean hand-off to the storyboard-to-video skill (which adds voiceover, captions, logo, music and exports). Use when the user wants moving characters / real motion instead of animated stills, or asks for prompts for Flow, Veo, OpenArt, Kling, Runway or similar.
---

# AI Video Prompts

The generators make the **motion**; the `storyboard-to-video` skill makes the **finished ad** (voiceover, captions, brand text, logo, music, transitions, exports). Keep that split: never ask the generator for text, logos, prices or narration.

## Pick the mode (best consistency first)

1. **Image → video (start frame)** — Flow "Frames to Video", OpenArt/Kling/Runway "image to video", vidIQ `startFrameB64`. Use the approved scene still as the first frame: the character, logo and set stay exactly as approved. Default choice when stills exist.
2. **Start + end frame** — when the shot must land on a specific pose (e.g. the farmer turning to wave). Make the end frame from the same still (edit/inpaint) so nothing else changes.
3. **Ingredients / reference images** — Flow "Ingredients to Video", OpenArt character reference, vidIQ `ingredients`: give the same 1–3 character reference images to every shot. Use when there is no still for a shot.
4. **Text only** — establishing shots without the main character.

## Prompt formula (one shot = one prompt, 5–8 s)

```
[Shot & camera] + [Subject + action, beat by beat] + [Setting & light] + [Style lock] + [Audio] + [Avoid]
```

- **Shot & camera**: one move per shot — slow push-in, gentle dolly left→right, orbit 20°, crane up, handheld subtle, static locked-off. Name the lens feel (wide, medium, close-up).
- **Subject + action**: 1–2 actions with timing ("first looks up at the palm, then sighs and lowers his head"). Small, readable gestures; AI breaks on fast or complex action.
- **Style lock** (paste into every prompt of a film): e.g. `3D animated cartoon film style, soft clay-like materials, warm cinematic golden-hour light, same character design as the reference`.
- **Audio** (Veo/Flow and others that make sound): `ambient sound only: wind, birds; no dialogue, no music` — the voiceover and music are added later; the storyboard-to-video skill plays clips muted anyway.
- **Avoid**: `no text, no captions, no new logos, no extra people, no morphing, keep the face and outfit identical`.
- Write the subject's **visual identity in the same words every time** (a "character sheet" line), e.g. `Abu Salim: Omani man in his 40s, short dark beard, white dishdasha with tassel, cream embroidered kumma cap, brown sandals`.

## Output to the user

For each scene: mode, aspect ratio (make 16:9 **and** 9:16 only if the subject fits both; otherwise 16:9 with the subject centred), duration, start/end frame file, the prompt in a copyable block, and 1–2 "if it fails" fixes (simplify the action, lock the camera, shorten to 5 s).

## After generation

1. Save clips as `public/<folder>/sceneNN.mp4`, check each for warped hands/faces, flicker, fake text — regenerate only the bad ones.
2. In the storyboard set `"video": "<folder>/sceneNN.mp4"` on those scenes (keep `"image"` as poster); clips loop if shorter than the scene, so make them ≥ the scene length or keep the narration short.
3. Run `stills.sh`, then `render.sh` from the storyboard-to-video skill.

## Cost and rights

- Paid generators (vidIQ credits, Flow/OpenArt plans): state the cost before generating and get a yes per batch; generate one test shot before a whole film.
- Use only the user's own characters, products and references; never imitate another brand's characters, ads or logos.
