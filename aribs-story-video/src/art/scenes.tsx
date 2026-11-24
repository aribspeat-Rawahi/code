import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, cycle, ease, pop, pulse, scaleAt, wave } from "../anim";
import { FRAUNCES } from "../fonts";
import { BAG, C, LOGO } from "../theme";
import { Farmer } from "./Farmer";

// The nine story drawings, ported from aribs.net (components/story/StoryArt.tsx).
// Same shapes and 400 × 400 coordinates; every animation is a function of the frame.

export const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg viewBox="0 0 400 400" width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps, t: frame / fps };
};

const Ground = () => <ellipse cx="200" cy="350" rx="170" ry="22" fill={C.forest900} opacity="0.12" />;

/* ------------------------------------------------------------------ */
/* Date palm (green, or old and dry with no fruit)                     */
/* ------------------------------------------------------------------ */
const PalmTree: React.FC<{ old?: boolean; cx?: number }> = ({ old = false, cx = 200 }) => {
  const { frame, fps } = useT();
  const fronds = [-150, -120, -90, -60, -30, -165, -15];
  const top = 140;
  // Old palm sways slowly; a healthy one a little more.
  const sway = (old ? 1.2 : 2) * wave(frame, fps, old ? 6 : 5);
  return (
    <g>
      {Array.from({ length: 9 }, (_, i) => {
        const g = pop(frame, fps, i * 0.05, 18);
        const y = 330 - i * 22;
        return (
          <rect
            key={i}
            x={cx - 14 - i * 1.2}
            y={y}
            width={28 - i * 0.6}
            height={20}
            rx={6}
            fill={i % 2 ? "#8b5e34" : "#9c6c3f"}
            opacity={Math.min(1, g * 2)}
            transform={scaleAt(1, cx, y + 20, g)}
          />
        );
      })}
      <g transform={`rotate(${sway} ${cx} ${top})`}>
        {fronds.map((a, i) => {
          const rad = (a * Math.PI) / 180;
          const droop = old ? 34 : 0;
          const draw = ease(frame, fps, 0.4 + i * 0.08, 0.7);
          return (
            <path
              key={a}
              d={`M${cx} ${top} Q ${cx + Math.cos(rad) * 70} ${top + Math.sin(rad) * 90 + droop} ${cx + Math.cos(rad) * 130} ${top + Math.sin(rad) * 80 + 40 + droop * 1.8}`}
              stroke={old ? (i % 2 ? "#9c8a55" : "#b8a06a") : i % 2 ? C.forest600 : C.leaf}
              strokeWidth={old ? 11 : 14}
              strokeLinecap="round"
              fill="none"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - draw}
            />
          );
        })}
      </g>
      {!old &&
        [cx - 12, cx, cx + 12].map((x, i) => (
          <circle key={x} cx={x} cy={162 + (i % 2) * 6} r={7 * pop(frame, fps, 1.1 + i * 0.1)} fill="#b5651d" />
        ))}
    </g>
  );
};

/* 1 ---------------------------------------------------------------- */
export const OldPalm = () => (
  <Svg>
    <Ground />
    <PalmTree old cx={250} />
    <Farmer x={62} s={0.9} mood="calm" delay={0.6} lookUp />
  </Svg>
);

/* 2 ---------------------------------------------------------------- */
export const Burden = () => {
  const { frame, fps } = useT();
  const logs = [
    { x: 30, y: 300, w: 180 },
    { x: 80, y: 276, w: 160 },
    { x: 55, y: 252, w: 140 },
  ];
  return (
    <Svg>
      <Ground />
      {logs.map((l, i) => {
        // Damping 14 overshoots a little, so each trunk lands with a small bounce.
        const p = pop(frame, fps, 0.2 + i * 0.3, 14);
        return (
          <g key={i} opacity={Math.min(1, p * 3)} transform={`translate(0 ${(1 - p) * -140})`}>
            <rect x={l.x} y={l.y} width={l.w} height="26" rx="13" fill={i % 2 ? "#9c6c3f" : "#8b5e34"} />
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={l.x + l.w * f} x2={l.x + l.w * f} y1={l.y + 4} y2={l.y + 22} stroke="#6b4626" strokeWidth="2" opacity="0.5" />
            ))}
            <ellipse cx={l.x + l.w} cy={l.y + 13} rx="8" ry="13" fill="#c49a6c" />
            <ellipse cx={l.x + l.w} cy={l.y + 13} rx="3" ry="6" fill="#9c6c3f" />
          </g>
        );
      })}
      <Farmer x={315} mood="worried" delay={1.1} />
    </Svg>
  );
};

