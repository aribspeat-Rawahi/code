import * as THREE from 'three';
import { create } from 'zustand';
import {
  BOOLEAN_LABEL,
  DEFAULT_PARAMS,
  OBJECT_LABEL,
  type BooleanOp,
  type ObjectType,
  type Params,
} from '../tools/primitives';
import { profileFromPoints, type Pt } from '../tools/sketch';
import { buildObjectGeometry, matrixOf } from '../tools/geometry';
import { toDisplay, type Unit } from '../units';
import type { SnapKind } from '../tools/snap';
import { findObject, flatten, removeIn, updateIn } from './tree';

export type Vec3 = [number, number, number];
export type TransformMode = 'translate' | 'rotate' | 'scale';
export type Tool = 'select' | 'sketch' | 'pickmove' | 'measure' | 'dimension';
export type PickTool = 'pickmove' | 'measure' | 'dimension';

/** Aligned dimension: measured points a, b and the offset vector to the dimension line (all mm, relative to position). */
export interface DimData {
  a: Vec3;
  b: Vec3;
  offset: Vec3;
}

export interface CadObject {
  id: string;
  name: string;
  type: ObjectType;
  params: Params; // mm
  profile?: Pt[]; // mm, local XY (extrusions only)
  op?: BooleanOp; // booleans only
  children?: CadObject[]; // booleans only: [base, ...tools], transforms relative to this object
  dim?: DimData; // dimensions only
  position: Vec3; // mm
  rotation: Vec3; // radians (XYZ Euler)
  scale: Vec3;
  color: string;
  visible: boolean;
}

export interface NewObjectSpec {
  type: ObjectType;
  name?: string;
  params?: Params;
  profile?: Pt[];
  position?: Vec3;
  rotation?: Vec3;
}

export interface SnapSettings {
  enabled: boolean;
  step: number; // mm
  angle: number; // degrees
  object: boolean; // snap to object corners, midpoints and centres
}

export interface PickInfo {
  point: Vec3;
  kind: SnapKind | null; // null = grid / free point
}

interface SceneState {
  objects: CadObject[];
  /** Selected ids in click order; [0] is the primary (gets the gizmo, is the boolean base). */
  selection: string[];
  selectedId: string | null;
  mode: TransformMode;
  tool: Tool;
  unit: Unit;
  snap: SnapSettings;
  extrudeHeight: number; // mm, used when a sketch is closed
  sketchPoints: Pt[];
  cursor: Pt | null;
  pick: PickInfo | null;
  /** Points picked so far by the active pick tool (move: base; measure: start; dimension: a, b). */
  pickPoints: Vec3[];
  projectName: string;
  log: string[];
  past: CadObject[][];
  future: CadObject[][];

