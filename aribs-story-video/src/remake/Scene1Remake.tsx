import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, cycle, ease, pop, pulse } from "../anim";
import { Caption } from "../components/Caption";
import { Words } from "../components/Words";
import { FRAUNCES, INTER } from "../fonts";
import { C } from "../theme";
import { VO_START } from "../timeline";

// Test of the "3D cartoon" remake: one AI-rendered still per scene, brought to life with
// a phone-screen hook, slow camera push, parallax-free Ken Burns, particles and pop-up labels.

export const SCENE1_REMAKE_FRAMES = 285; // 9.5 s at 30 fps
const VO_AT = 42; // voiceover starts at 1.4 s

// Where the square still sits in each layout. Label positions below are fractions of the still.
const useFrameLayout = () => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return vertical
    ? { vertical, img: 1600, left: -220, top: 0, label: 1 } // full-bleed, text fades in at the bottom
    : { vertical, img: 1080, left: 840, top: 0, label: 0.85 }; // still on the right, text panel on the left
};

const Bubble: React.FC<{ text: string; x: number; y: number; delay: number; k: number }> = ({ text, x, y, delay, k }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, delay, 14);
  const bob = -6 * pulse(frame, fps, 3);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translateY(${bob}px) scale(${p})`, opacity: Math.min(1, p * 2) }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 60,
          padding: `${22 * k}px ${34 * k}px`,
          fontFamily: INTER,
          fontWeight: 600,
          fontSize: 44 * k,
          color: C.forest900,
          boxShadow: "0 18px 40px rgba(20,51,29,0.25)",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
      {/* Thought dots towards the farmer */}
      <div style={{ position: "absolute", left: 70, top: "100%", width: 26, height: 26, marginTop: 10, borderRadius: "50%", background: "#fff" }} />
      <div style={{ position: "absolute", left: 50, top: "100%", width: 15, height: 15, marginTop: 46, borderRadius: "50%", background: "#fff" }} />
    </div>
  );
};

const Tag: React.FC<{ text: string; x: number; y: number; delay: number; k: number }> = ({ text, x, y, delay, k }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, delay, 15);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${p})`,
        opacity: Math.min(1, p * 2),
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(255,255,255,0.95)",
        borderRadius: 999,
        padding: `${14 * k}px ${28 * k}px`,
        fontFamily: INTER,
        fontWeight: 600,
        fontSize: 38 * k,
        color: C.forest900,
        boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#e0513d" }} />
      {text}
    </div>
  );
};

// Dry leaves drifting down across the frame
const Leaves: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const k = size / 1600;
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const q = cycle(t, 5.5, i * 0.9 - 2);
        if (q < 0) return null;
        const x = k * (840 + ((i * 173) % 420) - 260 * q + 40 * Math.sin((q * 3 + i) * Math.PI));
        const y = k * (120 + 1100 * q);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 34 * Math.max(k, 0.8),
              height: 12 * Math.max(k, 0.8),
              borderRadius: "50%",
              background: i % 2 ? "#b8955a" : "#9c7a45",
              opacity: Math.sin(q * Math.PI) * 0.9,
              transform: `rotate(${q * 540 + i * 40}deg)`,
            }}
          />
        );
      })}
    </>
  );
};

