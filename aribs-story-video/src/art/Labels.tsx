import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { pop, pulse, scaleAt } from "../anim";
import type { StepLabels } from "../story";
import { C } from "../theme";
import { Svg } from "./scenes";

// Speech/thought bubbles, signs and chips drawn on top of each scene.
// Positions are in the same 400 × 400 viewBox as the art (from aribs.net StoryLabels.tsx).
// Each label springs in once the scene has settled.

type P = { x: number; y: number };
type Layout = {
  bubble?: { at: P; to: P; kind?: "speech" | "thought" };
  sign?: { at: P; tone: "road" | "wood" | "banner"; post?: number };
  tags?: { at: P; arrow?: P }[];
};

// Index = scene number - 1
const LAYOUT: Layout[] = [
  { bubble: { at: { x: 92, y: 118 }, to: { x: 70, y: 192 }, kind: "thought" }, tags: [{ at: { x: 250, y: 262 } }] },
  { bubble: { at: { x: 285, y: 100 }, to: { x: 300, y: 184 }, kind: "thought" } },
  { sign: { at: { x: 85, y: 82 }, tone: "road", post: 176 }, bubble: { at: { x: 250, y: 112 }, to: { x: 296, y: 196 } } },
  // Chips sit above the roof so they clear the chimney and stay inside the frame.
  { tags: [{ at: { x: 88, y: 56 }, arrow: { x: 64, y: 288 } }, { at: { x: 322, y: 56 }, arrow: { x: 334, y: 288 } }] },
  { tags: [{ at: { x: 96, y: 34 } }, { at: { x: 304, y: 370 } }] },
  { sign: { at: { x: 85, y: 82 }, tone: "road", post: 176 }, bubble: { at: { x: 300, y: 118 }, to: { x: 352, y: 220 } } },
  { tags: [{ at: { x: 300, y: 66 } }] },
  { sign: { at: { x: 82, y: 120 }, tone: "wood", post: 210 } },
  { sign: { at: { x: 128, y: 58 }, tone: "banner" }, bubble: { at: { x: 175, y: 150 }, to: { x: 238, y: 208 } } },
];

const CW = 0.58; // average glyph width / font size (semibold sans)

const wrap = (text: string, max: number) => {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + " " + word).length <= max) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
  }
  return lines;
};

const Lines: React.FC<{ lines: string[]; x: number; top: number; fs: number; lh: number; fill: string }> = ({ lines, x, top, fs, lh, fill }) => (
  <text x={x} y={top + fs * 0.95} textAnchor="middle" fontSize={fs} fontWeight={600} fill={fill}>
    {lines.map((l, i) => (
      <tspan key={i} x={x} dy={i ? lh : 0}>
        {l}
      </tspan>
    ))}
  </text>
);

const useClock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps };
};

const Bubble: React.FC<{ text: string; at: P; to: P; kind?: "speech" | "thought"; delay: number }> = ({ text, at, to, kind = "speech", delay }) => {
  const { frame, fps } = useClock();
  const fs = 17;
  const lh = fs * 1.25;
  const lines = wrap(text, 16);
  const w = Math.max(...lines.map((l) => l.length)) * fs * CW + 30;
  const h = lines.length * lh + 18;
  const left = at.x - w / 2;
  const top = at.y - h / 2;
  const bottom = top + h;
  const bx = Math.min(Math.max(to.x, left + 22), left + w - 22);
  // Tail points at the speaker, at most 30 units long
  const dx = to.x - bx;
  const dy = to.y - bottom;
  const d = Math.hypot(dx, dy) || 1;
  const len = Math.min(d, 30);
  const tip = { x: bx + (dx / d) * len, y: bottom + (dy / d) * len };
  const stroke = C.forest700;

  const p = pop(frame, fps, delay, 15);
  const bob = frame / fps > delay + 0.6 ? -4 * pulse(frame - Math.round((delay + 0.6) * fps), fps, 3.2) : 0;

  return (
    <g opacity={Math.min(1, p * 2)} transform={scaleAt(p, tip.x, tip.y)}>
      <g transform={`translate(0 ${bob})`}>
        {kind === "thought" ? (
          <>
            <circle cx={bx + dx * 0.35} cy={bottom + 8 + dy * 0.25} r={6} fill="#fff" stroke={stroke} strokeWidth={2} />
            <circle cx={bx + dx * 0.7} cy={bottom + 12 + dy * 0.55} r={3.5} fill="#fff" stroke={stroke} strokeWidth={2} />
            <rect x={left} y={top} width={w} height={h} rx={h / 2} fill="#fff" stroke={stroke} strokeWidth={2} />
          </>
        ) : (
          <>
            <rect x={left} y={top} width={w} height={h} rx={14} fill="#fff" stroke={stroke} strokeWidth={2} />
            <path d={`M${bx - 9} ${bottom - 1} L ${tip.x} ${tip.y} L ${bx + 9} ${bottom - 1}`} fill="#fff" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
            <line x1={bx - 7.5} x2={bx + 7.5} y1={bottom - 1} y2={bottom - 1} stroke="#fff" strokeWidth={3} />
          </>
        )}
        <Lines lines={lines} x={at.x} top={top + 9} fs={fs} lh={lh} fill={C.forest900} />
      </g>
    </g>
  );
};

