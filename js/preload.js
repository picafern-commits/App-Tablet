const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onUpdateAvailable: (cb) => ipcRenderer.on("update_available", cb),
  onProgress: (cb) => ipcRenderer.on("download_progress", (_e, p) => cb(p)),
  onDownloaded: (cb) => ipcRenderer.on("update_downloaded", cb),
  installUpdate: () => ipcRenderer.send("install_update"),
  getPrinterHTML: (ip) => ipcRenderer.invoke("printer:get-html", ip),
  getTonerSNMP: (ip) => ipcRenderer.invoke("printer:get-toner-snmp", ip),
  showNotification: (payload) => ipcRenderer.invoke("app:notify", payload),
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),
  setFullscreen: (value) => ipcRenderer.invoke("app:set-fullscreen", value),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url)
});
