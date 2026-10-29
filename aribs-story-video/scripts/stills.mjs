// Renders one still per part (intro, 9 scenes, outro) for both compositions into out/stills/.
// Usage: node scripts/stills.mjs [secondsIntoScene=3.6]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const at = Number(process.argv[2] ?? 3.6);
const browserExecutable = process.env.REMOTION_BROWSER || null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });

for (const id of ["StoryLandscape", "StoryVertical"]) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  const { fps } = composition;
  const T = 18;
  const props = composition.props;
  // Mirror of getTimeline() in src/timeline.ts
  const sceneLen = props.steps.map((_, i) => {
    const vo = props.voiceover ? props.voDurations?.[i] : null;
    const base = Math.round(5.5 * fps);
    return (vo ? Math.max(base, 6 + Math.ceil(vo * fps) + Math.round(0.8 * fps)) : base) + T;
  });
  const frames = [["00-intro", Math.round(2.4 * fps)]];
  let start = 3 * fps + T - T;
  sceneLen.forEach((len, i) => {
    frames.push([`${String(i + 1).padStart(2, "0")}-scene`, start + Math.round(at * fps)]);
    start += len - T;
  });
  frames.push(["10-outro", composition.durationInFrames - 10]);
  for (const [name, frame] of frames) {
    const output = `out/stills/${id}-${name}.png`;
    await renderStill({ composition, serveUrl, output, frame, browserExecutable, imageFormat: "png" });
    console.log(output, frame);
  }
}
