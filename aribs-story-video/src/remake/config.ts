import captions from "../captions.json";
import { defaultStory } from "../story";

// One entry per scene of the 3D-style remake. Positions (x, y) are fractions of the square still.

export type RemakeLabel = {
  kind: "thought" | "speech" | "tag" | "sign";
  text: string;
  x: number;
  y: number;
  delay: number;
  dot?: string; // tag dot colour
  tail?: "left" | "right"; // speech tail side (towards the speaker)
  tone?: "road" | "wood"; // sign style
};

export type RemakeSceneConfig = {
  index: number; // 0-based scene number: picks voiceover, captions and title
  image: string; // file in public/remake/
  hook: "phone" | "reveal"; // phone = scene starts inside a phone screen; reveal = circle opening from brand green
  frame: { verticalLeft: number }; // horizontal crop of the 1600 px still in the 1080-wide vertical frame
  camera: { origin: string; zoom: number; drift: number };
  labels: RemakeLabel[];
  particles: "leaves" | "dust" | "vanDust" | "none";
  vanDust?: { x: number; y: number }; // where the dust leaves the van (rear wheel), for "vanDust"
  thuds?: number[]; // seconds: camera shake + thud sound
  sfx?: { name: string; at: number; volume: number }[]; // extra sounds, seconds
  // Optional effects, positions as fractions of the still
  steam?: { x: number; y: number }; // chimney steam puffs
  sparkles?: { x: number; y: number; w: number; h: number }; // gold sparkles in a box
  drops?: { x: number; y: number; to: number }; // water drops falling from (x, y) down to y = to
  gauge?: { x: number; y: number }; // water gauge filling 12% → 88%
  music: "tender" | "hope" | "uplift";
};

export const FPS = 30;
export const VO_AT = 42; // voiceover starts 1.4 s into the scene

const voDuration = (index: number) => {
  const cues = (captions as { end: number }[][])[index] ?? [];
  return cues.length ? cues[cues.length - 1].end : 0;
};

/** Scene length: voiceover plus a short tail, never shorter than 9 s. */
export const remakeFrames = (c: RemakeSceneConfig) => Math.max(9 * FPS, VO_AT + Math.ceil(voDuration(c.index) * FPS) + 24);

const L = (i: number) => defaultStory.steps[i].labels;

