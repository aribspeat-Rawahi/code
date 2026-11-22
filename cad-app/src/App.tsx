import { useEffect } from 'react';
import Toolbar from './components/Toolbar';
import ObjectTree from './components/ObjectTree';
import PropertiesPanel from './components/PropertiesPanel';
import Viewport from './components/Viewport';
import { useScene } from './store/sceneStore';

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
      const s = useScene.getState();
      const k = e.key.toLowerCase();

      if (e.ctrlKey && k === 'z' && !e.shiftKey) { e.preventDefault(); s.undo(); return; }
      if (e.ctrlKey && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); s.redo(); return; }
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (k === 'w') s.setMode('translate');
      else if (k === 'e') s.setMode('rotate');
      else if (k === 'r') s.setMode('scale');
      else if (k === 'escape') s.select(null);
      else if ((k === 'delete' || k === 'backspace') && s.selectedId) s.removeObject(s.selectedId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  useShortcuts();
  const count = useScene((s) => s.objects.length);
  const unit = useScene((s) => s.unit);
  const mode = useScene((s) => s.mode);

  return (
    <div className="app">
      <Toolbar />
      <ObjectTree />
      <main className="viewport">
        <Viewport />
      </main>
      <PropertiesPanel />
      <footer className="status">
        <span>{count} object{count === 1 ? '' : 's'}</span>
        <span>Unit: {unit}</span>
        <span>Tool: {mode}</span>
        <span className="hint">Left-drag orbit · Right-drag pan · Wheel zoom · W/E/R move/rotate/scale</span>
      </footer>
    </div>
  );
}
