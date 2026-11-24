import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { FPS, timeline } from "./story";
import { STORYBOARDS } from "./storyboards";

// Two compositions per storyboard: "<id>" (1080x1920) and "<id>-landscape" (1920x1080).
export const RemotionRoot: React.FC = () => (
  <>
    {STORYBOARDS.map((sb) => (
      <React.Fragment key={sb.id}>
        <Composition id={sb.id} component={Film} defaultProps={{ sb }} width={1080} height={1920} fps={FPS} durationInFrames={timeline(sb).total} />
        <Composition id={`${sb.id}-landscape`} component={Film} defaultProps={{ sb }} width={1920} height={1080} fps={FPS} durationInFrames={timeline(sb).total} />
      </React.Fragment>
    ))}
  </>
);
