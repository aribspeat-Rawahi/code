import { useScene } from '../store/sceneStore';
import { exportMesh } from './export';
import { buildDxf, type DxfView } from '../tools/dxf';
import { parseProject, serializeProject } from './project';

type Kind = 'project' | 'stl' | 'obj' | 'dxf';
const EXT: Record<Kind, string> = { project: 'ncad', stl: 'stl', obj: 'obj', dxf: 'dxf' };
const MIME: Record<Kind, string> = { project: 'application/json', stl: 'model/stl', obj: 'text/plain', dxf: 'application/dxf' };

const baseName = (p: string) => p.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, '');
const print = (m: string) => useScene.getState().print(m);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Save via Electron's native dialog, or download in a plain browser (dev). */
async function saveData(kind: Kind, defaultName: string, data: string | Uint8Array): Promise<string | null> {
  if (window.nirman) {
    const r = await window.nirman.saveFile({ kind, defaultName, data });
    return r.saved ? r.path ?? defaultName : null;
  }
  const blob = new Blob([data as BlobPart], { type: MIME[kind] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${defaultName}.${EXT[kind]}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return a.download;
}

async function openText(): Promise<{ name: string; text: string } | null> {
  if (window.nirman) return window.nirman.openProject();
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ncad,.json';
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? { name: f.name, text: await f.text() } : null);
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

const confirmDiscard = () =>
  useScene.getState().objects.length === 0 || window.confirm('Discard the current model? Unsaved changes will be lost.');

export async function saveProject(): Promise<void> {
  const s = useScene.getState();
  try {
    const path = await saveData('project', s.projectName, serializeProject(s.objects, s.unit));
    if (!path) return print('Save cancelled.');
    s.setProjectName(baseName(path));
    print(`Saved ${path}`);
  } catch (e) {
    print(`Error: ${errMsg(e)}`);
  }
}

export async function openProject(): Promise<void> {
  if (!confirmDiscard()) return;
  try {
    const file = await openText();
    if (!file) return print('Open cancelled.');
    const { unit, objects, skipped } = parseProject(file.text);
    useScene.getState().loadProject(objects, unit, baseName(file.name));
    print(`Opened ${file.name}: ${objects.length} objects${skipped ? `, ${skipped} invalid skipped` : ''}.`);
  } catch (e) {
    print(`Error: ${errMsg(e)}`);
  }
}

export async function exportModel(kind: 'stl' | 'obj'): Promise<void> {
  const s = useScene.getState();
  const visible = s.objects.filter((o) => o.visible && o.type !== 'dimension');
  if (!visible.length) return print('Nothing visible to export.');
  try {
    const path = await saveData(kind, s.projectName, exportMesh(visible, kind));
    print(path ? `Exported ${visible.length} objects to ${path} (mm)` : 'Export cancelled.');
  } catch (e) {
    print(`Error: ${errMsg(e)}`);
  }
}

/** 2D drawing of a view (default: the current plan/elevation, or Top from a 3D view). */
export async function exportDxf(view?: DxfView): Promise<void> {
  const s = useScene.getState();
  const current = s.view.name && s.view.name !== 'iso' ? s.view.name : null;
  const v: DxfView = view ?? current ?? 'top';
  if (!s.objects.some((o) => o.visible)) return print('Nothing visible to export.');
  try {
    const { dxf, lines, hidden } = buildDxf(s.objects, v, s.unit);
    const path = await saveData('dxf', `${s.projectName}-${v}`, dxf);
    print(
      path
        ? `Exported ${v} view to ${path}: ${lines} visible + ${hidden} hidden lines (mm).${!view && !current ? ' Tip: switch to Front/Right first to export an elevation.' : ''}`
        : 'Export cancelled.',
    );
  } catch (e) {
    print(`Error: ${errMsg(e)}`);
  }
}

export function newProject(): void {
  if (!confirmDiscard()) return;
  useScene.getState().newProject();
  print('New project.');
}
