const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  globalShortcut,
  Menu,
} = require("electron");
const path = require("path");

let mainWindow; // Login window
let compilerWindow; // Compiler window
let dataWindow; // Data window
let dashboardWindow; // Dashboard window

// Function to disable shortcuts for login & compiler windows only
function disableShortcuts() {
  globalShortcut.registerAll(
    [
      "Alt+Tab",
      "CommandOrControl+Tab",
      "CommandOrControl+W",
      "CommandOrControl+Q",
      "CommandOrControl+R",
      "CommandOrControl+Shift+R",
      "F11",
      "Alt+F4",
      "Super+D",
      "Super+M",
    ],
    () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow === dashboardWindow || focusedWindow === dataWindow) {
        return false; // Allow shortcuts for dashboard & data windows
      }
      return true; // Block shortcuts for login & compiler windows
    }
  );
}

// Function to enforce focus ONLY on login & compiler windows
function enforceWindowFocus(window) {
  if (!window || window === dashboardWindow || window === dataWindow) {
    return;
  }

  window.on("blur", () => {
    if (window.isDestroyed()) return;
    window.focus();
  });

  window.on("leave-full-screen", () => {
    if (window.isDestroyed()) return;
    window.setFullScreen(true);
  });

  window.setAlwaysOnTop(true, "screen-saver");
}

// Function to create the login window (Restricted)
function createLoginWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    kiosk: true,
    closable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "public" , "images" , "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, "public", "html", "index.html"));
  enforceWindowFocus(mainWindow);
}

// Function to create the compiler window (Restricted)
function createCompilerWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  compilerWindow = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    kiosk: true,
    closable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "public" , "images" , "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  compilerWindow.removeMenu();
  compilerWindow.loadFile(
    path.join(__dirname, "public", "html", "compiler.html")
  );
  enforceWindowFocus(compilerWindow);
}

// Function to create the data window (No Restrictions)
function createDataWindow() {
  dataWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: false,
    kiosk: false,
    closable: true,
    minimizable: true,
    maximizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: false,
    icon: path.join(__dirname, "public" , "images" , "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  dataWindow.setMenuBarVisibility(true);
  dataWindow.loadFile(path.join(__dirname, "public", "html", "data.html"));
}

// Function to create the dashboard window (No Restrictions)
function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: false,
    kiosk: false,
    closable: true,
    minimizable: true,
    maximizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: false,
    icon: path.join(__dirname, "public" , "images" , "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  dashboardWindow.setMenuBarVisibility(true);
  dashboardWindow.loadFile(
    path.join(__dirname, "public", "html", "dashboard.html")
  );
}

// Set the default menu to null for the entire application
app.on("ready", () => {
  Menu.setApplicationMenu(null);
});

app.whenReady().then(() => {
  createLoginWindow();
  disableShortcuts();

  app.on("browser-window-blur", (event, window) => {
    if (!window || window.isDestroyed()) return;

    if (window === dashboardWindow || window === dataWindow) {
      return;
    }

    if (window === mainWindow) {
      mainWindow.focus();
    }

    if (window === compilerWindow) {
      compilerWindow.focus();
    }
  });
});

// IPC listeners for opening windows
ipcMain.on("open-compiler-window", createCompilerWindow);
ipcMain.on("open-data-window", createDataWindow);
ipcMain.on("open-dashboard-window", createDashboardWindow);

// IPC listener to minimize the dashboard window
ipcMain.on("minimize-dashboard-window", () => {
  if (dashboardWindow) {
    dashboardWindow.minimize();
  }
});

// IPC listener to quit the app manually
ipcMain.on("quit-app", () => {
  globalShortcut.unregisterAll();
  app.quit();
});

// Handle closing of all windows
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    globalShortcut.unregisterAll();
    app.quit();
  }
});
