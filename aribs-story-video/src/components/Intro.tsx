import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../anim";
import { FRAUNCES } from "../fonts";
import { C, LOGO } from "../theme";
import { useLayout } from "./layout";
import { Backdrop } from "./Scene";
import { Words } from "./Words";

export const Intro: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = useLayout() === "vertical";
  const logo = pop(frame, fps, 0.1, 14);
  const size = vertical ? 300 : 260;
  return (
    <AbsoluteFill>
      <Backdrop glow={{ x: width / 2, y: height / 2 - (vertical ? 120 : 60), r: vertical ? 620 : 560 }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: vertical ? 64 : 48, padding: vertical ? "120px 90px 250px" : 80 }}>
        <Img src={staticFile(LOGO)} style={{ width: size, height: size, transform: `scale(${logo})` }} />
        <Words
          text={title}
          start={Math.round(0.7 * fps)}
          stagger={4}
          style={{
            fontFamily: FRAUNCES,
            fontWeight: 600,
            fontSize: vertical ? 104 : 110,
            lineHeight: 1.08,
            color: C.forest900,
            textAlign: "center",
            maxWidth: vertical ? 900 : 1500,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
