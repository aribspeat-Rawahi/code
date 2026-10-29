---
name: animation-video
description: Create animated MP4 videos with Remotion (React) — product promos, sale ads, text/title animations, social reels (9:16), YouTube (16:9) and feed (1:1) videos. Use when the user asks to make an animation, motion graphic, promo video, reel, or render a video from code or product data.
---

# Animation Video (Remotion)

Build videos as React components, preview a still frame, then render MP4.

## Files in this skill

- `templates/ProductPromo.tsx` — product image + name + price/sale price + CTA.
- `templates/TextReveal.tsx` — word-by-word title animation with subtitle.
- `templates/Root.tsx` — registers every template in `Reel` (1080x1920), `Wide` (1920x1080) and `Square` (1080x1080).
- `templates/index.ts` — Remotion entry point.
- `scripts/setup.sh <project-dir>` — scaffolds a Remotion project from the templates and runs `npm install`.
- `scripts/render.sh <project-dir> <composition-id> [props.json] [--still <frame>]` — renders MP4 (h264) or a PNG still into `<project-dir>/out/`.

Composition ids: `ProductPromoReel`, `ProductPromoWide`, `ProductPromoSquare`, `TextRevealReel`, `TextRevealWide`, `TextRevealSquare`.

## Workflow

1. **Clarify the brief** (ask once if missing): purpose, length in seconds, aspect ratio (reel / wide / square), text content, brand color, image URLs.
2. **Write a scene plan** before code: list each scene with start time, duration and what animates. Keep it short and confirm with the user for anything longer than ~15s.
3. **Set up the project** (skip if one exists — look for `remotion` in `package.json`):
   ```bash
   bash .claude/skills/animation-video/scripts/setup.sh video
   ```
   Requires Node.js 18+.
4. **Build the composition**:
   - Simple content changes → just write a `props.json`; no code change needed.
   - New layout/scenes → add a new component in `<project>/src/`, register it in `Root.tsx`. Reuse the patterns in the templates.
5. **Preview a still** at a key frame and show it to the user before the full render:
   ```bash
   bash .claude/skills/animation-video/scripts/render.sh video ProductPromoReel props.json --still 75
   ```
6. **Render the MP4** once the still looks right:
   ```bash
   bash .claude/skills/animation-video/scripts/render.sh video ProductPromoReel props.json
   ```
7. Report the output path, resolution, duration and file size.

## Example props.json

```json
{
  "productName": "Premium Cotton T-Shirt",
  "price": "৳1,200",
  "salePrice": "৳899",
  "imageUrl": "https://example.com/wp-content/uploads/tshirt.jpg",
  "ctaText": "Shop Now",
  "brandColor": "#7c3aed"
}
```

For WooCommerce, product data can come from the REST API (`/wp-json/wc/v3/products/<id>`): map `name`, `regular_price`, `sale_price`, `images[0].src` into props. Read API keys from environment variables, never hardcode them.

## Remotion rules (must follow)

- Animate **only** with `useCurrentFrame()` + `interpolate()` / `spring()`. Never use CSS transitions, CSS animations, `setTimeout` or `requestAnimationFrame` — frames render in parallel and out of order.
- Express timing in seconds × `fps` (`Math.round(1.5 * fps)`), not hard-coded frame numbers.
- Pass `extrapolateLeft/Right: 'clamp'` to `interpolate()` when the value must not overshoot.
- Use `<Sequence from={...}>` to delay scenes; inside it `useCurrentFrame()` starts at 0.
- Use `<Img>` (not `<img>`) and `staticFile('name.png')` for files in `public/`, so Remotion waits for them to load.
- Scale sizes by `width / 1080` so one component works in every aspect ratio.
- Keep props JSON-serializable (strings, numbers, booleans, arrays, objects).
- Bengali text: keep `"Noto Sans Bengali"` in the font stack and make sure the font is installed on the render machine (`fonts-noto-core` on Debian/Ubuntu), otherwise characters render as boxes.

## Rendering on a Linux VPS

- Remotion downloads its own headless Chrome on first render. On a minimal server install the shared libraries first (Debian/Ubuntu):
  ```bash
  sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2 fonts-noto-core
  ```
- To reuse an existing Chromium instead: `REMOTION_BROWSER=/path/to/chromium bash scripts/render.sh ...`.
- Rendering is CPU-heavy. On a small VPS set `CONCURRENCY=1` or `2` to avoid starving other services (e.g. a live WooCommerce site), or render on a separate machine.

## Troubleshooting

- **Blank or broken image** → the URL must be publicly reachable from the render machine; check CORS/hotlink protection on the WordPress site.
- **Animation jumps/flickers** → something animates outside `useCurrentFrame()`.
- **`Composition not found`** → id is case-sensitive; check `Root.tsx`.
- **Out of memory** → lower `CONCURRENCY`, or render at a smaller size with `--scale=0.5` for drafts.
