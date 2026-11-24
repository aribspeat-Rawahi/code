import React from 'react';
import {Composition} from 'remotion';
import {ProductPromo, productPromoDefaults} from './ProductPromo';
import {TextReveal, textRevealDefaults} from './TextReveal';

const FPS = 30;

// Common aspect ratios: 9:16 reel/story, 16:9 YouTube, 1:1 feed.
const formats = [
  {suffix: 'Reel', width: 1080, height: 1920},
  {suffix: 'Wide', width: 1920, height: 1080},
  {suffix: 'Square', width: 1080, height: 1080},
] as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {formats.map((f) => (
        <React.Fragment key={f.suffix}>
          <Composition
            id={`ProductPromo${f.suffix}`}
            component={ProductPromo}
            durationInFrames={5 * FPS}
            fps={FPS}
            width={f.width}
            height={f.height}
            defaultProps={productPromoDefaults}
          />
          <Composition
            id={`TextReveal${f.suffix}`}
            component={TextReveal}
            durationInFrames={4 * FPS}
            fps={FPS}
            width={f.width}
            height={f.height}
            defaultProps={textRevealDefaults}
          />
        </React.Fragment>
      ))}
    </>
  );
};
