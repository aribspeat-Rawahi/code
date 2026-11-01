import captions from "../captions.json";
import { defaultStory } from "../story";

// One entry per scene of the 3D-style remake. Positions (x, y) are fractions of the square still.

export type RemakeLabel = { kind: "thought" | "speech" | "tag" | "sign"; text: string; x: number; y: number; delay: number; dot?: string };

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
];
