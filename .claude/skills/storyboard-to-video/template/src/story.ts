import { font } from "./fonts";
import type { Scene, Storyboard } from "./types";

// Timing and defaults shared by every composition.
export const FPS = 30;
export const T = 18; // transition frames
export const COVER = 45; // 1.5 s thumbnail card (only when a cover is set)
export const INTRO = 90;
export const OUTRO = 180;
export const VO_AT = 42; // voiceover starts 1.4 s into each scene

const RTL = new Set(["ar", "fa", "ur", "he"]);

export const textSettings = (sb: Storyboard) => {
  const dir = sb.dir ?? (RTL.has(sb.lang) ? "rtl" : "ltr");
  const rtl = dir === "rtl";
  return {
    dir,
    rtl,
    titleFont: font(sb.fonts?.title ?? (rtl ? "Cairo" : "Fraunces")),
    bodyFont: font(sb.fonts?.body ?? (rtl ? "Cairo" : "Inter")),
  } as const;
};

export const voEnd = (s: Scene) => {
  const c = s.captions ?? [];
  return c.length ? c[c.length - 1].end : 0;
};

/** Scene length: voiceover plus a short tail, never shorter than 9 s. */
export const sceneFrames = (s: Scene) => Math.max(9 * FPS, VO_AT + Math.ceil(voEnd(s) * FPS) + 24);

export const timeline = (sb: Storyboard) => {
  const lens = sb.scenes.map(sceneFrames);
  const cover = sb.cover ? COVER - T : 0;
  const starts: number[] = [];
  let at = cover + INTRO - T;
  for (const len of lens) {
    starts.push(at);
    at += len - T;
  }
  return { lens, starts, outroStart: at, total: at + OUTRO };
};
