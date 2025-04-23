const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openCompilerWindow: () => ipcRenderer.send('open-compiler-window'),
  openDataWindow: () => ipcRenderer.send('open-data-window'),
  openDashboardWindow: () => ipcRenderer.send('open-dashboard-window'),
  quitApp: () => ipcRenderer.send('quit-app'),
  minimizeDashboardWindow: () => ipcRenderer.send('minimize-dashboard-window'), // ✅ Added minimize function
});
