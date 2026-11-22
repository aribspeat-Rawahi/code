import { newId, type CadObject, type Vec3 } from '../store/sceneStore';
import { BOOLEAN_OPS, DEFAULT_PARAMS, OBJECT_TYPES, type BooleanOp, type ObjectType, type Params } from '../tools/primitives';
import type { Pt } from '../tools/sketch';
import type { Unit } from '../units';

const FORMAT = 'nirman-cad';
const VERSION = 1;
const MAX_OBJECTS = 100_000;
const MAX_PROFILE_POINTS = 10_000;
const UNITS: Unit[] = ['mm', 'cm', 'm'];
const MAX_DEPTH = 32;

export function serializeProject(objects: CadObject[], unit: Unit): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, unit, objects }, null, 2);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function vec3(v: unknown, fallback: Vec3): Vec3 {
  return Array.isArray(v) && v.length === 3 && v.every(isNum) ? [v[0], v[1], v[2]] : fallback;
}

/** Validate one untrusted object; returns null if it can't be used. */
function sanitizeObject(raw: unknown, usedIds: Set<string>, depth = 0): CadObject | null {
  if (!raw || typeof raw !== 'object' || depth > MAX_DEPTH) return null;
  const o = raw as Record<string, unknown>;
  if (!OBJECT_TYPES.includes(o.type as ObjectType)) return null;
  const type = o.type as ObjectType;

  // Only keep known, positive dimensions for this type
  const params: Params = { ...DEFAULT_PARAMS[type] };
  const rawParams = (o.params ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(params)) {
    const v = rawParams[key];
    if (isNum(v) && v > 0) params[key] = v;
  }

  let profile: Pt[] | undefined;
  if (type === 'extrusion') {
    if (!Array.isArray(o.profile) || o.profile.length < 3 || o.profile.length > MAX_PROFILE_POINTS) return null;
    if (!o.profile.every((p) => Array.isArray(p) && p.length === 2 && isNum(p[0]) && isNum(p[1]))) return null;
    profile = (o.profile as number[][]).map((p) => [p[0], p[1]] as Pt);
  }

  let op: BooleanOp | undefined;
  let children: CadObject[] | undefined;
  if (type === 'boolean') {
    if (!BOOLEAN_OPS.includes(o.op as BooleanOp) || !Array.isArray(o.children)) return null;
    op = o.op as BooleanOp;
    children = o.children
      .map((c) => sanitizeObject(c, usedIds, depth + 1))
      .filter((c): c is CadObject => c !== null);
    if (!children.length) return null;
  }

  let dim: CadObject['dim'];
  if (type === 'dimension') {
    const d = (o.dim ?? {}) as Record<string, unknown>;
    const ok = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every(isNum);
    if (!ok(d.a) || !ok(d.b) || !ok(d.offset)) return null;
    dim = { a: vec3(d.a, [0, 0, 0]), b: vec3(d.b, [0, 0, 0]), offset: vec3(d.offset, [0, 0, 0]) };
  }

  let id = typeof o.id === 'string' && /^[\w-]{1,64}$/.test(o.id) ? o.id : newId();
  if (usedIds.has(id)) id = newId();
  usedIds.add(id);

  const scale = vec3(o.scale, [1, 1, 1]).map((s) => (s === 0 ? 1 : s)) as Vec3;
  const name = typeof o.name === 'string' ? o.name.replace(/[\r\n\t]/g, ' ').trim().slice(0, 80) : '';

  return {
    id,
    name: name || type,
    type,
    params,
    profile,
    op,
    children,
    dim,
    position: vec3(o.position, [0, 0, 0]),
    rotation: vec3(o.rotation, [0, 0, 0]),
    scale,
    color: typeof o.color === 'string' && /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : '#8aa4c8',
    visible: o.visible !== false,
  };
}

export function parseProject(text: string): { unit: Unit; objects: CadObject[]; skipped: number } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  const d = data as Record<string, unknown>;
  if (!d || d.format !== FORMAT) throw new Error('Not a Nirman CAD project file.');
  if (!isNum(d.version) || d.version > VERSION) throw new Error('Project was saved by a newer version.');
  if (!Array.isArray(d.objects)) throw new Error('Project has no object list.');
  if (d.objects.length > MAX_OBJECTS) throw new Error('Project has too many objects.');

  const used = new Set<string>();
  const objects = d.objects.map((o) => sanitizeObject(o, used)).filter((o): o is CadObject => o !== null);
  const unit = UNITS.includes(d.unit as Unit) ? (d.unit as Unit) : 'mm';
  return { unit, objects, skipped: d.objects.length - objects.length };
}
