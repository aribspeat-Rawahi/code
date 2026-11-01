import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, cycle, ease, pad2, pop, pulse } from "../anim";
import { Caption } from "../components/Caption";
import { Words } from "../components/Words";
import { FRAUNCES, INTER } from "../fonts";
import { defaultStory } from "../story";
import { C } from "../theme";
import { VO_START } from "../timeline";
import { RemakeLabel, RemakeSceneConfig, VO_AT, remakeFrames } from "./config";

// 3D-style remake: one AI-rendered still per scene, brought to life with a camera push,
// particles, pop-up labels, camera shakes, voiceover, music and captions.
// Works in both 1080x1920 and 1920x1080.

const useFrameLayout = (c: RemakeSceneConfig) => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return vertical
    ? { vertical, img: 1600, left: c.frame.verticalLeft, top: 0, label: 1 } // full-bleed, text fades in at the bottom
    : { vertical, img: 1180, left: 740, top: -50, label: 0.8 }; // still on the right (slightly cropped top/bottom), text panel on the left
};

const Label: React.FC<{ l: RemakeLabel; size: number; k: number }> = ({ l, size, k }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, l.delay, l.kind === "tag" ? 15 : 14);
  const bob = l.kind === "tag" ? 0 : -6 * pulse(frame, fps, 3);
  const base: React.CSSProperties = {
    position: "absolute",
    left: l.x * size,
    top: l.y * size,
    transform: `translate(-50%, -50%) translateY(${bob}px) scale(${p})`,
    opacity: Math.min(1, p * 2),
    fontFamily: INTER,
    fontWeight: 600,
    color: C.forest900,
    whiteSpace: "nowrap",
  };
  if (l.kind === "sign") {
    // Green road sign with a thin white inner border
    return (
      <div style={{ ...base, transform: `translate(-50%, -50%) translateY(${(1 - p) * -40}px) rotate(${(1 - p) * -6}deg)`, color: "#fff" }}>
        <div
          style={{
            background: l.tone === "wood" ? "#a0703f" : l.tone === "banner" ? C.leaf : C.forest700,
            color: l.tone === "banner" ? C.forest900 : "#fff",
            borderRadius: 12 * k,
            padding: `${18 * k}px ${30 * k}px`,
            fontSize: 38 * k,
            boxShadow:
              l.tone === "wood"
                ? "inset 0 -6px 0 rgba(0,0,0,0.15), 0 14px 30px rgba(0,0,0,0.3)"
                : `inset 0 0 0 ${4 * k}px ${C.forest700}, inset 0 0 0 ${7 * k}px rgba(255,255,255,0.8), 0 14px 30px rgba(0,0,0,0.3)`,
          }}
        >
          {l.text}
        </div>
      </div>
    );
  }
  if (l.kind === "tag") {
    return (
      <div
        style={{
          ...base,
          display: "flex",
          alignItems: "center",
          gap: 14 * k,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 999,
          padding: `${14 * k}px ${28 * k}px`,
          fontSize: 38 * k,
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ width: 18 * k, height: 18 * k, borderRadius: "50%", background: l.dot ?? C.leaf }} />
        {l.text}
      </div>
    );
  }
  return (
    <div style={base}>
      <div
        style={{
          background: "#fff",
          borderRadius: l.kind === "thought" ? 60 : 24,
          padding: `${22 * k}px ${34 * k}px`,
          fontSize: 44 * k,
          boxShadow: "0 18px 40px rgba(20,51,29,0.25)",
        }}
      >
        {l.text}
      </div>
      {l.kind === "thought" ? (
        <>
          {/* Thought dots towards the speaker (down-left) */}
          <div style={{ position: "absolute", left: 70 * k, top: "100%", width: 26 * k, height: 26 * k, marginTop: 10 * k, borderRadius: "50%", background: "#fff" }} />
          <div style={{ position: "absolute", left: 50 * k, top: "100%", width: 15 * k, height: 15 * k, marginTop: 46 * k, borderRadius: "50%", background: "#fff" }} />
        </>
      ) : (
        <div
          style={{
            position: "absolute",
            ...(l.tail === "right" ? { right: 60 * k } : { left: 60 * k }),
            top: "100%",
            width: 0,
            height: 0,
            borderLeft: `${16 * k}px solid transparent`,
            borderRight: `${16 * k}px solid transparent`,
            borderTop: `${26 * k}px solid #fff`,
          }}
        />
      )}
    </div>
  );
};

