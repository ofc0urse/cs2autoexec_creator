'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Minimalne API dla strony – jej obecność włącza przycisk „Zapisz do CS2”.
contextBridge.exposeInMainWorld('cs2desktop', {
  detect: () => ipcRenderer.invoke('cs2:detect'),
  chooseFolder: () => ipcRenderer.invoke('cs2:choose-folder'),
  save: content => ipcRenderer.invoke('cs2:save', String(content)),
  openFolder: () => ipcRenderer.invoke('cs2:open-folder'),
});
