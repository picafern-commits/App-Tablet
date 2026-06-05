"use strict";

const admin = require("firebase-admin");
const webpush = require("web-push");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

admin.initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

const VAPID_PUBLIC_KEY = defineSecret("APP_BRAGA_VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = defineSecret("APP_BRAGA_VAPID_PRIVATE_KEY");

const APP_URL = "https://picafern-commits.github.io/App-Tablet/html/index.html";
const VAPID_SUBJECT = "mailto:admin@appbraga.pt";
const CONFIG_DOC = "config/cloudNotifications";

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

function getTonerItems(fields = {}) {
  const items = [];
  const toner = fields.toner && typeof fields.toner === "object" ? fields.toner : {};
  [
    ["black", "Preto"],
    ["cyan", "Ciano"],
    ["magenta", "Magenta"],
    ["yellow", "Amarelo"]
  ].forEach(([key, label]) => {
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

function getTonerReplacementEvents(beforeFields, afterFields) {
  const before = getTonerItems(beforeFields);
  const after = getTonerItems(afterFields);
  const beforeMap = new Map(before.map((item) => [item.key, item]));
  return after
    .map((item) => ({ before: beforeMap.get(item.key), after: item }))
    .filter(({ before: oldItem, after: newItem }) => oldItem && oldItem.percent <= 0 && newItem.percent >= 95);
}

function getTonerZeroEvents(beforeFields, afterFields) {
  const before = getTonerItems(beforeFields);
  const after = getTonerItems(afterFields);
  const beforeMap = new Map(before.map((item) => [item.key, item]));
  return after
    .map((item) => ({ before: beforeMap.get(item.key), after: item }))
    .filter(({ before: oldItem, after: newItem }) => newItem.percent <= 0 && (!oldItem || oldItem.percent > 0));
}

function getPrinterLabel(fields = {}, id = "") {
  const model = fields.modelo || fields.model || fields.name || "Impressora";
  const loc = fields.localizacao || fields.location || fields.armazem || id;
  return `${model} ${loc}`.trim();
}

function getUpdatedAt(item = {}) {
  const value = item.updatedAt || item.createdAt || 0;
  if (typeof value === "number") return value;
  if (value && typeof value.toMillis === "function") return value.toMillis();
  return Number(value) || 0;
}

function uniqueActiveDevices(items) {
  const sorted = items
    .filter((item) => item.active !== false)
    .filter((item) => item.token || item.pushSubscription?.endpoint)
    .sort((a, b) => getUpdatedAt(b) - getUpdatedAt(a));
  const unique = new Map();
  sorted.forEach((item) => {
    const key = item.deviceKey || `${item.deviceType || ""}|${item.platform || ""}|${item.userAgent || item.id || ""}`;
    if (!unique.has(key)) unique.set(key, item);
  });
  return Array.from(unique.values());
}

async function getNotificationConfig() {
  const snap = await admin.firestore().doc("config/layout").get();
  return snap.exists ? snap.data() || {} : {};
}

async function getActiveNotificationDevices() {
  const snap = await admin.firestore().collection("notificationTokens").get();
  const items = [];
  snap.forEach((doc) => items.push({ id: doc.id, ref: doc.ref, ...doc.data() }));
  return uniqueActiveDevices(items);
}

async function markDeviceInactive(item, reason) {
  try {
    await item.ref.set({
      active: false,
      disabledAt: Date.now(),
      disabledReason: reason || "push-invalid"
    }, { merge: true });
  } catch (error) {
    logger.warn("Nao foi possivel desativar dispositivo push", { id: item.id, error: error.message });
  }
}

function configureWebPush() {
  const publicKey = String(VAPID_PUBLIC_KEY.value() || "").trim();
  const privateKey = String(VAPID_PRIVATE_KEY.value() || "").trim();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
  return true;
}

async function sendFcm(item, title, body, data = {}) {
  await admin.messaging().send({
    token: item.token,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value ?? "")])),
    webpush: {
      notification: {
        title,
        body,
        icon: "https://picafern-commits.github.io/App-Tablet/icon-192.png",
        badge: "https://picafern-commits.github.io/App-Tablet/icon-192.png",
        tag: data.event || data.collection || "app-braga"
      },
      fcmOptions: {
        link: data.url || APP_URL
      }
    }
  });
}

