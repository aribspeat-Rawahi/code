import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

/**
 * Feature edges (silhouette-independent "hard" edges) that tolerate T-junctions.
 *
 * Boolean results split flat faces into triangles whose edges don't line up end to end,
 * so three's EdgesGeometry treats those as open edges and draws stray lines across flat faces.
 * Here every triangle edge is grouped by the infinite line it lies on; each line is cut into
 * elementary segments, and a segment is drawn only if the faces touching it meet at an angle
 * above the threshold (or it is a true open border).
 */
export function featureEdges(
  geom: THREE.BufferGeometry,
  thresholdDeg = 20,
  /** If given, also keep silhouette edges as seen from this direction (towards the viewer). */
  viewDir?: THREE.Vector3,
  /**
   * Edges with a face on one side only. In a closed solid these are either real edges whose
   * neighbour didn't line up numerically (keep), or cracks inside a flat face left by CSG (drop).
   * Pass a function to decide per piece; `true` keeps them all.
   */
  openBorders: boolean | ((a: THREE.Vector3, b: THREE.Vector3, n: THREE.Vector3) => boolean) = true,
): THREE.BufferGeometry {
  const pos = geom.getAttribute('position');
  const out = new THREE.BufferGeometry();
  if (!pos) return out;

  const index = geom.getIndex();
  const triCount = (index ? index.count : pos.count) / 3;
  const vi = (i: number) => (index ? index.getX(i) : i);
  const cosT = Math.cos((thresholdDeg * Math.PI) / 180);
  const q = (v: number, s: number) => Math.round(v * s);

  type Seg = { t0: number; t1: number; n: THREE.Vector3 };
  const lines = new Map<string, { d: THREE.Vector3; p0: THREE.Vector3; segs: Seg[] }>();

  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();

  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, vi(t * 3 + k));
    const n = e1.subVectors(v[1], v[0]).cross(e2.subVectors(v[2], v[0])).clone();
    const area = n.length();
    if (area < 1e-9) continue; // sliver triangles have no reliable normal
    n.divideScalar(area);

    for (let k = 0; k < 3; k++) {
      const a = v[k];
      const b = v[(k + 1) % 3];
      const d = new THREE.Vector3().subVectors(b, a);
      const len = d.length();
      if (len < 1e-9) continue;
      d.divideScalar(len);
      // Canonical direction so both windings of an edge land on the same line
      const EPS = 1e-9;
      if (d.x < -EPS || (Math.abs(d.x) <= EPS && (d.y < -EPS || (Math.abs(d.y) <= EPS && d.z < 0)))) d.negate();
      const p0 = a.clone().addScaledVector(d, -a.dot(d)); // closest point on the line to the origin
      const key = `${q(d.x, 1e5)},${q(d.y, 1e5)},${q(d.z, 1e5)}|${q(p0.x, 1e2)},${q(p0.y, 1e2)},${q(p0.z, 1e2)}`;

      let line = lines.get(key);
      if (!line) lines.set(key, (line = { d, p0, segs: [] }));
      const ta = a.dot(line.d);
      const tb = b.dot(line.d);
      line.segs.push({ t0: Math.min(ta, tb), t1: Math.max(ta, tb), n });
    }
  }

  const verts: number[] = [];
  const push = (line: { d: THREE.Vector3; p0: THREE.Vector3 }, s: number, e: number) => {
    const { d, p0 } = line;
    verts.push(p0.x + d.x * s, p0.y + d.y * s, p0.z + d.z * s, p0.x + d.x * e, p0.y + d.y * e, p0.z + d.z * e);
  };

  for (const line of lines.values()) {
    const ts = [...new Set(line.segs.flatMap((s) => [s.t0, s.t1]))].sort((x, y) => x - y);
    let runStart: number | null = null;
    const pointAt = (t: number) => line.p0.clone().addScaledVector(line.d, t);
    for (let i = 0; i + 1 < ts.length; i++) {
      const s = ts[i];
      const e = ts[i + 1];
      let draw = false;
      if (e - s > 1e-6) {
        const mid = (s + e) / 2;
        const cover = line.segs.filter((g) => g.t0 <= mid && mid <= g.t1);
        if (cover.length === 0) draw = false; // gap between pieces on the same line (e.g. across an opening)
        else if (cover.length === 1)
          draw = typeof openBorders === 'function' ? openBorders(pointAt(s), pointAt(e), cover[0].n) : openBorders;
        else
          outer: for (let x = 0; x < cover.length; x++)
            for (let y = x + 1; y < cover.length; y++)
              if (
                Math.abs(cover[x].n.dot(cover[y].n)) < cosT ||
                // silhouette: one face turned towards the viewer, the other away — but not two
                // coplanar faces with opposite winding (a CSG artefact), which would cross flat faces
                (viewDir &&
                  cover[x].n.dot(viewDir) * cover[y].n.dot(viewDir) < 0 &&
                  Math.abs(cover[x].n.dot(cover[y].n)) < 0.9999)
              ) {
                draw = true;
                break outer;
              }
      }
      // Merge consecutive drawn pieces into one segment
      if (draw && runStart === null) runStart = s;
      if (!draw && runStart !== null) {
        push(line, runStart, s);
        runStart = null;
      }
    }
    if (runStart !== null) push(line, runStart, ts[ts.length - 1]);
  }

  out.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return out;
}

