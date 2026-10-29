import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, cancelRender, continueRender, delayRender, interpolate, staticFile, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { CLAMP, pad2 } from "./anim";
import { Intro } from "./components/Intro";
import { Outro } from "./components/Outro";
import { Scene } from "./components/Scene";
import type { StoryProps } from "./story";
import { BAG, LOGO } from "./theme";
import { TRANSITION, VO_START, getTimeline } from "./timeline";
import { circleReveal } from "./transitions/circleReveal";

const timing = linearTiming({ durationInFrames: TRANSITION, easing: Easing.inOut(Easing.cubic) });
// Van scenes slide sideways, in the direction the van drives (left to right).
const SLIDE_AFTER = new Set([2, 4]); // after scene 3 and scene 5 (0-based)

// SVG <image> does not wait for loading, so decode the logo and bag before any frame is captured.
const usePreloadImages = () => {
  const [handle] = useState(() => delayRender("Preloading images"));
  useEffect(() => {
    Promise.all(
      [LOGO, BAG].map((src) => {
        const img = new Image();
        img.src = staticFile(src);
        return img.decode();
      }),
    )
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [handle]);
};

const Music: React.FC<{ file: string; volume: number }> = ({ file, volume }) => {
  const { durationInFrames, fps } = useVideoConfig();
  return (
    <Audio
      src={staticFile(file)}
      volume={(f) => interpolate(f, [0, fps, durationInFrames - 2 * fps, durationInFrames], [0, volume, volume, 0], CLAMP)}
    />
  );
};

export const Story: React.FC<StoryProps> = (props) => {
  usePreloadImages();
  const tl = getTimeline(props);
  const steps = props.steps;

  const parts: React.ReactNode[] = [
    <TransitionSeries.Sequence key="intro" durationInFrames={tl.intro}>
      <Intro title={props.introTitle} />
    </TransitionSeries.Sequence>,
  ];
  steps.forEach((step, i) => {
    parts.push(
      i > 0 && SLIDE_AFTER.has(i - 1) ? (
        <TransitionSeries.Transition key={`t${i}`} timing={timing} presentation={slide({ direction: "from-right" })} />
      ) : (
        <TransitionSeries.Transition key={`t${i}`} timing={timing} presentation={circleReveal()} />
      ),
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={tl.scenes[i]}>
        <Scene index={i} step={step} total={steps.length} />
        {props.voiceover && props.voDurations?.[i] ? (
          <Sequence from={VO_START}>
            <Audio src={staticFile(`vo/${pad2(i + 1)}.mp3`)} />
          </Sequence>
        ) : null}
      </TransitionSeries.Sequence>,
    );
  });
  parts.push(
    <TransitionSeries.Transition key="t-outro" timing={timing} presentation={circleReveal()} />,
    <TransitionSeries.Sequence key="outro" durationInFrames={tl.outro}>
      <Outro outro={props.outro} />
    </TransitionSeries.Sequence>,
  );

  return (
    <AbsoluteFill>
      <TransitionSeries>{parts}</TransitionSeries>
      {props.music.enabled && props.musicAvailable ? <Music file={props.music.file} volume={props.music.volume} /> : null}
    </AbsoluteFill>
  );
};
