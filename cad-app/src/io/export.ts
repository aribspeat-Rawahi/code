import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import type { CadObject } from '../store/sceneStore';
import { buildGeometry } from '../tools/primitives';

/** Export visible objects in mm, Z-up (what slicers and most CAD tools expect). */
export function exportMesh(objects: CadObject[], kind: 'stl' | 'obj'): string | Uint8Array {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];

  for (const o of objects) {
    if (!o.visible) continue;
    const g = buildGeometry(o.type, o.params, o.profile);
    geometries.push(g);
    const m = new THREE.Mesh(g);
    m.name = o.name.replace(/\s+/g, '_');
    m.position.fromArray(o.position);
    m.rotation.set(o.rotation[0], o.rotation[1], o.rotation[2]);
    m.scale.fromArray(o.scale);
    group.add(m);
  }
  group.updateMatrixWorld(true);

  try {
    if (kind === 'stl') {
      const dv = new STLExporter().parse(group, { binary: true }) as DataView;
      return new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
    }
    return new OBJExporter().parse(group);
  } finally {
    geometries.forEach((g) => g.dispose());
  }
}
