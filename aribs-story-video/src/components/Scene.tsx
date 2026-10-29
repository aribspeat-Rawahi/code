import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { pad2, pop } from "../anim";
import { Labels } from "../art/Labels";
import { ART, BAG_SCENE, Sky } from "../art/scenes";
import { FRAUNCES, INTER } from "../fonts";
import type { StoryProps } from "../story";
import { C } from "../theme";
import { TRANSITION } from "../timeline";
import { BOX, useLayout } from "./layout";
import { Words } from "./Words";

export const Backdrop: React.FC<{ glow: { x: number; y: number; r: number } }> = ({ glow }) => (
  <AbsoluteFill
    style={{
      backgroundColor: C.sand50,
      backgroundImage: `radial-gradient(circle ${glow.r}px at ${glow.x}px ${glow.y}px, ${C.leafLight} 0%, rgba(227,246,220,0) 100%)`,
    }}
  />
);

export const Scene: React.FC<{ index: number; step: StoryProps["steps"][number]; total: number }> = ({ index, step, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const box = BOX[layout];
  const Art = ART[index];

  // Text starts while the transition is still finishing, so it is fully in once the scene settles.
  const start = Math.round(TRANSITION * 0.6);
  const counter = pop(frame - start, fps, 0, 18);
  const titleWords = step.title.split(" ").length;
  const body = pop(frame - start - titleWords * 3 - 6, fps, 0, 18);

  const a = box.art;
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <Backdrop glow={{ x: a.left + a.size / 2, y: a.top + a.size / 2, r: a.size * 0.62 }} />

      <div style={{ position: "absolute", left: a.left, top: a.top, width: a.size, height: a.size, fontFamily: INTER }}>
        {index !== BAG_SCENE && <Sky />}
        <Art />
        <Labels index={index} labels={step.labels} />
      </div>

      <div
        style={{
          position: "absolute",
          left: box.text.left,
          top: box.text.top,
          width: box.text.width,
          height: box.text.height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: layout === "landscape" ? 30 : 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: box.counter,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: C.forest600,
            opacity: counter,
            transform: `translateX(${(1 - counter) * -20}px)`,
          }}
        >
          <div style={{ width: 44 * counter, height: 6, borderRadius: 3, background: C.leaf }} />
          {pad2(index + 1)} / {pad2(total)}
        </div>
        <Words
          text={step.title}
          start={start + 2}
          style={{ fontFamily: FRAUNCES, fontWeight: 600, fontSize: box.title, lineHeight: 1.06, color: C.forest900, letterSpacing: "-0.01em" }}
        />
        <div
          style={{
            fontSize: box.body,
            lineHeight: 1.42,
            color: C.muted,
            opacity: body,
            transform: `translateY(${(1 - body) * 20}px)`,
          }}
        >
          {step.text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
