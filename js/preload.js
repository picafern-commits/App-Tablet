const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onUpdateAvailable: (cb) => ipcRenderer.on("update_available", cb),
  onProgress: (cb) => ipcRenderer.on("download_progress", (_e, p) => cb(p)),
  onDownloaded: (cb) => ipcRenderer.on("update_downloaded", cb),
  installUpdate: () => ipcRenderer.send("install_update"),
  getPrinterHTML: (ip) => ipcRenderer.invoke("printer:get-html", ip),
  getTonerSNMP: (ip) => ipcRenderer.invoke("printer:get-toner-snmp", ip),
  showNotification: (payload) => ipcRenderer.invoke("app:notify", payload),
  getNotificationStatus: () => ipcRenderer.invoke("app:notification-status"),
  showNotificationDialogTest: () => ipcRenderer.invoke("app:notification-dialog-test"),
  onNotificationTested: (cb) => ipcRenderer.on("app:notification-tested", (_event, payload) => cb(payload)),
  startPushWatcher: () => ipcRenderer.invoke("app:push-watcher-start"),
  getPushWatcherStatus: () => ipcRenderer.invoke("app:push-watcher-status"),
  sendWebPushBroadcast: (payload) => ipcRenderer.invoke("app:send-web-push-broadcast", payload),
  setPushVapidKeys: (payload) => ipcRenderer.invoke("app:set-push-vapid-keys", payload),
  importServiceAccount: () => ipcRenderer.invoke("app:import-service-account"),
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),
  setFullscreen: (value) => ipcRenderer.invoke("app:set-fullscreen", value),
  listDisplays: () => ipcRenderer.invoke("app:list-displays"),
  moveToDisplay: (displayId) => ipcRenderer.invoke("app:move-to-display", displayId),
  hideApp: () => ipcRenderer.invoke("app:hide"),
  closeApp: () => ipcRenderer.invoke("app:close"),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),
  getBackupStatus: () => ipcRenderer.invoke("backup:status"),
  writeLocalBackup: (payload) => ipcRenderer.invoke("backup:write", payload),
  openBackupFolder: () => ipcRenderer.invoke("backup:open-folder")
});
