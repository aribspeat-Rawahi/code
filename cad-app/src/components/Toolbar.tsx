import { useEffect, useRef, useState } from 'react';
import { useScene, type TransformMode } from '../store/sceneStore';
import { OBJECT_LABEL, PRIMITIVES } from '../tools/primitives';
import { exportDxf, exportModel, newProject, openProject, saveProject } from '../io/files';

const MODES: { mode: TransformMode; label: string; key: string }[] = [
  { mode: 'translate', label: 'Move', key: 'W' },
  { mode: 'rotate', label: 'Rotate', key: 'E' },
  { mode: 'scale', label: 'Scale', key: 'R' },
];

function FileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  const item = (label: string, hint: string, fn: () => void) => (
    <button
      role="menuitem"
      onClick={() => {
        setOpen(false);
        fn();
      }}
    >
      <span>{label}</span>
      <small>{hint}</small>
    </button>
  );

  return (
    <div className="menu" ref={ref}>
      <button className={open ? 'active' : ''} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        File ▾
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {item('New', 'Ctrl+N', newProject)}
          {item('Open…', 'Ctrl+O', openProject)}
          {item('Save…', 'Ctrl+S', saveProject)}
          <hr />
          {item('Export STL…', 'mm', () => exportModel('stl'))}
          {item('Export OBJ…', 'mm', () => exportModel('obj'))}
          {item('Export DXF (this view)…', '2D', () => exportDxf())}
        </div>
      )}
    </div>
  );
}

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
      <span className="brand" title={`Project: ${projectName}`}>
        Nirman CAD
      </span>

      <FileMenu />

      <div className="group" aria-label="Create">
        {PRIMITIVES.map((t) => (
          <button key={t} onClick={() => addObject({ type: t })} title={`Add ${OBJECT_LABEL[t]}`}>
            {OBJECT_LABEL[t]}
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
          onClick={() => (tool === 'pickmove' ? useScene.getState().setTool('select') : useScene.getState().startPickTool('pickmove'))}
          disabled={!selectedId && tool !== 'pickmove'}
          title="Move by points: base point → target point, with object snap (M)"
        >
          Move ⇢
        </button>
        <button
          className={tool === 'pickcopy' ? 'active' : ''}
          onClick={() => (tool === 'pickcopy' ? useScene.getState().setTool('select') : useScene.getState().startPickTool('pickcopy'))}
          disabled={!selectedId && tool !== 'pickcopy'}
          title="Copy by points: base point, then click each place for a copy (C)"
        >
          Copy ⇢
        </button>
        <button
          className={tool === 'pickmirror' ? 'active' : ''}
          onClick={() => (tool === 'pickmirror' ? useScene.getState().setTool('select') : useScene.getState().startPickTool('pickmirror'))}
          disabled={!selectedId && tool !== 'pickmirror'}
          title="Mirror: pick two points on the mirror line; keeps the originals (X). MIRROR ERASE replaces them."
        >
          Mirror
        </button>
        <button
          onClick={() => useScene.getState().openArray()}
          disabled={!selectedId}
          title="Array: rectangular grid or polar (circular) pattern of the selection (A)"
        >
          Array
        </button>
      </div>

      <div className="group" aria-label="Measure">
        <button
          className={tool === 'measure' ? 'active' : ''}
          onClick={() => (tool === 'measure' ? useScene.getState().setTool('select') : useScene.getState().startPickTool('measure'))}
          title="Measure distance between two points (Q)"
        >
          Dist
        </button>
        <button
          className={tool === 'dimension' ? 'active' : ''}
          onClick={() => (tool === 'dimension' ? useScene.getState().setTool('select') : useScene.getState().startPickTool('dimension'))}
          title="Add a dimension: two points, then the line position (D)"
        >
          Dim
        </button>
        <button
          onClick={() => {
            const n = selectedId ? useScene.getState().autoDimension(selectedId) : 0;
            if (n) useScene.getState().print(`Added ${n} dimensions.`);
          }}
          disabled={!selectedId}
          title="Auto dimension: width, depth and height of the selected object"
        >
          Auto
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
