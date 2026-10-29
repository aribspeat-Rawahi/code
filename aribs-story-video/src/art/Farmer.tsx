import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop, wave } from "../anim";
import { C } from "../theme";

// Omani farmer: white dishdasha, embroidered kumma cap, short beard, sandals.
// Drawn in the 400 × 400 story viewBox; (x, y) is the point between the feet,
// and the figure is ~150 units tall at s = 1.

export type Mood = "calm" | "worried" | "happy";

const SKIN = "#b9875c";
const ROBE = "#fbfaf6";
const LINE = "#d9d4c5";
const INK = "#2a1d14";

export const Farmer: React.FC<{
  x: number;
  y?: number;
  s?: number;
  mood?: Mood;
  delay?: number;
  lookUp?: boolean;
}> = ({ x, y = 340, s = 1, mood = "calm", delay = 0, lookUp = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const enter = pop(frame, fps, delay, 18);
  const hx = x;
  const hy = y - 128 * s; // head centre

  // Looking up at the palm: eyes move up/right and the head tilts a little.
  const look = lookUp ? ease(frame, fps, delay + 0.8, 1) : 0;
  const eyeDx = 1.5 * s * look;
  const eyeDy = -2 * s * look;
  const headTilt = 7 * look;

  // Waving arm swings 0 → -14° → 0 every 1.2 s.
  const waveAngle = t > delay + 0.6 ? -7 + 7 * Math.cos(((t - delay - 0.6) / 1.2) * Math.PI * 2) : 0;
  // Worried: the hand on the head pats slowly.
  const worryBob = mood === "worried" ? 1.5 * s * wave(frame, fps, 1.6) : 0;

  const mouth =
    mood === "happy"
      ? `M${hx - 6 * s} ${hy + 6 * s} Q ${hx} ${hy + 11 * s} ${hx + 6 * s} ${hy + 6 * s}`
      : mood === "worried"
        ? `M${hx - 5 * s} ${hy + 9 * s} Q ${hx} ${hy + 5 * s} ${hx + 5 * s} ${hy + 9 * s}`
        : `M${hx - 5 * s} ${hy + 7 * s} H ${hx + 5 * s}`;

  const arm = (d: string, hand: { x: number; y: number; r?: number }) => (
    <>
      <path d={d} stroke={ROBE} strokeWidth={11 * s} strokeLinecap="round" fill="none" />
      <circle cx={hand.x} cy={hand.y} r={(hand.r ?? 5) * s} fill={SKIN} />
    </>
  );
  const leftArm = arm(`M${x - 18 * s} ${y - 102 * s} Q ${x - 24 * s} ${y - 76 * s} ${x - 20 * s} ${y - 58 * s}`, {
    x: x - 20 * s,
    y: y - 55 * s,
  });

  return (
    <g opacity={enter} transform={`translate(0 ${(1 - enter) * 12})`}>
      <ellipse cx={x} cy={y + 2} rx={30 * s} ry={6 * s} fill={C.forest900} opacity="0.15" />
      {/* Sandals */}
      <rect x={x - 18 * s} y={y - 6 * s} width={14 * s} height={6 * s} rx={3 * s} fill="#5b3a20" />
      <rect x={x + 4 * s} y={y - 6 * s} width={14 * s} height={6 * s} rx={3 * s} fill="#5b3a20" />
      {/* Dishdasha */}
      <path
        d={`M${x - 20 * s} ${y - 108 * s} L ${x - 28 * s} ${y - 4 * s} H ${x + 28 * s} L ${x + 20 * s} ${y - 108 * s} Q ${x} ${y - 114 * s} ${x - 20 * s} ${y - 108 * s} Z`}
        fill={ROBE}
        stroke={LINE}
        strokeWidth={1.5}
      />
      {/* Furakha tassel */}
      <path d={`M${x} ${y - 108 * s} V ${y - 82 * s}`} stroke={LINE} strokeWidth={1.5 * s} />
      <ellipse cx={x} cy={y - 79 * s} rx={2.5 * s} ry={4 * s} fill="#c9b98a" />
      {/* Arms */}
      {mood === "worried" ? (
        <>
          <g transform={`translate(0 ${worryBob})`}>
            {arm(`M${x + 18 * s} ${y - 102 * s} Q ${x + 32 * s} ${y - 128 * s} ${x + 12 * s} ${y - 142 * s}`, {
              x: x + 11 * s,
              y: y - 143 * s,
            })}
          </g>
          {leftArm}
        </>
      ) : mood === "happy" ? (
        <>
          <g transform={`rotate(${waveAngle} ${x + 18 * s} ${y - 102 * s})`}>
            {arm(`M${x + 18 * s} ${y - 102 * s} Q ${x + 38 * s} ${y - 118 * s} ${x + 40 * s} ${y - 142 * s}`, {
              x: x + 40 * s,
              y: y - 146 * s,
              r: 5.5,
            })}
          </g>
          {leftArm}
        </>
      ) : (
        <>
          {arm(`M${x + 18 * s} ${y - 102 * s} Q ${x + 24 * s} ${y - 76 * s} ${x + 20 * s} ${y - 58 * s}`, {
            x: x + 20 * s,
            y: y - 55 * s,
          })}
          {leftArm}
        </>
      )}
      {/* Neck */}
      <rect x={hx - 5 * s} y={hy + 12 * s} width={10 * s} height={10 * s} fill={SKIN} />
      <g transform={`rotate(${headTilt} ${hx} ${hy + 15 * s})`}>
        <circle cx={hx} cy={hy} r={15 * s} fill={SKIN} />
        {/* Short beard */}
        <path
          d={`M${hx - 14 * s} ${hy + 2 * s} Q ${hx - 12 * s} ${hy + 18 * s} ${hx} ${hy + 19 * s} Q ${hx + 12 * s} ${hy + 18 * s} ${hx + 14 * s} ${hy + 2 * s} Q ${hx} ${hy + 12 * s} ${hx - 14 * s} ${hy + 2 * s} Z`}
          fill="#3b2a1e"
        />
        {/* Kumma cap */}
        <path
          d={`M${hx - 15 * s} ${hy - 4 * s} Q ${hx} ${hy - 26 * s} ${hx + 15 * s} ${hy - 4 * s} Z`}
          fill="#f4efe2"
          stroke="#cfc6ad"
          strokeWidth={1}
        />
        {[-9, -3, 3, 9].map((dx) => (
          <circle
            key={dx}
            cx={hx + dx * s}
            cy={hy - 9 * s - Math.abs(dx) * 0.2 * s}
            r={1.6 * s}
            fill={dx % 2 ? C.forest600 : "#b5651d"}
          />
        ))}
        {/* Dot eyes, brows and mouth */}
        <circle cx={hx - 5 * s + eyeDx} cy={hy - 1 * s + eyeDy} r={1.6 * s} fill={INK} />
        <circle cx={hx + 5 * s + eyeDx} cy={hy - 1 * s + eyeDy} r={1.6 * s} fill={INK} />
        {mood === "worried" && (
          <>
            <path d={`M${hx - 8 * s} ${hy - 6 * s} L ${hx - 3 * s} ${hy - 4 * s}`} stroke={INK} strokeWidth={1.4 * s} strokeLinecap="round" />
            <path d={`M${hx + 8 * s} ${hy - 6 * s} L ${hx + 3 * s} ${hy - 4 * s}`} stroke={INK} strokeWidth={1.4 * s} strokeLinecap="round" />
          </>
        )}
        <path d={mouth} stroke="#f4efe2" strokeWidth={1.6 * s} strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
};
