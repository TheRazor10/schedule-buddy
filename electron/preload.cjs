const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Firm operations
  firms: {
    getAll: () => ipcRenderer.invoke('firms:getAll'),
    load: (firmId) => ipcRenderer.invoke('firms:load', firmId),
    save: (firmData) => ipcRenderer.invoke('firms:save', firmData),
    delete: (firmId) => ipcRenderer.invoke('firms:delete', firmId),
  },
  // Config operations
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (config) => ipcRenderer.invoke('config:set', config),
  },
  // Check if running in Electron
  isElectron: () => ipcRenderer.invoke('app:isElectron'),
});
