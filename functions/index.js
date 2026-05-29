"use strict";

const admin = require("firebase-admin");
const { logger } = require("firebase-functions");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

const APP_BASE_URL = "https://picafern-commits.github.io/App-Tablet/";
const TOKEN_BATCH_SIZE = 500;

const NOTIFICATION_RULES = {
  stock: {
    title: "Stock atualizado",
    label: "Stock",
    url: "html/stock.html",
    configField: "notifyStockMin"
  },
  manutencoes: {
    title: "Manutenção atualizada",
    label: "Manutenções",
    url: "html/manutencao-impressoras.html",
    configField: "notifyMaintenance"
  },
  printers: {
    title: "Impressoras atualizadas",
    label: "Impressoras / toner",
    url: "html/impressoras.html",
    configField: "notifyTonerZero"
  },
  radios: {
    title: "Rádios atualizados",
    label: "Rádios",
    url: "html/radios.html",
    configField: "notifyRadios"
  },
  radioWeeklyRecords: {
    title: "Registo semanal atualizado",
    label: "Registos semanais",
    url: "html/radios.html",
    configField: "notifyRadios"
  }
};

function getChangeType(before, after) {
  if (!before.exists && after.exists) return "created";
  if (before.exists && !after.exists) return "deleted";
  return "updated";
}

function getDocData(change) {
  if (change.after.exists) return change.after.data() || {};
  return change.before.data() || {};
}

function valueToText(value) {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value.toDate === "function") return value.toDate().toLocaleString("pt-PT");
  return "";
}

function pickFirst(data, fields) {
  for (const field of fields) {
    const text = valueToText(data[field]);
    if (text) return text;
  }
  return "";
}

function describeDocument(collectionKey, changeType, data, docId) {
  const action = {
    created: "novo registo",
    updated: "registo alterado",
    deleted: "registo apagado"
  }[changeType] || "alteração";

  if (collectionKey === "stock") {
    const item = pickFirst(data, ["equipamento", "modelo", "toner", "cor"]);
    const local = pickFirst(data, ["localizacao", "armazem"]);
    return `${action}${item ? `: ${item}` : ""}${local ? ` (${local})` : ""}.`;
  }

  if (collectionKey === "manutencoes") {
    const item = pickFirst(data, ["modelo", "numeroSerie", "serie", "ip"]);
    const estado = pickFirst(data, ["estado"]);
    return `${action}${item ? `: ${item}` : ""}${estado ? ` - ${estado}` : ""}.`;
  }

  if (collectionKey === "printers") {
    const item = pickFirst(data, ["modelo", "name", "nome", "ip"]) || docId;
    const toner = pickFirst(data, ["percent", "tonerPercent", "nivelToner", "nivel"]);
    return `${action}: ${item}${toner ? ` - toner ${toner}%` : ""}.`;
  }

  if (collectionKey === "radios") {
    const item = pickFirst(data, ["nome", "serial", "mac"]) || docId;
    return `${action}: ${item}.`;
  }

  if (collectionKey === "radioWeeklyRecords") {
    const semana = pickFirst(data, ["weekLabel", "semana", "idRegisto", "recordId"]) || docId;
    return `${action}: ${semana}.`;
  }

  return `${action}: ${docId}.`;
}

async function shouldSendForRule(rule) {
  const snap = await db.collection("config").doc("layout").get();
  const config = snap.exists ? snap.data() || {} : {};
  if (config.notificationEnabled !== true) return false;
  if (rule.configField === "notifyRadios") {
    return config.notifyRadios === true || config.notifyAllChanges === true;
  }
  return config[rule.configField] !== false;
}

async function getActiveTokens() {
  const snap = await db.collection("notificationTokens").where("active", "==", true).get();
  const tokens = [];
  snap.forEach((doc) => {
    const data = doc.data() || {};
    if (typeof data.token === "string" && data.token.trim()) {
      tokens.push({ token: data.token.trim(), id: doc.id });
    }
  });
  return tokens;
}

async function removeInvalidTokens(responses, batch) {
  const deletes = [];
  responses.forEach((response, index) => {
    if (response.success) return;
    const code = response.error && response.error.code ? response.error.code : "";
    if (
      code.includes("registration-token-not-registered") ||
      code.includes("invalid-registration-token") ||
      code.includes("invalid-argument")
    ) {
      deletes.push(db.collection("notificationTokens").doc(batch[index].id).set({
        active: false,
        invalidAt: Date.now(),
        invalidReason: code
      }, { merge: true }));
    }
  });
  return Promise.all(deletes);
}

async function sendPushToAllDevices({ title, body, tag, url }) {
  const tokens = await getActiveTokens();
  if (!tokens.length) {
    logger.info("No active notification tokens.");
    return;
  }

  for (let index = 0; index < tokens.length; index += TOKEN_BATCH_SIZE) {
    const batch = tokens.slice(index, index + TOKEN_BATCH_SIZE);
    const result = await messaging.sendEachForMulticast({
      tokens: batch.map((item) => item.token),
      notification: {
        title,
        body
      },
      data: {
        title,
        body,
        tag,
        url
      },
      webpush: {
        fcmOptions: {
          link: url
        },
        notification: {
          title,
          body,
          icon: `${APP_BASE_URL}icon-192.png`,
          badge: `${APP_BASE_URL}icon-192.png`,
          tag,
          requireInteraction: false,
          renotify: true,
          data: { url }
        }
      }
    });

    await removeInvalidTokens(result.responses, batch);
    logger.info("Push sent", {
      successCount: result.successCount,
      failureCount: result.failureCount,
      tag
    });
  }
}

async function handleCollectionChange(collectionKey, event) {
  const rule = NOTIFICATION_RULES[collectionKey];
  if (!rule) return;

  const shouldSend = await shouldSendForRule(rule);
  if (!shouldSend) {
    logger.info("Notifications disabled for collection", { collectionKey });
    return;
  }

  const change = event.data;
  if (!change) return;

  const changeType = getChangeType(change.before, change.after);
  const data = getDocData(change);
  const docId = event.params.docId || "sem-id";
  const body = `${rule.label}: ${describeDocument(collectionKey, changeType, data, docId)}`;
  const url = `${APP_BASE_URL}${rule.url}`;
  const tag = `firestore-${collectionKey}-${docId}-${Date.now()}`;

  await sendPushToAllDevices({
    title: rule.title,
    body,
    tag,
    url
  });
}

exports.notifyStockChanges = onDocumentWritten("stock/{docId}", (event) => handleCollectionChange("stock", event));
exports.notifyMaintenanceChanges = onDocumentWritten("manutencoes/{docId}", (event) => handleCollectionChange("manutencoes", event));
exports.notifyPrinterChanges = onDocumentWritten("printers/{docId}", (event) => handleCollectionChange("printers", event));
exports.notifyRadioChanges = onDocumentWritten("radios/{docId}", (event) => handleCollectionChange("radios", event));
exports.notifyRadioWeeklyRecordChanges = onDocumentWritten("radioWeeklyRecords/{docId}", (event) => handleCollectionChange("radioWeeklyRecords", event));
