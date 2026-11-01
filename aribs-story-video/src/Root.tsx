import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { pad2 } from "./anim";
import "./fonts";
import { REMAKE_SCENES, remakeFrames } from "./remake/config";
import { RemakeFilm, filmTimeline } from "./remake/RemakeFilm";
import { RemakeScene } from "./remake/RemakeScene";
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
  const musicAvailable = props.music.enabled ? await exists("music/tender.mp3") : false;
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
      {/* 3D-style film: intro, nine scenes, outro */}
      <Composition id="RemakeFilm" component={RemakeFilm} width={1080} height={1920} fps={FPS} durationInFrames={filmTimeline().total} />
      <Composition id="RemakeFilmLandscape" component={RemakeFilm} width={1920} height={1080} fps={FPS} durationInFrames={filmTimeline().total} />
      {/* 3D-style remake, one composition per finished scene in each layout */}
      {REMAKE_SCENES.map((c) => (
        <React.Fragment key={c.index}>
          <Composition id={`Remake3DScene${c.index + 1}`} component={RemakeScene} defaultProps={{ c }} width={1080} height={1920} fps={FPS} durationInFrames={remakeFrames(c)} />
          <Composition id={`Remake3DScene${c.index + 1}Landscape`} component={RemakeScene} defaultProps={{ c }} width={1920} height={1080} fps={FPS} durationInFrames={remakeFrames(c)} />
        </React.Fragment>
      ))}
    </>
  );
};
