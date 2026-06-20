/* ============================================
   Search Bharat - Preload Script
   Secure bridge between Electron and renderer.
   Exposes safe APIs to the browser UI.
   ============================================ */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Listen for tracker blocked events from main process
  onTrackerBlocked: (callback) => {
    ipcRenderer.on('tracker-blocked', (event, url) => callback(url));
  },

  // Privacy & VPN
  setProxy: (location) => ipcRenderer.invoke('set-proxy', location),
  clearProxy: () => ipcRenderer.send('clear-proxy'),
  setWebRTC: (allow) => ipcRenderer.send('set-webrtc', allow),

  // Screenshot
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),

  // Check if running in Electron
  isElectron: true,
});