/* 3 + 6 ------------------------------------------------------------ */
/* ARIBS closed box van: white body, green stripe, forest-green cab on */
/* the right. It always drives left to right.                          */
const ARRIVE = 1.4; // seconds to drive into place

const Van: React.FC<{ shift?: number; stops?: boolean; children?: React.ReactNode }> = ({ shift = 0, stops = false, children }) => {
  const { frame, fps, t } = useT();

  // Speed 1 = cruising. A van that stops slows down exactly like its ease-out arrival.
  const speedAt = (f: number) => {
    if (!stops) return 1;
    const p = Math.min(1, f / (ARRIVE * fps));
    return (1 - p) * (1 - p);
  };
  let dist = 0; // frames driven at full speed
  for (let f = 0; f < frame; f++) dist += speedAt(f);
  const speed = speedAt(frame);
  const driven = dist / fps; // seconds of driving

  const x = interpolate(t, [0, ARRIVE], [-300, shift], { ...CLAMP, easing: (v) => 1 - (1 - v) * (1 - v) });
  const dashOffset = (driven * 100) % 70;
  const wheelAngle = driven * 450;
  const bounce = -(1 - Math.cos((driven / 0.35) * Math.PI * 2)) * speed;
  const headlight = 0.6 + 0.4 * pulse(frame, fps, 1.4);

  return (
    <Svg>
      <Ground />
      {/* Road with moving dashes */}
      <rect x="0" y="318" width="400" height="26" fill="#c9bfa9" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={i * 70 - dashOffset} y={329} width={30} height={4} rx={2} fill="#f4f1ea" />
      ))}
      <g transform={`translate(${x} 0)`}>
        {/* Dust puffs behind the van, only while it is moving */}
        {[0, 1, 2, 3].map((i) => {
          const q = cycle(driven, 1.2, i * 0.3);
          if (q < 0) return null;
          const k = 1 - (1 - q) * (1 - q);
          return (
            <circle
              key={i}
              cx={36 - 66 * k}
              cy={304 - 14 * k}
              r={5 + 11 * k}
              fill="#d8cdb4"
              opacity={0.9 * (1 - q) * Math.min(1, speed * 3)}
            />
          );
        })}
        <g transform={`translate(0 ${bounce})`}>
          {/* Box body */}
          <rect x="40" y="176" width="210" height="114" rx="10" fill="#fbfaf6" stroke="#d6d2c4" strokeWidth="2" />
          <rect x="40" y="262" width="210" height="28" fill={C.leaf} />
          <image href={staticFile(LOGO)} x="60" y="190" width="64" height="64" />
          <text x="134" y="222" fontSize="30" fontWeight="600" fontFamily={FRAUNCES} fill={C.forest900}>
            ARIBS
          </text>
          <text x="135" y="244" fontSize="12" fontWeight="600" letterSpacing="3" fill={C.earth600}>
            PALM PEAT
          </text>
          {/* Cab */}
          <path d="M250 196 H 300 L 334 236 V 290 H 250 Z" fill={C.forest700} />
          <path d="M262 206 H 296 L 320 236 H 262 Z" fill={C.leafLight} />
          {/* Headlight */}
          <circle cx="330" cy="262" r="5" fill="#f6cf63" opacity={headlight} />
          <circle cx="330" cy="262" r="9" fill="#f6cf63" opacity={(headlight - 0.6) * 0.6} />
        </g>
        {[80, 210, 300].map((cx) => (
          <g key={cx} transform={`rotate(${wheelAngle} ${cx} 300)`}>
            <circle cx={cx} cy={300} r={20} fill="#1d1d1b" />
            <circle cx={cx} cy={300} r={8} fill="#c9bfa9" />
            <rect x={cx - 2} y={282} width={4} height={10} fill="#c9bfa9" />
          </g>
        ))}
      </g>
      {children}
    </Svg>
  );
};

