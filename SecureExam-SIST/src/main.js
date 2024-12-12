const { app, BrowserWindow } = require('electron');

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    kiosk: true, // Enable kiosk mode for fullscreen
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Ensure compatibility with older APIs
    },
  });

  mainWindow.loadURL('http://127.0.0.1:5500/src/index.html');



  // Disable the menu bar
  mainWindow.setMenuBarVisibility(false);

  // Quit the app when all windows are closed
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});
app.on('web-contents-created', (_, contents) => {
  contents.on('before-input-event', (event, input) => {
    // Block common shortcuts
    if (input.control && (input.key === 'T' || input.key === 'R' || input.key === 'I')) {
      event.preventDefault();
    }
  });

  contents.on('will-attach-webview', (event) => {
    // Block webview injection
    event.preventDefault();
  });

  // Disable right-click menu and DevTools
  contents.on('context-menu', (event) => event.preventDefault());
  contents.on('before-input-event', (event, input) => {
    if (input.control && input.key === 'Shift') {
      event.preventDefault();
    }
  });
});
mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('your-exam-platform.com')) {
      event.preventDefault();
    }
  });
