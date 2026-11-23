import * as THREE from 'three';
import type { CadObject } from '../store/sceneStore';
import { featureEdges } from './edges';
import { buildObjectGeometry, matrixOf } from './geometry';

export type SnapKind = 'end' | 'mid' | 'center' | 'int' | 'near';
export type SnapModes = Record<SnapKind, boolean>;
export const ALL_SNAP_MODES: SnapModes = { end: true, mid: true, center: true, int: true, near: true };

export interface SnapPoint {
  p: THREE.Vector3;
  kind: SnapKind;
}
type Edge = [THREE.Vector3, THREE.Vector3];

/** Everything an object offers to snap to, in world space. */
export interface SnapData {
  points: SnapPoint[];
  edges: Edge[];
}

export const SNAP_LABEL: Record<SnapKind, string> = {
  end: 'Endpoint',
  mid: 'Midpoint',
  center: 'Center',
  int: 'Intersection',
  near: 'Nearest',
};
export const SNAP_COLOR: Record<SnapKind, string> = {
  end: '#4ade80',
  mid: '#38bdf8',
  center: '#f472b6',
  int: '#fbbf24',
  near: '#a78bfa',
};

/** Snap data per object version, in the object's parent frame. Objects are immutable, so this never goes stale. */
const cache = new WeakMap<CadObject, SnapData>();

/** Axis centres (base and top) for round and prismatic shapes — hole and boss centres for mechanical work. */
function axisCenters(o: CadObject): THREE.Vector3[] {
  const h = o.params.height;
  switch (o.type) {
    case 'cylinder':
    case 'cone':
    case 'box':
    case 'extrusion':
      return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, h)];
    case 'sphere':
      return [new THREE.Vector3(0, 0, o.params.radius)];
    default:
      return [];
  }
}

function localData(o: CadObject): SnapData {
  const points: SnapPoint[] = [];
  const edges: Edge[] = [];
  const g = buildObjectGeometry(o);
  const e = featureEdges(g);
  const pos = e.getAttribute('position');
  for (let i = 0; i + 1 < pos.count; i += 2) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    edges.push([a, b]);
    points.push({ p: a, kind: 'end' }, { p: b, kind: 'end' }, { p: a.clone().lerp(b, 0.5), kind: 'mid' });
  }
  g.computeBoundingBox();
  if (g.boundingBox && !g.boundingBox.isEmpty()) points.push({ p: g.boundingBox.getCenter(new THREE.Vector3()), kind: 'center' });
  g.dispose();
  e.dispose();

  for (const c of axisCenters(o)) points.push({ p: c, kind: 'center' });
  // Boolean parts keep their centres (e.g. the centre of a drilled hole)
  for (const child of o.children ?? []) {
    if (!child.visible) continue;
    for (const sp of dataInParentFrame(child).points) if (sp.kind === 'center') points.push(sp);
  }
  return { points, edges };
}

