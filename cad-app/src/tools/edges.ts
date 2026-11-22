import * as THREE from 'three';

/**
 * Feature edges (silhouette-independent "hard" edges) that tolerate T-junctions.
 *
 * Boolean results split flat faces into triangles whose edges don't line up end to end,
 * so three's EdgesGeometry treats those as open edges and draws stray lines across flat faces.
 * Here every triangle edge is grouped by the infinite line it lies on; each line is cut into
 * elementary segments, and a segment is drawn only if the faces touching it meet at an angle
 * above the threshold (or it is a true open border).
 */
export function featureEdges(geom: THREE.BufferGeometry, thresholdDeg = 20): THREE.BufferGeometry {
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
    for (let i = 0; i + 1 < ts.length; i++) {
      const s = ts[i];
      const e = ts[i + 1];
      let draw = false;
      if (e - s > 1e-6) {
        const mid = (s + e) / 2;
        const cover = line.segs.filter((g) => g.t0 <= mid && mid <= g.t1);
        if (cover.length === 0) draw = false; // gap between pieces on the same line (e.g. across an opening)
        else if (cover.length === 1) draw = true; // open border
        else
          outer: for (let x = 0; x < cover.length; x++)
            for (let y = x + 1; y < cover.length; y++)
              if (Math.abs(cover[x].n.dot(cover[y].n)) < cosT) {
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
