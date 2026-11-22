import { contextBridge, ipcRenderer } from 'electron';

// Minimal, explicit API surface: the renderer never gets raw ipcRenderer or fs access.
contextBridge.exposeInMainWorld('nirman', {
  platform: process.platform,
  saveFile: (req: unknown) => ipcRenderer.invoke('file:save', req),
  openProject: () => ipcRenderer.invoke('file:open-project'),
});
