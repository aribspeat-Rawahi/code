import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, cycle, ease, pop, pulse } from "./anim";
import { alpha, useBrand } from "./brand";
import { VO_AT, sceneFrames, textSettings } from "./story";
import type { Cue, Label as LabelT, Scene as SceneT, Storyboard } from "./types";
import { Words } from "./Words";

// One storyboard scene: a square still brought to life with a camera push, particles,
// pop-up labels, camera shakes, voiceover and captions. Works in 1080x1920 and 1920x1080.

const useFrameLayout = (c: SceneT) => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return vertical
    ? { vertical, img: 1600, left: c.frame?.verticalLeft ?? -260, top: 0, label: 1 } // full-bleed, text fades in at the bottom
    : { vertical, img: 1180, left: 740, top: -50, label: 0.8 }; // still on the right (slightly cropped top/bottom), text panel on the left
};

const Label: React.FC<{ l: LabelT; size: number; k: number; font: string; dir: "ltr" | "rtl" }> = ({ l, size, k, font, dir }) => {
  const b = useBrand();
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
    fontFamily: font,
    direction: dir,
    fontWeight: 600,
    color: b.dark,
    whiteSpace: "nowrap",
  };
  if (l.kind === "sign") {
    // Green road sign with a thin white inner border
    return (
      <div style={{ ...base, transform: `translate(-50%, -50%) translateY(${(1 - p) * -40}px) rotate(${(1 - p) * -6}deg)`, color: "#fff" }}>
        <div
          style={{
            background: l.tone === "wood" ? "#a0703f" : l.tone === "banner" ? b.accent : b.mid,
            color: l.tone === "banner" ? b.dark : "#fff",
            borderRadius: 12 * k,
            padding: `${18 * k}px ${30 * k}px`,
            fontSize: 38 * k,
            boxShadow:
              l.tone === "wood"
                ? "inset 0 -6px 0 rgba(0,0,0,0.15), 0 14px 30px rgba(0,0,0,0.3)"
                : `inset 0 0 0 ${4 * k}px ${b.mid}, inset 0 0 0 ${7 * k}px rgba(255,255,255,0.8), 0 14px 30px rgba(0,0,0,0.3)`,
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
        <div style={{ width: 18 * k, height: 18 * k, borderRadius: "50%", background: l.dot ?? b.accent }} />
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
          boxShadow: `0 18px 40px ${alpha(b.dark, 0.25)}`,
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

const Particles: React.FC<{ kind: SceneT["particles"]; size: number; from?: { x: number; y: number } }> = ({ kind, size, from }) => {
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
const Effects: React.FC<{ c: SceneT; size: number; k: number; numFont: string }> = ({ c, size, k, numFont }) => {
  const b = useBrand();
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
          <div style={{ width: 54 * k, height: 260 * k, borderRadius: 30 * k, background: "rgba(255,255,255,0.92)", border: `${4 * k}px solid ${b.mid}`, padding: 6 * k, display: "flex", alignItems: "flex-end", boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}>
            <div style={{ width: "100%", height: `${fill * 100}%`, borderRadius: 22 * k, background: "linear-gradient(to top, #3a9ad9, #8fd3fa)" }} />
          </div>
          <div style={{ fontFamily: numFont, fontWeight: 600, fontSize: 34 * k, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{Math.round(fill * 100)}%</div>
        </div>
      ) : null}
    </>
  );
};

// Caption of the line being spoken; frame 0 = start of the voiceover
const Caption: React.FC<{ cues: Cue[]; fontSize: number; font: string; dir: "ltr" | "rtl" }> = ({ cues, fontSize, font, dir }) => {
  const b = useBrand();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cue = cues.find((q) => t >= q.start - 0.1 && t <= q.end + 0.25);
  if (!cue) return null;
  const opacity = interpolate(t, [cue.start - 0.1, cue.start + 0.05, cue.end + 0.1, cue.end + 0.25], [0, 1, 1, 0], CLAMP);
  return (
    <div
      style={{
        opacity,
        direction: dir,
        background: alpha(b.dark, 0.9),
        color: "#fff",
        borderRadius: 18,
        padding: `${fontSize * 0.4}px ${fontSize * 0.65}px`,
        fontFamily: font,
        fontSize,
        lineHeight: dir === "rtl" ? 1.6 : 1.35,
        fontWeight: 600,
      }}
    >
      {cue.text}
    </div>
  );
};

const SceneContent: React.FC<{ c: SceneT; sb: Storyboard }> = ({ c, sb }) => {
  const b = useBrand();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useFrameLayout(c);
  const total = sceneFrames(c);
  const t = frame / fps;
  const T = textSettings(sb);
  const rtl = T.rtl;
  const labels = c.labels ?? [];
  const cam = { origin: c.camera?.origin ?? "50% 45%", zoom: c.camera?.zoom ?? 1.1, drift: c.camera?.drift ?? 0 };

  // Slow camera push, a little drift, and a short shake on every thud
  const zoom = interpolate(frame, [0, total], [1, L.vertical ? cam.zoom : cam.zoom - 0.02], CLAMP);
  const drift = interpolate(frame, [0, total], [0, L.vertical ? cam.drift : (cam.drift * 2) / 3], CLAMP);
  let shake = 0;
  for (const at of c.thuds ?? []) {
    const d = t - at;
    if (d >= 0 && d < 0.5) shake += 12 * Math.exp(-d * 9) * Math.sin(d * 55);
  }
  const title = (
    <Words
      text={c.title}
      start={Math.round(1.7 * fps)}
      style={{ fontFamily: T.titleFont, fontWeight: rtl ? 700 : 600, fontSize: L.vertical ? 84 : 92, lineHeight: rtl ? 1.3 : 1.05, color: "#fff", direction: T.dir }}
    />
  );
  const caption = (
    <Sequence from={VO_AT} layout="none">
      <Caption cues={c.captions ?? []} fontSize={rtl ? 36 : 34} font={T.bodyFont} dir={T.dir} />
    </Sequence>
  );

  return (
    <AbsoluteFill style={{ background: b.dark, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: L.left,
          top: L.top,
          width: L.img,
          height: L.img,
          transform: `translate(${drift}px, ${shake}px) scale(${zoom})`,
          transformOrigin: cam.origin,
          // Keep particles (e.g. van dust) inside the picture
          overflow: "hidden",
        }}
      >
        <Img src={staticFile(c.image)} style={{ width: "100%", height: "100%" }} />
        {/* Labels and particles live in image space so they move with the camera */}
        <Particles kind={c.particles ?? "none"} size={L.img} from={c.vanDust} />
        <Effects c={c} size={L.img} k={L.label} numFont={T.bodyFont} />
        {labels.map((l, j) => (
          <Label key={j} l={l} size={L.img} k={L.label} font={T.bodyFont} dir={T.dir} />
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
              background: `linear-gradient(to bottom, ${alpha(b.dark, 0)} 0%, ${alpha(b.dark, 0.92)} 38%, ${b.dark} 60%)`,
            }}
          />
          <div style={{ position: "absolute", left: 80, right: 80, top: 1410, textAlign: rtl ? "right" : "left" }}>{title}</div>
          <div style={{ position: "absolute", left: 80, right: 80, top: rtl ? 1545 : 1530 }}>{caption}</div>
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
              background: `linear-gradient(to right, ${b.dark} 0%, ${b.dark} 30%, ${alpha(b.dark, 0.7)} 55%, ${alpha(b.dark, 0)} 100%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 110,
              top: 0,
              width: 590,
              height: 1080,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 28,
              textAlign: rtl ? "right" : "left",
            }}
          >
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

// Transitions and the continuous music track are handled by Film.
export const Scene: React.FC<{ c: SceneT; sb: Storyboard }> = ({ c, sb }) => {
  const b = useBrand();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
  } else {
    wrapper = {};
  }

  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${b.mid} 0%, ${b.dark} 70%)` }}>
      <AbsoluteFill style={wrapper}>
        <SceneContent c={c} sb={sb} />
      </AbsoluteFill>
      <Sequence from={VO_AT} layout="none">
        {c.voFile ? <Audio src={staticFile(c.voFile)} /> : null}
      </Sequence>
      <Sfx name="whoosh" at={c.hook === "phone" ? 14 : 0} volume={0.35} />
      {(c.labels ?? []).map((l, j) => (
        <Sfx key={j} name="pop" at={l.delay * fps + 2} volume={0.25} />
      ))}
      {(c.sfx ?? []).map((x) => (
        <Sfx key={`${x.name}-${x.at}`} name={x.name} at={x.at * fps} volume={x.volume} />
      ))}
      {(c.thuds ?? []).map((s) => (
        <Sfx key={s} name="thud" at={s * fps} volume={0.45} />
      ))}
    </AbsoluteFill>
  );
};