/**
 * An edge piece with a face on one side only: is it a crack inside a flat face?
 * Step a little to both sides within the face plane; if the surface continues flat on both
 * sides, nothing is really there. A real edge has empty space or a turning face on one side.
 */
export function isFlatCrack(g: THREE.BufferGeometry, a: THREE.Vector3, b: THREE.Vector3, n: THREE.Vector3, diag: number): boolean {
  const bvh = (g as THREE.BufferGeometry & { boundsTree?: MeshBVH }).boundsTree;
  if (!bvh) return false;
  const pos = g.getAttribute('position');
  const index = g.getIndex();
  const vi = (i: number) => (index ? index.getX(i) : i);
  const mid = a.clone().lerp(b, 0.5);
  const side = new THREE.Vector3().crossVectors(n, b.clone().sub(a)).normalize();
  const step = diag * 1e-3;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  for (const sign of [1, -1]) {
    const probe = mid.clone().addScaledVector(side, step * sign);
    const hit = bvh.closestPointToPoint(probe);
    if (!hit || hit.distance > step * 0.05) return false; // empty space on this side
    v0.fromBufferAttribute(pos, vi(hit.faceIndex * 3));
    v1.fromBufferAttribute(pos, vi(hit.faceIndex * 3 + 1));
    v2.fromBufferAttribute(pos, vi(hit.faceIndex * 3 + 2));
    const fn = v1.sub(v0).cross(v2.sub(v0)).normalize();
    if (Math.abs(fn.dot(n)) < 0.999) return false; // the surface turns here: a real edge
  }
  return true;
}


/**
 * Feature edges for a boolean result: open-border pieces are kept only when they are real edges,
 * not cracks inside flat faces left by CSG. Builds a BVH on the geometry (reorders its index,
 * which doesn't change the shape).
 */
export function cleanFeatureEdges(g: THREE.BufferGeometry, thresholdDeg = 20): THREE.BufferGeometry {
  if (!g.getAttribute('position')?.count) return featureEdges(g, thresholdDeg);
  const geo = g as THREE.BufferGeometry & { boundsTree?: MeshBVH };
  if (!geo.boundsTree) geo.boundsTree = new MeshBVH(g);
  g.computeBoundingBox();
  const diag = g.boundingBox!.getSize(new THREE.Vector3()).length() || 1;
  return featureEdges(g, thresholdDeg, undefined, (a, b, n) => !isFlatCrack(g, a, b, n, diag));
}
