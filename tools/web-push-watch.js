#!/usr/bin/env node
"use strict";

const fs = require("fs");
const https = require("https");
const crypto = require("crypto");

const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "toner-manager-756c4";
const POLL_SECONDS = Math.max(15, Number(process.env.APP_BRAGA_PUSH_INTERVAL || 60));
const WATCH_COLLECTIONS = (process.env.APP_BRAGA_PUSH_COLLECTIONS || "printers,stock,manutencoes,radios,radioWeeklyRecords")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

if (!SERVICE_ACCOUNT_PATH) {
  console.error("Define GOOGLE_APPLICATION_CREDENTIALS com o caminho do JSON da service account.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), serviceAccount.private_key);
  return `${unsigned}.${base64url(signature)}`;
}

function requestJson(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk.toString("utf8"); });
      res.on("end", () => {
        let parsed = {};
        try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = { raw }; }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
        else reject(new Error(`${res.statusCode}: ${JSON.stringify(parsed)}`));
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

let cachedToken = null;
let cachedTokenUntil = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenUntil) return cachedToken;
  const form = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${signJwt()}`;
  const data = await requestJson({
    method: "POST",
    hostname: "oauth2.googleapis.com",
    path: "/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(form)
    }
  }, form);
  cachedToken = data.access_token;
  cachedTokenUntil = Date.now() + Math.max(300, Number(data.expires_in || 3600) - 120) * 1000;
  return cachedToken;
}

function firestoreValue(value) {
  if (!value || typeof value !== "object") return value;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) {
    const out = {};
    Object.entries(value.mapValue.fields || {}).forEach(([key, val]) => { out[key] = firestoreValue(val); });
    return out;
  }
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(firestoreValue);
  return value;
}

function parseDoc(doc) {
  const fields = {};
  Object.entries(doc.fields || {}).forEach(([key, val]) => { fields[key] = firestoreValue(val); });
  return {
    name: doc.name,
    updateTime: doc.updateTime || "",
    fields
  };
}

async function listCollection(collection) {
  const token = await getAccessToken();
  const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?pageSize=300`;
  const data = await requestJson({
    method: "GET",
    hostname: "firestore.googleapis.com",
    path,
    headers: { Authorization: `Bearer ${token}` }
  });
  return (data.documents || []).map(parseDoc);
}

async function listTokens() {
  const docs = await listCollection("notificationTokens");
  return docs
    .map((doc) => doc.fields)
    .filter((item) => item.active !== false && item.token && String(item.source || "").includes("web-push"));
}

async function sendFcm(token, title, body, data = {}) {
  const accessToken = await getAccessToken();
  return requestJson({
    method: "POST",
    hostname: "fcm.googleapis.com",
    path: `/v1/projects/${PROJECT_ID}/messages:send`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  }, {
    message: {
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
      webpush: {
        fcmOptions: { link: data.url || "https://picafern-commits.github.io/App-Tablet/html/index.html" }
      }
    }
  });
}

async function broadcast(title, body, data) {
  const tokens = await listTokens();
  for (const item of tokens) {
    try {
      await sendFcm(item.token, title, body, data);
      console.log(`Push enviado: ${item.deviceName || item.deviceType || item.token.slice(0, 12)}`);
    } catch (error) {
      console.warn(`Falhou push para token: ${error.message}`);
    }
  }
}

const seen = new Map();
const printerState = new Map();
let boot = true;

function normalizePercentValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
  if (typeof value === "string") {
    const match = value.replace(",", ".").match(/\d{1,3}(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }
  return null;
}

function getDocId(docName) {
  return String(docName || "").split("/").pop() || "";
}

function getPrinterTonerItems(fields = {}) {
  const items = [];
  const toner = fields.toner && typeof fields.toner === "object" ? fields.toner : {};
  const colorMap = [
    ["black", "Preto"],
    ["cyan", "Ciano"],
    ["magenta", "Magenta"],
    ["yellow", "Amarelo"]
  ];

  colorMap.forEach(([key, label]) => {
    const percent = normalizePercentValue(
      toner[key] ??
      fields[key] ??
      fields[`${key}Percent`] ??
      fields[`${key}_percent`]
    );
    if (percent !== null) items.push({ key, label, percent });
  });

  if (!items.length) {
    const percent = normalizePercentValue(fields.percent ?? fields.tonerPercent ?? fields.toner_percent ?? fields.nivelToner ?? fields.nivel ?? fields.percentage);
    if (percent !== null) items.push({ key: "black", label: "Preto", percent });
  }

  if (Array.isArray(fields.colors)) {
    fields.colors.forEach((item) => {
      if (!item) return;
      const key = String(item.key || item.color || item.cor || "toner").toLowerCase();
      if (items.some((existing) => existing.key === key)) return;
      const percent = normalizePercentValue(item.percent ?? item.value ?? item.valor ?? item.nivel);
      if (percent !== null) items.push({ key, label: item.label || item.cor || key, percent });
    });
  }

  return items;
}

function getTonerReplacementEvents(previousFields, nextFields) {
  const previous = getPrinterTonerItems(previousFields);
  const next = getPrinterTonerItems(nextFields);
  const previousMap = new Map(previous.map((item) => [item.key, item]));
  return next
    .map((item) => ({ before: previousMap.get(item.key), after: item }))
    .filter(({ before, after }) => before && before.percent <= 0 && after.percent >= 95);
}

async function getNotificationConfig() {
  try {
    const configDocs = await listCollection("config");
    const layout = configDocs.find((doc) => getDocId(doc.name) === "layout");
    return layout ? layout.fields : {};
  } catch (error) {
    console.warn(`Nao foi possivel ler config/layout: ${error.message}`);
    return {};
  }
}

function getPrinterLabel(fields, id) {
  const model = fields.modelo || fields.model || fields.name || "Impressora";
  const loc = fields.localizacao || fields.location || fields.armazem || id;
  return `${model} ${loc}`.trim();
}

async function handlePrinterReplacementPush(doc, config) {
  if (config.notificationEnabled === false || config.notifyTonerChange === false) return;
  const id = getDocId(doc.name);
  const previous = printerState.get(id);
  printerState.set(id, doc.fields);
  if (boot || !previous) return;

  const events = getTonerReplacementEvents(previous, doc.fields);
  if (!events.length) return;

  const label = getPrinterLabel(doc.fields, id);
  for (const event of events) {
    await broadcast("Toner trocado", `${label}: ${event.after.label} passou de ${event.before.percent}% para ${event.after.percent}%.`, {
      collection: "printers",
      event: "toner-replaced",
      printerId: id,
      color: event.after.key,
      beforePercent: event.before.percent,
      afterPercent: event.after.percent,
      url: "https://picafern-commits.github.io/App-Tablet/html/impressoras.html"
    });
  }
}

async function pollOnce() {
  const notificationConfig = await getNotificationConfig();
  for (const collection of WATCH_COLLECTIONS) {
    const docs = await listCollection(collection);
    let changed = 0;
    for (const doc of docs) {
      const key = doc.name;
      const previous = seen.get(key);
      if (previous && previous !== doc.updateTime) changed += 1;
      seen.set(key, doc.updateTime);
      if (collection === "printers") await handlePrinterReplacementPush(doc, notificationConfig);
    }
    if (!boot && changed && collection !== "printers") {
      await broadcast("App Braga", `${collection}: ${changed} alteracao${changed === 1 ? "" : "es"}.`, {
        collection,
        changed,
        url: "https://picafern-commits.github.io/App-Tablet/html/index.html"
      });
    }
  }
  boot = false;
}

async function main() {
  console.log(`App Braga Web Push watcher ativo. Projeto: ${PROJECT_ID}. Intervalo: ${POLL_SECONDS}s.`);
  await pollOnce();
  setInterval(() => pollOnce().catch((error) => console.error(error.message)), POLL_SECONDS * 1000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
