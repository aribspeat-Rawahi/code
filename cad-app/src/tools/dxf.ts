import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { layerOf, type CadObject, type Layer, type ViewName } from '../store/sceneStore';
import { featureEdges, isFlatCrack } from './edges';
import { buildObjectGeometry, matrixOf } from './geometry';
import { toDisplay, type Unit } from '../units';

export type DxfView = Exclude<ViewName, 'iso'>;

/** Direction towards the viewer, and how world XYZ maps onto the 2D sheet (u = right, v = up). */
const VIEWS: Record<DxfView, { dir: THREE.Vector3; uv: (p: THREE.Vector3) => [number, number] }> = {
  top: { dir: new THREE.Vector3(0, 0, 1), uv: (p) => [p.x, p.y] },
  front: { dir: new THREE.Vector3(0, -1, 0), uv: (p) => [p.x, p.z] },
  back: { dir: new THREE.Vector3(0, 1, 0), uv: (p) => [-p.x, p.z] },
  right: { dir: new THREE.Vector3(1, 0, 0), uv: (p) => [p.y, p.z] },
  left: { dir: new THREE.Vector3(-1, 0, 0), uv: (p) => [-p.y, p.z] },
};

type Seg = { a: [number, number]; b: [number, number]; layer: string; hidden?: boolean; dim?: boolean };
type Text = { at: [number, number]; h: number; rot: number; text: string; layer: string };

const fmt = (n: number) => (Math.abs(n) < 1e-9 ? '0' : n.toFixed(4).replace(/\.?0+$/, ''));

/**
 * 2D orthographic drawing of the visible objects as a DXF R12 (AC1009) file, in millimetres.
 * Edges are feature edges plus silhouettes for this view; hidden parts go on a dashed HIDDEN layer.
 */
