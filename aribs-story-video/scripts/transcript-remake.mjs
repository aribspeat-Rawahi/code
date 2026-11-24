// Writes subtitles and a plain transcript for the 3D film (RemakeFilm) in both languages:
//   transcript/aribs-3d.srt / .txt      from src/captions.json
//   transcript/aribs-3d-ar.srt / .txt   from src/captions-ar.json
// Mirrors filmTimeline() in src/remake/RemakeFilm.tsx and remakeFrames() in src/remake/config.ts.
// Usage: node scripts/transcript-remake.mjs
import fs from "node:fs";

const FPS = 30, T = 18, COVER = 45, INTRO = 90, OUTRO = 180, VO_AT = 42;

const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

const write = (captionsFile, name, title) => {
  const captions = JSON.parse(fs.readFileSync(captionsFile, "utf8"));
  const voEnd = (cues) => (cues.length ? cues[cues.length - 1].end : 0);
  const lens = captions.map((cues) => Math.max(9 * FPS, VO_AT + Math.ceil(voEnd(cues) * FPS) + 24));
  const cues = [];
  let start = COVER - T + INTRO - T;
  captions.forEach((sceneCues, i) => {
    for (const c of sceneCues) cues.push({ ...c, from: (start + VO_AT) / FPS + c.start, to: (start + VO_AT) / FPS + c.end });
    start += lens[i] - T;
  });
  fs.mkdirSync("transcript", { recursive: true });
  fs.writeFileSync(`transcript/${name}.srt`, cues.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(c.to)}\n${c.speaker ? `${c.speaker}: ` : ""}${c.text}\n`).join("\n"));
  fs.writeFileSync(`transcript/${name}.txt`, `${title}\n\n${cues.map((c) => `[${ts(c.from).slice(3, 8)}] ${c.text}`).join("\n")}\n`);
  console.log(`transcript/${name}.srt (${cues.length} cues, film ${((start + OUTRO) / FPS).toFixed(1)} s)`);
};

write("src/captions.json", "aribs-3d", "ARIBS Palm-to-Peat story (3D film), voiceover transcript");
write("src/captions-ar.json", "aribs-3d-ar", "قصة أريبس من النخيل إلى بالم بيت — نص التعليق الصوتي");
