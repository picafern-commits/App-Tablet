const { app, BrowserWindow, shell, ipcMain, Tray, Menu, Notification, screen, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const snmp = require("net-snmp");

let win;
let tray;
app.isQuitting = false;

const APP_REMOTE_URL = "https://picafern-commits.github.io/App-Tablet/html/index.html";
const APP_LOCAL_FALLBACK = path.join(__dirname, "..", "html", "index.html");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

if (process.platform === "win32") {
  app.setAppUserModelId("com.appbraga.desktop");
}

function settingsPath() {
  return path.join(app.getPath("userData"), "desktop-settings.json");
}

function backupDirPath() {
  return path.join(app.getPath("userData"), "local-backups");
}

function backupStatusPath() {
  return path.join(backupDirPath(), "backup-status.json");
}

function readBackupStatus() {
  try {
    return JSON.parse(fs.readFileSync(backupStatusPath(), "utf8"));
  } catch {
    return { ok: false, lastRunAt: null, lastRunDate: null, lastFile: null, lastError: null };
  }
}

function writeBackupStatus(status) {
  fs.mkdirSync(backupDirPath(), { recursive: true });
  fs.writeFileSync(backupStatusPath(), JSON.stringify(status, null, 2), "utf8");
}

function readDesktopSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
  } catch {
    return { fullscreen: true };
  }
}

function writeDesktopSettings(settings) {
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
  } catch {}
}

function getDisplayById(displayId) {
  const displays = screen.getAllDisplays();
  return displays.find((display) => String(display.id) === String(displayId)) || null;
}

function getDisplayForWindow() {
  if (!win || win.isDestroyed()) return screen.getPrimaryDisplay();
  return screen.getDisplayMatching(win.getBounds());
}

function getSavedOrPrimaryDisplay(settings = readDesktopSettings()) {
  return getDisplayById(settings.displayId) || screen.getPrimaryDisplay();
}

function getWindowBoundsForDisplay(display, settings = readDesktopSettings()) {
  const area = display.workArea || display.bounds;
  const width = Math.min(Math.max(settings.width || 1400, 1100), area.width);
  const height = Math.min(Math.max(settings.height || 860, 700), area.height);
  return {
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2),
    width,
    height
  };
}

function mostrarJanelaPrincipal() {
  if (!win) {
    createWindow();
    return;
  }
  win.show();
  win.focus();
}

function createTray() {
  if (tray) return;

  tray = new Tray(path.join(__dirname, "..", "icon.ico"));
  tray.setToolTip("App Braga");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Abrir App Braga", click: mostrarJanelaPrincipal },
    {
      label: "Sair",
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on("double-click", mostrarJanelaPrincipal);
}

function createWindow() {
  const desktopSettings = readDesktopSettings();
  const startDisplay = getSavedOrPrimaryDisplay(desktopSettings);
  const startBounds = getWindowBoundsForDisplay(startDisplay, desktopSettings);
  win = new BrowserWindow({
    x: startBounds.x,
    y: startBounds.y,
    width: startBounds.width,
    height: startBounds.height,
    minWidth: 1100,
    minHeight: 700,
    fullscreen: desktopSettings.fullscreen !== false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "icon.ico"),
    backgroundColor: "#101114",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadURL(APP_REMOTE_URL);

  win.webContents.on("did-fail-load", (_event, _errorCode, _errorDescription, validatedUrl) => {
    if (String(validatedUrl || "").startsWith("file://")) return;
    win.loadFile(APP_LOCAL_FALLBACK);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    const target = String(url || "");
    if (target.startsWith("https://picafern-commits.github.io/App-Tablet/")) return;
    if (target.startsWith("file://")) return;
    event.preventDefault();
    shell.openExternal(target);
  });

  win.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  win.on("resize", () => {
    if (!win || win.isDestroyed()) return;
    const [width, height] = win.getSize();
    writeDesktopSettings({ ...readDesktopSettings(), width, height, fullscreen: win.isFullScreen() });
  });

  win.on("enter-full-screen", () => writeDesktopSettings({ ...readDesktopSettings(), fullscreen: true }));
  win.on("leave-full-screen", () => writeDesktopSettings({ ...readDesktopSettings(), fullscreen: false }));
}

function requestUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith("https://") ? https : http;
    const req = client.get(
      url,
      { timeout: 6000, headers: { "User-Agent": "AppBragaDesktop/1.0" } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk.toString("utf8"); });
        res.on("end", () => resolve({ ok: true, statusCode: res.statusCode || 0, body: data, url }));
      }
    );
    req.on("error", (error) => resolve({ ok: false, statusCode: 0, body: "", error: error.message, url }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, statusCode: 0, body: "", error: "Timeout", url });
    });
  });
}

