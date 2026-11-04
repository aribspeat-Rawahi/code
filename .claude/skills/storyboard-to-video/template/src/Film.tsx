import React from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { CLAMP, pop } from "./anim";
import { BrandContext, useBrand } from "./brand";
import { circleReveal } from "./circleReveal";
import { Scene } from "./Scene";
import { COVER, INTRO, OUTRO, T, VO_AT, textSettings, timeline, voEnd } from "./story";
import type { Storyboard } from "./types";
import { Words } from "./Words";

// The whole film from one storyboard: optional cover, intro, scenes, outro,
// with one music track that follows each scene's mood and dips under the voice.

const XFADE = 45;

// The campaign thumbnail, slowly pushing in
const Cover: React.FC<{ sb: Storyboard }> = ({ sb }) => {
  const b = useBrand();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const zoom = interpolate(frame, [0, COVER], [1, 1.04], CLAMP);
  const src = height > width ? (sb.cover?.vertical ?? sb.cover?.landscape) : (sb.cover?.landscape ?? sb.cover?.vertical);
  return (
    <AbsoluteFill style={{ background: b.dark }}>
      {src ? <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} /> : null}
    </AbsoluteFill>
  );
};

const Bg: React.FC = () => {
  const b = useBrand();
  return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${b.mid} 0%, ${b.dark} 72%)` }} />;
};

const Intro: React.FC<{ sb: Storyboard }> = ({ sb }) => {
  const tx = textSettings(sb);
  const b = useBrand();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const logo = pop(frame, fps, 0.1, 14);
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50, padding: vertical ? "120px 90px 250px" : 80 }}>
        <Img src={staticFile(b.logo)} style={{ width: vertical ? 300 : 250, height: vertical ? 300 : 250, transform: `scale(${logo})` }} />
        <Words
          text={sb.intro.title}
          start={Math.round(0.7 * fps)}
          stagger={4}
          style={{
            fontFamily: tx.titleFont,
            fontWeight: tx.dir === "rtl" ? 700 : 600,
            fontSize: vertical ? 104 : 112,
            lineHeight: tx.dir === "rtl" ? 1.35 : 1.08,
            color: "#fff",
            textAlign: "center",
            maxWidth: vertical ? 900 : 1500,
            direction: tx.dir,
          }}
        />
      </AbsoluteFill>
      <Sequence from={3} layout="none">
        <Audio src={staticFile("sfx/chime.mp3")} volume={0.3} />
      </Sequence>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ sb: Storyboard }> = ({ sb }) => {
  const tx = textSettings(sb);
  const b = useBrand();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const at = (sec: number) => pop(frame - T, fps, sec, 16);
  const zoom = interpolate(frame, [0, OUTRO], [1.08, 1], CLAMP); // gentle zoom-out
  const fs = 44;
  const o = sb.outro;
  const contacts = o.contacts ?? [];
  return (
    <AbsoluteFill style={{ fontFamily: tx.bodyFont, direction: tx.dir }}>
      <Bg />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: vertical ? "120px 80px 250px" : 80, transform: `scale(${zoom})` }}>
        <Img src={staticFile(b.logo)} style={{ width: vertical ? 230 : 190, height: vertical ? 230 : 190, transform: `scale(${at(0)})` }} />
        <div style={{ marginTop: 34, fontFamily: tx.titleFont, fontWeight: tx.dir === "rtl" ? 700 : 600, fontSize: vertical ? 80 : 86, lineHeight: tx.dir === "rtl" ? 1.35 : 1.08, color: "#fff", opacity: at(0.3), maxWidth: vertical ? 900 : 1600 }}>
          {o.headline}
        </div>
        <div style={{ marginTop: 18, fontSize: 44, color: b.light, opacity: at(0.6) }}>{o.subline ?? ""}</div>
        <div style={{ marginTop: 60, display: "flex", flexDirection: vertical ? "column" : "row", gap: vertical ? 26 : 56 }}>
          {contacts.map((text, i) => {
            const p = at(1 + i * 0.25);
            return (
              <div
                key={text}
                style={{ fontSize: fs, fontWeight: 600, color: "#fff", opacity: p, transform: `translateY(${(1 - p) * 24}px)`, display: "flex", alignItems: "center", gap: 16 }}
              >
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: b.accent }} />
                {text}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Sequence from={T} layout="none">
        <Audio src={staticFile("sfx/chime.mp3")} volume={0.28} />
      </Sequence>
    </AbsoluteFill>
  );
};


// Music sections follow consecutive runs of the same scene mood (public/music/<mood>.mp3)
const Music: React.FC<{ sb: Storyboard }> = ({ sb }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const tl = timeline(sb);
  const windows = sb.scenes.map((s, i) => [tl.starts[i] + VO_AT, tl.starts[i] + VO_AT + Math.ceil(voEnd(s) * fps)] as const);
  const duck = (f: number) => {
    let s = 0;
    for (const [a, z] of windows) s = Math.max(s, interpolate(f, [a - 8, a, z, z + 16], [0, 1, 1, 0], CLAMP));
    return 1 - 0.6 * s;
  };
  const master = (f: number) => interpolate(f, [0, fps, durationInFrames - 2 * fps, durationInFrames], [0, 1, 1, 0], CLAMP);
  const sections: { file: string; from: number; to: number }[] = [];
  sb.scenes.forEach((s, i) => {
    const mood = s.mood ?? "hope";
    const last = sections[sections.length - 1];
    if (last && last.file === mood) return;
    if (last) last.to = tl.starts[i];
    sections.push({ file: mood, from: i === 0 ? 0 : tl.starts[i], to: durationInFrames });
  });
  return (
    <>
      {sections.map((s, i) => {
        const from = Math.max(0, s.from - (i ? XFADE / 2 : 0));
        const to = Math.min(durationInFrames, s.to + (i < sections.length - 1 ? XFADE / 2 : 0));
        return (
          <Sequence key={`${s.file}-${i}`} from={from} durationInFrames={to - from} layout="none">
            <Audio
              src={staticFile(`music/${s.file}.mp3`)}
              loop
              volume={(f) => {
                const abs = from + f;
                const fadeIn = interpolate(abs, [from, from + (i ? XFADE : 1), to - (i < sections.length - 1 ? XFADE : 1), to], [0, 1, 1, 0], CLAMP);
                return 0.3 * fadeIn * duck(abs) * master(abs);
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};

export const Film: React.FC<{ sb: Storyboard }> = ({ sb }) => {
  const tl = timeline(sb);
  const timing = linearTiming({ durationInFrames: T, easing: Easing.inOut(Easing.cubic) });
  const parts: React.ReactNode[] = [];
  if (sb.cover) {
    parts.push(
      <TransitionSeries.Sequence key="cover" durationInFrames={COVER}>
        <Cover sb={sb} />
      </TransitionSeries.Sequence>,
      <TransitionSeries.Transition key="t-cover" timing={timing} presentation={fade()} />,
    );
  }
  parts.push(
    <TransitionSeries.Sequence key="intro" durationInFrames={INTRO}>
      <Intro sb={sb} />
    </TransitionSeries.Sequence>,
  );
  sb.scenes.forEach((c, i) => {
    const tr = c.transitionIn ?? (i === 0 ? "fade" : "circle");
    parts.push(
      tr === "fade" ? (
        <TransitionSeries.Transition key={`t${i}`} timing={timing} presentation={fade()} />
      ) : tr === "slide" ? (
        <TransitionSeries.Transition key={`t${i}`} timing={timing} presentation={slide({ direction: "from-right" })} />
      ) : (
        <TransitionSeries.Transition key={`t${i}`} timing={timing} presentation={circleReveal()} />
      ),
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={tl.lens[i]}>
        <Scene c={{ ...c, hook: c.hook ?? (i === 0 ? "phone" : "reveal") }} sb={sb} />
      </TransitionSeries.Sequence>,
    );
  });
  parts.push(
    <TransitionSeries.Transition key="t-outro" timing={timing} presentation={circleReveal()} />,
    <TransitionSeries.Sequence key="outro" durationInFrames={OUTRO}>
      <Outro sb={sb} />
    </TransitionSeries.Sequence>,
  );
  return (
    <BrandContext.Provider value={sb.brand}>
      <AbsoluteFill style={{ background: sb.brand.dark }}>
        <TransitionSeries>{parts}</TransitionSeries>
        <Music sb={sb} />
      </AbsoluteFill>
    </BrandContext.Provider>
  );
};
