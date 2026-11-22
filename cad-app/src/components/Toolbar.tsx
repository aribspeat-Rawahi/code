import { useScene, type TransformMode } from '../store/sceneStore';
import { OBJECT_LABEL, PRIMITIVES } from '../tools/primitives';
import { exportModel, newProject, openProject, saveProject } from '../io/files';
import { toDisplay, type Unit } from '../units';

const MODES: { mode: TransformMode; label: string; key: string }[] = [
  { mode: 'translate', label: 'Move', key: 'W' },
  { mode: 'rotate', label: 'Rotate', key: 'E' },
  { mode: 'scale', label: 'Scale', key: 'R' },
];

export default function Toolbar() {
  const mode = useScene((s) => s.mode);
  const tool = useScene((s) => s.tool);
  const unit = useScene((s) => s.unit);
  const snap = useScene((s) => s.snap);
  const selectedId = useScene((s) => s.selectedId);
  const canUndo = useScene((s) => s.past.length > 0);
  const canRedo = useScene((s) => s.future.length > 0);
  const projectName = useScene((s) => s.projectName);
  const { addObject, setMode, setTool, setUnit, setSnap, removeObject, undo, redo } = useScene.getState();

  return (
    <header className="toolbar">
      <span className="brand" title={projectName}>
        Nirman CAD <small>· {projectName}</small>
      </span>

      <div className="group" aria-label="File">
        <button onClick={newProject} title="New (Ctrl+N)">New</button>
        <button onClick={openProject} title="Open project (Ctrl+O)">Open</button>
        <button onClick={saveProject} title="Save project (Ctrl+S)">Save</button>
        <button onClick={() => exportModel('stl')} title="Export STL (mm)">STL</button>
        <button onClick={() => exportModel('obj')} title="Export OBJ (mm)">OBJ</button>
      </div>

      <div className="group" aria-label="Create">
        {PRIMITIVES.map((t) => (
          <button key={t} onClick={() => addObject({ type: t })} title={`Add ${OBJECT_LABEL[t]}`}>
            + {OBJECT_LABEL[t]}
          </button>
        ))}
        <button
          className={tool === 'sketch' ? 'active' : ''}
          onClick={() => setTool(tool === 'sketch' ? 'select' : 'sketch')}
          title="Sketch a profile and extrude it (S)"
        >
          Sketch
        </button>
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
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">Redo</button>
        <button onClick={() => selectedId && removeObject(selectedId)} disabled={!selectedId} title="Delete (Del)">
          Delete
        </button>
      </div>

      <button
        className={snap.enabled ? 'active' : ''}
        onClick={() => setSnap({ enabled: !snap.enabled })}
        title={`Snap to ${toDisplay(snap.step, unit)} ${unit} / ${snap.angle}° (F9). Change step: SNAP <value>`}
      >
        Snap {toDisplay(snap.step, unit)}
      </button>

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
