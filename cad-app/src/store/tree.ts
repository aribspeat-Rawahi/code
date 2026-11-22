import type { CadObject } from './sceneStore';

/** Depth-first search through top-level objects and boolean children. */
export function findObject(list: CadObject[], id: string | null): CadObject | undefined {
  if (!id) return undefined;
  for (const o of list) {
    if (o.id === id) return o;
    const hit = o.children && findObject(o.children, id);
    if (hit) return hit;
  }
  return undefined;
}

export function findParent(list: CadObject[], id: string, parent?: CadObject): CadObject | undefined {
  for (const o of list) {
    if (o.id === id) return parent;
    const hit = o.children && findParent(o.children, id, o);
    if (hit) return hit;
  }
  return undefined;
}

export function flatten(list: CadObject[]): CadObject[] {
  return list.flatMap((o) => [o, ...(o.children ? flatten(o.children) : [])]);
}

/** Replace one object anywhere in the tree; untouched branches keep their identity (cheap re-render). */
export function updateIn(list: CadObject[], id: string, f: (o: CadObject) => CadObject): CadObject[] {
  let changed = false;
  const out = list.map((o) => {
    if (o.id === id) {
      changed = true;
      return f(o);
    }
    if (o.children) {
      const c = updateIn(o.children, id, f);
      if (c !== o.children) {
        changed = true;
        return { ...o, children: c };
      }
    }
    return o;
  });
  return changed ? out : list;
}

export function removeIn(list: CadObject[], ids: Set<string>): CadObject[] {
  let changed = false;
  const out: CadObject[] = [];
  for (const o of list) {
    if (ids.has(o.id)) {
      changed = true;
      continue;
    }
    if (o.children) {
      const c = removeIn(o.children, ids);
      if (c !== o.children) {
        changed = true;
        out.push({ ...o, children: c });
        continue;
      }
    }
    out.push(o);
  }
  return changed ? out : list;
}
