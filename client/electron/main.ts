import { app, BrowserWindow, globalShortcut, ipcMain, session, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM-compatible __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── State ────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let isKioskActive = false;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// ── Single Instance Lock ─────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ── Create Window ────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: false,
      spellcheck: false,
    },
    autoHideMenuBar: true,
    frame: false,                          // Frameless from the start
    fullscreen: true,                      // Start fullscreen immediately
    icon: path.join(__dirname, '../public/favicon.png'),
  });

  // Remove the application menu entirely
  mainWindow.setMenu(null);

  // Start in fullscreen + always on top
  mainWindow.setFullScreen(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setMinimizable(false);
  mainWindow.setClosable(false);
  mainWindow.setResizable(false);
  mainWindow.setSkipTaskbar(true);

  // Block window close — only allow through IPC confirmation
  mainWindow.on('close', (e: Electron.Event) => {
    if (!isKioskActive) {
      e.preventDefault();
      // Send close request to renderer for confirmation
      mainWindow?.webContents.send('close-requested');
    }
  });

  // Focus enforcement — always re-focus
  mainWindow.on('blur', () => {
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.focus();
        mainWindow.moveTop();
      }
    }, 100);
  });

  // Register all dangerous keyboard shortcuts on startup
  registerBlockedShortcuts();

  // Load the app
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Kiosk Mode (extra lockdown for student exam) ─────────────
function enterKiosk(): void {
  if (!mainWindow || isKioskActive) return;
  isKioskActive = true;
  console.log('[SecureExam] Kiosk mode ACTIVATED (exam in progress)');
}

function exitKiosk(): void {
  if (!mainWindow || !isKioskActive) return;
  isKioskActive = false;
  console.log('[SecureExam] Kiosk mode DEACTIVATED (exam finished)');
}

// ── Block Dangerous Shortcuts ────────────────────────────────
function registerBlockedShortcuts(): void {
  const shortcutsToBlock = [
    // Window management
    'Alt+Tab',
    'Alt+Shift+Tab',
    'Alt+F4',
    'Alt+Escape',
    'Alt+Space',

    // Task manager / system
    'Control+Shift+Escape',
    'Control+Alt+Delete',

    // DevTools
    'F12',
    'Control+Shift+I',
    'Control+Shift+J',
    'Control+Shift+C',

    // Browser shortcuts
    'Control+L',
    'Control+N',
    'Control+T',
    'Control+W',
    'Control+Shift+N',
    'Control+R',
    'Control+Shift+R',
    'F5',
    'F11',
    'Control+F5',

    // Windows key combinations
    'Super',
    'Super+D',
    'Super+E',
    'Super+R',
    'Super+Tab',
    'Super+L',
    'Super+M',
    'Super+Shift+M',

    // Screenshot
    'PrintScreen',
    'Alt+PrintScreen',
    'Super+PrintScreen',
    'Super+Shift+S',

    // Clipboard
    'Control+Shift+V',

    // Navigation
    'Alt+Left',
    'Alt+Right',
    'Control+H',
    'Control+J',

    // Misc
    'Escape',
  ];

  for (const shortcut of shortcutsToBlock) {
    try {
      globalShortcut.register(shortcut, () => {
        console.log(`[SecureExam] Blocked shortcut: ${shortcut}`);
        if (mainWindow) {
          mainWindow.webContents.send('security-violation', {
            type: 'blocked-shortcut',
            shortcut,
            timestamp: Date.now(),
          });
        }
      });
    } catch {
      // Some shortcuts may not be registerable on all platforms
    }
  }
}

// ── IPC Handlers ─────────────────────────────────────────────
ipcMain.handle('enter-kiosk', () => {
  enterKiosk();
  return { success: true };
});

ipcMain.handle('exit-kiosk', () => {
  exitKiosk();
  return { success: true };
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('is-kiosk-active', () => {
  return isKioskActive;
});

// Close with confirmation — called from renderer
ipcMain.handle('request-close', async () => {
  if (!mainWindow) return { confirmed: false };

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Close SecureExam',
    message: 'Are you sure you want to close SecureExam?',
    detail: isKioskActive
      ? 'WARNING: Your exam is still in progress. Closing now will end your session.'
      : 'The application will be closed.',
    buttons: ['Cancel', 'Close'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });

  if (result.response === 1) {
    // User confirmed close
    globalShortcut.unregisterAll();
    isKioskActive = false;

    if (mainWindow) {
      mainWindow.setClosable(true);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setFullScreen(false);
      mainWindow.destroy();
    }

    app.quit();
    return { confirmed: true };
  }

  return { confirmed: false };
});

ipcMain.handle('close-app', () => {
  globalShortcut.unregisterAll();
  isKioskActive = false;

  if (mainWindow) {
    mainWindow.setClosable(true);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
    mainWindow.destroy();
  }

  app.quit();
});

// ── App Lifecycle ────────────────────────────────────────────
app.whenReady().then(() => {
  // Block permission requests (camera, mic, notifications, etc.)
  session.defaultSession.setPermissionRequestHandler(
    (_webContents: Electron.WebContents, _permission: string, callback: (granted: boolean) => void) => {
      callback(false);
    }
  );

  createWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