const Particles: React.FC<{ kind: RemakeSceneConfig["particles"]; size: number; from?: { x: number; y: number } }> = ({ kind, size, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const k = size / 1600;
  if (kind === "leaves") {
    // Dry leaves drifting down
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
  }
  if (kind === "vanDust" && from) {
    // Dust puffs rolling back from the rear wheel
    return (
      <>
        {Array.from({ length: 7 }, (_, i) => {
          const q = cycle(t, 1.6, i * 0.23 - 1.6);
          if (q < 0) return null;
          const e = 1 - (1 - q) * (1 - q);
          const r = size * (0.03 + 0.09 * e);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: size * (from.x - 0.16 * e) - r,
                top: size * (from.y - 0.05 * e) - r,
                width: r * 2,
                height: r * 2,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(222,196,150,0.75) 0%, rgba(222,196,150,0) 70%)",
                opacity: 1 - q,
              }}
            />
          );
        })}
      </>
    );
  }
  if (kind === "dust") {
    // Warm dust motes floating up in the sunlight
    return (
      <>
        {Array.from({ length: 14 }, (_, i) => {
          const q = cycle(t, 6 + (i % 4), i * 0.55 - 4);
          if (q < 0) return null;
          const x = k * (200 + ((i * 211) % 1250) + 50 * Math.sin((q * 2 + i * 0.3) * Math.PI));
          const y = k * (1450 - 700 * q - ((i * 97) % 300));
          const r = (4 + (i % 3) * 3) * Math.max(k, 0.8);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: r,
                height: r,
                borderRadius: "50%",
                background: "#fff3d6",
                boxShadow: `0 0 ${r * 2}px #ffe2a8`,
                opacity: Math.sin(q * Math.PI) * 0.75,
              }}
            />
          );
        })}
      </>
    );
  }
  return null;
};

