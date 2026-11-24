// Renders review stills (one per scene, plus intro and outro) for one composition.
// Usage: node scripts/stills.mjs <composition-id> <out-dir> <frame> [<frame> ...]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const [id, outDir, ...frames] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER || null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
for (const [n, f] of frames.entries()) {
  const frame = Math.min(Number(f), composition.durationInFrames - 1);
  await renderStill({ composition, serveUrl, output: path.join(outDir, `${String(n).padStart(2, "0")}.png`), frame, browserExecutable });
}
console.log(`${frames.length} stills → ${outDir}`);
