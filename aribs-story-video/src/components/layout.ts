import { useVideoConfig } from "remotion";

export type Layout = "landscape" | "vertical";

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return height > width ? "vertical" : "landscape";
};

// Pixel boxes for each layout. Vertical keeps ~120 px top and 250 px bottom safe margins.
export const BOX = {
  landscape: {
    art: { left: 800, top: 50, size: 980 },
    text: { left: 110, top: 0, width: 620, height: 1080 },
    title: 88,
    body: 44,
    counter: 30,
  },
  vertical: {
    art: { left: 50, top: 130, size: 980 },
    text: { left: 90, top: 1140, width: 900, height: 530 },
    title: 84,
    body: 46,
    counter: 30,
  },
} as const;
