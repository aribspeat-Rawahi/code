import { useScene, type TransformMode } from '../store/sceneStore';
import { OBJECT_LABEL, PRIMITIVES } from '../tools/primitives';
import { exportModel, newProject, openProject, saveProject } from '../io/files';

const MODES: { mode: TransformMode; label: string; key: string }[] = [
  { mode: 'translate', label: 'Move', key: 'W' },
  { mode: 'rotate', label: 'Rotate', key: 'E' },
  { mode: 'scale', label: 'Scale', key: 'R' },
];

export default function Toolbar() {
  const mode = useScene((s) => s.mode);
  const tool = useScene((s) => s.tool);
  const selectedId = useScene((s) => s.selectedId);
  const topLevelSelected = useScene((s) => s.selection.filter((id) => s.objects.some((o) => o.id === id)).length);
  const isBoolean = useScene((s) => s.objects.some((o) => o.id === s.selectedId && o.type === 'boolean'));
  const canUndo = useScene((s) => s.past.length > 0);
  const canRedo = useScene((s) => s.future.length > 0);
  const projectName = useScene((s) => s.projectName);
  const { addObject, setMode, setTool, removeSelected, booleanOp, explode, undo, redo } = useScene.getState();
  const boolHint = topLevelSelected < 2 ? ' — Ctrl+click 2+ objects first; the first is the base' : '';

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

      <div className="group" aria-label="Boolean">
        <button onClick={() => booleanOp('union')} disabled={topLevelSelected < 2} title={`Union: merge into one${boolHint}`}>Union</button>
        <button onClick={() => booleanOp('subtract')} disabled={topLevelSelected < 2} title={`Subtract: cut the others out of the base${boolHint}`}>Subtract</button>
        <button onClick={() => booleanOp('intersect')} disabled={topLevelSelected < 2} title={`Intersect: keep only the overlap${boolHint}`}>Intersect</button>
        <button onClick={() => selectedId && explode(selectedId)} disabled={!isBoolean} title="Explode: split a boolean back into its parts">Explode</button>
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
        <button
          className={tool === 'pickmove' ? 'active' : ''}
          onClick={() => (tool === 'pickmove' ? useScene.getState().setTool('select') : useScene.getState().startPickMove())}
          disabled={!selectedId && tool !== 'pickmove'}
          title="Move by points: base point → target point, with object snap (M)"
        >
          Move ⇢
        </button>
      </div>

      <div className="group" aria-label="Edit">
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">Redo</button>
        <button onClick={removeSelected} disabled={!selectedId} title="Delete selected (Del)">
          Delete
        </button>
      </div>

    </header>
  );
}