// Scene-specific effects: chimney steam, gold sparkles, falling water drops, a water gauge
const Effects: React.FC<{ c: RemakeSceneConfig; size: number; k: number }> = ({ c, size, k }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const fill = 0.12 + 0.76 * ease(frame, fps, 1.4, 3);
  return (
    <>
      {c.steam
        ? [0, 1, 2, 3].map((i) => {
            const q = cycle(t, 3, i * 0.75 - 3);
            if (q < 0) return null;
            const e = 1 - (1 - q) * (1 - q);
            const r = size * (0.025 + 0.05 * e);
            return (
              <div
                key={`steam-${i}`}
                style={{
                  position: "absolute",
                  left: size * (c.steam!.x + 0.03 * e) - r,
                  top: size * (c.steam!.y - 0.14 * e) - r,
                  width: r * 2,
                  height: r * 2,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 70%)",
                  opacity: 1 - q,
                }}
              />
            );
          })
        : null}
      {c.sparkles
        ? Array.from({ length: 6 }, (_, i) => {
            const q = cycle(t, 1.4, 0.4 + i * 0.37, 0.5);
            if (q < 0) return null;
            const sx = c.sparkles!.x + c.sparkles!.w * (((i * 37) % 100) / 100);
            const sy = c.sparkles!.y + c.sparkles!.h * (((i * 61) % 100) / 100);
            const sc = Math.sin(q * Math.PI);
            const d = 26 * Math.max(k, 0.8);
            return (
              <svg
                key={`spark-${i}`}
                viewBox="-10 -10 20 20"
                width={d}
                height={d}
                style={{ position: "absolute", left: sx * size - d / 2, top: sy * size - d / 2, transform: `scale(${sc}) rotate(${q * 90}deg)`, overflow: "visible" }}
              >
                <path d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z" fill="#ffd866" style={{ filter: "drop-shadow(0 0 4px #ffe9a8)" }} />
              </svg>
            );
          })
        : null}
      {c.drops
        ? Array.from({ length: 4 }, (_, i) => {
            const q = cycle(t, 1.1, 1.0 + i * 0.7, 0.3);
            if (q < 0) return null;
            const w = 16 * Math.max(k, 0.8);
            return (
              <div
                key={`drop-${i}`}
                style={{
                  position: "absolute",
                  left: size * (c.drops!.x + 0.04 * Math.sin(i * 2.1)) - w / 2,
                  top: size * (c.drops!.y + (c.drops!.to - c.drops!.y) * q * q),
                  width: w,
                  height: w * 1.4,
                  borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                  background: "linear-gradient(160deg, #d8f1ff 0%, #6fc0ef 70%)",
                  boxShadow: "0 0 8px rgba(111,192,239,0.7)",
                  opacity: Math.min(1, Math.sin(q * Math.PI) * 1.6),
                }}
              />
            );
          })
        : null}
      {c.gauge ? (
        <div
          style={{
            position: "absolute",
            left: size * c.gauge.x,
            top: size * c.gauge.y,
            transform: `translate(-50%, 0) scale(${pop(frame, fps, 1.0, 16)})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10 * k,
          }}
        >
          <div style={{ width: 54 * k, height: 260 * k, borderRadius: 30 * k, background: "rgba(255,255,255,0.92)", border: `${4 * k}px solid ${C.forest700}`, padding: 6 * k, display: "flex", alignItems: "flex-end", boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}>
            <div style={{ width: "100%", height: `${fill * 100}%`, borderRadius: 22 * k, background: "linear-gradient(to top, #3a9ad9, #8fd3fa)" }} />
          </div>
          <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 34 * k, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{Math.round(fill * 100)}%</div>
        </div>
      ) : null}
    </>
  );
};

const SceneContent: React.FC<{ c: RemakeSceneConfig }> = ({ c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useFrameLayout(c);
  const total = remakeFrames(c);
  const t = frame / fps;
  const step = defaultStory.steps[c.index];

  // Slow camera push, a little drift, and a short shake on every thud
  const zoom = interpolate(frame, [0, total], [1, L.vertical ? c.camera.zoom : c.camera.zoom - 0.02], CLAMP);
  const drift = interpolate(frame, [0, total], [0, L.vertical ? c.camera.drift : (c.camera.drift * 2) / 3], CLAMP);
  let shake = 0;
  for (const at of c.thuds ?? []) {
    const d = t - at;
    if (d >= 0 && d < 0.5) shake += 12 * Math.exp(-d * 9) * Math.sin(d * 55);
  }
  const textIn = ease(frame, fps, 1.6, 0.8);

  const counter = (
    <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 30, letterSpacing: "0.14em", color: C.leaf, opacity: textIn, transform: `translateY(${(1 - textIn) * 30}px)` }}>
      {pad2(c.index + 1)} / {pad2(defaultStory.steps.length)}
    </div>
  );
  const title = (
    <Words text={step.title} start={Math.round(1.7 * fps)} style={{ fontFamily: FRAUNCES, fontWeight: 600, fontSize: L.vertical ? 84 : 92, lineHeight: 1.05, color: "#fff" }} />
  );
  const caption = (
    <Sequence from={VO_AT - VO_START} layout="none">
      <Caption index={c.index} fontSize={34} />
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
          transform: `translate(${drift}px, ${shake}px) scale(${zoom})`,
          transformOrigin: c.camera.origin,
          // Keep particles (e.g. van dust) inside the picture
          overflow: "hidden",
        }}
      >
        <Img src={staticFile(`remake/${c.image}`)} style={{ width: "100%", height: "100%" }} />
        {/* Labels and particles live in image space so they move with the camera */}
        <Particles kind={c.particles} size={L.img} from={c.vanDust} />
        <Effects c={c} size={L.img} k={L.label} />
        {c.labels.map((l) => (
          <Label key={l.text} l={l} size={L.img} k={L.label} />
        ))}
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
          {/* Soft edge where the still meets the text panel; starts left of the still because the push widens it */}
          <div
            style={{
              position: "absolute",
              left: L.left - 120,
              top: 0,
              width: 320,
              bottom: 0,
              background: `linear-gradient(to right, ${C.forest900} 0%, ${C.forest900} 30%, rgba(20,51,29,0.7) 55%, rgba(20,51,29,0) 100%)`,
            }}
          />
          <div style={{ position: "absolute", left: 110, top: 0, width: 590, height: 1080, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28, fontFamily: INTER }}>
            {counter}
            {title}
            <div style={{ height: 190 }}>{caption}</div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

const Sfx: React.FC<{ name: string; at: number; volume: number }> = ({ name, at, volume }) => (
  <Sequence from={Math.round(at)} layout="none">
    <Audio src={staticFile(`sfx/${name}.mp3`)} volume={volume} />
  </Sequence>
);

// standalone = render one scene on its own (own entrance and music).
// In the full film the transitions and one continuous music track are handled by RemakeFilm.
export const RemakeScene: React.FC<{ c: RemakeSceneConfig; standalone?: boolean }> = ({ c, standalone = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = remakeFrames(c);

  let wrapper: React.CSSProperties;
  if (c.hook === "phone") {
    // The scene starts inside a phone screen, then the phone flies into full screen
    const grow = pop(frame, fps, 0.5, 16);
    const enter = pop(frame, fps, 0, 18);
    const bezel = interpolate(grow, [0, 0.85, 1], [22, 22, 0], CLAMP);
    wrapper = {
      transform: `translateY(${(1 - enter) * 400}px) rotate(${interpolate(grow, [0, 1], [-7, 0])}deg) scale(${interpolate(grow, [0, 1], [0.56, 1])})`,
      borderRadius: interpolate(grow, [0, 1], [76, 0]),
      overflow: "hidden",
      boxShadow: `0 0 0 ${bezel}px #101512, 0 40px 90px rgba(0,0,0,${0.45 * (1 - grow)})`,
    };
  } else if (!standalone) {
    wrapper = {};
  } else {
    // Circle opening from the centre
    const r = interpolate(frame, [0, 20], [0, 75], { ...CLAMP, easing: (v) => 1 - (1 - v) ** 3 });
    wrapper = { clipPath: `circle(${r}% at 50% 50%)` };
  }

  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${C.forest600} 0%, ${C.forest900} 70%)` }}>
      <AbsoluteFill style={wrapper}>
        <SceneContent c={c} />
      </AbsoluteFill>
      <Sequence from={VO_AT} layout="none">
        <Audio src={staticFile(`vo/${pad2(c.index + 1)}.mp3`)} />
      </Sequence>
      {standalone ? (
        <Audio
          src={staticFile(`music/${c.music}.mp3`)}
          volume={(f) => interpolate(f, [0, 20, VO_AT, VO_AT + 10, total - 30, total], [0, 0.3, 0.3, 0.12, 0.12, 0], CLAMP)}
        />
      ) : null}
      <Sfx name="whoosh" at={c.hook === "phone" ? 14 : 0} volume={0.35} />
      {c.labels.map((l) => (
        <Sfx key={l.text} name="pop" at={l.delay * fps + 2} volume={0.25} />
      ))}
      {(c.sfx ?? []).map((x) => (
        <Sfx key={`${x.name}-${x.at}`} name={x.name} at={x.at * fps} volume={x.volume} />
      ))}
      {c.drops
        ? [0, 1, 2, 3].map((i) => <Sfx key={`drop-${i}`} name="drop" at={(1.0 + i * 0.7 + 1.1) * fps} volume={0.25} />)
        : null}
      {(c.thuds ?? []).map((s) => (
        <Sfx key={s} name="thud" at={s * fps} volume={0.45} />
      ))}
    </AbsoluteFill>
  );
};