export const Truck = () => <Van />;

export const Delivery = () => (
  <Van shift={-24} stops>
    <Farmer x={366} y={318} s={0.62} mood="happy" delay={1.1} />
  </Van>
);

/* 4 ---------------------------------------------------------------- */
export const Factory = () => {
  const { frame, fps, t } = useT();
  const rise = pop(frame, fps, 0, 18);
  return (
    <Svg>
      <Ground />
      {/* Conveyors */}
      <rect x="0" y="318" width="130" height="8" rx="4" fill={C.forest900} opacity="0.55" />
      <rect x="270" y="318" width="130" height="8" rx="4" fill={C.forest900} opacity="0.55" />
      {/* Palm trunks ride in on the left (drawn behind the building, so they vanish inside) */}
      {[0, 1].map((i) => {
        const q = cycle(t, 3.2, i * 1.6 - 1.6);
        if (q < 0) return null;
        return (
          <g key={i} transform={`translate(${-90 + 200 * q} 0)`}>
            <rect x="0" y="298" width="70" height="20" rx="10" fill="#8b5e34" />
            <ellipse cx="70" cy="308" rx="6" ry="10" fill="#c49a6c" />
          </g>
        );
      })}
      {/* Palm peat mounds come out on the right */}
      {[0, 1, 2, 3].map((i) => {
        const q = cycle(t, 2.4, i * 0.6);
        if (q < 0) return null;
        return <path key={i} d="M0 318 C 6 304, 22 304, 28 318 Z" fill="#6b4626" transform={`translate(${262 + 138 * q} 0)`} />;
      })}
      <g opacity={rise} transform={`translate(0 ${(1 - rise) * 30})`}>
        <rect x="110" y="170" width="180" height="170" rx="10" fill="#f4f1ea" stroke={C.forest700} strokeWidth="4" />
        <path d="M100 175 L200 112 L300 175 Z" fill={C.forest700} />
        <rect x="248" y="118" width="26" height="60" rx="5" fill={C.forest600} />
        <rect x="110" y="282" width="30" height="44" fill={C.forest900} />
        <rect x="260" y="282" width="30" height="44" fill={C.forest900} />
        {/* ARIBS logo in a white circle on the front */}
        <circle cx="200" cy="222" r="34" fill="#fff" stroke={C.leaf} strokeWidth="3" />
        <image href={staticFile(LOGO)} x="170" y="192" width="60" height="60" />
        <text x="200" y="276" textAnchor="middle" fontSize="15" fontWeight="600" letterSpacing="2" fill={C.forest900}>
          ARIBS
        </text>
        {/* Gear */}
        <g transform={`rotate(${t * 60} 150 200)`}>
          <circle cx="150" cy="200" r="11" fill={C.leaf} />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="147" y="184" width="6" height="7" rx="2" fill={C.leaf} transform={`rotate(${i * 45} 150 200)`} />
          ))}
          <circle cx="150" cy="200" r="4" fill={C.forest900} />
        </g>
      </g>
      {/* Chimney steam */}
      {[0, 1, 2].map((i) => {
        const q = cycle(t, 3, i - 3);
        if (q < 0) return null;
        const k = 1 - (1 - q) * (1 - q);
        return <circle key={i} cx={261} cy={112 - 30 * k} r={8 + 8 * k} fill={C.sand100} opacity={0.9 * (1 - q) * rise} />;
      })}
      {/* Gold sparkles over the fresh peat */}
      {[
        { x: 300, y: 286 },
        { x: 336, y: 276 },
        { x: 372, y: 290 },
      ].map((p, i) => {
        const q = cycle(t, 1.6, 0.6 + i * 0.5, 0.4);
        if (q < 0) return null;
        const sc = Math.sin(q * Math.PI);
        return (
          <path
            key={p.x}
            d={`M${p.x} ${p.y - 9} L ${p.x + 2.5} ${p.y - 2.5} L ${p.x + 9} ${p.y} L ${p.x + 2.5} ${p.y + 2.5} L ${p.x} ${p.y + 9} L ${p.x - 2.5} ${p.y + 2.5} L ${p.x - 9} ${p.y} L ${p.x - 2.5} ${p.y - 2.5} Z`}
            fill="#f6cf63"
            transform={`${scaleAt(sc, p.x, p.y)} rotate(${q * 90} ${p.x} ${p.y})`}
          />
        );
      })}
    </Svg>
  );
};