export function buildDxf(
  objects: CadObject[],
  view: DxfView,
  unit: Unit,
  layers: Layer[],
): { dxf: string; lines: number; hidden: number } {
  // App layer -> DXF layer name (R12: upper case, letters/digits/_-$, max 31 chars, unique)
  const dxfName = new Map<string, string>();
  const used = new Set<string>();
  for (const l of layers) {
    let n = l.id === '0' ? '0' : l.name.toUpperCase().replace(/[^A-Z0-9_$-]/g, '_').slice(0, 24) || 'LAYER';
    while (used.has(n)) n = `${n.slice(0, 22)}_${used.size}`;
    used.add(n);
    dxfName.set(l.id, n);
  }
  const nameOf = (o: CadObject) => dxfName.get(layerOf(layers, o).id) ?? '0';

  const { dir, uv } = VIEWS[view];
  const solids = objects.filter((o) => o.visible && o.type !== 'dimension');

  // World-space meshes with a BVH, used for hidden-line tests
  const meshes: THREE.Mesh[] = [];
  const edgeSets: THREE.BufferGeometry[] = [];
  const meshLayer: string[] = [];
  const bounds = new THREE.Box3();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  for (const o of solids) {
    const g = buildObjectGeometry(o);
    if (!g.getAttribute('position')?.count) continue;
    g.applyMatrix4(matrixOf(o));
    g.computeBoundingBox();
    bounds.union(g.boundingBox!);
    (g as THREE.BufferGeometry & { boundsTree?: MeshBVH }).boundsTree = new MeshBVH(g);
    const mesh = new THREE.Mesh(g, material);
    mesh.raycast = acceleratedRaycast;
    meshes.push(mesh);
    meshLayer.push(nameOf(o));
  }

  const diag = bounds.isEmpty() ? 1000 : bounds.getSize(new THREE.Vector3()).length();
  for (const m of meshes) edgeSets.push(featureEdges(m.geometry, 20, dir, (a, b, n) => !isFlatCrack(m.geometry, a, b, n, diag)));
  const eps = diag * 1e-4;
  const occlusionTol = diag * 1e-3;
  const far = diag * 4 + 1000;
  const raycaster = new THREE.Raycaster();
  raycaster.firstHitOnly = true;

  /** True if something sits between the viewer and point p. */
  const hidden = (p: THREE.Vector3) => {
    const origin = p.clone().addScaledVector(dir, far);
    raycaster.set(origin, dir.clone().negate());
    // Ignore hits right at the point: a ray along a hole wall grazes it at the rim itself
    raycaster.far = far - occlusionTol;
    for (const m of meshes) if (raycaster.intersectObject(m, false).length) return true;
    return false;
  };

  const segs: Seg[] = [];
  const seen = new Set<string>();
  const key = (a: [number, number], b: [number, number]) => {
    const k1 = `${a[0].toFixed(3)},${a[1].toFixed(3)}`;
    const k2 = `${b[0].toFixed(3)},${b[1].toFixed(3)}`;
    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
  };
  const pushSeg = (a3: THREE.Vector3, b3: THREE.Vector3, layer: string, isHidden: boolean) => {
    const a = uv(a3);
    const b = uv(b3);
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < eps) return; // edge seen end-on
    const k = `${isHidden ? 'H' : 'V'}:${key(a, b)}`;
    if (seen.has(k)) return; // e.g. top and bottom edges that coincide in plan
    seen.add(k);
    segs.push({ a, b, layer: isHidden ? `${layer}_HIDDEN` : layer, hidden: isHidden });
  };

  for (const [ei, edges] of edgeSets.entries()) {
    const pos = edges.getAttribute('position');
    for (let i = 0; i + 1 < pos.count; i += 2) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, i);
      const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
      const [ua, va] = uv(a);
      const [ub, vb] = uv(b);
      const len2d = Math.hypot(ub - ua, vb - va);
      if (len2d < eps) continue;
      // Sample along the edge and split it into visible / hidden runs
      const n = Math.min(64, Math.max(2, Math.ceil(len2d / (diag / 300))));
      const states: boolean[] = [];
      for (let k = 0; k < n; k++) states.push(hidden(a.clone().lerp(b, (k + 0.5) / n)));
      let start = 0;
      for (let k = 1; k <= n; k++) {
        if (k === n || states[k] !== states[start]) {
          pushSeg(a.clone().lerp(b, start / n), a.clone().lerp(b, k / n), meshLayer[ei], states[start]);
          start = k;
        }
      }
    }
    edges.dispose();
  }
  meshes.forEach((m) => {
    (m.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH }).boundsTree = undefined;
    m.geometry.dispose();
  });
  material.dispose();

  // A hidden edge behind a visible one on the same 2D line (e.g. bottom edge under the top edge in
  // plan) must not be drawn dashed on top of it: subtract the visible coverage from hidden pieces.
  const visible = segs.filter((s) => !s.hidden);
  const drawn: Seg[] = [...visible];
  for (const h of segs) {
    if (!h.hidden) continue;
    for (const piece of subtractCollinear(h, visible, eps)) drawn.push(piece);
  }

  // Dimensions: extension lines, dimension line, ticks and the measured value
  const texts: Text[] = [];
  const textH = Math.max(diag / 80, 1);
  for (const o of objects) {
    if (!o.visible || o.type !== 'dimension' || !o.dim) continue;
    const P = new THREE.Vector3(...o.position);
    const A = new THREE.Vector3(...o.dim.a).add(P);
    const B = new THREE.Vector3(...o.dim.b).add(P);
    const O = new THREE.Vector3(...o.dim.offset);
    const a = uv(A);
    const b = uv(B);
    const a2 = uv(A.clone().add(O));
    const b2 = uv(B.clone().add(O));
    const len2d = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]);
    if (len2d < eps) continue; // dimension points straight at the viewer
    const d: [number, number] = [(b2[0] - a2[0]) / len2d, (b2[1] - a2[1]) / len2d];
    const t = len2d * 0.025;
    const L = nameOf(o);
    const tick = (p: [number, number]): Seg => ({
      a: [p[0] - (d[0] - d[1]) * t, p[1] - (d[1] + d[0]) * t],
      b: [p[0] + (d[0] - d[1]) * t, p[1] + (d[1] + d[0]) * t],
      layer: L,
      dim: true,
    });
    drawn.push({ a, b: a2, layer: L, dim: true }, { a: b, b: b2, layer: L, dim: true }, { a: a2, b: b2, layer: L, dim: true }, tick(a2), tick(b2));
    let rot = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
    if (rot > 90.01 || rot < -89.99) rot += rot > 0 ? -180 : 180; // keep text readable
    const value = Math.round(toDisplay(A.distanceTo(B), unit) * 100) / 100;
    // Text sits just off the dimension line, on the side away from the object
    const off = [-Math.sin((rot * Math.PI) / 180) * textH * 0.4, Math.cos((rot * Math.PI) / 180) * textH * 0.4];
    texts.push({ at: [(a2[0] + b2[0]) / 2 + off[0], (a2[1] + b2[1]) / 2 + off[1]], h: textH, rot, text: `${value}`, layer: L });
  }

  // Layer table: every app layer that was drawn, plus a dashed _HIDDEN twin where needed
  const table: [string, number, string][] = [['0', 7, 'CONTINUOUS']];
  const usedNames = new Set([...drawn.map((s) => s.layer), ...texts.map((t) => t.layer)]);
  for (const l of layers) {
    const n = dxfName.get(l.id)!;
    const aci = nearestAci(l.color);
    if (n !== '0' && usedNames.has(n)) table.push([n, aci, 'CONTINUOUS']);
    if (usedNames.has(`${n}_HIDDEN`)) table.push([`${n}_HIDDEN`, aci, 'DASHED']);
  }
  return {
    dxf: writeDxf(drawn, texts, diag, table),
    lines: drawn.filter((s) => !s.hidden && !s.dim).length,
    hidden: drawn.filter((s) => s.hidden).length,
  };
}