async function sendStandardWebPush(item, title, body, data = {}) {
  await webpush.sendNotification(item.pushSubscription, JSON.stringify({
    title,
    body,
    tag: data.event || data.collection || "app-braga",
    data: {
      url: data.url || APP_URL,
      ...data
    }
  }));
}

async function updateRuntimeStatus(data = {}) {
  await admin.firestore().doc(CONFIG_DOC).set({
    provider: "firebase-functions",
    region: "europe-west1",
    updatedAt: Date.now(),
    ...data
  }, { merge: true });
}

async function writeAudit(action, data = {}) {
  try {
    await admin.firestore().collection("auditLogs").add({
      action,
      source: "firebase-functions",
      createdAt: Date.now(),
      ...data
    });
  } catch (error) {
    logger.warn("Falhou escrita de auditoria", { action, error: error.message });
  }
}

async function broadcast(title, body, data = {}) {
  const devices = await getActiveNotificationDevices();
  const canStandardWebPush = configureWebPush();
  let sent = 0;
  let failed = 0;

  for (const item of devices) {
    try {
      if (item.token) {
        await sendFcm(item, title, body, data);
        sent += 1;
      }
      if (item.pushSubscription?.endpoint && canStandardWebPush) {
        await sendStandardWebPush(item, title, body, data);
        sent += 1;
      }
    } catch (error) {
      failed += 1;
      logger.warn("Falhou envio push", { id: item.id, source: item.source, error: error.message });
      if (/UNREGISTERED|NotRegistered|not registered|registration-token-not-registered/i.test(error.message) || error.statusCode === 404 || error.statusCode === 410) {
        await markDeviceInactive(item, "push-unregistered");
      }
    }
  }

  await updateRuntimeStatus({
    lastTitle: title,
    lastBody: body,
    lastEvent: data.event || data.collection || "manual",
    lastSent: sent,
    lastFailed: failed,
    lastRunAt: Date.now(),
    standardWebPushReady: canStandardWebPush
  });

  await writeAudit("notification-broadcast", {
    title,
    body,
    sent,
    failed,
    event: data.event || data.collection || "manual",
    collection: data.collection || "",
    targetUrl: data.url || APP_URL
  });

  return { sent, failed };
}

exports.onNotificationRequestCreated = onDocumentCreated({
  document: "notificationRequests/{requestId}",
  secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY]
}, async (event) => {
  const data = event.data?.data() || {};
  await writeAudit("notification-test-request", {
    requestId: event.params.requestId,
    title: data.title || "App Braga",
    event: data.event || "manual-remote-test"
  });
  await broadcast(data.title || "App Braga", data.body || "Teste remoto de notificacao.", {
    event: data.event || "manual-remote-test",
    requestId: event.params.requestId,
    url: data.url || "https://picafern-commits.github.io/App-Tablet/html/config.html"
  });
});

