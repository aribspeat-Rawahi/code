import * as THREE from 'three';
import type { Pt } from './sketch';

export type PrimitiveType = 'box' | 'cylinder' | 'sphere' | 'cone';
export type ObjectType = PrimitiveType | 'extrusion';
export type Params = Record<string, number>;

export const OBJECT_TYPES: ObjectType[] = ['box', 'cylinder', 'sphere', 'cone', 'extrusion'];
export const PRIMITIVES: PrimitiveType[] = ['box', 'cylinder', 'sphere', 'cone'];

export const OBJECT_LABEL: Record<ObjectType, string> = {
  box: 'Box',
  cylinder: 'Cylinder',
  sphere: 'Sphere',
  cone: 'Cone',
  extrusion: 'Extrusion',
};

// Default sizes in mm
export const DEFAULT_PARAMS: Record<ObjectType, Params> = {
  box: { width: 100, depth: 100, height: 100 },
  cylinder: { radius: 50, height: 100 },
  sphere: { radius: 50 },
  cone: { radius: 50, height: 100 },
  extrusion: { height: 100 },
};

const SEGMENTS = 64;
const MIN = 0.001;

/** Build a mesh geometry whose base sits on Z=0, centred on the XY origin. */
export function buildGeometry(type: ObjectType, p: Params, profile?: Pt[]): THREE.BufferGeometry {
  let g: THREE.BufferGeometry;
  switch (type) {
    case 'box': {
      const h = Math.max(p.height, MIN);
      g = new THREE.BoxGeometry(Math.max(p.width, MIN), Math.max(p.depth, MIN), h);
      g.translate(0, 0, h / 2);
      break;
    }
    case 'cylinder': {
      const r = Math.max(p.radius, MIN);
      const h = Math.max(p.height, MIN);
      g = new THREE.CylinderGeometry(r, r, h, SEGMENTS);
      g.rotateX(Math.PI / 2); // three.js cylinders are Y-up
      g.translate(0, 0, h / 2);
      break;
    }
    case 'cone': {
      const r = Math.max(p.radius, MIN);
      const h = Math.max(p.height, MIN);
      g = new THREE.ConeGeometry(r, h, SEGMENTS);
      g.rotateX(Math.PI / 2);
      g.translate(0, 0, h / 2);
      break;
    }
    case 'sphere': {
      const r = Math.max(p.radius, MIN);
      g = new THREE.SphereGeometry(r, SEGMENTS, SEGMENTS / 2);
      g.translate(0, 0, r);
      break;
    }
    case 'extrusion': {
      if (!profile || profile.length < 3) {
        g = new THREE.BufferGeometry();
        break;
      }
      const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
      // Shape lies in XY, so extruding along +Z keeps the base on the ground
      g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(p.height, MIN), bevelEnabled: false });
      break;
    }
  }
  return g;
}