const SceneContent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useFrameLayout();
  // Slow camera push towards the farmer, with a slight drift to the palm
  const zoom = interpolate(frame, [0, SCENE1_REMAKE_FRAMES], [1, L.vertical ? 1.12 : 1.1], CLAMP);
  const drift = interpolate(frame, [0, SCENE1_REMAKE_FRAMES], [0, L.vertical ? -30 : -20], CLAMP);
  const textIn = ease(frame, fps, 1.6, 0.8);
  const at = (fx: number) => fx * L.img;

  const counter = (
    <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 30, letterSpacing: "0.14em", color: C.leaf, opacity: textIn, transform: `translateY(${(1 - textIn) * 30}px)` }}>
      01 / 09
    </div>
  );
  const title = (
    <Words
      text="Old palms, no fruit"
      start={Math.round(1.7 * fps)}
      style={{ fontFamily: FRAUNCES, fontWeight: 600, fontSize: L.vertical ? 84 : 92, lineHeight: 1.05, color: "#fff" }}
    />
  );
  const caption = (
    <Sequence from={VO_AT - VO_START} layout="none">
      <Caption index={0} fontSize={L.vertical ? 34 : 34} />
    </Sequence>
  );

  return (
    <AbsoluteFill style={{ background: C.forest900, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: L.left,
          top: L.top,
          width: L.img,
          height: L.img,
          transform: `translateX(${drift}px) scale(${zoom})`,
          transformOrigin: "35% 40%",
        }}
      >
        <Img src={staticFile("remake/scene1.jpg")} style={{ width: "100%", height: "100%" }} />
        {/* Labels live in image space so they move with the camera */}
        <Bubble text="No dates this year…" x={at(0.35)} y={at(0.225)} delay={2.2} k={L.label} />
        <Tag text="No fruit" x={at(0.65)} y={at(0.706)} delay={3.0} k={L.label} />
        <Leaves size={L.img} />
      </div>
      {L.vertical ? (
        <>
          {/* Fade the picture into the brand green where the text sits */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 1180,
              bottom: 0,
              background: `linear-gradient(to bottom, rgba(20,51,29,0) 0%, rgba(20,51,29,0.92) 38%, ${C.forest900} 60%)`,
            }}
          />
          <div style={{ position: "absolute", left: 80, right: 80, top: 1360 }}>{counter}</div>
          <div style={{ position: "absolute", left: 80, right: 80, top: 1410 }}>{title}</div>
          <div style={{ position: "absolute", left: 80, right: 80, top: 1530, fontFamily: INTER }}>{caption}</div>
        </>
      ) : (
        <>
          {/* Soft edge where the still meets the text panel */}
          <div
            style={{
              position: "absolute",
              // Starts left of the still: the camera push widens the picture by up to ~60 px
              left: L.left - 120,
              top: 0,
              width: 440,
              bottom: 0,
              background: `linear-gradient(to right, ${C.forest900} 0%, ${C.forest900} 30%, rgba(20,51,29,0.7) 55%, rgba(20,51,29,0) 100%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 110,
              top: 0,
              width: 680,
              height: 1080,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 28,
              fontFamily: INTER,
            }}
          >
            {counter}
            {title}
            <div style={{ height: 190 }}>{caption}</div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

export const Scene1Remake: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Hook: the scene starts inside a phone screen, then the phone flies into full screen
  const grow = pop(frame, fps, 0.5, 16);
  const scale = interpolate(grow, [0, 1], [0.56, 1]);
  const radius = interpolate(grow, [0, 1], [76, 0]);
  const bezel = interpolate(grow, [0, 0.85, 1], [22, 22, 0], CLAMP);
  const tilt = interpolate(grow, [0, 1], [-7, 0]);
  const enter = pop(frame, fps, 0, 18);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${C.forest600} 0%, ${C.forest900} 70%)` }}>
      <AbsoluteFill
        style={{
          transform: `translateY(${(1 - enter) * 400}px) rotate(${tilt}deg) scale(${scale})`,
          borderRadius: radius,
          overflow: "hidden",
          boxShadow: `0 0 0 ${bezel}px #101512, 0 40px 90px rgba(0,0,0,${0.45 * (1 - grow)})`,
        }}
      >
        <SceneContent />
      </AbsoluteFill>
      <Sequence from={VO_AT} layout="none">
        <Audio src={staticFile("vo/01.mp3")} />
      </Sequence>
      <Audio src={staticFile("music/tender.mp3")} volume={(f) => interpolate(f, [0, 20, VO_AT, VO_AT + 10, SCENE1_REMAKE_FRAMES - 30, SCENE1_REMAKE_FRAMES], [0, 0.3, 0.3, 0.12, 0.12, 0], CLAMP)} />
      <Sequence from={14} layout="none">
        <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.35} />
      </Sequence>
      <Sequence from={Math.round(2.2 * fps) + 2} layout="none">
        <Audio src={staticFile("sfx/pop.mp3")} volume={0.25} />
      </Sequence>
      <Sequence from={Math.round(3.0 * fps) + 2} layout="none">
        <Audio src={staticFile("sfx/pop.mp3")} volume={0.25} />
      </Sequence>
    </AbsoluteFill>
  );
};
