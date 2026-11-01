// Writes transcript/aribs-3d.srt and .txt for the 3D-style film (RemakeFilm), from src/captions.json.
// Mirrors filmTimeline() in src/remake/RemakeFilm.tsx and remakeFrames() in src/remake/config.ts.
// Usage: node scripts/transcript-remake.mjs
import fs from "node:fs";

const FPS = 30, T = 18, INTRO = 90, VO_AT = 42;
const captions = JSON.parse(fs.readFileSync("src/captions.json", "utf8"));
const voEnd = (cues) => (cues.length ? cues[cues.length - 1].end : 0);
const lens = captions.map((cues) => Math.max(9 * FPS, VO_AT + Math.ceil(voEnd(cues) * FPS) + 24));

const cues = [];
let start = INTRO - T;
captions.forEach((sceneCues, i) => {
  for (const c of sceneCues) cues.push({ ...c, from: (start + VO_AT) / FPS + c.start, to: (start + VO_AT) / FPS + c.end });
  start += lens[i] - T;
});

const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
fs.mkdirSync("transcript", { recursive: true });
fs.writeFileSync("transcript/aribs-3d.srt", cues.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(c.to)}\n${c.speaker ? `${c.speaker}: ` : ""}${c.text}\n`).join("\n"));
fs.writeFileSync(
  "transcript/aribs-3d.txt",
  `ARIBS Palm-to-Peat story (3D film), voiceover transcript\n\n${cues.map((c) => `[${ts(c.from).slice(3, 8)}] ${c.speaker || "Narrator"}: ${c.text}`).join("\n")}\n`,
);
console.log(`transcript/aribs-3d.srt (${cues.length} cues, film ${((start + 180) / FPS).toFixed(1)} s)`);
