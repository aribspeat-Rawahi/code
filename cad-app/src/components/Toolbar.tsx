import { useScene, type TransformMode } from '../store/sceneStore';
import { PRIMITIVE_LABEL, type PrimitiveType } from '../tools/primitives';
import type { Unit } from '../units';

const PRIMITIVES: PrimitiveType[] = ['box', 'cylinder', 'sphere', 'cone'];
const MODES: { mode: TransformMode; label: string; key: string }[] = [
  { mode: 'translate', label: 'Move', key: 'W' },
  { mode: 'rotate', label: 'Rotate', key: 'E' },
  { mode: 'scale', label: 'Scale', key: 'R' },
];

export default function Toolbar() {
  const { mode, unit, selectedId, past, future } = useScene();
  const { addPrimitive, setMode, setUnit, removeObject, undo, redo } = useScene.getState();

  return (
    <header className="toolbar">
      <span className="brand">Nirman CAD</span>

      <div className="group" aria-label="Create">
        {PRIMITIVES.map((t) => (
          <button key={t} onClick={() => addPrimitive(t)} title={`Add ${PRIMITIVE_LABEL[t]}`}>
            + {PRIMITIVE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="group" aria-label="Transform">
        {MODES.map((m) => (
          <button
            key={m.mode}
            className={mode === m.mode ? 'active' : ''}
            onClick={() => setMode(m.mode)}
            title={`${m.label} (${m.key})`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="group" aria-label="Edit">
        <button onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)">Undo</button>
        <button onClick={redo} disabled={!future.length} title="Redo (Ctrl+Y)">Redo</button>
        <button
          onClick={() => selectedId && removeObject(selectedId)}
          disabled={!selectedId}
          title="Delete (Del)"
        >
          Delete
        </button>
      </div>

      <label className="unit">
        Unit
        <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
          <option value="mm">mm</option>
          <option value="cm">cm</option>
          <option value="m">m</option>
        </select>
      </label>
    </header>
  );
}
