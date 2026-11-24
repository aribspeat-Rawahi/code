import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const FRAUNCES = loadFraunces("normal", { weights: ["600"], subsets: ["latin"] }).fontFamily;
export const INTER = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily;

// Arabic version of the 3D film
export const CAIRO = loadCairo("normal", { weights: ["600", "700"], subsets: ["arabic", "latin"] }).fontFamily;
