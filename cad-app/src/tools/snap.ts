import * as THREE from 'three';
import type { CadObject } from '../store/sceneStore';
import { featureEdges } from './edges';
import { buildObjectGeometry, matrixOf } from './geometry';

export type SnapKind = 'end' | 'mid' | 'center';
export interface SnapPoint {
  p: THREE.Vector3;
  kind: SnapKind;
}

export const SNAP_LABEL: Record<SnapKind, string> = { end: 'Endpoint', mid: 'Midpoint', center: 'Center' };
export const SNAP_COLOR: Record<SnapKind, string> = { end: '#4ade80', mid: '#38bdf8', center: '#f472b6' };

/** Snap points per object version, in the object's parent frame. Objects are immutable, so this never goes stale. */
const cache = new WeakMap<CadObject, SnapPoint[]>();

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

function localPoints(o: CadObject): SnapPoint[] {
  const out: SnapPoint[] = [];
  const g = buildObjectGeometry(o);
  const edges = featureEdges(g);
  const pos = edges.getAttribute('position');
  for (let i = 0; i + 1 < pos.count; i += 2) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    out.push({ p: a, kind: 'end' }, { p: b, kind: 'end' }, { p: a.clone().lerp(b, 0.5), kind: 'mid' });
  }
  g.computeBoundingBox();
  if (g.boundingBox && !g.boundingBox.isEmpty()) out.push({ p: g.boundingBox.getCenter(new THREE.Vector3()), kind: 'center' });
  g.dispose();
  edges.dispose();

  for (const c of axisCenters(o)) out.push({ p: c, kind: 'center' });
  // Boolean parts keep their centres (e.g. the centre of a drilled hole)
  for (const child of o.children ?? []) {
    if (!child.visible) continue;
    for (const sp of pointsInParentFrame(child)) if (sp.kind === 'center') out.push(sp);
  }
  return out;
}

function pointsInParentFrame(o: CadObject): SnapPoint[] {
  let pts = cache.get(o);
  if (!pts) {
    const m = matrixOf(o);
    const seen = new Set<string>();
    pts = [];
    for (const sp of localPoints(o)) {
      const p = sp.p.clone().applyMatrix4(m);
      const key = `${sp.kind}:${Math.round(p.x * 100)},${Math.round(p.y * 100)},${Math.round(p.z * 100)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pts.push({ p, kind: sp.kind });
    }
    cache.set(o, pts);
  }
  return pts;
}

/** All snap points of visible top-level objects, in world space. */
export function collectSnapPoints(objects: CadObject[], exclude: Set<string> = new Set()): SnapPoint[] {
  return objects.filter((o) => o.visible && !exclude.has(o.id)).flatMap(pointsInParentFrame);
}

const PRIORITY: Record<SnapKind, number> = { end: 0, center: 1, mid: 2 };

/** Nearest snap point to the pointer in screen space, within `radiusPx`. */
export function findSnap(
  points: SnapPoint[],
  pointerNdc: THREE.Vector2,
  camera: THREE.Camera,
  size: { width: number; height: number },
  radiusPx = 12,
): SnapPoint | null {
  let best: SnapPoint | null = null;
  let bestScore = Infinity;
  const v = new THREE.Vector3();
  const px = ((pointerNdc.x + 1) / 2) * size.width;
  const py = ((1 - pointerNdc.y) / 2) * size.height;
  for (const sp of points) {
    v.copy(sp.p).project(camera);
    if (v.z > 1 || v.z < -1) continue; // behind the camera / clipped
    const d = Math.hypot(((v.x + 1) / 2) * size.width - px, ((1 - v.y) / 2) * size.height - py);
    if (d > radiusPx) continue;
    // Prefer corners over centres over midpoints when they are about equally close
    const score = d + PRIORITY[sp.kind] * 3;
    if (score < bestScore) {
      bestScore = score;
      best = sp;
    }
  }
  return best;
}