  addObject: (spec: NewObjectSpec) => string;
  updateObject: (id: string, patch: Partial<Omit<CadObject, 'id'>>) => void;
  removeObject: (id: string) => void;
  removeSelected: () => void;
  duplicateObject: (id: string, offset: Vec3) => string | null;
  select: (id: string | null, additive?: boolean) => void;
  setSelection: (ids: string[]) => void;
  booleanOp: (op: BooleanOp) => boolean;
  explode: (id: string) => boolean;
  setMode: (mode: TransformMode) => void;
  setTool: (tool: Tool) => void;
  setUnit: (unit: Unit) => void;
  setSnap: (patch: Partial<SnapSettings>) => void;
  setExtrudeHeight: (mm: number) => void;
  addSketchPoint: (p: Pt) => void;
  popSketchPoint: () => void;
  cancelSketch: () => void;
  finishSketch: () => boolean;
  setCursor: (p: Pt | null) => void;
  setPick: (p: PickInfo | null) => void;
  startPickTool: (tool: PickTool) => boolean;
  addPickPoint: (p: Vec3) => void;
  addDimension: (a: Vec3, b: Vec3, offset?: Vec3) => string | null;
  autoDimension: (id: string) => number;
  setProjectName: (name: string) => void;
  print: (msg: string) => void;
  loadProject: (objects: CadObject[], unit: Unit, name: string) => void;
  newProject: () => void;
  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 100;
const LOG_LIMIT = 200;
const PALETTE = ['#8aa4c8', '#c8a98a', '#9cc89a', '#c89ab8', '#c8c48a', '#8ac4c8'];

let counter = 0;
export const newId = () => `obj_${Date.now().toString(36)}_${(counter++).toString(36)}`;

/** Push the current object list onto the undo stack and clear redo. */
const withHistory = (s: SceneState) => ({
  past: [...s.past, s.objects].slice(-HISTORY_LIMIT),
  future: [] as CadObject[][],
});

const sel = (ids: string[]) => ({ selection: ids, selectedId: ids[0] ?? null });

/** Keep only selected ids that still exist after an edit/undo. */
const keepSelection = (s: SceneState, objects: CadObject[]) =>
  sel(s.selection.filter((id) => findObject(objects, id)));

/** Next free number for a label, e.g. "Box 3". */
function nextName(objects: CadObject[], label: string): string {
  const re = new RegExp(`^${label} (\\d+)$`);
  const n = Math.max(0, ...flatten(objects).map((o) => Number(re.exec(o.name)?.[1] ?? 0))) + 1;
  return `${label} ${n}`;
}

/** Deep copy with fresh ids so a duplicate never shares ids with its source. */
function cloneWithNewIds(o: CadObject): CadObject {
  return { ...structuredClone(o), id: newId(), children: o.children?.map(cloneWithNewIds) };
}

const PICK_HELP: Record<PickTool, string> = {
  pickmove: 'Move: click the base point (e.g. a corner of the object), then the target point. Or type x y z / @dx dy dz. Esc cancels.',
  measure: 'Measure: click two points (object snap works). Or type x y z / @dx dy dz. Esc ends.',
  dimension: 'Dimension: click two points, then where the dimension line goes. Esc ends.',
};

/**
 * Offset from the measured line a→b to the dimension line, taken from a third point c
 * (its component perpendicular to a→b). Without c, offset sideways in plan (or along X for vertical lines).
 */
export function dimOffset(a: Vec3, b: Vec3, c: Vec3 | null): Vec3 {
  const ab = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
  const len = ab.length();
  const d = ab.clone().normalize();
  if (c) {
    const ac = new THREE.Vector3(...c).sub(new THREE.Vector3(...a));
    const perp = ac.sub(d.clone().multiplyScalar(ac.dot(d)));
    if (perp.length() > len * 1e-3) return perp.toArray() as Vec3;
  }
  const side = Math.abs(d.z) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 0, 1)).normalize();
  return side.multiplyScalar(Math.max(len * 0.15, 1)).toArray() as Vec3;
}

const DEFAULT_HEIGHT: Record<Unit, number> = { mm: 100, cm: 100, m: 3000 };
const DEFAULT_STEP: Record<Unit, number> = { mm: 10, cm: 10, m: 100 };