ipcMain.handle("printer:get-html", async (_event, ip) => {
  if (!ip) return { ok: false, body: "", error: "IP inválido" };
  const cleanIp = String(ip).trim();
  const paths = ["/", "/startwlm/Start_Wlm.htm", "/status", "/home", "/monitor", "/mainte/supplies.cgi"];
  for (const p of paths) {
    const res = await requestUrl(`http://${cleanIp}${p}`);
    if (res.ok && res.body) return res;
  }
  return { ok: false, body: "", error: "Sem resposta HTML" };
});

function snmpGet(session, oids) {
  return new Promise((resolve, reject) => {
    session.get(oids, (error, varbinds) => {
      if (error) return reject(error);
      resolve(varbinds || []);
    });
  });
}

function snmpSubtree(session, oid) {
  return new Promise((resolve, reject) => {
    const rows = [];
    session.subtree(
      oid,
      (varbind) => {
        if (varbind && varbind.value !== undefined && varbind.value !== null) {
          rows.push(varbind);
        }
      },
      (error) => {
        if (error) return reject(error);
        resolve(rows);
      }
    );
  });
}

function normalizeSnmpString(value) {
  if (Buffer.isBuffer(value)) return value.toString("utf8").trim();
  return String(value || "").trim();
}

function extractIndex(oid) {
  return String(oid || "").split(".").pop();
}

async function getByIndex(session, index) {
  const vars = await snmpGet(session, [
    `1.3.6.1.2.1.43.11.1.1.9.1.${index}`,
    `1.3.6.1.2.1.43.11.1.1.8.1.${index}`
  ]);

  const level = Number(vars[0] && vars[0].value);
  const max = Number(vars[1] && vars[1].value);

  if (!Number.isFinite(level) || !Number.isFinite(max) || max <= 0 || level < 0) return null;

  return {
    level,
    max,
    percent: Math.max(0, Math.min(100, Math.round((level / max) * 100)))
  };
}

ipcMain.handle("printer:get-toner-snmp", async (_event, ip) => {
  const cleanIp = String(ip || "").trim();
  if (!cleanIp) return { ok: false, error: "IP inválido", colors: [], residue: null };

  const session = snmp.createSession(cleanIp, "public", {
    timeout: 3000,
    retries: 1,
    version: snmp.Version2c
  });

  try {
    const descs = await snmpSubtree(session, "1.3.6.1.2.1.43.11.1.1.6.1");

    const colorsConfig = [
      { key: "black", label: "Preto", re: /(black|preto)/i },
      { key: "cyan", label: "Ciano", re: /(cyan|ciano|blue|azul)/i },
      { key: "magenta", label: "Magenta", re: /(magenta|red|vermelho)/i },
      { key: "yellow", label: "Amarelo", re: /(yellow|amarelo)/i }
    ];

    const colors = [];
    for (const cfg of colorsConfig) {
      const desc = descs.find(v => cfg.re.test(normalizeSnmpString(v.value)));
      if (!desc) continue;
      const info = await getByIndex(session, extractIndex(desc.oid));
      if (!info) continue;
      colors.push({ key: cfg.key, label: cfg.label, percent: info.percent });
    }

    let residue = null;
    const residueDesc = descs.find(v => /(waste|resid|resíduo|residual|used toner|waste toner)/i.test(normalizeSnmpString(v.value)));
    if (residueDesc) {
      const info = await getByIndex(session, extractIndex(residueDesc.oid));
      if (info) residue = { key: "waste", label: "Resíduo", percent: info.percent };
    }

    if (!colors.length) {
      const fallback = await snmpGet(session, [
        "1.3.6.1.2.1.43.11.1.1.9.1.1",
        "1.3.6.1.2.1.43.11.1.1.8.1.1"
      ]);
      const level = Number(fallback[0] && fallback[0].value);
      const max = Number(fallback[1] && fallback[1].value);
            if (Number.isFinite(level) && Number.isFinite(max) && max > 0 && level >= 0) {
        colors.push({ key: "black", label: "Preto", percent: Math.max(0, Math.min(100, Math.round((level / max) * 100))) });
      }
    }

    if (!colors.length && !residue) {
      return { ok: false, error: "Sem leitura SNMP", colors: [], residue: null };
    }

    return { ok: true, colors, residue };
  } catch (error) {
    return { ok: false, error: error.message, colors: [], residue: null };
  } finally {
    try { session.close(); } catch {}
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on("activate", () => {
    mostrarJanelaPrincipal();
  });
});

app.on("second-instance", () => {
  mostrarJanelaPrincipal();
});

ipcMain.handle("app:notify", async (_event, payload = {}) => {
  try {
    const title = String(payload.title || "App Braga");
    const body = String(payload.body || "");
    const tag = String(payload.tag || "");
    if (!Notification.isSupported()) {
      if (tray && process.platform === "win32") {
        tray.displayBalloon({
          title,
          content: body,
          icon: path.join(__dirname, "..", "icon.ico")
        });
        return { ok: true, mode: "tray-balloon" };
      }
      return { ok: false, error: "Notificacoes nao suportadas pelo sistema" };
    }

    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, "..", "icon-192.png"),
      silent: false
    });
    notification.show();
    if (tag === "app-braga-test" && win && !win.isDestroyed()) {
      win.webContents.send("app:notification-tested", { ok: true, mode: "electron-notification" });
    }
    return { ok: true, mode: "electron-notification" };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("app:notification-status", async () => ({
  ok: true,
  supported: Notification.isSupported(),
  platform: process.platform,
  appUserModelId: process.platform === "win32" ? "com.appbraga.desktop" : "",
  trayReady: !!tray,
  focused: !!win && !win.isDestroyed() && win.isFocused()
}));

ipcMain.handle("app:notification-dialog-test", async () => {
  if (!win || win.isDestroyed()) return { ok: false, error: "Janela indisponivel" };
  await dialog.showMessageBox(win, {
    type: "info",
    title: "App Braga",
    message: "Teste de notificacao",
    detail: "Se este aviso apareceu, a ponte Electron esta a funcionar. Se o toast do Windows nao apareceu, o problema esta nas permissoes/notificacoes do Windows."
  });
  return { ok: true };
});

ipcMain.handle("app:get-info", async () => ({
  ok: true,
  version: app.getVersion(),
  platform: process.platform,
  userData: app.getPath("userData"),
  settings: readDesktopSettings()
}));

ipcMain.handle("app:set-fullscreen", async (_event, value) => {
  if (!win) return { ok: false };
  const active = typeof value === "boolean" ? value : !win.isFullScreen();
  win.setFullScreen(active);
  writeDesktopSettings({ ...readDesktopSettings(), fullscreen: active });
  return { ok: true, fullscreen: active };
});

ipcMain.handle("app:list-displays", async () => {
  const current = getDisplayForWindow();
  const displays = screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    index: index + 1,
    label: `Monitor ${index + 1}`,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
    primary: display.id === screen.getPrimaryDisplay().id,
    current: display.id === current.id
  }));
  return { ok: true, displays, currentDisplayId: current.id };
});