exports.onPrinterWritten = onDocumentWritten({
  document: "printers/{printerId}",
  secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY]
}, async (event) => {
  if (!event.data?.before.exists || !event.data?.after.exists) return;
  const config = await getNotificationConfig();
  if (config.notificationEnabled === false) return;

  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  const label = getPrinterLabel(after, event.params.printerId);

  if (config.notifyTonerZero !== false) {
    const zeroEvents = getTonerZeroEvents(before, after);
    for (const tonerEvent of zeroEvents) {
      await broadcast("Toner a 0%", `${label}: ${tonerEvent.after.label} chegou a 0%.`, {
        collection: "printers",
        event: "toner-zero",
        printerId: event.params.printerId,
        color: tonerEvent.after.key,
        afterPercent: tonerEvent.after.percent,
        url: "https://picafern-commits.github.io/App-Tablet/html/impressoras.html"
      });
      await writeAudit("toner-zero", {
        collection: "printers",
        documentId: event.params.printerId,
        printer: label,
        color: tonerEvent.after.key,
        afterPercent: tonerEvent.after.percent
      });
    }
  }

  if (config.notifyTonerChange !== false) {
    const events = getTonerReplacementEvents(before, after);
    for (const tonerEvent of events) {
      await broadcast("Toner trocado", `${label}: ${tonerEvent.after.label} passou de ${tonerEvent.before.percent}% para ${tonerEvent.after.percent}%.`, {
        collection: "printers",
        event: "toner-replaced",
        printerId: event.params.printerId,
        color: tonerEvent.after.key,
        beforePercent: tonerEvent.before.percent,
        afterPercent: tonerEvent.after.percent,
        url: "https://picafern-commits.github.io/App-Tablet/html/impressoras.html"
      });
      await writeAudit("toner-replaced", {
        collection: "printers",
        documentId: event.params.printerId,
        printer: label,
        color: tonerEvent.after.key,
        beforePercent: tonerEvent.before.percent,
        afterPercent: tonerEvent.after.percent
      });
    }
  }
});

exports.onStockWritten = onDocumentWritten({
  document: "stock/{stockId}",
  secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY]
}, async (event) => {
  if (!event.data?.after.exists) return;
  const config = await getNotificationConfig();
  if (config.notificationEnabled === false || config.notifyStockMin === false) return;
  if (!event.data.before.exists) return;
  await writeAudit("stock-updated", {
    collection: "stock",
    documentId: event.params.stockId
  });
  await broadcast("Stock atualizado", "Foi feita uma alteracao no stock.", {
    collection: "stock",
    event: "stock-updated",
    stockId: event.params.stockId,
    url: "https://picafern-commits.github.io/App-Tablet/html/stock.html"
  });
});

exports.onManutencaoWritten = onDocumentWritten({
  document: "manutencoes/{manutencaoId}",
  secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY]
}, async (event) => {
  if (!event.data?.after.exists) return;
  const config = await getNotificationConfig();
  if (config.notificationEnabled === false || config.notifyMaintenance === false) return;
  const after = event.data.after.data() || {};
  const label = after.modelo || after.numeroSerie || after.ip || "Manutencao";
  await writeAudit(event.data.before.exists ? "maintenance-updated" : "maintenance-created", {
    collection: "manutencoes",
    documentId: event.params.manutencaoId,
    label,
    status: after.estado || ""
  });
  await broadcast(event.data.before.exists ? "Manutencao atualizada" : "Nova manutencao", `${label}: ${after.estado || "estado atualizado"}.`, {
    collection: "manutencoes",
    event: event.data.before.exists ? "maintenance-updated" : "maintenance-created",
    manutencaoId: event.params.manutencaoId,
    url: "https://picafern-commits.github.io/App-Tablet/html/manutencao-impressoras.html"
  });
});

exports.onRadioWeeklyRecordCreated = onDocumentCreated({
  document: "radioWeeklyRecords/{recordId}",
  secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY]
}, async (event) => {
  const config = await getNotificationConfig();
  if (config.notificationEnabled === false || config.notifyRadios !== true) return;
  const data = event.data?.data() || {};
  await writeAudit("radio-weekly-created", {
    collection: "radioWeeklyRecords",
    documentId: event.params.recordId,
    weekLabel: data.weekLabel || ""
  });
  await broadcast("Registo semanal de radios", data.weekLabel || "Foi criado um registo semanal de radios.", {
    collection: "radioWeeklyRecords",
    event: "radio-weekly-created",
    recordId: event.params.recordId,
    url: "https://picafern-commits.github.io/App-Tablet/html/radios.html"
  });
});
