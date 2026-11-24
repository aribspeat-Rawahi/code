import { createContext, useContext } from "react";
import type { Storyboard } from "./types";

export type Brand = Storyboard["brand"];

export const BrandContext = createContext<Brand>({ logo: "", dark: "#14331d", mid: "#2c6b3f", accent: "#66d154", light: "#e3f6dc" });
export const useBrand = () => useContext(BrandContext);

/** "#14331d" + 0.5 → "rgba(20,51,29,0.5)" */
export const alpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
