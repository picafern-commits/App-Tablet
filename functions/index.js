"use strict";

const admin = require("firebase-admin");
const webpush = require("web-push");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const logger = require("firebase-functions/logger");

admin.initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

function envValue(name) {
  return String(process.env[name] || "").trim();
}

const APP_URL = "https://picafern-commits.github.io/App-Tablet/html/index.html";
const VAPID_SUBJECT = envValue("APP_BRAGA_VAPID_SUBJECT") || "mailto:admin@appbraga.pt";
const CONFIG_DOC = "config/cloudNotifications";
const CLOUD_SETTINGS_DOC = "config/notificationCloudSettings";

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

function getTonerLowEvents(beforeFields, afterFields, threshold = 25) {
  const before = getTonerItems(beforeFields);
  const after = getTonerItems(afterFields);
  const beforeMap = new Map(before.map((item) => [item.key, item]));
  return after
    .map((item) => ({ before: beforeMap.get(item.key), after: item }))
    .filter(({ before: oldItem, after: newItem }) => newItem.percent > 0 && newItem.percent <= threshold && (!oldItem || oldItem.percent > threshold));
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

function normalizeWebPushSubscription(item = {}) {
  const direct = item.pushSubscription && typeof item.pushSubscription === "object" ? item.pushSubscription : null;
  const endpoint = String(direct?.endpoint || item.endpoint || "").trim();
  const keys = direct?.keys || item.keys || {};
  const p256dh = keys.p256dh || item.p256dh || item.publicKey || "";
  const auth = keys.auth || item.auth || item.authSecret || "";
  if (!endpoint) return null;
  return {
    endpoint,
    expirationTime: direct?.expirationTime || null,
    keys: { p256dh, auth }
  };
}

function hasValidWebPushSubscription(item = {}) {
  const sub = normalizeWebPushSubscription(item);
  return !!(sub?.endpoint && sub?.keys?.p256dh && sub?.keys?.auth);
}

function uniqueActiveDevices(items) {
  const sorted = items
    .filter((item) => item.active !== false)
    .filter((item) => item.source !== "electron-native")
    .filter((item) => item.source !== "web-local-no-push")
    .filter((item) => item.token || hasValidWebPushSubscription(item))
    .map((item) => ({ ...item, pushSubscription: normalizeWebPushSubscription(item) || item.pushSubscription }))
    .sort((a, b) => getUpdatedAt(b) - getUpdatedAt(a));
  const unique = new Map();
  sorted.forEach((item) => {
    const key = item.pushSubscription?.endpoint || item.endpoint || item.token || item.deviceKey || `${item.deviceType || ""}|${item.platform || ""}|${item.userAgent || item.id || ""}`;
    if (!unique.has(key)) unique.set(key, item);
  });
  return Array.from(unique.values());
}

async function getNotificationConfig() {
  const [layoutSnap, cloudSnap] = await Promise.all([
    admin.firestore().doc("config/layout").get(),
    admin.firestore().doc(CLOUD_SETTINGS_DOC).get()
  ]);
  const layout = layoutSnap.exists ? layoutSnap.data() || {} : {};
  const cloud = cloudSnap.exists ? cloudSnap.data() || {} : {};
  const alerts = cloud.alerts || {};
  return {
    ...layout,
    ...cloud,
    notificationEnabled: cloud.enabled ?? cloud.notificationEnabled ?? layout.notificationEnabled,
    notifyTonerZero: alerts.tonerZero ?? layout.notifyTonerZero ?? layout.notificationTonerZero,
    notifyTonerLow25: alerts.tonerLow25 ?? layout.notifyTonerLow25 ?? layout.notificationTonerLow25,
    notifyTonerChange: alerts.tonerChange ?? layout.notifyTonerChange ?? layout.notificationTonerChange,
    notifyStockMin: alerts.stockMin ?? layout.notifyStockMin ?? layout.notificationStockMin,
    notifyMaintenance: alerts.maintenance ?? layout.notifyMaintenance ?? layout.notificationMaintenance,
    notifyRadios: alerts.radios ?? layout.notifyRadios ?? layout.notificationRadios
  };
}

async function getActiveNotificationDevices() {
  const snap = await admin.firestore().collection("notificationTokens").where("active", "==", true).get();
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

async function configureWebPush() {
  let cloud = {};
  try {
    const snap = await admin.firestore().doc(CLOUD_SETTINGS_DOC).get();
    cloud = snap.exists ? snap.data() || {} : {};
  } catch (error) {
    logger.warn("Nao foi possivel ler configuracao cloud Web Push", { error: error.message });
  }

  const publicKey = String(cloud.vapidPublicKey || cloud.notificationVapidKey || envValue("APP_BRAGA_VAPID_PUBLIC_KEY") || "").trim();
  const privateKey = String(cloud.vapidPrivateKey || envValue("APP_BRAGA_VAPID_PRIVATE_KEY") || "").trim();
  const subject = String(cloud.vapidSubject || VAPID_SUBJECT || "mailto:admin@appbraga.pt").trim();
  if (!publicKey || !privateKey) {
    return {
      ready: false,
      source: cloud.vapidPublicKey || cloud.vapidPrivateKey ? "firestore-incomplete" : "missing",
      publicKeyReady: !!publicKey,
      privateKeyReady: !!privateKey
    };
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return {
    ready: true,
    source: cloud.vapidPrivateKey ? "firestore" : "environment",
    publicKeyReady: true,
    privateKeyReady: true
  };
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
  const subscription = normalizeWebPushSubscription(item);
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("Web Push subscription incompleta: faltam endpoint/keys.");
  }
  await webpush.sendNotification(subscription, JSON.stringify({
    title,
    body,
    tag: data.event || data.collection || "app-braga",
    requireInteraction: data.requireInteraction === "1" || data.requireInteraction === true,
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

async function writeNotificationHistory(data = {}) {
  try {
    await admin.firestore().collection("notificationHistory").add({
      source: "firebase-functions",
      createdAt: Date.now(),
      ...data
    });
  } catch (error) {
    logger.warn("Falhou escrita do historico de notificacoes", { error: error.message });
  }
}

async function broadcast(title, body, data = {}) {
  const allDevices = await getActiveNotificationDevices();
  const excludeDeviceKey = data.excludeDeviceKey ? String(data.excludeDeviceKey) : "";
  const devices = excludeDeviceKey
    ? allDevices.filter((item) => String(item.deviceKey || "") !== excludeDeviceKey)
    : allDevices;
  const webPushRuntime = await configureWebPush();
  const canStandardWebPush = webPushRuntime.ready === true;
  let sent = 0;
  let failed = 0;
  let fcmTargets = 0;
  let standardWebPushTargets = 0;
  let lastError = "";
  const sendErrors = [];

  async function tryPush(item, method, sender) {
    try {
      await sender();
      sent += 1;
      return true;
    } catch (error) {
      failed += 1;
      const message = error?.message || String(error);
      lastError = message;
      sendErrors.push({ id: item.id, method, source: item.source || "", message });
      logger.warn("Falhou envio push", { id: item.id, method, source: item.source, error: message });
      if (/UNREGISTERED|NotRegistered|not registered|registration-token-not-registered/i.test(message) || error.statusCode === 404 || error.statusCode === 410) {
        await markDeviceInactive(item, "push-unregistered");
      }
      return false;
    }
  }

  for (const item of devices) {
    // Importante: uma falha no FCM não pode impedir o Web Push standard do mesmo dispositivo.
    if (item.token) {
      fcmTargets += 1;
      await tryPush(item, "fcm", () => sendFcm(item, title, body, data));
    }
    if (hasValidWebPushSubscription(item)) {
      standardWebPushTargets += 1;
      if (canStandardWebPush) {
        await tryPush(item, "standard-web-push", () => sendStandardWebPush(item, title, body, data));
      } else {
        failed += 1;
        lastError = "Faltam credenciais VAPID na configuracao cloud.";
        sendErrors.push({ id: item.id, method: "standard-web-push", source: item.source || "", message: lastError });
        logger.warn("Web Push standard sem VAPID cloud", { id: item.id, source: item.source, credentialSource: webPushRuntime.source });
      }
    }
  }

  if (sent <= 0 && !lastError) {
    if (!devices.length) {
      lastError = "Nao ha dispositivos ativos registados para receber push.";
    } else if (standardWebPushTargets <= 0) {
      lastError = "Nao ha nenhum dispositivo com Web Push standard. No iPhone/Android abre a app instalada e usa Reparar este dispositivo.";
    } else if (!canStandardWebPush) {
      lastError = "Faltam credenciais VAPID na configuracao cloud.";
    } else {
      lastError = "A cloud nao conseguiu enviar para nenhum dispositivo registado.";
    }
  }

  await updateRuntimeStatus({
    lastTitle: title,
    lastBody: body,
    lastEvent: data.event || data.collection || "manual",
    lastSent: sent,
    lastFailed: failed,
    lastDeviceCount: devices.length,
    lastTotalDeviceCount: allDevices.length,
    lastExcludedDeviceKey: excludeDeviceKey,
    lastFcmTargets: fcmTargets,
    lastStandardWebPushTargets: standardWebPushTargets,
    lastError,
    lastErrors: sendErrors.slice(0, 10),
    lastRunAt: Date.now(),
    standardWebPushReady: canStandardWebPush,
    credentialSource: webPushRuntime.source,
    publicKeyReady: webPushRuntime.publicKeyReady,
    privateKeyReady: webPushRuntime.privateKeyReady
  });

  await writeAudit("notification-broadcast", {
    title,
    body,
    sent,
    failed,
    deviceCount: devices.length,
    totalDeviceCount: allDevices.length,
    excludedDeviceKey: excludeDeviceKey,
    fcmTargets,
    standardWebPushTargets,
    event: data.event || data.collection || "manual",
    collection: data.collection || "",
    targetUrl: data.url || APP_URL,
    credentialSource: webPushRuntime.source
  });

  await writeNotificationHistory({
    title,
    body,
    sent,
    failed,
    deviceCount: devices.length,
    fcmTargets,
    standardWebPushTargets,
    standardWebPushReady: canStandardWebPush,
    credentialSource: webPushRuntime.source,
    event: data.event || data.collection || "manual",
    collection: data.collection || "",
    targetUrl: data.url || APP_URL,
    error: sent > 0 ? "" : lastError,
    errors: sendErrors.slice(0, 10)
  });

  return {
    sent,
    failed,
    fcmTargets,
    standardWebPushTargets,
    standardWebPushReady: canStandardWebPush,
    credentialSource: webPushRuntime.source,
    error: sent > 0 ? "" : lastError,
    errors: sendErrors.slice(0, 10)
  };
}

exports.onNotificationRequestCreated = onDocumentCreated({
  document: "notificationRequests/{requestId}"
}, async (event) => {
  const data = event.data?.data() || {};
  const requestRef = event.data?.ref;
  await requestRef?.set({
    status: "processing",
    processingAt: Date.now()
  }, { merge: true });
  await writeAudit("notification-test-request", {
    requestId: event.params.requestId,
    title: data.title || "App Braga",
    event: data.event || "manual-remote-test"
  });
  try {
    const result = await broadcast(data.title || "App Braga", data.body || "Teste remoto de notificacao.", {
      event: data.event || "manual-remote-test",
      requestId: event.params.requestId,
      url: data.url || "https://picafern-commits.github.io/App-Tablet/html/notificacoes.html",
      excludeDeviceKey: data.excludeDeviceKey || "",
      requestedBy: data.requestedBy || "",
      requireInteraction: data.requireInteraction === true ? "1" : ""
    });
    await requestRef?.set({
      status: result.sent > 0 ? "sent" : "failed",
      sent: result.sent,
      failed: result.failed,
      standardWebPushReady: result.standardWebPushReady,
      standardWebPushTargets: result.standardWebPushTargets,
      credentialSource: result.credentialSource,
      error: result.error || "",
      errors: result.errors || [],
      finishedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    await requestRef?.set({
      status: "failed",
      error: error.message || String(error),
      finishedAt: Date.now()
    }, { merge: true });
    throw error;
  }
});

exports.onPrinterWritten = onDocumentWritten({
  document: "printers/{printerId}"
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

  if (config.notifyTonerLow25 !== false) {
    const lowEvents = getTonerLowEvents(before, after, 25);
    for (const tonerEvent of lowEvents) {
      await broadcast("Toner a 25%", `${label}: ${tonerEvent.after.label} chegou a ${tonerEvent.after.percent}%.`, {
        collection: "printers",
        event: "toner-low-25",
        printerId: event.params.printerId,
        color: tonerEvent.after.key,
        beforePercent: tonerEvent.before ? tonerEvent.before.percent : "",
        afterPercent: tonerEvent.after.percent,
        url: "https://picafern-commits.github.io/App-Tablet/html/impressoras.html"
      });
      await writeAudit("toner-low-25", {
        collection: "printers",
        documentId: event.params.printerId,
        printer: label,
        color: tonerEvent.after.key,
        beforePercent: tonerEvent.before ? tonerEvent.before.percent : null,
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
  document: "stock/{stockId}"
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
  document: "manutencoes/{manutencaoId}"
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
  document: "radioWeeklyRecords/{recordId}"
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
