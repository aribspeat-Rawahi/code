import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export type TextRevealProps = {
  title: string;
  subtitle?: string;
  background: string;
  color: string;
};

export const textRevealDefaults: TextRevealProps = {
  title: 'Big Winter Sale',
  subtitle: 'Up to 50% off this week',
  background: '#0f172a',
  color: '#ffffff',
};

export const TextReveal: React.FC<TextRevealProps> = ({title, subtitle, background, color}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const base = width / 1080;
  const words = title.split(' ');
  const wordDelay = Math.round(0.15 * fps);

  const subtitleStart = words.length * wordDelay + Math.round(0.3 * fps);
  const subtitleOpacity = interpolate(frame, [subtitleStart, subtitleStart + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background,
        color,
        fontFamily: 'Inter, "Noto Sans Bengali", Arial, sans-serif',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80 * base,
        textAlign: 'center',
      }}
    >
      <div style={{fontSize: 110 * base, fontWeight: 900, lineHeight: 1.1}}>
        {words.map((word, i) => {
          // Each word springs in one after another.
          const progress = spring({frame: frame - i * wordDelay, fps, config: {damping: 14}});
          return (
            <span
              key={`${word}-${i}`}
              style={{
                display: 'inline-block',
                marginRight: '0.25em',
                opacity: progress,
                transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px) scale(${progress})`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
      {subtitle ? (
        <div style={{fontSize: 48 * base, marginTop: 32 * base, opacity: subtitleOpacity}}>{subtitle}</div>
      ) : null}
    </AbsoluteFill>
  );
};
