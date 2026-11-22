// 2D sketch helpers. All coordinates are in mm on the XY ground plane.
export type Pt = [number, number];

export const snapValue = (v: number, step: number): number => Math.round(v / step) * step;

export const samePt = (a: Pt, b: Pt, eps = 1e-6): boolean =>
  Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;

/** Signed polygon area (shoelace formula). */
export function polygonArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/**
 * Turn clicked sketch points into a closed profile centred on its bounding box,
 * so the resulting object rotates around its own middle.
 */
export function profileFromPoints(raw: Pt[]): { center: Pt; profile: Pt[] } | { error: string } {
  const pts: Pt[] = [];
  for (const p of raw) if (!pts.length || !samePt(pts[pts.length - 1], p)) pts.push(p);
  if (pts.length > 1 && samePt(pts[0], pts[pts.length - 1])) pts.pop();

  if (pts.length < 3) return { error: 'Need at least 3 points to close a profile.' };
  if (Math.abs(polygonArea(pts)) < 1e-6) return { error: 'Profile has zero area (points are in a line).' };

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const center: Pt = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  return { center, profile: pts.map(([x, y]) => [x - center[0], y - center[1]] as Pt) };
}

/** Rectangle profile for a straight wall from a to b (centre line), or null if a == b. */
export function wallPoints(a: Pt, b: Pt, thickness: number): Pt[] | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const nx = (-dy / len) * (thickness / 2);
  const ny = (dx / len) * (thickness / 2);
  return [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ];
}
