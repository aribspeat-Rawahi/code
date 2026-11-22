import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, Grid, Line, OrbitControls, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useScene, type CadObject, type Vec3 } from '../store/sceneStore';
import { buildObjectGeometry } from '../tools/geometry';
import { featureEdges } from '../tools/edges';

/** Hard edges of a mesh, robust to the T-junctions boolean results contain. */
function FeatureEdges({ geometry, color }: { geometry: THREE.BufferGeometry; color: string }) {
  const edges = useMemo(() => featureEdges(geometry), [geometry]);
  useEffect(() => () => edges.dispose(), [edges]);
  return (
    <lineSegments geometry={edges} raycast={() => null}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}
import { samePt, snapValue, type Pt } from '../tools/sketch';
import { collectSnapPoints, findSnap, SNAP_COLOR } from '../tools/snap';
import { DEG2RAD } from '../units';

// Clicking a gizmo handle also fires the canvas "missed" event; ignore it briefly after a drag.
let lastGizmoUse = 0;

/** Translucent preview of a boolean's parts, so hidden tools (e.g. a door cut-out) can be seen. */
function PartGhost({ obj, highlight }: { obj: CadObject; highlight: boolean }) {
  const geometry = useMemo(() => buildObjectGeometry(obj), [obj]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={obj.position} rotation={obj.rotation} scale={obj.scale} visible={obj.visible} raycast={() => null}>
      <meshBasicMaterial color={highlight ? '#ff9f1c' : '#9fb4d0'} transparent opacity={highlight ? 0.25 : 0.08} depthWrite={false} />
      <FeatureEdges geometry={geometry} color={highlight ? '#ff9f1c' : '#7d8fa8'} />
    </mesh>
  );
}

function ObjectMesh({
  obj,
  selected,
  primary,
  showParts,
}: {
  obj: CadObject;
  selected: boolean;
  primary: boolean;
  showParts: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const mode = useScene((s) => s.mode);
  const sketching = useScene((s) => s.tool !== 'select'); // any picking tool
  const snap = useScene((s) => s.snap);
  const select = useScene((s) => s.select);
  const updateObject = useScene((s) => s.updateObject);

  const selection = useScene((s) => s.selection);
  // Rebuilds only when this object (or one of its boolean parts) changed
  const geometry = useMemo(() => buildObjectGeometry(obj), [obj]);
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
      // While sketching, objects must not swallow clicks meant for the ground plane
      onClick={
        sketching
          ? undefined
          : (e) => {
              e.stopPropagation();
              select(obj.id, e.nativeEvent.ctrlKey || e.nativeEvent.shiftKey || e.nativeEvent.metaKey);
            }
      }
    >
      <meshStandardMaterial color={obj.color} metalness={0.1} roughness={0.6} />
      <FeatureEdges geometry={geometry} color={selected ? '#ff9f1c' : '#1b1f24'} />
    </mesh>
  );

  const ghosts = showParts && obj.children && (
    <group position={obj.position} rotation={obj.rotation} scale={obj.scale}>
      {obj.children.map((c) => (
        <PartGhost key={c.id} obj={c} highlight={selection.includes(c.id)} />
      ))}
    </group>
  );

  if (!primary || !obj.visible || sketching) return (
    <>
      {mesh}
      {ghosts}
    </>
  );
  return (
    <>
      {mesh}
      {ghosts}
      <TransformControls
        object={ref}
        mode={mode}
        size={0.8}
        translationSnap={snap.enabled ? snap.step : null}
        rotationSnap={snap.enabled ? snap.angle * DEG2RAD : null}
        scaleSnap={snap.enabled ? 0.1 : null}
        onMouseDown={() => (lastGizmoUse = performance.now())}
        onMouseUp={commitTransform}
      />
    </>
  );
}

/** Pixel-sized dots that stay visible at any zoom level. */
function Dots({ points, color, size }: { points: Pt[]; color: string; size: number }) {
  const arr = useMemo(() => new Float32Array(points.flatMap(([x, y]) => [x, y, 0.5])), [points]);
  if (!points.length) return null;
  return (
    <points key={points.length} renderOrder={10}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[arr, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} sizeAttenuation={false} depthTest={false} />
    </points>
  );
}

/** Object snap candidates for the current scene, rebuilt only when objects change. */
function useSnapPoints(exclude?: string[]) {
  const objects = useScene((s) => s.objects);
  const enabled = useScene((s) => s.snap.object);
  const key = exclude?.join(',') ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (enabled ? collectSnapPoints(objects, new Set(exclude)) : []), [objects, enabled, key]);
}