const Sign: React.FC<{ text: string; at: P; tone: "road" | "wood" | "banner"; post?: number; delay: number }> = ({ text, at, tone, post, delay }) => {
  const { frame, fps } = useClock();
  const fs = tone === "banner" ? 19 : 15;
  const lh = fs * 1.25;
  const lines = wrap(text, 14);
  const w = Math.max(...lines.map((l) => l.length)) * fs * CW + (tone === "banner" ? 44 : 28);
  const h = lines.length * lh + 14;
  const left = at.x - w / 2;
  const top = at.y - h / 2;
  const board = tone === "road" ? C.forest700 : tone === "wood" ? "#a0703f" : C.leaf;
  const ink = tone === "road" ? "#fff" : tone === "wood" ? "#fff8ea" : C.forest900;

  const p = pop(frame, fps, delay, 14);
  return (
    <g opacity={Math.min(1, p * 2)} transform={`translate(0 ${(1 - p) * -40}) rotate(${(1 - p) * -6} ${at.x} ${top})`}>
      {post
        ? (tone === "road" ? [left + 14, left + w - 14] : [at.x]).map((px) => (
            <rect key={px} x={px - 3} y={top + h - 2} width={6} height={post - (top + h) + 2} rx={2} fill={tone === "wood" ? "#7a5230" : "#7d8a80"} />
          ))
        : null}
      {tone === "banner" ? (
        <>
          <path d={`M${left - 14} ${top + 8} H ${left + 8} V ${top + h + 8} H ${left - 14} L ${left - 4} ${top + 8 + h / 2} Z`} fill={C.forest600} />
          <path d={`M${left + w + 14} ${top + 8} H ${left + w - 8} V ${top + h + 8} H ${left + w + 14} L ${left + w + 4} ${top + 8 + h / 2} Z`} fill={C.forest600} />
        </>
      ) : null}
      <rect x={left} y={top} width={w} height={h} rx={tone === "wood" ? 6 : 8} fill={board} />
      {tone === "road" && <rect x={left + 4} y={top + 4} width={w - 8} height={h - 8} rx={5} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.5} />}
      {tone === "wood" && (
        <>
          <line x1={left + 6} x2={left + w - 6} y1={top + h * 0.5} y2={top + h * 0.5} stroke="#7a5230" strokeOpacity={0.35} strokeWidth={1.5} />
          <circle cx={left + 8} cy={top + 8} r={2} fill="#5b3a20" />
          <circle cx={left + w - 8} cy={top + 8} r={2} fill="#5b3a20" />
        </>
      )}
      <Lines lines={lines} x={at.x} top={top + 7} fs={fs} lh={lh} fill={ink} />
    </g>
  );
};

const Tag: React.FC<{ text: string; at: P; arrow?: P; delay: number; index: number }> = ({ text, at, arrow, delay, index }) => {
  const { frame, fps } = useClock();
  const fs = 15;
  const w = text.length * fs * CW + 40;
  const h = 32;
  const left = at.x - w / 2;
  const top = at.y - h / 2;
  const p = pop(frame, fps, delay, 16);
  const t = frame / fps;
  const dash = -((t * 24) % 24);
  const bob = t > delay ? -3 * pulse(frame - Math.round((delay + index * 0.4) * fps), fps, 2.8) : 0;
  return (
    <g opacity={Math.min(1, p * 2)} transform={`translate(${(1 - p) * (index % 2 ? 30 : -30)} 0)`}>
      {arrow && (
        <>
          <path
            d={`M${at.x} ${top + h + 4} L ${arrow.x} ${arrow.y - 8}`}
            stroke={C.forest700}
            strokeWidth={2.5}
            strokeDasharray="6 6"
            strokeDashoffset={dash}
            fill="none"
          />
          <path
            d={`M${arrow.x - 7} ${arrow.y - 12} L ${arrow.x} ${arrow.y - 2} L ${arrow.x + 7} ${arrow.y - 12}`}
            stroke={C.forest700}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      <g transform={`translate(0 ${bob})`}>
        <rect x={left} y={top} width={w} height={h} rx={h / 2} fill="#fff" stroke={C.forest700} strokeOpacity={0.25} strokeWidth={1.5} />
        <circle cx={left + 16} cy={at.y} r={5} fill={C.leaf} />
        <text x={left + 28} y={at.y + fs * 0.35} fontSize={fs} fontWeight={600} fill={C.forest900}>
          {text}
        </text>
      </g>
    </g>
  );
};

export const Labels: React.FC<{ index: number; labels: StepLabels }> = ({ index, labels }) => {
  const layout = LAYOUT[index];
  if (!layout) return null;
  return (
    <Svg>
      {layout.sign && labels.sign && <Sign text={labels.sign} {...layout.sign} delay={0.8} />}
      {layout.tags &&
        labels.tags?.map((t, i) => (layout.tags && layout.tags[i] ? <Tag key={t} text={t} {...layout.tags[i]} index={i} delay={1.0 + i * 0.25} /> : null))}
      {layout.bubble && labels.bubble && <Bubble text={labels.bubble} {...layout.bubble} delay={1.3} />}
    </Svg>
  );
};
