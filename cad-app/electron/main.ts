import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const devUrl = process.env.VITE_DEV_SERVER_URL;
let mainWindow: BrowserWindow | null = null;

type FileKind = 'project' | 'stl' | 'obj' | 'dxf';
const FILE_KINDS: Record<FileKind, Electron.FileFilter> = {
  project: { name: 'Nirman CAD project', extensions: ['ncad'] },
  stl: { name: 'STL mesh', extensions: ['stl'] },
  obj: { name: 'Wavefront OBJ', extensions: ['obj'] },
  dxf: { name: 'DXF drawing', extensions: ['dxf'] },
};

const MAX_SAVE_BYTES = 500 * 1024 * 1024;
const MAX_OPEN_BYTES = 100 * 1024 * 1024;

/** Only accept IPC from our own window. */
function assertTrusted(e: IpcMainInvokeEvent): BrowserWindow {
  if (!mainWindow || e.sender !== mainWindow.webContents) throw new Error('Untrusted IPC sender');
  return mainWindow;
}

ipcMain.handle('file:save', async (e, req: unknown) => {
  const win = assertTrusted(e);
  const { kind, defaultName, data } = (req ?? {}) as Record<string, unknown>;
  if (typeof kind !== 'string' || !Object.hasOwn(FILE_KINDS, kind)) throw new Error('Invalid file kind');
  const isText = typeof data === 'string';
  if (!isText && !(data instanceof Uint8Array)) throw new Error('Invalid file data');
  const size = isText ? Buffer.byteLength(data as string) : (data as Uint8Array).byteLength;
  if (size > MAX_SAVE_BYTES) throw new Error('File too large');

  const filter = FILE_KINDS[kind as FileKind];
  const ext = filter.extensions[0];
  const safeName =
    (typeof defaultName === 'string' ? path.basename(defaultName) : '').replace(/[^\w\- .]/g, '_').slice(0, 100) ||
    'untitled';

  const res = await dialog.showSaveDialog(win, { defaultPath: `${safeName}.${ext}`, filters: [filter] });
  if (res.canceled || !res.filePath) return { saved: false };

  const target = path.extname(res.filePath).toLowerCase() === `.${ext}` ? res.filePath : `${res.filePath}.${ext}`;
  await fs.writeFile(target, isText ? (data as string) : Buffer.from(data as Uint8Array));
  return { saved: true, path: target };
});

ipcMain.handle('file:open-project', async (e) => {
  const win = assertTrusted(e);
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Nirman CAD project', extensions: ['ncad', 'json'] }],
  });
  const file = res.filePaths[0];
  if (res.canceled || !file) return null;
  const stat = await fs.stat(file);
  if (stat.size > MAX_OPEN_BYTES) throw new Error('File too large');
  return { name: path.basename(file), text: await fs.readFile(file, 'utf8') };
});

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#1b1f24',
    title: 'Nirman CAD',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow = win;
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  // Open external links in the default browser, never inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Block navigation away from the app
  win.webContents.on('will-navigate', (event, url) => {
    if (devUrl && url.startsWith(devUrl)) return;
    event.preventDefault();
  });

  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
