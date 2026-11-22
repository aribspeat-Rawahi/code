import { useEffect } from 'react';
import Toolbar from './components/Toolbar';
import ObjectTree from './components/ObjectTree';
import PropertiesPanel from './components/PropertiesPanel';
import Viewport from './components/Viewport';
import CommandLine from './components/CommandLine';
import { useScene } from './store/sceneStore';
import { newProject, openProject, saveProject } from './io/files';
import { toDisplay } from './units';

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
      else if (k === 'escape') s.select(null);
      else if ((k === 'delete' || k === 'backspace') && s.selectedId) s.removeObject(s.selectedId);
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

  return (
    <footer className="status">
      <span>{count} object{count === 1 ? '' : 's'}</span>
      <span>Unit: {unit}</span>
      <span>{tool === 'sketch' ? 'Tool: sketch' : `Tool: ${mode}`}</span>
      <span>Snap: {snap.enabled ? `${d(snap.step)} ${unit} / ${snap.angle}°` : 'off'}</span>
      {sketchInfo && <span className="coords">{sketchInfo}</span>}
      <span className="hint">
        {tool === 'sketch'
          ? 'Click points · Shift = 90° · click first point or Enter to close · Backspace undo point · Esc cancel'
          : 'Left-drag orbit · Right-drag pan · Wheel zoom · W/E/R transform · S sketch · Space command'}
      </span>
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
        </div>
        <CommandLine />
      </main>
      <PropertiesPanel />
      <StatusBar />
    </div>
  );
}
