/* ============================================
   Search Bharat - Electron Main Process
   This is the Chromium "browser process" that
   manages windows, webviews, and IPC.
   ============================================ */

const { app, BrowserWindow, ipcMain, session, Menu, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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

  // VPN & Privacy IPC handlers
  ipcMain.handle('set-proxy', async (event, location) => {
    console.log(`Setting proxy for location: ${location}`);
    
    try {
      // In a real app, you'd filter by country code (location)
      // For this demo, we'll fetch a list of working SOCKS5 proxies
      const response = await net.fetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=5000&country=all&ssl=all&anonymity=all');
      const text = await response.text();
      const proxies = text.split('\r\n').filter(p => p.trim());
      
      if (proxies.length === 0) {
        throw new Error('No proxies available');
      }

      // Pick a random proxy from the list for better success rate
      const proxy = proxies[Math.floor(Math.random() * Math.min(10, proxies.length))];
      const proxyRule = `socks5://${proxy}`;
      
      await session.defaultSession.setProxy({ proxyRules: proxyRule });
      console.log(`VPN connected to ${proxyRule}`);
      return { success: true, proxy: proxy };
    } catch (e) {
      console.error('Failed to set proxy:', e);
      // Fallback to direct if proxy fails
      await session.defaultSession.setProxy({ proxyRules: 'direct://' });
      return { success: false, error: e.message };
    }
  });

  ipcMain.on('clear-proxy', async () => {
    try {
      await session.defaultSession.setProxy({ proxyRules: 'direct://' });
      console.log('VPN disconnected');
    } catch (e) {}
  });

  ipcMain.on('set-webrtc', (event, allow) => {
    session.defaultSession.setWebRTCIPHandlingPolicy(
      allow ? 'default' : 'disable-non-proxied-udp'
    );
  });

  // Screenshot IPC handler
  ipcMain.handle('take-screenshot', async () => {
    try {
      const image = await mainWindow.webContents.capturePage();
      const pngBuffer = image.toPNG();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const desktopPath = app.getPath('desktop');
      const fileName = `SearchBharat_Screenshot_${timestamp}.png`;
      const filePath = path.join(desktopPath, fileName);
      
      fs.writeFileSync(filePath, pngBuffer);
      return { success: true, path: filePath, fileName: fileName };
    } catch (e) {
      console.error('Screenshot failed:', e);
      return { success: false, error: e.message };
    }
  });

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
