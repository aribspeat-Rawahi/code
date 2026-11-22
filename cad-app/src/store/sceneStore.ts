import { create } from 'zustand';
import { DEFAULT_PARAMS, OBJECT_LABEL, type ObjectType, type Params } from '../tools/primitives';
import { profileFromPoints, type Pt } from '../tools/sketch';
import type { Unit } from '../units';

export type Vec3 = [number, number, number];
export type TransformMode = 'translate' | 'rotate' | 'scale';
export type Tool = 'select' | 'sketch';

export interface CadObject {
  id: string;
  name: string;
  type: ObjectType;
  params: Params; // mm
  profile?: Pt[]; // mm, local XY (extrusions only)
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
}

interface SceneState {
  objects: CadObject[];
  selectedId: string | null;
  mode: TransformMode;
  tool: Tool;
  unit: Unit;
  snap: SnapSettings;
  extrudeHeight: number; // mm, used when a sketch is closed
  sketchPoints: Pt[];
  cursor: Pt | null;
  projectName: string;
  log: string[];
  past: CadObject[][];
  future: CadObject[][];

  addObject: (spec: NewObjectSpec) => string;
  updateObject: (id: string, patch: Partial<Omit<CadObject, 'id'>>) => void;
  removeObject: (id: string) => void;
  duplicateObject: (id: string, offset: Vec3) => string | null;
  select: (id: string | null) => void;
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

const DEFAULT_HEIGHT: Record<Unit, number> = { mm: 100, cm: 100, m: 3000 };
const DEFAULT_STEP: Record<Unit, number> = { mm: 10, cm: 10, m: 100 };

export const useScene = create<SceneState>((set, get) => ({
  objects: [],
  selectedId: null,
  mode: 'translate',
  tool: 'select',
  unit: 'mm',
  snap: { enabled: true, step: 10, angle: 15 },
  extrudeHeight: 100,
  sketchPoints: [],
  cursor: null,
  projectName: 'untitled',
  log: ['Nirman CAD ready. Type HELP for commands.'],
  past: [],
  future: [],

  addObject: (spec) => {
    const id = newId();
    set((s) => {
      const idx = s.objects.length;
      const label = OBJECT_LABEL[spec.type];
      // Next free number for this label, e.g. "Box 3"
      const re = new RegExp(`^${label} (\\d+)$`);
      const n = Math.max(0, ...s.objects.map((o) => Number(re.exec(o.name)?.[1] ?? 0))) + 1;
      const obj: CadObject = {
        id,
        name: spec.name ?? `${label} ${n}`,
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
      return { ...withHistory(s), objects: [...s.objects, obj], selectedId: id };
    });
    return id;
  },

  updateObject: (id, patch) =>
    set((s) => ({
      ...withHistory(s),
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })),

  removeObject: (id) =>
    set((s) => ({
      ...withHistory(s),
      objects: s.objects.filter((o) => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  duplicateObject: (id, offset) => {
    const src = get().objects.find((o) => o.id === id);
    if (!src) return null;
    const copy: CadObject = {
      ...structuredClone(src),
      id: newId(),
      name: `${src.name} copy`,
      position: [src.position[0] + offset[0], src.position[1] + offset[1], src.position[2] + offset[2]],
    };
    set((s) => ({ ...withHistory(s), objects: [...s.objects, copy], selectedId: copy.id }));
    return copy.id;
  },

  select: (id) => set({ selectedId: id }),
  setMode: (mode) => set({ mode }),
  setTool: (tool) =>
    set((s) => ({
      tool,
      sketchPoints: [],
      cursor: null,
      selectedId: tool === 'sketch' ? null : s.selectedId,
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
  setProjectName: (projectName) => set({ projectName }),
  print: (msg) => set((s) => ({ log: [...s.log, msg].slice(-LOG_LIMIT) })),

  loadProject: (objects, unit, name) =>
    set({
      objects,
      unit,
      projectName: name,
      selectedId: null,
      tool: 'select',
      sketchPoints: [],
      past: [],
      future: [],
    }),

  newProject: () =>
    set({ objects: [], selectedId: null, tool: 'select', sketchPoints: [], projectName: 'untitled', past: [], future: [] }),

  undo: () => {
    const s = get();
    if (!s.past.length) return;
    const prev = s.past[s.past.length - 1];
    set({
      objects: prev,
      past: s.past.slice(0, -1),
      future: [s.objects, ...s.future],
      selectedId: prev.some((o) => o.id === s.selectedId) ? s.selectedId : null,
    });
  },

  redo: () => {
    const s = get();
    if (!s.future.length) return;
    const next = s.future[0];
    set({
      objects: next,
      past: [...s.past, s.objects],
      future: s.future.slice(1),
      selectedId: next.some((o) => o.id === s.selectedId) ? s.selectedId : null,
    });
  },
}));
