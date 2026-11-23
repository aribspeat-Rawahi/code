import * as THREE from 'three';
import type { CadObject } from '../store/sceneStore';
import { buildObjectGeometry, matrixOf } from './geometry';

/** World-space bounds per object version (objects are immutable, so this never goes stale). */
const cache = new WeakMap<CadObject, THREE.Box3>();

function objectBounds(o: CadObject): THREE.Box3 {
  let box = cache.get(o);
  if (box) return box;
  box = new THREE.Box3();
  if (o.type === 'dimension' && o.dim) {
    const p = new THREE.Vector3(...o.position);
    const { a, b, offset } = o.dim;
    for (const v of [a, b]) {
      box.expandByPoint(new THREE.Vector3(...v).add(p));
      box.expandByPoint(new THREE.Vector3(...v).add(p).add(new THREE.Vector3(...offset)));
    }
  } else {
    const g = buildObjectGeometry(o);
    g.applyMatrix4(matrixOf(o));
    g.computeBoundingBox();
    if (g.boundingBox) box.copy(g.boundingBox);
    g.dispose();
  }
  cache.set(o, box);
  return box;
}

/** Bounds of all visible objects, or null if the scene is empty. */
export function sceneBounds(objects: CadObject[]): THREE.Box3 | null {
  const box = new THREE.Box3();
  for (const o of objects) if (o.visible) box.union(objectBounds(o));
  return box.isEmpty() ? null : box;
}
