const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  enableKioskMode: () => ipcRenderer.send('enable-kiosk-mode'),
  quitApp: () => ipcRenderer.send('quit-app'),
  //startTimer: () => ipcRenderer.send('start-timer'),
  //onTimerFinish: (callback) => ipcRenderer.on('timer-finish', callback),
  openCompilerWindow: () => ipcRenderer.send('open-compiler-window'), // Add this line
});
