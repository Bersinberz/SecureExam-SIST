const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  globalShortcut,
  Menu,
  dialog
} = require("electron");
const path = require("path");

const isDev = true;

let mainWindow;
let examWindow;
let staffWindow;
let adminWindow;

function disableAllShortcuts() {
  const allShortcuts = [
    "Alt+Tab",
    "Ctrl+Alt+Delete", 
    "Alt+F4",
    "F11",
    "PrintScreen",
    "Escape",
    "Super+L",
    "Super+D",
    "Super+M",
    "Super+R",
    "Super+E",
    "Super+F",
    "Super+Tab",
    "CommandOrControl+W",
    "CommandOrControl+Q", 
    "CommandOrControl+R",
    "CommandOrControl+N",
    "CommandOrControl+O",
    "CommandOrControl+P",
    "CommandOrControl+S",
    "CommandOrControl+Shift+I",
    "CommandOrControl+Shift+J", 
    "CommandOrControl+Shift+C",
    "F12",
    "F5",
    "Ctrl+F5",
    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
    "Alt+Left",
    "Alt+Right",
    "Alt+Home",
    "CommandOrControl+Left",
    "CommandOrControl+Right",
    "CommandOrControl+A",
    "CommandOrControl+C",
    "CommandOrControl+X",
    "CommandOrControl+V",
    "CommandOrControl+Z",
    "CommandOrControl+Y",
    "ContextMenu",
    "CommandOrControl+=",
    "CommandOrControl+-",
    "Ctrl+Esc",
    "Alt+Esc",
    "Win",
    "CommandOrControl+Tab",
    "CommandOrControl+Space",
    "CommandOrControl+Shift+Esc",
    "Ctrl+Win+D",
    "Win+Ctrl+D",
    "Ctrl+Win+F4",
    "Ctrl+Win+Left",
    "Ctrl+Win+Right",
    "Win+Tab",
    "Win+Ctrl+F4",
    "Win+Ctrl+Left",
    "Win+Ctrl+Right",
    "Win+D",
    "Win+M",
    "Win+Home",
    "Win+Comma",
    "Win+Number",
    "Win+Ctrl+Number",
    "Win+Alt+Number",
    "Win+B",
    "Win+Up",
    "Win+Down",
    "Win+Left",
    "Win+Right",
    "Win+Shift+Left",
    "Win+Shift+Right",
    "Win+G",
    "Win+Alt+R",
    "Win+Alt+PrintScreen",
    "Win+P",
    "Win+Plus",
    "Win+Minus",
    "Win+Esc",
    "Ctrl+Win+Enter"
  ];

  allShortcuts.forEach(shortcut => {
    try {
      globalShortcut.register(shortcut, () => {
        return true;
      });
    } catch (error) {
      // Silent fail
    }
  });
}

function enforceSecureFocus(window) {
  if (!window || window === adminWindow || staffWindow) return;

  window.on("blur", () => {
    if (window.isDestroyed()) return;
    window.focus();
  });

  window.on("leave-full-screen", () => {
    if (window.isDestroyed()) return;
    window.setFullScreen(true);
  });

  window.setAlwaysOnTop(true, "screen-saver");
  
  window.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  window.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  window.webContents.on('devtools-opened', () => {
    window.webContents.closeDevTools();
  });
}

function createLoginWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    fullscreen: true,
    kiosk: true,
    closable: false,
    minimizable: false,
    maximizable: false,
    resizable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    title: "Secure Exam - Login",
    icon: path.join(__dirname, "..", "client", "public", "favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: isDev ? false : true,
      allowRunningInsecureContent: isDev,
      devTools: isDev
    },
  });

  mainWindow.removeMenu();

  const loginUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../client/dist/index.html')}`;
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    setTimeout(() => {
      mainWindow.loadURL(loginUrl);
    }, 2000);
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const allowedOrigins = ['http://localhost:5173', 'file://'];
    const isAllowed = allowedOrigins.some(origin => navigationUrl.startsWith(origin));
    
    if (!isAllowed) {
      event.preventDefault();
    }
  });

  mainWindow.loadURL(loginUrl);
  
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  enforceSecureFocus(mainWindow);
}

function createExamWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  if (examWindow) {
    examWindow.focus();
    return;
  }

  examWindow = new BrowserWindow({
    width: width,
    height: height,
    fullscreen: true,
    kiosk: true,
    closable: false,
    minimizable: false,
    maximizable: false,
    resizable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    title: "Secure Exam - Examination",
    icon: path.join(__dirname, "..", "client", "public", "favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: isDev ? false : true,
      devTools: isDev
    },
  });

  examWindow.removeMenu();
  
  const examUrl = isDev 
    ? 'http://localhost:5173/#/exam' 
    : `file://${path.join(__dirname, '../client/dist/index.html#/exam')}`;
  
  examWindow.loadURL(examUrl);
  
  if (isDev) {
    examWindow.webContents.openDevTools();
  }

  enforceSecureFocus(examWindow);

  examWindow.on('closed', () => {
    examWindow = null;
  });
}

function createStaffWindow() {
  if (staffWindow) {
    staffWindow.focus();
    return;
  }

  staffWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    fullscreen: false,
    kiosk: false,
    closable: true,
    minimizable: true,
    maximizable: true,
    resizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: false,
    title: "Secure Exam - Staff Portal",
    icon: path.join(__dirname, "..", "client", "public", "favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: isDev ? false : true,
    },
  });

  staffWindow.setMenuBarVisibility(true);
  
  const staffUrl = isDev 
    ? 'http://localhost:5173/#/staff' 
    : `file://${path.join(__dirname, '../client/dist/index.html#/staff')}`;
  
  staffWindow.loadURL(staffUrl);

  if (isDev) {
    staffWindow.webContents.openDevTools();
  }

  staffWindow.on('closed', () => {
    staffWindow = null;
  });
}

function createAdminWindow() {
  if (adminWindow) {
    adminWindow.focus();
    return;
  }

  adminWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    fullscreen: false,
    kiosk: false,
    closable: true,
    minimizable: true,
    maximizable: true,
    resizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: false,
    title: "Secure Exam - Admin Dashboard",
    icon: path.join(__dirname, "..", "client", "public", "favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: isDev ? false : true,
    },
  });

  adminWindow.setMenuBarVisibility(true);
  
  const adminUrl = isDev 
    ? 'http://localhost:5173/#/admin' 
    : `file://${path.join(__dirname, '../client/dist/index.html#/admin')}`;
  
  adminWindow.loadURL(adminUrl);

  if (isDev) {
    adminWindow.webContents.openDevTools();
  }

  adminWindow.on('closed', () => {
    adminWindow = null;
  });
}

app.on("ready", () => {
  Menu.setApplicationMenu(null);
  createLoginWindow();
  disableAllShortcuts();
});

app.whenReady().then(() => {
  app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
    });
    
    contents.on('will-navigate', (event, navigationUrl) => {
      const allowedOrigins = ['http://localhost:5173', 'file://'];
      const isAllowed = allowedOrigins.some(origin => navigationUrl.startsWith(origin));
      
      if (!isAllowed) {
        event.preventDefault();
      }
    });
  });

  app.on("browser-window-blur", (event, window) => {
    if (!window || window.isDestroyed()) return;

    if (window === adminWindow || window === staffWindow) {
      return;
    }

    if (window === mainWindow) {
      mainWindow.focus();
    }

    if (window === examWindow) {
      examWindow.focus();
    }
  });
});

ipcMain.on("open-exam-window", createExamWindow);
ipcMain.on("open-staff-window", createStaffWindow);
ipcMain.on("open-admin-window", createAdminWindow);

ipcMain.on("minimize-window", () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.minimize();
  }
});

ipcMain.on("close-window", () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow && (focusedWindow === adminWindow || focusedWindow === staffWindow)) {
    focusedWindow.close();
  }
});

ipcMain.on("close-app", () => {
  globalShortcut.unregisterAll();
  app.quit();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(focusedWindow, options);
  return result;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    globalShortcut.unregisterAll();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createLoginWindow();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-redirect', (event, navigationUrl) => {
    const allowedOrigins = ['http://localhost:5173', 'file://'];
    const isAllowed = allowedOrigins.some(origin => navigationUrl.startsWith(origin));
    
    if (!isAllowed) {
      event.preventDefault();
    }
  });
});