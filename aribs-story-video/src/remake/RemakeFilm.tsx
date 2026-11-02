import React from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { CLAMP, pop } from "../anim";
import { Words } from "../components/Words";
import { C, LOGO } from "../theme";
import { circleReveal } from "../transitions/circleReveal";
import { REMAKE_SCENES, VO_AT, remakeFrames } from "./config";
import { RemakeScene } from "./RemakeScene";
import { LANG, Lang, voDuration } from "./lang";

// The full 3D-style film: intro, the nine scenes, outro, with one continuous music track.

const T = 18; // transition frames
const INTRO = 90;
const OUTRO = 180;
const XFADE = 45;
const SLIDE_INTO = new Set([3, 5]); // van scenes slide sideways into scene 4 and scene 6 (0-based index)

export const filmTimeline = (lang: Lang = "en") => {
  const lens = REMAKE_SCENES.map((c) => remakeFrames(c, lang));
  const starts: number[] = [];
  let at = INTRO - T;
  for (const len of lens) {
    starts.push(at);
    at += len - T;
  }
  return { lens, starts, outroStart: at, total: at + OUTRO };
};


const Bg: React.FC = () => <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${C.forest600} 0%, ${C.forest900} 72%)` }} />;

const Intro: React.FC<{ lang: Lang }> = ({ lang }) => {
  const tx = LANG[lang];
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const logo = pop(frame, fps, 0.1, 14);
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50, padding: vertical ? "120px 90px 250px" : 80 }}>
        <Img src={staticFile(LOGO)} style={{ width: vertical ? 300 : 250, height: vertical ? 300 : 250, transform: `scale(${logo})` }} />
        <Words
          text={tx.intro}
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

const Outro: React.FC<{ lang: Lang }> = ({ lang }) => {
  const tx = LANG[lang];
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const at = (sec: number) => pop(frame - T, fps, sec, 16);
  const zoom = interpolate(frame, [0, OUTRO], [1.08, 1], CLAMP); // gentle zoom-out
  const fs = 44;
  const o = tx.outro;
  const contacts = o.contacts;
  return (
    <AbsoluteFill style={{ fontFamily: tx.bodyFont, direction: tx.dir }}>
      <Bg />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: vertical ? "120px 80px 250px" : 80, transform: `scale(${zoom})` }}>
        <Img src={staticFile(LOGO)} style={{ width: vertical ? 230 : 190, height: vertical ? 230 : 190, transform: `scale(${at(0)})` }} />
        <div style={{ marginTop: 34, fontFamily: tx.titleFont, fontWeight: tx.dir === "rtl" ? 700 : 600, fontSize: vertical ? 80 : 86, lineHeight: tx.dir === "rtl" ? 1.35 : 1.08, color: "#fff", opacity: at(0.3), maxWidth: vertical ? 900 : 1600 }}>
          {o.headline}
        </div>
        <div style={{ marginTop: 18, fontSize: 44, color: C.leafLight, opacity: at(0.6) }}>{o.subline}</div>
        <div style={{ marginTop: 60, display: "flex", flexDirection: vertical ? "column" : "row", gap: vertical ? 26 : 56 }}>
          {contacts.map((text, i) => {
            const p = at(1 + i * 0.25);
            return (
              <div
                key={text}
                style={{ fontSize: fs, fontWeight: 600, color: "#fff", opacity: p, transform: `translateY(${(1 - p) * 24}px)`, display: "flex", alignItems: "center", gap: 16 }}
              >
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: C.leaf }} />
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

// One music track in three moods, cross-faded at the turning points and dipped under every voice line
const Music: React.FC<{ lang: Lang }> = ({ lang }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const tl = filmTimeline(lang);
  const windows = REMAKE_SCENES.map((c, i) => [tl.starts[i] + VO_AT, tl.starts[i] + VO_AT + Math.ceil(voDuration(lang, c.index) * fps)] as const);
  const duck = (f: number) => {
    let s = 0;
    for (const [a, b] of windows) s = Math.max(s, interpolate(f, [a - 8, a, b, b + 16], [0, 1, 1, 0], CLAMP));
    return 1 - 0.6 * s;
  };
  const master = (f: number) => interpolate(f, [0, fps, durationInFrames - 2 * fps, durationInFrames], [0, 1, 1, 0], CLAMP);
  const sections = [
    { file: "tender", from: 0, to: tl.starts[2] },
    { file: "hope", from: tl.starts[2], to: tl.starts[6] },
    { file: "uplift", from: tl.starts[6], to: durationInFrames },
  ];
  return (
    <>
      {sections.map((s, i) => {
        const from = Math.max(0, s.from - (i ? XFADE / 2 : 0));
        const to = Math.min(durationInFrames, s.to + (i < sections.length - 1 ? XFADE / 2 : 0));
        return (
          <Sequence key={s.file} from={from} durationInFrames={to - from} layout="none">
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

export const RemakeFilm: React.FC<{ lang?: Lang }> = ({ lang = "en" }) => {
  const tl = filmTimeline(lang);
  const timing = linearTiming({ durationInFrames: T, easing: Easing.inOut(Easing.cubic) });
  const parts: React.ReactNode[] = [
    <TransitionSeries.Sequence key="intro" durationInFrames={INTRO}>
      <Intro lang={lang} />
    </TransitionSeries.Sequence>,
  ];
  REMAKE_SCENES.forEach((c, i) => {
    parts.push(
      i === 0 ? (
        <TransitionSeries.Transition key={`t${i}`} timing={timing} presentation={fade()} />
      ) : SLIDE_INTO.has(i) ? (
        <TransitionSeries.Transition key={`t${i}`} timing={timing} presentation={slide({ direction: "from-right" })} />
      ) : (
        <TransitionSeries.Transition key={`t${i}`} timing={timing} presentation={circleReveal()} />
      ),
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={tl.lens[i]}>
        <RemakeScene c={c} standalone={false} lang={lang} />
      </TransitionSeries.Sequence>,
    );
  });
  parts.push(
    <TransitionSeries.Transition key="t-outro" timing={timing} presentation={circleReveal()} />,
    <TransitionSeries.Sequence key="outro" durationInFrames={OUTRO}>
      <Outro lang={lang} />
    </TransitionSeries.Sequence>,
  );
  return (
    <AbsoluteFill style={{ background: C.forest900 }}>
      <TransitionSeries>{parts}</TransitionSeries>
      <Music lang={lang} />
    </AbsoluteFill>
  );
};