export const REMAKE_SCENES: RemakeSceneConfig[] = [
  {
    index: 0,
    image: "scene1.jpg",
    hook: "phone",
    frame: { verticalLeft: -220 },
    camera: { origin: "35% 40%", zoom: 1.12, drift: -30 },
    labels: [
      { kind: "thought", text: L(0).bubble ?? "", x: 0.35, y: 0.225, delay: 2.2 },
      { kind: "tag", text: L(0).tags?.[0] ?? "", x: 0.65, y: 0.706, delay: 3.0, dot: "#e0513d" },
    ],
    particles: "leaves",
    music: "tender",
  },
  {
    index: 1,
    image: "scene2.jpg",
    hook: "reveal",
    frame: { verticalLeft: -150 },
    camera: { origin: "25% 45%", zoom: 1.1, drift: 20 },
    labels: [{ kind: "thought", text: L(1).bubble ?? "", x: 0.45, y: 0.27, delay: 2.0 }],
    particles: "dust",
    thuds: [0.7, 1.0, 1.3],
    music: "tender",
  },
  {
    index: 2,
    image: "scene3.jpg",
    hook: "reveal",
    frame: { verticalLeft: -200 },
    // Camera follows the van to the right, towards the waving farmer
    camera: { origin: "55% 60%", zoom: 1.08, drift: -70 },
    labels: [
      { kind: "sign", text: L(2).sign ?? "", x: 0.37, y: 0.18, delay: 1.2 },
      { kind: "speech", text: L(2).bubble ?? "", x: 0.55, y: 0.33, delay: 2.4 },
    ],
    particles: "vanDust",
    vanDust: { x: 0.12, y: 0.74 },
    sfx: [
      { name: "engine", at: 0.1, volume: 0.35 },
      { name: "horn", at: 1.8, volume: 0.25 },
    ],
    music: "hope",
  },
  {
    index: 3,
    image: "scene4.jpg",
    hook: "reveal",
    frame: { verticalLeft: -260 },
    camera: { origin: "42% 46%", zoom: 1.08, drift: 0 },
    labels: [
      { kind: "tag", text: L(3).tags?.[0] ?? "", x: 0.32, y: 0.31, delay: 1.2, dot: "#8b5e34" },
      { kind: "tag", text: L(3).tags?.[1] ?? "", x: 0.7, y: 0.57, delay: 1.6 },
    ],
    particles: "none",
    steam: { x: 0.545, y: 0.2 },
    sparkles: { x: 0.6, y: 0.62, w: 0.3, h: 0.2 },
    sfx: [{ name: "hum", at: 0.4, volume: 0.25 }],
    music: "hope",
  },
  {
    index: 4,
    image: "scene5.jpg",
    hook: "reveal",
    frame: { verticalLeft: -260 },
    camera: { origin: "50% 45%", zoom: 1.1, drift: 0 },
    labels: [
      { kind: "tag", text: L(4).tags?.[0] ?? "", x: 0.32, y: 0.1, delay: 1.2 },
      { kind: "tag", text: L(4).tags?.[1] ?? "", x: 0.68, y: 0.1, delay: 1.5, dot: "#8b5e34" },
    ],
    particles: "dust",
    sparkles: { x: 0.3, y: 0.18, w: 0.4, h: 0.5 },
    sfx: [{ name: "chime", at: 0.5, volume: 0.25 }],
    music: "hope",
  },
  {
    index: 5,
    image: "scene6.jpg",
    hook: "reveal",
    frame: { verticalLeft: -380 },
    camera: { origin: "78% 55%", zoom: 1.08, drift: -30 },
    labels: [
      { kind: "sign", text: L(5).sign ?? "", x: 0.47, y: 0.17, delay: 1.0 },
      { kind: "speech", text: L(5).bubble ?? "", x: 0.74, y: 0.41, delay: 2.2, tail: "right" },
    ],
    particles: "dust",
    sfx: [
      { name: "engine", at: 0.1, volume: 0.3 },
      { name: "horn", at: 1.5, volume: 0.22 },
    ],
    music: "hope",
  },
  {
    index: 6,
    image: "scene7.jpg",
    hook: "reveal",
    frame: { verticalLeft: -260 },
    camera: { origin: "50% 62%", zoom: 1.1, drift: 0 },
    labels: [{ kind: "tag", text: L(6).tags?.[0] ?? "", x: 0.5, y: 0.1, delay: 1.4, dot: "#5aa9e6" }],
    particles: "none",
    // Wet soil glistens; the gauge sits in the open sky on the left
    sparkles: { x: 0.36, y: 0.72, w: 0.38, h: 0.12 },
    gauge: { x: 0.25, y: 0.08 },
    sfx: [0, 1, 2, 3].map((i) => ({ name: "drop", at: 1.4 + i * 0.7, volume: 0.22 })),
    music: "uplift",
  },
  {
    index: 7,
    image: "scene8.jpg",
    hook: "reveal",
    frame: { verticalLeft: -260 },
    camera: { origin: "45% 45%", zoom: 1.1, drift: 0 },
    labels: [{ kind: "sign", text: L(7).sign ?? "", x: 0.3, y: 0.24, delay: 1.2, tone: "wood" }],
    particles: "dust",
    sparkles: { x: 0.36, y: 0.42, w: 0.3, h: 0.14 },
    sfx: [{ name: "birds", at: 1.0, volume: 0.2 }],
    music: "uplift",
  },
];
