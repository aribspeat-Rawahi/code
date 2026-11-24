import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const FONTS: Record<string, string> = {
  Fraunces: loadFraunces("normal", { weights: ["600"], subsets: ["latin"] }).fontFamily,
  Inter: loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily,
  Cairo: loadCairo("normal", { weights: ["600", "700"], subsets: ["arabic", "latin"] }).fontFamily,
};

export const font = (name: string) => FONTS[name] ?? name;
