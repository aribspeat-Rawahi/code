import { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges, GizmoHelper, GizmoViewport, Grid, OrbitControls, TransformControls } from '@react-three/drei';
import type * as THREE from 'three';
import { useScene, type CadObject, type Vec3 } from '../store/sceneStore';
import { buildGeometry } from '../tools/primitives';

// Clicking a gizmo handle also fires the canvas "missed" event; ignore it briefly after a drag.
let lastGizmoUse = 0;

function ObjectMesh({ obj, selected }: { obj: CadObject; selected: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  const mode = useScene((s) => s.mode);
  const select = useScene((s) => s.select);
  const updateObject = useScene((s) => s.updateObject);

  const geometry = useMemo(() => buildGeometry(obj.type, obj.params), [obj.type, obj.params]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const commitTransform = () => {
    lastGizmoUse = performance.now();
    const m = ref.current;
    if (!m) return;
    updateObject(obj.id, {
      position: m.position.toArray() as Vec3,
      rotation: [m.rotation.x, m.rotation.y, m.rotation.z],
      scale: m.scale.toArray() as Vec3,
    });
  };

  const mesh = (
    <mesh
      ref={ref}
      geometry={geometry}
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      visible={obj.visible}
      onClick={(e) => {
        e.stopPropagation();
        select(obj.id);
      }}
    >
      <meshStandardMaterial color={obj.color} metalness={0.1} roughness={0.6} />
      <Edges threshold={20} color={selected ? '#ff9f1c' : '#1b1f24'} />
    </mesh>
  );

  if (!selected || !obj.visible) return mesh;
  return (
    <>
      {mesh}
      <TransformControls
        object={ref}
        mode={mode}
        size={0.8}
        onMouseDown={() => (lastGizmoUse = performance.now())}
        onMouseUp={commitTransform}
      />
    </>
  );
}

export default function Viewport() {
  const objects = useScene((s) => s.objects);
  const selectedId = useScene((s) => s.selectedId);
  const unit = useScene((s) => s.unit);
  const select = useScene((s) => s.select);

  // Grid spacing follows the working unit (values in mm)
  const grid = unit === 'm' ? { cell: 100, section: 1000 } : { cell: 10, section: 100 };

  return (
    <Canvas
      className="viewport-canvas"
      camera={{ position: [650, -750, 550], up: [0, 0, 1], fov: 45, near: 1, far: 1e6 }}
      onPointerMissed={() => {
        if (performance.now() - lastGizmoUse > 250) select(null);
      }}
    >
      <color attach="background" args={['#22272e']} />
      <hemisphereLight args={['#ffffff', '#444444', 0.6]} />
      <directionalLight position={[600, -400, 1000]} intensity={1.4} />
      <directionalLight position={[-500, 600, 300]} intensity={0.4} />

      {/* drei Grid lies in XZ; rotate it into the XY ground plane */}
      <Grid
        rotation={[Math.PI / 2, 0, 0]}
        infiniteGrid
        cellSize={grid.cell}
        sectionSize={grid.section}
        cellColor="#3a424d"
        sectionColor="#56606e"
        cellThickness={0.6}
        sectionThickness={1}
        fadeDistance={unit === 'm' ? 40000 : 4000}
        fadeStrength={1.5}
      />
      <axesHelper args={[grid.section]} />

      {objects.map((o) => (
        <ObjectMesh key={o.id} obj={o} selected={o.id === selectedId} />
      ))}

      <OrbitControls makeDefault enableDamping={false} target={[250, 0, 0]} />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#e5534b', '#57ab5a', '#539bf5']} labelColor="#ffffff" />
      </GizmoHelper>
    </Canvas>
  );
}
