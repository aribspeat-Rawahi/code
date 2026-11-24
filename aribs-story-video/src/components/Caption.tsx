import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP } from "../anim";
import captions from "../captions.json";
import { C } from "../theme";
import { VO_START } from "../timeline";

type Cue = { speaker: string; text: string; start: number; end: number };
const ALL = captions as Cue[][];

// Burned-in caption of the line being spoken right now (for silent autoplay).
export const Caption: React.FC<{ index: number; fontSize: number }> = ({ index, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - VO_START) / fps;
  const cue = (ALL[index] ?? []).find((c) => t >= c.start - 0.1 && t <= c.end + 0.25);
  if (!cue) return null;
  const opacity = interpolate(t, [cue.start - 0.1, cue.start + 0.05, cue.end + 0.1, cue.end + 0.25], [0, 1, 1, 0], CLAMP);
  return (
    <div
      style={{
        opacity,
        background: "rgba(20,51,29,0.9)",
        color: "#fff",
        borderRadius: 18,
        padding: `${fontSize * 0.4}px ${fontSize * 0.65}px`,
        fontSize,
        lineHeight: 1.35,
        fontWeight: 600,
      }}
    >
      {cue.speaker ? (
        <div style={{ color: C.leaf, fontSize: fontSize * 0.68, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
          {cue.speaker}
        </div>
      ) : null}
      {cue.text}
    </div>
  );
};