/* 5 ---------------------------------------------------------------- */
export const Bag = () => {
  const { frame, fps } = useT();
  const circle = pop(frame, fps, 0, 18);
  const rise = pop(frame, fps, 0.2, 16);
  const float = -8 * pulse(frame, fps, 4);
  return (
    <AbsoluteFill>
      <Svg>
        <Ground />
        <circle cx="200" cy="200" r="150" fill={C.leafLight} opacity={circle} transform={scaleAt(0.6 + 0.4 * circle, 200, 200)} />
      </Svg>
      <div
        style={{
          position: "absolute",
          inset: "16%",
          opacity: rise,
          transform: `translateY(${(1 - rise) * 60 + float * rise}px) rotate(${(1 - rise) * -6}deg)`,
        }}
      >
        <Img
          src={staticFile(BAG)}
          style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 20px 30px rgba(20,51,29,0.3))" }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* 7 ---------------------------------------------------------------- */
export const Plant = () => {
  const { frame, fps, t } = useT();
  const soilDark = 0.55 * ease(frame, fps, 1.8, 2.6);
  const fill = 0.12 + 0.76 * ease(frame, fps, 1.2, 3);
  const stem = ease(frame, fps, 0.2, 1.2);
  const leaves = [
    { d: "M200 250 C 150 230, 120 250, 110 280 C 150 285, 185 270, 200 250 Z", o: [200, 250], delay: 1.0 },
    { d: "M202 215 C 250 190, 285 205, 295 235 C 255 245, 220 235, 202 215 Z", o: [202, 215], delay: 1.5 },
    { d: "M200 182 C 175 140, 190 110, 212 100 C 225 135, 220 165, 200 182 Z", o: [200, 182], delay: 2.0 },
  ];
  return (
    <Svg>
      <defs>
        <clipPath id="story-gauge">
          <rect x="334" y="132" width="26" height="156" rx="13" />
        </clipPath>
      </defs>
      <Ground />
      <path d="M40 345 C 110 300, 290 300, 360 345 Z" fill="#6b4626" />
      <path d="M40 345 C 110 300, 290 300, 360 345 Z" fill="#3a2414" opacity={soilDark} />
      {/* Water gauge 12% → 88% */}
      <rect x="331" y="129" width="32" height="162" rx="16" fill="#fff" stroke={C.forest700} strokeWidth="2.5" />
      <g clipPath="url(#story-gauge)">
        <rect x="334" y={132 + 156 * (1 - fill)} width="26" height={156 * fill} fill="#7cc4e8" />
      </g>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="331" x2="341" y1={129 + 162 * f} y2={129 + 162 * f} stroke={C.forest700} strokeWidth="2" />
      ))}
      <text x="347" y="312" textAnchor="middle" fontSize="15" fontWeight="600" fill={C.forest700}>
        {Math.round(fill * 100)}%
      </text>
      {Array.from({ length: 26 }, (_, i) => (
        <circle key={i} cx={70 + ((i * 47) % 260)} cy={330 + ((i * 13) % 12)} r={2 + (i % 3)} fill="#c49a6c" opacity="0.8" />
      ))}
      {/* Sprout grows leaf by leaf */}
      <path
        d="M200 330 C 198 280, 206 240, 200 180"
        stroke={C.forest600}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - stem}
      />
      {leaves.map((l) => (
        <path key={l.d} d={l.d} fill={C.leaf} transform={scaleAt(pop(frame, fps, l.delay, 15), l.o[0], l.o[1])} />
      ))}
      {/* Falling water drops */}
      {[150, 120, 185].map((x, i) => {
        const q = cycle(t, 2.2, 0.8 + i * 0.6, 0.8);
        if (q < 0) return null;
        return <path key={x} d={`M${x} 60 q 8 14 0 20 q -8 -6 0 -20 Z`} fill="#7cc4e8" opacity={Math.sin(q * Math.PI)} transform={`translate(0 ${250 * q * q})`} />;
      })}
    </Svg>
  );
};

