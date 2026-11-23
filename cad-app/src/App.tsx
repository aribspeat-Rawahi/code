import { useEffect } from 'react';
import Toolbar from './components/Toolbar';
import ObjectTree from './components/ObjectTree';
import PropertiesPanel from './components/PropertiesPanel';
import Viewport from './components/Viewport';
import CommandLine from './components/CommandLine';
import ViewBar from './components/ViewBar';
import OsnapMenu from './components/OsnapMenu';
import ArrayPanel from './components/ArrayPanel';
import { isFlatView, useScene } from './store/sceneStore';
import { newProject, openProject, saveProject } from './io/files';
import { toDisplay, type Unit } from './units';
import { SNAP_COLOR, SNAP_LABEL } from './tools/snap';

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
      const s = useScene.getState();
      const k = e.key.toLowerCase();

      if (e.ctrlKey || e.metaKey) {
        const actions: Record<string, () => void> = {
          z: e.shiftKey ? s.redo : s.undo,
          y: s.redo,
          s: saveProject,
          o: openProject,
          n: newProject,
        };
        if (actions[k]) {
          e.preventDefault();
          actions[k]();
        }
        return;
      }
      if (e.altKey) return;

      if (k === ' ') {
        e.preventDefault();
        document.getElementById('command-input')?.focus();
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        s.setSnap({ enabled: !s.snap.enabled });
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        s.setSnap({ object: !s.snap.object });
        s.print(`Object snap ${s.snap.object ? 'off' : 'on'}`);
        return;
      }

      if (s.tool === 'pickmove' || s.tool === 'pickcopy' || s.tool === 'pickmirror' || s.tool === 'measure' || s.tool === 'dimension' || s.tool === 'arraycenter') {
        if (k === 'escape') {
          if (s.pickPoints.length && (s.tool === 'measure' || s.tool === 'dimension')) useScene.setState({ pickPoints: [] });
          else {
            s.setTool('select');
            s.print('Done.');
          }
        }
        return;
      }

      // Views work in every tool
      const VIEW_KEYS: Record<string, 'top' | 'front' | 'right' | 'left' | 'back' | 'iso'> = {
        '1': 'top',
        '2': 'front',
        '3': 'right',
        '4': 'left',
        '5': 'back',
        '0': 'iso',
      };
      if (VIEW_KEYS[k]) {
        s.setView(VIEW_KEYS[k]);
        return;
      }
      if (k === 'f') {
        s.zoomExtents();
        return;
      }
      if (k === 'p') {
        s.setProjection(!s.view.ortho);
        return;
      }

      if (s.tool === 'sketch') {
        if (k === 'enter') s.finishSketch();
        else if (k === 'backspace') s.popSketchPoint();
        else if (k === 'escape') {
          if (s.sketchPoints.length) s.cancelSketch();
          else s.setTool('select');
        }
        return;
      }

      if (k === 'w') s.setMode('translate');
      else if (k === 'e') s.setMode('rotate');
      else if (k === 'r') s.setMode('scale');
      else if (k === 's') s.setTool('sketch');
      else if (k === 'm') s.startPickTool('pickmove');
      else if (k === 'c') s.startPickTool('pickcopy');
      else if (k === 'x') s.startPickTool('pickmirror');
      else if (k === 'a') s.openArray();
      else if (k === 'escape' && s.arrayDraft) s.closeArray();
      else if (k === 'q') s.startPickTool('measure');
      else if (k === 'd') s.startPickTool('dimension');
      else if (k === 'escape' && s.arrayDraft) s.closeArray();
      else if (k === 'escape') s.select(null);
      else if (k === 'delete' || k === 'backspace') s.removeSelected();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function StatusBar() {
  const count = useScene((s) => s.objects.length);
  const unit = useScene((s) => s.unit);
  const mode = useScene((s) => s.mode);
  const tool = useScene((s) => s.tool);
  const snap = useScene((s) => s.snap);
  const cursor = useScene((s) => s.cursor);
  const last = useScene((s) => s.sketchPoints.at(-1));
  const pick = useScene((s) => s.pick);
  const view = useScene((s) => s.view);
  const flat = isFlatView(view);
  const currentLayer = useScene((s) => s.layers.find((l) => l.id === s.currentLayer));
  const base = useScene((s) => s.pickPoints.at(-1));

  const d = (mm: number) => Math.round(toDisplay(mm, unit) * 1000) / 1000;
  let sketchInfo = '';
  if (tool === 'sketch' && cursor) {
    sketchInfo = `X ${d(cursor[0])}  Y ${d(cursor[1])}`;
    if (last) {
      const dx = cursor[0] - last[0];
      const dy = cursor[1] - last[1];
      const ang = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI) * 100) / 100;
      sketchInfo += `   Length ${d(Math.hypot(dx, dy))}  Angle ${ang}°`;
    }
  }

  if ((tool === 'pickmove' || tool === 'pickcopy' || tool === 'pickmirror' || tool === 'measure' || tool === 'dimension' || tool === 'arraycenter') && pick) {
    const [x, y, z] = pick.point.map(d);
    sketchInfo = `X ${x}  Y ${y}  Z ${z}`;
    if (base) {
      const dv = pick.point.map((v, i) => v - base[i]);
      sketchInfo += `   Δ ${dv.map(d).join(', ')}  Distance ${d(Math.hypot(...dv))}`;
    }
  }

  const hints: Record<string, string> = {
    sketch: 'Click points · Shift = 90° · click first point or Enter to close · Backspace undo point · Esc cancel',
    pickmove: base ? 'Click the target point · Esc cancel' : 'Click the base point on the object · Esc cancel',
    pickcopy: base ? 'Click each place for a copy · Esc to finish' : 'Click the base point on the object · Esc cancel',
    pickmirror: base ? 'Click the second point of the mirror line · Esc cancel' : 'Click the first point of the mirror line · Esc cancel',
    arraycenter: 'Click the array centre (snap to a Center) · Esc cancel',
    measure: base ? 'Click the second point · Esc restart' : 'Click the first point · Esc to finish',
    dimension: 'Click point 1, point 2, then where the dimension line goes · Esc to finish',
    select: flat
      ? '2D view: left-drag pan · wheel zoom · 0 = Iso to orbit · F fit · M move · Q measure · D dimension'
      : 'Orbit: left-drag · Pan: right-drag · 1-5/0 views · F fit · W/E/R transform · M move · Q measure · D dim · S sketch',
  };

  return (
    <footer className="status">
      <span>{count} object{count === 1 ? '' : 's'}</span>
      <label className="status-unit">
        Unit
        <select value={unit} onChange={(e) => useScene.getState().setUnit(e.target.value as Unit)}>
          <option value="mm">mm</option>
          <option value="cm">cm</option>
          <option value="m">m</option>
        </select>
      </label>
      <button
        className={`status-btn ${snap.enabled ? 'active' : ''}`}
        onClick={() => useScene.getState().setSnap({ enabled: !snap.enabled })}
        title="Toggle snap (F9). Change the step with: SNAP <value>"
      >
        Snap {snap.enabled ? `${d(snap.step)} ${unit} / ${snap.angle}°` : 'off'}
      </button>
      <OsnapMenu />
      {currentLayer && (
        <span title="Current layer: new objects go here">
          <span className="swatch" style={{ background: currentLayer.color, display: 'inline-block', marginRight: 4 }} />
          {currentLayer.name}
        </span>
      )}
      <span>
        View: {view.name ?? 'free'} · {view.ortho ? 'ortho' : 'persp'}
      </span>
      <span>Tool: {tool === 'select' ? mode : { sketch: 'sketch', pickmove: 'move by points', pickcopy: 'copy', pickmirror: 'mirror', measure: 'measure', dimension: 'dimension', arraycenter: 'array centre' }[tool]}</span>
      {pick?.kind && (
        <span className="snap-kind" style={{ color: SNAP_COLOR[pick.kind] }}>
          ● {SNAP_LABEL[pick.kind]}
        </span>
      )}
      {sketchInfo && <span className="coords">{sketchInfo}</span>}
      <span className="hint">{hints[tool]}</span>
    </footer>
  );
}

export default function App() {
  useShortcuts();
  const projectName = useScene((s) => s.projectName);
  useEffect(() => {
    document.title = `${projectName} - Nirman CAD`;
  }, [projectName]);

  return (
    <div className="app">
      <Toolbar />
      <ObjectTree />
      <main className="viewport">
        <div className="canvas-wrap">
          <Viewport />
          <ViewBar />
          <ArrayPanel />
        </div>
        <CommandLine />
      </main>
      <PropertiesPanel />
      <StatusBar />
    </div>
  );
}