export const useScene = create<SceneState>((set, get) => ({
  objects: [],
  selection: [],
  selectedId: null,
  mode: 'translate',
  tool: 'select',
  unit: 'mm',
  snap: { enabled: true, step: 10, angle: 15, object: true },
  extrudeHeight: 100,
  sketchPoints: [],
  cursor: null,
  pick: null,
  pickPoints: [],
  projectName: 'untitled',
  log: ['Nirman CAD ready. Type HELP for commands.'],
  past: [],
  future: [],

  addObject: (spec) => {
    const id = newId();
    set((s) => {
      const idx = s.objects.length;
      const obj: CadObject = {
        id,
        name: spec.name ?? nextName(s.objects, OBJECT_LABEL[spec.type]),
        type: spec.type,
        params: { ...DEFAULT_PARAMS[spec.type], ...spec.params },
        profile: spec.profile,
        // Lay toolbar-created objects out along X so they don't overlap
        position: spec.position ?? [(idx % 6) * 150, Math.floor(idx / 6) * 150, 0],
        rotation: spec.rotation ?? [0, 0, 0],
        scale: [1, 1, 1],
        color: PALETTE[idx % PALETTE.length],
        visible: true,
      };
      return { ...withHistory(s), objects: [...s.objects, obj], ...sel([id]) };
    });
    return id;
  },

  updateObject: (id, patch) =>
    set((s) => ({ ...withHistory(s), objects: updateIn(s.objects, id, (o) => ({ ...o, ...patch })) })),

  removeObject: (id) =>
    set((s) => {
      const objects = removeIn(s.objects, new Set([id]));
      return { ...withHistory(s), objects, ...keepSelection(s, objects) };
    }),

  removeSelected: () =>
    set((s) => {
      if (!s.selection.length) return {};
      const objects = removeIn(s.objects, new Set(s.selection));
      return { ...withHistory(s), objects, ...sel([]) };
    }),

  duplicateObject: (id, offset) => {
    const src = get().objects.find((o) => o.id === id);
    if (!src) return null;
    const copy: CadObject = {
      ...cloneWithNewIds(src),
      name: `${src.name} copy`,
      position: [src.position[0] + offset[0], src.position[1] + offset[1], src.position[2] + offset[2]],
    };
    set((s) => ({ ...withHistory(s), objects: [...s.objects, copy], ...sel([copy.id]) }));
    return copy.id;
  },

  select: (id, additive = false) =>
    set((s) => {
      if (!id) return sel([]);
      if (!additive) return sel([id]);
      return sel(s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id]);
    }),
  setSelection: (ids) => set(sel(ids)),

  booleanOp: (op) => {
    const s = get();
    const parts = s.selection
      .map((id) => s.objects.find((o) => o.id === id))
      .filter((o): o is CadObject => !!o);
    if (parts.length < 2) {
      s.print('Error: select 2 or more top-level objects (Ctrl+click). The first selected is the base.');
      return false;
    }
    if (parts.some((p) => p.type === 'dimension')) {
      s.print('Error: dimensions cannot be part of a boolean. Deselect them first.');
      return false;
    }
    const base = parts[0];
    const origin = base.position;
    // The new object sits where the base was; children are stored relative to it
    const children = parts.map((p) => ({
      ...p,
      position: [p.position[0] - origin[0], p.position[1] - origin[1], p.position[2] - origin[2]] as Vec3,
    }));
    const obj: CadObject = {
      id: newId(),
      name: nextName(s.objects, BOOLEAN_LABEL[op]),
      type: 'boolean',
      op,
      params: {},
      children,
      position: [...origin],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: base.color,
      visible: true,
    };
    const used = new Set(parts.map((p) => p.id));
    const baseIdx = s.objects.findIndex((o) => o.id === base.id);
    const objects = s.objects.filter((o) => !used.has(o.id));
    objects.splice(Math.min(baseIdx, objects.length), 0, obj);
    set({ ...withHistory(s), objects, ...sel([obj.id]) });
    s.print(`${obj.name}: ${base.name} ${op} ${parts.slice(1).map((p) => p.name).join(', ')}`);
    return true;
  },

  explode: (id) => {
    const s = get();
    const idx = s.objects.findIndex((o) => o.id === id);
    const b = s.objects[idx];
    if (!b || b.type !== 'boolean' || !b.children) {
      s.print('Error: select a top-level boolean object to explode.');
      return false;
    }
    // Bake the boolean's transform into each child so nothing moves on screen
    const parent = matrixOf(b);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const children = b.children.map((c) => {
      parent.clone().multiply(matrixOf(c)).decompose(pos, quat, scl);
      const e = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
      return { ...c, position: pos.toArray() as Vec3, rotation: [e.x, e.y, e.z] as Vec3, scale: scl.toArray() as Vec3 };
    });
    const objects = [...s.objects.slice(0, idx), ...children, ...s.objects.slice(idx + 1)];
    set({ ...withHistory(s), objects, ...sel(children.map((c) => c.id)) });
    s.print(`Exploded ${b.name} into ${children.length} objects.`);
    return true;
  },

  setMode: (mode) => set({ mode }),
  setTool: (tool) =>
    set((s) => ({
      tool,
      sketchPoints: [],
      cursor: null,
      pick: null,
      pickPoints: [],
      ...(tool === 'sketch' ? sel([]) : sel(s.selection)),
    })),

  setUnit: (unit) =>
    set((s) => ({
      unit,
      // Follow the unit's sensible defaults unless the user changed them
      snap: Object.values(DEFAULT_STEP).includes(s.snap.step) ? { ...s.snap, step: DEFAULT_STEP[unit] } : s.snap,
      extrudeHeight: Object.values(DEFAULT_HEIGHT).includes(s.extrudeHeight) ? DEFAULT_HEIGHT[unit] : s.extrudeHeight,
    })),

  setSnap: (patch) => set((s) => ({ snap: { ...s.snap, ...patch } })),
  setExtrudeHeight: (mm) => set({ extrudeHeight: mm }),

  addSketchPoint: (p) => set((s) => ({ sketchPoints: [...s.sketchPoints, p] })),
  popSketchPoint: () => set((s) => ({ sketchPoints: s.sketchPoints.slice(0, -1) })),
  cancelSketch: () => set({ sketchPoints: [] }),

  finishSketch: () => {
    const s = get();
    const r = profileFromPoints(s.sketchPoints);
    if ('error' in r) {
      s.print(`Error: ${r.error}`);
      return false;
    }
    s.addObject({
      type: 'extrusion',
      params: { height: s.extrudeHeight },
      profile: r.profile,
      position: [r.center[0], r.center[1], 0],
    });
    set({ sketchPoints: [], cursor: null, tool: 'select' });
    s.print(`Extruded ${r.profile.length}-point profile. Edit its height in Properties.`);
    return true;
  },

  setCursor: (p) => set({ cursor: p }),
  setPick: (pick) => set({ pick }),

  startPickTool: (tool) => {
    const s = get();
    if (tool === 'pickmove' && !s.selection.some((id) => s.objects.some((o) => o.id === id))) {
      s.print('Error: select the object(s) to move first.');
      return false;
    }
    set({ tool, pickPoints: [], pick: null, sketchPoints: [], cursor: null });
    s.print(PICK_HELP[tool]);
    return true;
  },

  addPickPoint: (p) => {
    const s = get();
    const pts = [...s.pickPoints, p];
    const r = (v: number) => Math.round(toDisplay(v, s.unit) * 1000) / 1000;

    if (s.tool === 'pickmove') {
      if (pts.length < 2) {
        set({ pickPoints: pts });
        return s.print('Base point set. Now the target point.');
      }
      const [base, target] = pts;
      const d: Vec3 = [target[0] - base[0], target[1] - base[1], target[2] - base[2]];
      const ids = new Set(s.selection.filter((id) => s.objects.some((o) => o.id === id)));
      const objects = s.objects.map((o) =>
        ids.has(o.id) ? { ...o, position: [o.position[0] + d[0], o.position[1] + d[1], o.position[2] + d[2]] as Vec3 } : o,
      );
      set({ ...withHistory(s), objects, tool: 'select', pickPoints: [], pick: null });
      return s.print(`Moved ${ids.size} object(s) by ${d.map(r).join(', ')} ${s.unit} (distance ${r(Math.hypot(...d))} ${s.unit}).`);
    }

    if (s.tool === 'measure') {
      if (pts.length < 2) {
        set({ pickPoints: pts });
        return s.print('First point set. Now the second point.');
      }
      const [a, b] = pts;
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ang = Math.round(((Math.atan2(d[1], d[0]) * 180) / Math.PI) * 100) / 100;
      set({ pickPoints: [] }); // stay in the tool for the next measurement
      return s.print(
        `Distance ${r(Math.hypot(d[0], d[1], d[2]))} ${s.unit}   ΔX ${r(d[0])}  ΔY ${r(d[1])}  ΔZ ${r(d[2])}   angle in XY ${ang}°`,
      );
    }

    if (s.tool === 'dimension') {
      if (pts.length < 3) {
        set({ pickPoints: pts });
        return s.print(pts.length === 1 ? 'Now the second point.' : 'Now click where the dimension line goes.');
      }
      const [a, b, c] = pts;
      s.addDimension(a, b, dimOffset(a, b, c));
      set({ pickPoints: [], tool: 'dimension' }); // stay for the next dimension
    }
  },

  addDimension: (a, b, offset) => {
    const s = get();
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (len < 1e-6) {
      s.print('Error: the two points are the same.');
      return null;
    }
    const id = newId();
    const obj: CadObject = {
      id,
      name: nextName(s.objects, OBJECT_LABEL.dimension),
      type: 'dimension',
      params: {},
      dim: { a, b, offset: offset ?? dimOffset(a, b, null) },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#ffd166',
      visible: true,
    };
    set((st) => ({ ...withHistory(st), objects: [...st.objects, obj] }));
    s.print(`${obj.name}: ${Math.round(toDisplay(len, s.unit) * 1000) / 1000} ${s.unit}`);
    return id;
  },

  autoDimension: (id) => {
    const s = get();
    const o = s.objects.find((x) => x.id === id);
    if (!o || o.type === 'dimension') {
      s.print('Error: select a solid object to dimension.');
      return 0;
    }
    const g = buildObjectGeometry(o);
    g.applyMatrix4(matrixOf(o));
    g.computeBoundingBox();
    const bb = g.boundingBox;
    g.dispose();
    if (!bb || bb.isEmpty()) return 0;
    const { min, max } = bb;
    const gap = Math.max(max.x - min.x, max.y - min.y, max.z - min.z) * 0.15;
    // Width along the front-bottom edge, depth along the right-bottom edge, height up the front-right corner
    const dims: [Vec3, Vec3, Vec3][] = [
      [[min.x, min.y, min.z], [max.x, min.y, min.z], [0, -gap, 0]],
      [[max.x, min.y, min.z], [max.x, max.y, min.z], [gap, 0, 0]],
      [[max.x, min.y, min.z], [max.x, min.y, max.z], [gap, -gap, 0].map((v) => v * 0.7071) as Vec3],
    ];
    let n = 0;
    for (const [a, b, off] of dims) if (Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) > 1e-6 && s.addDimension(a, b, off)) n++;
    return n;
  },

  setProjectName: (projectName) => set({ projectName }),
  print: (msg) => set((s) => ({ log: [...s.log, msg].slice(-LOG_LIMIT) })),

  loadProject: (objects, unit, name) =>
    set({ objects, unit, projectName: name, tool: 'select', sketchPoints: [], past: [], future: [], ...sel([]) }),

  newProject: () =>
    set({ objects: [], tool: 'select', sketchPoints: [], projectName: 'untitled', past: [], future: [], ...sel([]) }),

  undo: () => {
    const s = get();
    if (!s.past.length) return;
    const prev = s.past[s.past.length - 1];
    set({ objects: prev, past: s.past.slice(0, -1), future: [s.objects, ...s.future], ...keepSelection(s, prev) });
  },

  redo: () => {
    const s = get();
    if (!s.future.length) return;
    const next = s.future[0];
    set({ objects: next, past: [...s.past, s.objects], future: s.future.slice(1), ...keepSelection(s, next) });
  },
}));
