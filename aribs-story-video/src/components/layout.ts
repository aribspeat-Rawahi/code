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
    caption: 32,
    captionBox: 190, // room for a speaker label + 3 lines

  },
  vertical: {
    art: { left: 60, top: 120, size: 960 },
    text: { left: 90, top: 1095, width: 900, height: 575 },
    title: 80,
    body: 42,
    counter: 30,
    caption: 34,
    captionBox: 150, // room for a speaker label + 2 lines

  },
} as const;
