import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  runSetup: (step, data) => ipcRenderer.invoke('run-setup', step, data),
  finishSetup: () => ipcRenderer.invoke('finish-setup'),
  cancelSetup: () => ipcRenderer.invoke('cancel-setup'),
});