/** Parts of segment h not covered by collinear segments in `cover`. */
function subtractCollinear(h: Seg, cover: Seg[], eps: number): Seg[] {
  const dx = h.b[0] - h.a[0];
  const dy = h.b[1] - h.a[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const t = (p: [number, number]) => (p[0] - h.a[0]) * ux + (p[1] - h.a[1]) * uy; // position along h
  const off = (p: [number, number]) => Math.abs((p[0] - h.a[0]) * uy - (p[1] - h.a[1]) * ux); // distance from h's line

  const covered: [number, number][] = [];
  for (const c of cover) {
    if (off(c.a) > eps || off(c.b) > eps) continue; // not on the same line
    const t0 = Math.min(t(c.a), t(c.b));
    const t1 = Math.max(t(c.a), t(c.b));
    if (t1 > eps && t0 < len - eps) covered.push([Math.max(0, t0), Math.min(len, t1)]);
  }
  covered.sort((p, q) => p[0] - q[0]);

  const out: Seg[] = [];
  let cur = 0;
  const at = (s: number): [number, number] => [h.a[0] + ux * s, h.a[1] + uy * s];
  for (const [s, e] of covered) {
    if (s - cur > eps) out.push({ ...h, a: at(cur), b: at(s) });
    cur = Math.max(cur, e);
  }
  if (len - cur > eps) out.push({ ...h, a: at(cur), b: at(len) });
  return out;
}

/**
 * Nearest AutoCAD Color Index for a hex colour (R12 has no true colour). Matching by hue keeps
 * soft UI colours recognisable (a muted orange stays orange instead of collapsing to grey).
 */
const ACI_HUES: [number, number][] = [
  [0, 1], // red
  [30, 30], // orange
  [60, 2], // yellow
  [120, 3], // green
  [180, 4], // cyan
  [210, 140], // azure
  [240, 5], // blue
  [300, 6], // magenta
  [330, 210], // pink
  [360, 1],
];
export function nearestAci(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (sat < 0.2) return max > 0.85 ? 7 : max > 0.55 ? 9 : 8; // white / light grey / grey
  let hue: number;
  if (max === r) hue = ((g - b) / (max - min)) * 60;
  else if (max === g) hue = ((b - r) / (max - min) + 2) * 60;
  else hue = ((r - g) / (max - min) + 4) * 60;
  if (hue < 0) hue += 360;
  return ACI_HUES.reduce((best, cur) => (Math.abs(cur[0] - hue) < Math.abs(best[0] - hue) ? cur : best))[1];
}

function writeDxf(segs: Seg[], texts: Text[], diag: number, layers: [string, number, string][]): string {
  const out: string[] = [];
  const w = (code: number, value: string | number) => out.push(String(code), typeof value === 'number' ? fmt(value) : value);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of segs)
    for (const [x, y] of [s.a, s.b]) {
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;

  // HEADER (R12). $INSUNITS = 4 tells newer readers the drawing is in millimetres.
  w(0, 'SECTION'); w(2, 'HEADER');
  w(9, '$ACADVER'); w(1, 'AC1009');
  w(9, '$INSUNITS'); w(70, '4');
  w(9, '$EXTMIN'); w(10, minX); w(20, minY); w(30, 0);
  w(9, '$EXTMAX'); w(10, maxX); w(20, maxY); w(30, 0);
  w(0, 'ENDSEC');

  // TABLES: line types and layers
  const dash = Math.max(diag / 120, 0.5);
  w(0, 'SECTION'); w(2, 'TABLES');
  w(0, 'TABLE'); w(2, 'LTYPE'); w(70, '2');
  w(0, 'LTYPE'); w(2, 'CONTINUOUS'); w(70, '0'); w(3, 'Solid line'); w(72, '65'); w(73, '0'); w(40, 0);
  w(0, 'LTYPE'); w(2, 'DASHED'); w(70, '0'); w(3, '__ __ __'); w(72, '65'); w(73, '2'); w(40, dash * 1.5); w(49, dash); w(49, -dash * 0.5);
  w(0, 'ENDTAB');
  w(0, 'TABLE'); w(2, 'LAYER'); w(70, String(layers.length));
  for (const [name, color, lt] of layers) {
    w(0, 'LAYER'); w(2, name); w(70, '0'); w(62, String(color)); w(6, lt);
  }
  w(0, 'ENDTAB');
  w(0, 'ENDSEC');

  w(0, 'SECTION'); w(2, 'ENTITIES');
  for (const s of segs) {
    w(0, 'LINE'); w(8, s.layer);
    w(10, s.a[0]); w(20, s.a[1]); w(30, 0);
    w(11, s.b[0]); w(21, s.b[1]); w(31, 0);
  }
  for (const t of texts) {
    // Centre-aligned text: group 72 = 1 uses the 11/21 alignment point
    w(0, 'TEXT'); w(8, t.layer);
    w(10, t.at[0]); w(20, t.at[1]); w(30, 0);
    w(40, t.h); w(1, t.text.replace(/[\r\n]/g, ' ')); w(50, t.rot);
    w(72, '1'); w(11, t.at[0]); w(21, t.at[1]); w(31, 0);
  }
  w(0, 'ENDSEC');
  w(0, 'EOF');
  return out.join('\r\n') + '\r\n';
}
