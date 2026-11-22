import { create } from 'zustand';
import { DEFAULT_PARAMS, PRIMITIVE_LABEL, type Params, type PrimitiveType } from '../tools/primitives';
import type { Unit } from '../units';

export type Vec3 = [number, number, number];
export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface CadObject {
  id: string;
  name: string;
  type: PrimitiveType;
  params: Params; // mm
  position: Vec3; // mm
  rotation: Vec3; // radians (XYZ Euler)
  scale: Vec3;
  color: string;
  visible: boolean;
}

interface SceneState {
  objects: CadObject[];
  selectedId: string | null;
  mode: TransformMode;
  unit: Unit;
  past: CadObject[][];
  future: CadObject[][];
  addPrimitive: (type: PrimitiveType) => void;
  updateObject: (id: string, patch: Partial<Omit<CadObject, 'id'>>) => void;
  removeObject: (id: string) => void;
  select: (id: string | null) => void;
  setMode: (mode: TransformMode) => void;
  setUnit: (unit: Unit) => void;
  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 100;
const PALETTE = ['#8aa4c8', '#c8a98a', '#9cc89a', '#c89ab8', '#c8c48a', '#8ac4c8'];

let counter = 0;
const newId = () => `obj_${Date.now().toString(36)}_${(counter++).toString(36)}`;

/** Push the current object list onto the undo stack and clear redo. */
const withHistory = (s: SceneState) => ({
  past: [...s.past, s.objects].slice(-HISTORY_LIMIT),
  future: [] as CadObject[][],
});

export const useScene = create<SceneState>((set, get) => ({
  objects: [],
  selectedId: null,
  mode: 'translate',
  unit: 'mm',
  past: [],
  future: [],

  addPrimitive: (type) =>
    set((s) => {
      const n = s.objects.filter((o) => o.type === type).length + 1;
      const idx = s.objects.length;
      const obj: CadObject = {
        id: newId(),
        name: `${PRIMITIVE_LABEL[type]} ${n}`,
        type,
        params: { ...DEFAULT_PARAMS[type] },
        // Lay new objects out along X so they don't overlap
        position: [(idx % 6) * 150, Math.floor(idx / 6) * 150, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: PALETTE[idx % PALETTE.length],
        visible: true,
      };
      return { ...withHistory(s), objects: [...s.objects, obj], selectedId: obj.id };
    }),

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

  select: (id) => set({ selectedId: id }),
  setMode: (mode) => set({ mode }),
  setUnit: (unit) => set({ unit }),

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
