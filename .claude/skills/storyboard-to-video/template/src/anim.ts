import { Easing, interpolate, spring } from "remotion";

// Every helper is a pure function of the frame, so each frame renders the same way every time.

export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Spring from 0 to 1 that starts `delay` seconds into the scene. */
export const pop = (frame: number, fps: number, delay = 0, damping = 16) =>
  spring({ frame: frame - Math.round(delay * fps), fps, config: { damping } });

/** Eased 0 → 1 between two times (seconds). */
export const ease = (frame: number, fps: number, from: number, duration: number) =>
  interpolate(frame / fps, [from, from + duration], [0, 1], { ...CLAMP, easing: Easing.bezier(0.22, 1, 0.36, 1) });

/** Smooth sine wave in [-1, 1] with the given period (seconds). */
export const wave = (frame: number, fps: number, period: number, phase = 0) =>
  Math.sin(((frame / fps) / period + phase) * Math.PI * 2);

/** 0 → 0 → peak → 0, smooth pulse in [0, 1] with the given period (seconds). */
export const pulse = (frame: number, fps: number, period: number) => 0.5 - 0.5 * Math.cos(((frame / fps) / period) * Math.PI * 2);

/**
 * Repeating progress in [0, 1) for a loop of `period` seconds that starts after `delay`
 * and waits `gap` seconds between runs. Returns -1 while waiting.
 */
export const cycle = (time: number, period: number, delay = 0, gap = 0) => {
  const t = time - delay;
  if (t < 0) return -1;
  const local = t % (period + gap);
  return local < period ? local / period : -1;
};

/** SVG transform that scales around (ox, oy). */
export const scaleAt = (s: number, ox: number, oy: number, sy = s) =>
  `translate(${ox} ${oy}) scale(${s} ${sy}) translate(${-ox} ${-oy})`;

export const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
