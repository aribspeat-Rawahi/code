import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";

type Props = Record<string, never>;

// The next scene appears inside a circle that grows from the centre.
const CircleReveal: React.FC<TransitionPresentationComponentProps<Props>> = ({ children, presentationDirection, presentationProgress }) => {
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  // 72% of the reference radius reaches the corners of any rectangle.
  const r = interpolate(presentationProgress, [0, 1], [0, 72]);
  return <AbsoluteFill style={{ clipPath: `circle(${r}% at 50% 50%)` }}>{children}</AbsoluteFill>;
};

export const circleReveal = (): TransitionPresentation<Props> => ({ component: CircleReveal, props: {} });
