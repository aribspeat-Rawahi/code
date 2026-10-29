import React from "react";
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { CLAMP } from "../anim";
import { labelTimes } from "../art/Labels";
import type { StoryProps } from "../story";
import { TRANSITION, VO_START, getTimeline } from "../timeline";

// Background music in three moods, cross-faded at the story's turning points,
// and dipped under the voiceover so every word stays clear.

const XFADE = 45; // frames
const DUCK = 0.4; // music level while someone speaks

type Timeline = ReturnType<typeof getTimeline>;

const voiceWindows = (props: StoryProps, tl: Timeline, fps: number) =>
  props.voiceover
    ? tl.starts.flatMap((start, i) => {
        const vo = props.voDurations?.[i];
        return vo ? [[start + VO_START, start + VO_START + Math.ceil(vo * fps)] as const] : [];
      })
    : [];

export const Music: React.FC<{ props: StoryProps }> = ({ props }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const tl = getTimeline(props);
  const windows = voiceWindows(props, tl, fps);
  const ramp = 8;
  const duck = (f: number) => {
    let speaking = 0;
    for (const [a, b] of windows) speaking = Math.max(speaking, interpolate(f, [a - ramp, a, b, b + ramp * 2], [0, 1, 1, 0], CLAMP));
    return 1 - (1 - DUCK) * speaking;
  };
  const master = (f: number) => interpolate(f, [0, fps, durationInFrames - 2 * fps, durationInFrames], [0, 1, 1, 0], CLAMP);

  // tender: intro + scenes 1-2 · hope: scenes 3-6 · uplift: scenes 7-9 + outro
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
                const fade = interpolate(abs, [from, from + (i ? XFADE : 1), to - (i < sections.length - 1 ? XFADE : 1), to], [0, 1, 1, 0], CLAMP);
                return props.music.volume * fade * duck(abs) * master(abs);
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};

const Sfx: React.FC<{ name: string; at: number; volume: number }> = ({ name, at, volume }) => (
  <Sequence from={Math.max(0, Math.round(at))} layout="none">
    <Audio src={staticFile(`sfx/${name}.mp3`)} volume={volume} />
  </Sequence>
);

/** Sounds for one scene; frame 0 = the moment its transition starts. */
export const SceneSfx: React.FC<{ index: number; props: StoryProps; slide: boolean; length: number }> = ({ index, props, slide, length }) => {
  const { fps } = useVideoConfig();
  const v = props.sfx.volume;
  const s = (sec: number) => sec * fps;
  const cues: { name: string; at: number; volume: number }[] = [{ name: slide ? "swoosh" : "whoosh", at: 0, volume: 0.32 }];

  for (const t of labelTimes(index, props.steps[index].labels)) cues.push({ name: "pop", at: s(t) + 2, volume: 0.22 });

  switch (index) {
    case 1: // trunks land
      for (let i = 0; i < 3; i++) cues.push({ name: "thud", at: s(0.55 + i * 0.3), volume: 0.4 });
      break;
    case 2: // van drives in and honks
      cues.push({ name: "engine", at: s(0.1), volume: 0.3 }, { name: "horn", at: s(1.5), volume: 0.2 });
      break;
    case 3: // factory running
      cues.push({ name: "hum", at: s(0.4), volume: 0.22 });
      break;
    case 4: // bag rises
      cues.push({ name: "chime", at: s(0.5), volume: 0.2 });
      break;
    case 5: // van arrives, farmer waves
      cues.push({ name: "engine", at: s(0.1), volume: 0.3 }, { name: "horn", at: s(1.6), volume: 0.2 });
      break;
    case 6: // water drops land
      for (let t = 3.0; s(t) < length - 10; t += 3.0) for (let i = 0; i < 3; i++) cues.push({ name: "drop", at: s(t + i * 0.6), volume: 0.25 });
      break;
    case 7:
      cues.push({ name: "birds", at: s(1.0), volume: 0.16 });
      break;
    case 8:
      cues.push({ name: "chime", at: s(0.8), volume: 0.22 }, { name: "birds", at: s(1.8), volume: 0.18 });
      break;
  }
  return (
    <>
      {cues
        .filter((c) => c.at < length)
        .map((c, i) => (
          <Sfx key={i} name={c.name} at={c.at} volume={c.volume * v} />
        ))}
    </>
  );
};

export const IntroSfx: React.FC<{ volume: number }> = ({ volume }) => <Sfx name="chime" at={3} volume={0.3 * volume} />;
export const OutroSfx: React.FC<{ volume: number }> = ({ volume }) => (
  <>
    <Sfx name="whoosh" at={0} volume={0.32 * volume} />
    <Sfx name="chime" at={TRANSITION} volume={0.28 * volume} />
  </>
);
