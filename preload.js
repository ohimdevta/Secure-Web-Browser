/* ============================================
   NovaBrowser — Preload Script
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

  // Check if running in Electron
  isElectron: true,
});
