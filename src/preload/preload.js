const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pet", {
  onStateChange(callback) {
    ipcRenderer.on("pet-state", (_event, payload) => callback(payload));
  }
});