/* 8 ---------------------------------------------------------------- */
export const Harvest = () => {
  const { frame, fps } = useT();
  const rows = [
    { y: 300, color: "#6b4626" },
    { y: 250, color: "#7a5230" },
    { y: 205, color: "#8b5e34" },
  ];
  let order = 0;
  // Pop order: front row first; drawn back to front so nearer rows overlap farther ones.
  const delays = rows.map((_, ri) => Array.from({ length: 6 - ri }, () => 0.3 + order++ * 0.12));
  return (
    <Svg>
      <Ground />
      {rows
        .map((r, ri) => (
          <g key={ri}>
            <path d={`M${30 + ri * 30} ${r.y + 22} Q 200 ${r.y - 6} ${370 - ri * 30} ${r.y + 22} Z`} fill={r.color} />
            {Array.from({ length: 6 - ri }, (_, i) => {
              const x = 60 + ri * 30 + i * ((220 - ri * 60) / Math.max(1, 5 - ri));
              const s = 1 - ri * 0.18;
              const g = pop(frame, fps, delays[ri][i], 15);
              return (
                <g key={i} transform={scaleAt(g, x, r.y + 8)}>
                  <path d={`M${x} ${r.y + 8} V ${r.y - 22 * s}`} stroke={C.forest600} strokeWidth={4 * s} />
                  <path d={`M${x} ${r.y - 8 * s} C ${x - 24 * s} ${r.y - 22 * s}, ${x - 26 * s} ${r.y - 4 * s}, ${x} ${r.y - 4 * s} Z`} fill={C.leaf} />
                  <path d={`M${x} ${r.y - 16 * s} C ${x + 24 * s} ${r.y - 30 * s}, ${x + 26 * s} ${r.y - 12 * s}, ${x} ${r.y - 12 * s} Z`} fill={C.forest600} />
                  {(i + ri) % 2 === 0 && <circle cx={x + 8 * s} cy={r.y - 26 * s} r={7 * s} fill="#d9534f" />}
                </g>
              );
            })}
          </g>
        ))
        .reverse()}
      <Farmer x={345} y={345} s={0.75} mood="happy" delay={1} />
    </Svg>
  );
};

