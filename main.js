const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let compilerWindow;

// Function to create the login window
function createLoginWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width,
    height,
    kiosk: true, // Enable kiosk mode by default
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html'); // Load login page (index.html)
}

// Function to create the compiler window
function createCompilerWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  compilerWindow = new BrowserWindow({
    width,
    height,
    kiosk: true, // Enable kiosk mode on compiler page
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  compilerWindow.loadFile('compiler.html'); // Load compiler page (compiler.html)
}

// This event triggers when the app is ready
app.whenReady().then(createLoginWindow);

// IPC listener to enable kiosk mode (already enabled by default, but this allows toggling)
ipcMain.on('enable-kiosk-mode', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(true); // Set fullscreen mode for login window
  }
  if (compilerWindow) {
    compilerWindow.setFullScreen(true); // Set fullscreen mode for compiler window
  }
});

// IPC listener to start the timer in the compiler page
//ipcMain.on('start-timer', () => {
  //let timer = 10; // Start a 10-second timer
  //let countdownInterval;

  //if (compilerWindow) {
    //countdownInterval = setInterval(() => {
      //timer--;
      // Send the updated timer to the renderer process (frontend)
      //compilerWindow.webContents.send('timer-update', timer);
      
      // If timer reaches zero, close the app
      //if (timer <= 0) {
        //clearInterval(countdownInterval);
        //compilerWindow.close(); // Close the compiler window
        //app.quit(); // Quit the app
      //}
    //}, 1000);
  //}
//});

// IPC listener to quit the app manually
ipcMain.on('quit-app', () => {
  app.quit();
});

// IPC listener for opening the compiler window
ipcMain.on('open-compiler-window', () => {
  createCompilerWindow();
});

// Handle closing of all windows
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
