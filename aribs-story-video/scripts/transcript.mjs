// Writes transcript/aribs-story.srt (subtitles for upload) and transcript/aribs-story.txt
// from src/captions.json, using the same scene timing as the video.
// Usage: node scripts/transcript.mjs
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { selectComposition } from "@remotion/renderer";

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "StoryLandscape", browserExecutable: process.env.REMOTION_BROWSER || null });
const { fps, props } = composition;
const captions = JSON.parse(fs.readFileSync("src/captions.json", "utf8"));

// Mirror of getTimeline() in src/timeline.ts
const T = 18;
const VO_START = T + 6;
let start = 3 * fps + T - T;
const cues = [];
props.steps.forEach((_, i) => {
  const vo = props.voiceover ? props.voDurations?.[i] : null;
  const base = Math.round(5.5 * fps);
  const len = (vo ? Math.max(base, 6 + Math.ceil(vo * fps) + Math.round(0.8 * fps)) : base) + T;
  for (const c of captions[i] ?? []) {
    const at = (start + VO_START) / fps;
    cues.push({ ...c, from: at + c.start, to: at + c.end, scene: i + 1 });
  }
  start += len - T;
});

const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const srt = cues.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(c.to)}\n${c.speaker ? `${c.speaker}: ` : ""}${c.text}\n`).join("\n");
const txt = cues.map((c) => `[${ts(c.from).slice(3, 8)}] ${c.speaker || "Narrator"}: ${c.text}`).join("\n");

fs.mkdirSync("transcript", { recursive: true });
fs.writeFileSync("transcript/aribs-story.srt", srt);
fs.writeFileSync("transcript/aribs-story.txt", `ARIBS Palm-to-Peat story, voiceover transcript\n\n${txt}\n`);
console.log(`transcript/aribs-story.srt (${cues.length} cues)`);
