import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { pad2 } from "./anim";
import "./fonts";
import { Story } from "./Story";
import { StoryProps, defaultStory, storySchema } from "./story";
import { FPS, getTimeline } from "./timeline";

const exists = async (file: string) => {
  try {
    const res = await fetch(staticFile(file), { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
};

// Looks for optional audio in public/ and sizes every scene to its voiceover.
const calculateMetadata: CalculateMetadataFunction<StoryProps> = async ({ props }) => {
  const voDurations = await Promise.all(
    props.steps.map(async (_, i) => {
      const file = `vo/${pad2(i + 1)}.mp3`;
      if (!props.voiceover || !(await exists(file))) return null;
      return getAudioDurationInSeconds(staticFile(file));
    }),
  );
  const musicAvailable = props.music.enabled ? await exists(props.music.file) : false;
  const resolved = { ...props, voDurations, musicAvailable };
  return { durationInFrames: getTimeline(resolved).total, props: resolved };
};

export const RemotionRoot: React.FC = () => {
  const shared = {
    component: Story,
    fps: FPS,
    durationInFrames: getTimeline(defaultStory).total,
    schema: storySchema,
    defaultProps: defaultStory,
    calculateMetadata,
  };
  return (
    <>
      {/* Website and YouTube */}
      <Composition id="StoryLandscape" width={1920} height={1080} {...shared} />
      {/* Instagram Reels, TikTok, WhatsApp Status */}
      <Composition id="StoryVertical" width={1080} height={1920} {...shared} />
    </>
  );
};
