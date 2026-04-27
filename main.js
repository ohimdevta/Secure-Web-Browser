/* ============================================
   NovaBrowser — Electron Main Process
   This is the Chromium "browser process" that
   manages windows, webviews, and IPC.
   ============================================ */

const { app, BrowserWindow, ipcMain, session, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,             // We use our own custom titlebar
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a1a',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,         // Enable <webview> for real page rendering
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');

  // Window control IPC handlers
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window-close', () => mainWindow.close());

  // Remove default menu
  Menu.setApplicationMenu(null);

  // Configure session for ad/tracker blocking
  setupContentBlocking();
}

function setupContentBlocking() {
  // Block known tracker domains
  const blockedDomains = [
    'doubleclick.net', 'googlesyndication.com', 'adservice.google.com',
    'facebook.com/tr', 'connect.facebook.net/en_US/fbevents',
    'analytics.google.com', 'google-analytics.com',
    'hotjar.com', 'clarity.ms', 'mouseflow.com',
  ];

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url.toLowerCase();
    const blocked = blockedDomains.some(domain => url.includes(domain));
    
    if (blocked) {
      // Send blocked count to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tracker-blocked', details.url);
      }
      callback({ cancel: true });
    } else {
      callback({ cancel: false });
    }
  });

  // Enforce HTTPS upgrades
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*'] },
    (details, callback) => {
      // Skip localhost and local files
      if (details.url.includes('localhost') || details.url.includes('127.0.0.1')) {
        callback({ cancel: false });
        return;
      }
      const httpsUrl = details.url.replace('http://', 'https://');
      callback({ redirectURL: httpsUrl });
    }
  );
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