ipcMain.handle("app:move-to-display", async (_event, displayId) => {
  if (!win) return { ok: false, error: "Janela indisponivel" };
  const target = getDisplayById(displayId) || screen.getPrimaryDisplay();
  if (!target) return { ok: false, error: "Monitor indisponivel" };
  const wasFullscreen = win.isFullScreen();
  const settings = readDesktopSettings();
  const nextBounds = getWindowBoundsForDisplay(target, settings);
  if (wasFullscreen) {
    win.setFullScreen(false);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  win.setBounds(nextBounds, false);
  win.setPosition(nextBounds.x, nextBounds.y, false);
  win.setSize(nextBounds.width, nextBounds.height, false);
  win.show();
  win.focus();
  if (wasFullscreen) setTimeout(() => win && !win.isDestroyed() && win.setFullScreen(true), 650);
  writeDesktopSettings({ ...settings, ...nextBounds, displayId: target.id, fullscreen: wasFullscreen });
  return { ok: true, display: target.id, bounds: nextBounds, fullscreen: wasFullscreen };
});

ipcMain.handle("app:hide", async () => {
  if (!win) return { ok: false };
  win.hide();
  return { ok: true };
});

ipcMain.handle("app:close", async () => {
  app.isQuitting = true;
  app.quit();
  return { ok: true };
});

ipcMain.handle("app:open-external", async (_event, url) => {
  if (!url) return { ok: false };
  await shell.openExternal(String(url));
  return { ok: true };
});

ipcMain.handle("backup:status", async () => ({
  ok: true,
  backupDir: backupDirPath(),
  status: readBackupStatus()
}));

ipcMain.handle("backup:write", async (_event, payload = {}) => {
  try {
    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const fileName = `app-braga-backup-${stamp}.json`;
    const filePath = path.join(backupDirPath(), fileName);
    const data = {
      app: "App Braga",
      createdAt: now.toISOString(),
      source: "electron-local-backup",
      ...payload
    };
    fs.mkdirSync(backupDirPath(), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    const status = {
      ok: true,
      lastRunAt: now.toISOString(),
      lastRunDate: now.toISOString().slice(0, 10),
      lastFile: filePath,
      lastError: null,
      collectionCount: payload.collectionCount || 0,
      documentCount: payload.documentCount || 0
    };
    writeBackupStatus(status);
    return { ok: true, filePath, status };
  } catch (error) {
    const status = {
      ...readBackupStatus(),
      ok: false,
      lastError: error.message,
      lastErrorAt: new Date().toISOString()
    };
    try { writeBackupStatus(status); } catch {}
    return { ok: false, error: error.message, status };
  }
});

ipcMain.handle("backup:open-folder", async () => {
  fs.mkdirSync(backupDirPath(), { recursive: true });
  await shell.openPath(backupDirPath());
  return { ok: true, backupDir: backupDirPath() };
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") return;
});