/** Coloured marker on the snapped point: green = endpoint, blue = midpoint, pink = centre. */
function SnapMarker() {
  const pick = useScene((s) => s.pick);
  const pts = useMemo(() => (pick?.kind ? [pick.point] : []), [pick]);
  if (!pick?.kind) return null;
  return (
    <>
      <Dots3 points={pts} color="#000000" size={15} />
      <Dots3 points={pts} color={SNAP_COLOR[pick.kind]} size={11} />
    </>
  );
}

function Dots3({ points, color, size }: { points: Vec3[]; color: string; size: number }) {
  const arr = useMemo(() => new Float32Array(points.flat()), [points]);
  if (!points.length) return null;
  return (
    <points key={points.length} renderOrder={11}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[arr, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} sizeAttenuation={false} depthTest={false} transparent />
    </points>
  );
}

/** Invisible ground plane that receives pointer events for picking tools. */
function PickPlane({
  onMove,
  onPick,
}: {
  onMove: (e: ThreeEvent<PointerEvent>) => void;
  onPick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <mesh
      onPointerMove={(e) => {
        e.stopPropagation();
        onMove(e);
      }}
      onPointerLeave={() => useScene.getState().setPick(null)}
      onClick={(e) => {
        if (e.delta > 3) return; // was an orbit drag
        e.stopPropagation();
        onPick(e);
      }}
    >
      <planeGeometry args={[1e7, 1e7]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Ground-plane polyline sketching. Clicks add points; clicking the first point closes the profile. */
function SketchLayer() {
  const pts = useScene((s) => s.sketchPoints);
  const cursor = useScene((s) => s.cursor);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const snapPoints = useSnapPoints();

  const resolve = (e: ThreeEvent<PointerEvent | MouseEvent>): Pt => {
    const s = useScene.getState();

    // 1. Existing sketch points (so the profile can be closed)
    const raw: Pt = [e.point.x, e.point.y];
    const tol = camera.position.distanceTo(new THREE.Vector3(raw[0], raw[1], 0)) * 0.015;
    for (const q of s.sketchPoints) {
      if (Math.hypot(q[0] - raw[0], q[1] - raw[1]) < tol) {
        s.setPick({ point: [q[0], q[1], 0], kind: 'end' });
        return q;
      }
    }

    // 2. Object snap: corners / midpoints / centres, projected onto the ground
    const hit = findSnap(snapPoints, e.pointer, camera, size);
    if (hit) {
      s.setPick({ point: [hit.p.x, hit.p.y, hit.p.z], kind: hit.kind });
      return [hit.p.x, hit.p.y];
    }

    // 3. Grid snap, then Shift = lock to horizontal/vertical
    let p = raw;
    if (s.snap.enabled) p = [snapValue(p[0], s.snap.step), snapValue(p[1], s.snap.step)];
    const last = s.sketchPoints.at(-1);
    if (e.nativeEvent.shiftKey && last) {
      p = Math.abs(p[0] - last[0]) >= Math.abs(p[1] - last[1]) ? [p[0], last[1]] : [last[0], p[1]];
    }
    s.setPick(null);
    return p;
  };

  const preview = cursor && pts.length ? [...pts, cursor] : pts;

  return (
    <group>
      <PickPlane
        onMove={(e) => useScene.getState().setCursor(resolve(e))}
        onPick={(e) => {
          const s = useScene.getState();
          const p = resolve(e);
          if (s.sketchPoints.length >= 3 && samePt(p, s.sketchPoints[0])) s.finishSketch();
          else s.addSketchPoint(p);
        }}
      />

      {preview.length >= 2 && (
        <Line
          points={preview.map(([x, y]) => [x, y, 0.5] as [number, number, number])}
          color="#ff9f1c"
          lineWidth={2}
          depthTest={false}
          renderOrder={9}
        />
      )}
      <Dots points={pts.slice(1)} color="#ff9f1c" size={7} />
      <Dots points={pts.slice(0, 1)} color="#ffd166" size={11} />
      {cursor && <Dots points={[cursor]} color="#ffffff" size={6} />}
      <SnapMarker />
    </group>
  );
}

/** Move by points: click a base point, then a target point; the selection moves by the difference. */
function PickMoveLayer() {
  const base = useScene((s) => s.pickBase);
  const pick = useScene((s) => s.pick);
  const selection = useScene((s) => s.selection);
  const objects = useScene((s) => s.objects);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  // Base point may be on the moving objects; the target must be somewhere else
  const snapPoints = useSnapPoints(base ? selection : undefined);

  const resolve = (e: ThreeEvent<PointerEvent | MouseEvent>): Vec3 => {
    const s = useScene.getState();
    const hit = findSnap(snapPoints, e.pointer, camera, size);
    let p: Vec3;
    if (hit) {
      p = [hit.p.x, hit.p.y, hit.p.z];
    } else {
      p = [e.point.x, e.point.y, 0];
      if (s.snap.enabled) p = [snapValue(p[0], s.snap.step), snapValue(p[1], s.snap.step), 0];
    }
    s.setPick({ point: p, kind: hit?.kind ?? null });
    return p;
  };

  const moving = objects.filter((o) => selection.includes(o.id));
  const d: Vec3 | null = base && pick ? [pick.point[0] - base[0], pick.point[1] - base[1], pick.point[2] - base[2]] : null;

  return (
    <group>
      <PickPlane
        onMove={(e) => resolve(e)}
        onPick={(e) => {
          const s = useScene.getState();
          const p = resolve(e);
          if (!s.pickBase) {
            s.setPickBase(p);
            s.print('Base point set. Now click the target point.');
          } else s.finishPickMove(p);
        }}
      />
      {/* Live preview of where the selection will land */}
      {d && (
        <group position={d}>
          {moving.map((o) => (
            <PartGhost key={o.id} obj={o} highlight />
          ))}
        </group>
      )}
      {base && pick && (
        <Line points={[base, pick.point]} color="#ffd166" lineWidth={1.5} dashed dashSize={20} gapSize={10} depthTest={false} renderOrder={9} />
      )}
      {base && <Dots3 points={[base]} color="#ffd166" size={10} />}
      <SnapMarker />
    </group>
  );
}

export default function Viewport() {
  const objects = useScene((s) => s.objects);
  const selection = useScene((s) => s.selection);
  const unit = useScene((s) => s.unit);
  const tool = useScene((s) => s.tool);
  const select = useScene((s) => s.select);

  // Grid spacing follows the working unit (values in mm)
  const grid = unit === 'm' ? { cell: 100, section: 1000 } : { cell: 10, section: 100 };

  return (
    <Canvas
      className={`viewport-canvas ${tool !== 'select' ? 'sketching' : ''}`}
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
        <ObjectMesh
          key={o.id}
          obj={o}
          selected={selection.includes(o.id)}
          primary={selection[0] === o.id}
          showParts={!!o.children && (selection.includes(o.id) || o.children.some((c) => selection.includes(c.id)))}
        />
      ))}
      {tool === 'sketch' && <SketchLayer />}
      {tool === 'pickmove' && <PickMoveLayer />}

      <OrbitControls makeDefault enableDamping={false} target={[250, 0, 0]} />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#e5534b', '#57ab5a', '#539bf5']} labelColor="#ffffff" />
      </GizmoHelper>
    </Canvas>
  );
}
