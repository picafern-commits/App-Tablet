const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const http = require("http");
const https = require("https");
const snmp = require("net-snmp");

let win;

const APP_REMOTE_URL = "https://picafern-commits.github.io/App-Tablet/index.html";
const APP_LOCAL_FILE = path.join(__dirname, "index.html");

async function createWindow() {

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.ico"),
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  try {

    await win.loadURL(
      APP_REMOTE_URL + "?desktop=" + Date.now(),
      {
        extraHeaders:
          "pragma: no-cache\n"
          + "cache-control: no-cache\n"
      }
    );

    console.log("APP carregada do GitHub Pages");

  } catch (err) {

    console.log("Erro GitHub, fallback local:", err);

    await win.loadFile(APP_LOCAL_FILE);

  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

}

function requestUrl(url) {
  return new Promise((resolve) => {

    const client =
      url.startsWith("https://")
        ? https
        : http;

    const req = client.get(
      url,
      {
        timeout: 6000,
        headers: {
          "User-Agent": "AppBragaDesktop/1.0"
        }
      },
      (res) => {

        let data = "";

        res.on("data", (chunk) => {
          data += chunk.toString("utf8");
        });

        res.on("end", () => {

          resolve({
            ok: true,
            statusCode: res.statusCode || 0,
            body: data,
            url
          });

        });

      }
    );

    req.on("error", (error) => {

      resolve({
        ok: false,
        statusCode: 0,
        body: "",
        error: error.message,
        url
      });

    });

    req.on("timeout", () => {

      req.destroy();

      resolve({
        ok: false,
        statusCode: 0,
        body: "",
        error: "Timeout",
        url
      });

    });

  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
