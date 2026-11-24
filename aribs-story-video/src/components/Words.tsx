import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../anim";

// Title that animates in word by word (3-frame stagger, translateY + fade).
export const Words: React.FC<{ text: string; start: number; style: React.CSSProperties; stagger?: number }> = ({
  text,
  start,
  style,
  stagger = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={style}>
      {text.split(" ").map((word, i) => {
        const p = pop(frame - start - i * stagger, fps, 0, 16);
        return (
          <span
            key={`${word}-${i}`}
            style={{ display: "inline-block", whiteSpace: "pre", opacity: p, transform: `translateY(${(1 - p) * 0.45}em)` }}
          >
            {word}
            {i < text.split(" ").length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
};
