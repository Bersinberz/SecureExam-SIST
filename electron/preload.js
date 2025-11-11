const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('secureExam', {
  // Window management
  openExamWindow: () => ipcRenderer.send('open-exam-window'),
  openStaffWindow: () => ipcRenderer.send('open-staff-window'),
  openAdminWindow: () => ipcRenderer.send('open-admin-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  closeApp: () => ipcRenderer.send('close-app'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // Platform detection
  isElectron: true,
  platform: process.platform,
  versions: process.versions
});

// Security: Remove Node.js globals from renderer
delete window.require;
delete window.exports;
delete window.module;
delete window.__filename;
delete window.__dirname;