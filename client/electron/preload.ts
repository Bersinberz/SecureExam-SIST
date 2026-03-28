import { contextBridge, ipcRenderer } from 'electron';

// ── Expose secure API to renderer ────────────────────────────
contextBridge.exposeInMainWorld('secureExam', {
  isElectron: true,
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // Kiosk mode controls
  enterKiosk: () => ipcRenderer.invoke('enter-kiosk'),
  exitKiosk: () => ipcRenderer.invoke('exit-kiosk'),
  isKioskActive: () => ipcRenderer.invoke('is-kiosk-active'),

  // App controls
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  requestClose: () => ipcRenderer.invoke('request-close'),

  // Security event listeners
  onSecurityViolation: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('security-violation', handler);
    return () => ipcRenderer.removeListener('security-violation', handler);
  },

  onCloseRequested: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('close-requested', handler);
    return () => ipcRenderer.removeListener('close-requested', handler);
  },
});

// ── DOM-Level Security (runs in renderer context) ────────────
window.addEventListener('DOMContentLoaded', () => {
  // Block right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Block dangerous keyboard shortcuts at DOM level
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const blockedKeys = [
      // DevTools
      { key: 'F12' },
      { key: 'I', ctrl: true, shift: true },
      { key: 'J', ctrl: true, shift: true },
      { key: 'C', ctrl: true, shift: true },
      { key: 'U', ctrl: true },

      // Refresh
      { key: 'F5' },
      { key: 'r', ctrl: true },
      { key: 'R', ctrl: true, shift: true },

      // Navigation
      { key: 'l', ctrl: true },
      { key: 'n', ctrl: true },
      { key: 't', ctrl: true },
      { key: 'w', ctrl: true },
      { key: 'F11' },

      // Print / Save
      { key: 'p', ctrl: true },
      { key: 's', ctrl: true },
    ];

    for (const blocked of blockedKeys) {
      const keyMatch = e.key.toLowerCase() === (blocked.key || '').toLowerCase()
                    || e.key === blocked.key;
      const ctrlMatch = blocked.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const shiftMatch = blocked.shift ? e.shiftKey : true;

      if (keyMatch && ctrlMatch && shiftMatch) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
  }, true);

  // Block drag-and-drop
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});
