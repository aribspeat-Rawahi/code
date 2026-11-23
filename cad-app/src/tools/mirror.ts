import * as THREE from 'three';
import type { CadObject, Vec3 } from '../store/sceneStore';
import { matrixOf } from './geometry';

/** Reflection across the plane through `point` with unit normal `normal`. */
export function reflectionMatrix(point: THREE.Vector3, normal: THREE.Vector3): THREE.Matrix4 {
  const n = normal.clone().normalize();
  const d = 2 * point.dot(n);
  const [x, y, z] = [n.x, n.y, n.z];
  // R = I - 2nnᵀ, plus translation 2(p·n)n
  return new THREE.Matrix4().set(
    1 - 2 * x * x, -2 * x * y, -2 * x * z, d * x,
    -2 * y * x, 1 - 2 * y * y, -2 * y * z, d * y,
    -2 * z * x, -2 * z * y, 1 - 2 * z * z, d * z,
    0, 0, 0, 1,
  );
}

/** Mirror in the object's own X: S = diag(-1, 1, 1). */
const S = new THREE.Matrix4().makeScale(-1, 1, 1);

function decompose(m: THREE.Matrix4): Pick<CadObject, 'position' | 'rotation' | 'scale'> {
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  m.decompose(p, q, s);
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return { position: p.toArray() as Vec3, rotation: [e.x, e.y, e.z], scale: s.toArray() as Vec3 };
}

/**
 * The object's own shape mirrored in its local X (geometry only, transform untouched).
 * Box, cylinder, cone and sphere are symmetric in local X, so they don't change; an extrusion's
 * profile is flipped; a boolean mirrors each part inside its frame.
 */
function mirrorLocal(o: CadObject): CadObject {
  if (o.type === 'extrusion' && o.profile) {
    // Flip x and reverse the order so the outline keeps its winding
    return { ...o, profile: o.profile.map(([x, y]) => [-x, y] as [number, number]).reverse() };
  }
  if (o.type === 'boolean' && o.children) {
    return {
      ...o,
      children: o.children.map((c) => ({ ...mirrorLocal(c), ...decompose(S.clone().multiply(matrixOf(c)).multiply(S)) })),
    };
  }
  return o;
}

/**
 * The object reflected by R. A reflection flips handedness, which a position/rotation/scale
 * transform can't express, so: R·M·shape = (R·M·S)·(S·shape) — a proper transform R·M·S
 * applied to the locally mirrored shape.
 */
export function mirrorObject(o: CadObject, R: THREE.Matrix4): CadObject {
  if (o.type === 'dimension' && o.dim) {
    const P = new THREE.Vector3(...o.position);
    const pa = new THREE.Vector3(...o.dim.a).add(P).applyMatrix4(R);
    const pb = new THREE.Vector3(...o.dim.b).add(P).applyMatrix4(R);
    const off = new THREE.Vector3(...o.dim.offset).transformDirection(R).multiplyScalar(new THREE.Vector3(...o.dim.offset).length());
    return {
      ...o,
      position: [0, 0, 0],
      dim: { a: pa.toArray() as Vec3, b: pb.toArray() as Vec3, offset: off.toArray() as Vec3 },
    };
  }
  return { ...mirrorLocal(o), ...decompose(R.clone().multiply(matrixOf(o)).multiply(S)) };
}
