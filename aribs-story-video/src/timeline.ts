import type { StoryProps } from "./story";

export const FPS = 30;
export const TRANSITION = 18; // frames per scene transition
export const INTRO = 3 * FPS;
export const OUTRO = 6 * FPS;
export const SCENE = Math.round(5.5 * FPS);
export const VO_START = TRANSITION + 6; // voiceover starts once the scene is fully in
const VO_TAIL = Math.round(0.8 * FPS);

// Every sequence except the outro also covers the transition into the next one,
// so each part stays on screen for its full length.
export const getTimeline = (props: StoryProps) => {
  const scenes = props.steps.map((_, i) => {
    const vo = props.voiceover ? props.voDurations?.[i] : null;
    const visible = vo ? Math.max(SCENE, VO_START - TRANSITION + Math.ceil(vo * FPS) + VO_TAIL) : SCENE;
    return visible + TRANSITION;
  });
  const intro = INTRO + TRANSITION;
  const total = intro + scenes.reduce((a, b) => a + b, 0) + OUTRO - TRANSITION * (scenes.length + 1);
  // Absolute frame where each scene (and the outro) starts entering
  const starts: number[] = [];
  let at = intro - TRANSITION;
  for (const len of scenes) {
    starts.push(at);
    at += len - TRANSITION;
  }
  return { intro, scenes, outro: OUTRO, total, starts, outroStart: at };
};