function dataInParentFrame(o: CadObject): SnapData {
  let data = cache.get(o);
  if (!data) {
    const m = matrixOf(o);
    const local = localData(o);
    const seen = new Set<string>();
    const points: SnapPoint[] = [];
    for (const sp of local.points) {
      const p = sp.p.clone().applyMatrix4(m);
      const key = `${sp.kind}:${Math.round(p.x * 100)},${Math.round(p.y * 100)},${Math.round(p.z * 100)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      points.push({ p, kind: sp.kind });
    }
    const edges = local.edges.map(([a, b]) => [a.clone().applyMatrix4(m), b.clone().applyMatrix4(m)] as Edge);
    data = { points, edges };
    cache.set(o, data);
  }
  return data;
}

/** Snap data of the given (already visibility-filtered) top-level objects, in world space. */
export function collectSnapData(objects: CadObject[], exclude: Set<string> = new Set()): SnapData {
  const points: SnapPoint[] = [];
  const edges: Edge[] = [];
  for (const o of objects) {
    if (o.type === 'dimension' || exclude.has(o.id)) continue;
    const d = dataInParentFrame(o);
    for (const p of d.points) points.push(p);
    for (const e of d.edges) edges.push(e);
  }
  return { points, edges };
}

/** Closest points between segments p1q1 and p2q2 (Ericson, Real-Time Collision Detection 5.1.9). */
function closestSegSeg(p1: THREE.Vector3, q1: THREE.Vector3, p2: THREE.Vector3, q2: THREE.Vector3) {
  const d1 = q1.clone().sub(p1);
  const d2 = q2.clone().sub(p2);
  const r = p1.clone().sub(p2);
  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const f = d2.dot(r);
  let s: number;
  let t: number;
  const c = d1.dot(r);
  const b = d1.dot(d2);
  const denom = a * e - b * b;
  s = denom > 1e-12 ? THREE.MathUtils.clamp((b * f - c * e) / denom, 0, 1) : 0;
  t = (b * s + f) / e;
  if (t < 0) {
    t = 0;
    s = THREE.MathUtils.clamp(-c / a, 0, 1);
  } else if (t > 1) {
    t = 1;
    s = THREE.MathUtils.clamp((b - c) / a, 0, 1);
  }
  const c1 = p1.clone().addScaledVector(d1, s);
  const c2 = p2.clone().addScaledVector(d2, t);
  return { s, t, c1, c2, dist: c1.distanceTo(c2) };
}

const PRIORITY: Record<SnapKind, number> = { end: 0, int: 1, center: 2, mid: 3, near: 9 };

/**
 * Best snap under the pointer within `radiusPx` (screen space).
 * Corners, intersections, centres and midpoints win when one is within reach; otherwise the
 * nearest point on an edge. In orthographic views intersections are apparent (as drawn on screen),
 * so lines at different heights that cross in plan still snap.
 */
export function findSnap(
  data: SnapData,
  pointerNdc: THREE.Vector2,
  camera: THREE.Camera,
  size: { width: number; height: number },
  modes: SnapModes = ALL_SNAP_MODES,
  radiusPx = 12,
): SnapPoint | null {
  const px = ((pointerNdc.x + 1) / 2) * size.width;
  const py = ((1 - pointerNdc.y) / 2) * size.height;
  const v = new THREE.Vector3();
  const toScreen = (p: THREE.Vector3): [number, number] | null => {
    v.copy(p).project(camera);
    if (v.z > 1 || v.z < -1) return null; // behind the camera / clipped
    return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
  };

  // 1. Discrete points
  let best: SnapPoint | null = null;
  let bestScore = Infinity;
  for (const sp of data.points) {
    if (!modes[sp.kind]) continue;
    const s = toScreen(sp.p);
    if (!s) continue;
    const d = Math.hypot(s[0] - px, s[1] - py);
    if (d > radiusPx) continue;
    const score = d + PRIORITY[sp.kind] * 3;
    if (score < bestScore) {
      bestScore = score;
      best = sp;
    }
  }

  if (!modes.int && !modes.near) return best;

  // 2. Edges passing within reach of the pointer (screen-space distance to the projected segment)
  type Cand = { e: Edge; a: [number, number]; b: [number, number]; d: number };
  const cands: Cand[] = [];
  for (const e of data.edges) {
    const a = toScreen(e[0]);
    const b = toScreen(e[1]);
    if (!a || !b) continue;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? THREE.MathUtils.clamp(((px - a[0]) * dx + (py - a[1]) * dy) / l2, 0, 1) : 0;
    const d = Math.hypot(a[0] + dx * t - px, a[1] + dy * t - py);
    if (d <= radiusPx) cands.push({ e, a, b, d });
  }
  cands.sort((x, y) => x.d - y.d);
  const near = cands.slice(0, 40);
  const ortho = (camera as THREE.OrthographicCamera).isOrthographicCamera === true;

  // 3. Intersections between nearby edges
  if (modes.int) {
    const sizeTol = (p: THREE.Vector3) => Math.max(1e-3, p.length() * 1e-6);
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        const A = near[i];
        const B = near[j];
        let s: number;
        let t: number;
        if (ortho) {
          // Apparent intersection of the drawn lines
          const r = [A.b[0] - A.a[0], A.b[1] - A.a[1]];
          const q = [B.b[0] - B.a[0], B.b[1] - B.a[1]];
          const den = r[0] * q[1] - r[1] * q[0];
          if (Math.abs(den) < 1e-9) continue; // parallel
          const w = [B.a[0] - A.a[0], B.a[1] - A.a[1]];
          s = (w[0] * q[1] - w[1] * q[0]) / den;
          t = (w[0] * r[1] - w[1] * r[0]) / den;
          if (s < -1e-6 || s > 1 + 1e-6 || t < -1e-6 || t > 1 + 1e-6) continue;
        } else {
          const c = closestSegSeg(A.e[0], A.e[1], B.e[0], B.e[1]);
          if (c.dist > sizeTol(c.c1)) continue; // skew lines don't really meet
          s = c.s;
          t = c.t;
        }
        // Where both edges end it's just a corner — Endpoint already covers that
        const atEndA = s < 1e-4 || s > 1 - 1e-4;
        const atEndB = t < 1e-4 || t > 1 - 1e-4;
        if (atEndA && atEndB) continue;
        const p = A.e[0].clone().lerp(A.e[1], s);
        const sc = toScreen(p);
        if (!sc) continue;
        const d = Math.hypot(sc[0] - px, sc[1] - py);
        if (d > radiusPx) continue;
        const score = d + PRIORITY.int * 3;
        if (score < bestScore) {
          bestScore = score;
          best = { p, kind: 'int' };
        }
      }
    }
  }
  if (best || !modes.near || !near.length) return best;

  // 4. Nearest point on the closest edge (ray-to-segment, exact in perspective too)
  const ray = new THREE.Raycaster();
  ray.setFromCamera(pointerNdc, camera);
  const onSeg = new THREE.Vector3();
  ray.ray.distanceSqToSegment(near[0].e[0], near[0].e[1], undefined, onSeg);
  return { p: onSeg.clone(), kind: 'near' };
}