/* 9 ---------------------------------------------------------------- */
export const Green = () => {
  const { frame, fps, t } = useT();
  const hillBack = pop(frame, fps, 0, 18);
  const hillFront = pop(frame, fps, 0.15, 18);
  const sapling = (x: number, s: number, d: number, phase: number) => {
    const g = pop(frame, fps, d, 16);
    const oy = 300 - 70 * s;
    return (
      <g key={x} transform={scaleAt(g, x, 300)}>
        <rect x={x - 4 * s} y={oy} width={8 * s} height={70 * s} rx={3} fill="#8b5e34" />
        <g transform={`rotate(${3 * wave(frame, fps, 4, phase)} ${x} ${oy})`}>
          {[-160, -125, -90, -55, -20].map((a, i) => {
            const r = (a * Math.PI) / 180;
            return (
              <path
                key={a}
                d={`M${x} ${oy} Q ${x + Math.cos(r) * 34 * s} ${oy + Math.sin(r) * 40 * s} ${x + Math.cos(r) * 60 * s} ${oy + Math.sin(r) * 20 * s + 22 * s}`}
                stroke={i % 2 ? C.forest600 : C.leaf}
                strokeWidth={7 * s}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </g>
      </g>
    );
  };
  return (
    <Svg>
      <g transform={`rotate(${t * 12} 300 95)`}>
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="297" y="38" width="6" height="18" rx="3" fill="#f2c14e" transform={`rotate(${i * 30} 300 95)`} />
        ))}
      </g>
      <circle cx="300" cy="95" r="32" fill="#f6cf63" />
      <path
        d="M0 300 C 80 240, 160 250, 230 285 C 290 255, 350 245, 400 270 V 345 Q 200 392 0 345 Z"
        fill={C.leaf}
        opacity={hillBack}
        transform={`translate(0 ${(1 - hillBack) * 80})`}
      />
      <path
        d="M0 330 C 90 300, 200 310, 260 330 C 320 310, 370 305, 400 315 V 350 Q 200 395 0 350 Z"
        fill={C.forest600}
        opacity={hillFront}
        transform={`translate(0 ${(1 - hillFront) * 80})`}
      />
      {sapling(70, 0.9, 0.5, 0)}
      {sapling(160, 1.1, 0.7, 0.3)}
      {sapling(340, 0.8, 0.9, 0.6)}
      <Farmer x={250} y={338} s={0.85} mood="happy" delay={1.1} />
      {/* Leaves floating up */}
      {[120, 230, 330].map((x, i) => {
        const q = cycle(t, 4, 1 + i * 0.8);
        if (q < 0) return null;
        const k = 1 - (1 - q) * (1 - q);
        return (
          <path
            key={x}
            d={`M${x} 360 c 6 -10 16 -10 18 -4 c -6 8 -12 10 -18 4 Z`}
            fill={C.leafLight}
            opacity={Math.sin(q * Math.PI)}
            transform={`translate(0 ${-200 * k}) rotate(${40 * q} ${x + 9} 357)`}
          />
        );
      })}
    </Svg>
  );
};

/* Ambient sky: two drifting clouds and one flock of birds ------------ */
const Cloud: React.FC<{ y: number; s: number; speed: number; from: number }> = ({ y, s, speed, from }) => {
  const { t } = useT();
  const x = from + ((t * speed) % 540);
  return (
    <g transform={`translate(${x > 480 ? x - 540 : x} ${y}) scale(${s})`}>
      <path d="M-60 0 a 18 18 0 0 1 22 -20 a 26 26 0 0 1 46 -6 a 20 20 0 0 1 30 14 a 14 14 0 0 1 2 12 Z" fill="#fff" stroke="#e4ddcb" strokeWidth="2" />
    </g>
  );
};

const Birds = () => {
  const { frame, fps, t } = useT();
  // One crossing per scene, from just after the transition in until just before the shortest scene ends.
  const p = interpolate(frame, [Math.round(0.6 * fps), Math.round(5.6 * fps)], [0, 1], CLAMP);
  if (p <= 0 || p >= 1) return null;
  const x = -60 + 520 * p;
  const y = -8 * Math.sin(p * Math.PI * 3);
  return (
    <g transform={`translate(${x} ${y})`}>
      {[
        { x: 0, y: 70 },
        { x: 26, y: 58 },
        { x: 18, y: 84 },
      ].map((b, i) => {
        const flap = 0.2 + 0.8 * Math.cos(((t + i * 0.15) / 0.6) * Math.PI * 2);
        return (
          <path
            key={i}
            d={`M${b.x - 9} ${b.y} Q ${b.x - 4} ${b.y - 6} ${b.x} ${b.y} Q ${b.x + 4} ${b.y - 6} ${b.x + 9} ${b.y}`}
            stroke={C.forest900}
            strokeOpacity={0.45}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            transform={scaleAt(1, b.x, b.y, flap)}
          />
        );
      })}
    </g>
  );
};

export const Sky = () => (
  <Svg
    style={{
      maskImage: "linear-gradient(to right, transparent, black 18%, black 82%, transparent)",
      WebkitMaskImage: "linear-gradient(to right, transparent, black 18%, black 82%, transparent)",
    }}
  >
    <Cloud y={48} s={0.9} speed={11} from={-40} />
    <Cloud y={96} s={0.6} speed={15} from={180} />
    <Birds />
  </Svg>
);

export const ART = [OldPalm, Burden, Truck, Factory, Bag, Delivery, Plant, Harvest, Green] as const;
export const BAG_SCENE = 4; // index of the scene without ambient sky
