import * as THREE from 'three';
import { ADDITION, Brush, Evaluator, INTERSECTION, SUBTRACTION } from 'three-bvh-csg';
import type { CadObject } from '../store/sceneStore';
import { buildGeometry, type BooleanOp } from './primitives';

const CSG_OP: Record<BooleanOp, typeof ADDITION> = {
  union: ADDITION,
  subtract: SUBTRACTION,
  intersect: INTERSECTION,
};

/** Local transform of an object (position, XYZ rotation, scale). */
export function matrixOf(o: CadObject): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...o.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...o.rotation, 'XYZ')),
    new THREE.Vector3(...o.scale),
  );
}

const isEmpty = (g: THREE.BufferGeometry) => !g.getAttribute('position') || g.getAttribute('position').count === 0;

/**
 * Geometry for any object in its own local frame. Booleans are evaluated from
 * their visible children (first = base, rest = tools); hidden children are skipped,
 * which lets the user switch a cut on and off.
 */
export function buildObjectGeometry(o: CadObject): THREE.BufferGeometry {
  if (o.type !== 'boolean') return buildGeometry(o.type, o.params, o.profile);

  const parts: THREE.BufferGeometry[] = [];
  for (const c of o.children ?? []) {
    if (!c.visible) continue;
    const g = buildObjectGeometry(c);
    if (isEmpty(g)) {
      g.dispose();
      continue;
    }
    // Bake the child's transform so every brush sits at identity
    g.applyMatrix4(matrixOf(c));
    // CSG needs identical attribute sets on every input
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    parts.push(g);
  }
  if (parts.length === 0) return new THREE.BufferGeometry();
  if (parts.length === 1) return parts[0];

  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  evaluator.attributes = ['position', 'normal'];
  try {
    let result = new Brush(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      const next = evaluator.evaluate(result, new Brush(parts[i]), CSG_OP[o.op ?? 'union']);
      if (i > 1) result.geometry.dispose(); // intermediate result
      result = next;
    }
    parts.forEach((g) => g.dispose());
    return result.geometry;
  } catch (err) {
    console.error('Boolean evaluation failed', err);
    parts.slice(1).forEach((g) => g.dispose());
    return parts[0];
  }
}
