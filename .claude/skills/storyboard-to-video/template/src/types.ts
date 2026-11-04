// Storyboard format. One JSON file per film in src/storyboards/ (see the skill's SKILL.md).
// Positions (x, y) are fractions (0–1) of the square scene image.

export type Cue = { text: string; start: number; end: number };

export type Label = {
  kind: "thought" | "speech" | "tag" | "sign";
  text: string;
  x: number;
  y: number;
  delay: number; // seconds into the scene
  dot?: string; // tag dot colour
  tail?: "left" | "right"; // speech tail side (towards the speaker)
  tone?: "road" | "wood" | "banner"; // sign style
};

export type Scene = {
  image: string; // file in public/
  title: string;
  voiceover: string; // narration text (the voiceover script turns it into audio + captions)
  hook?: "phone" | "reveal"; // phone = starts inside a phone screen (good for scene 1)
  transitionIn?: "circle" | "slide" | "fade";
  mood?: "tender" | "hope" | "uplift"; // music section
  frame?: { verticalLeft?: number }; // horizontal crop in the 9:16 frame (px of a 1600 px wide image)
  camera?: { origin?: string; zoom?: number; drift?: number };
  labels?: Label[];
  particles?: "leaves" | "dust" | "vanDust" | "none";
  vanDust?: { x: number; y: number };
  thuds?: number[];
  sfx?: { name: string; at: number; volume: number }[];
  steam?: { x: number; y: number };
  sparkles?: { x: number; y: number; w: number; h: number };
  gauge?: { x: number; y: number };
  // Filled in by the voiceover scripts
  voFile?: string;
  captions?: Cue[];
};

export type Storyboard = {
  id: string;
  lang: string; // "en", "ar", ...
  dir?: "ltr" | "rtl"; // default: rtl for ar/fa/ur/he
  fonts?: { title?: string; body?: string }; // Fraunces, Inter or Cairo
  brand: { logo: string; dark: string; mid: string; accent: string; light: string };
  cover?: { landscape?: string; vertical?: string };
  intro: { title: string };
  outro: { headline: string; subline?: string; contacts?: string[] };
  voice?: Record<string, unknown>; // settings used by the voiceover scripts
  scenes: Scene[];
};
