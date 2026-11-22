import { contextBridge } from 'electron';

// Minimal, explicit API surface. File open/save IPC will be added here later.
contextBridge.exposeInMainWorld('nirman', {
  platform: process.platform,
  versions: { electron: process.versions.electron, chrome: process.versions.chrome },
});
