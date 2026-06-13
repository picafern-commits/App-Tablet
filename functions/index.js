"use strict";

const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const webpush = require("web-push");

admin.initializeApp();

const db = admin.firestore();
const DEVICE_COLLECTION = "notificationDevices";
const INBOX_COLLECTION = "notificationInbox";
const HISTORY_COLLECTION = "notificationHistory";
const REGION = "europe-west1";
const PUBLIC_HTTP_OPTIONS = { region: REGION, cors: true, invoker: "public" };

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function envValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return String(value).trim();
  }
  return "";
}

function getVapid() {
  const publicKey = envValue("APP_BRAGA_VAPID_PUBLIC_KEY", "WEB_PUSH_PUBLIC_KEY", "VAPID_PUBLIC_KEY");
  const privateKey = envValue("APP_BRAGA_VAPID_PRIVATE_KEY", "WEB_PUSH_PRIVATE_KEY", "VAPID_PRIVATE_KEY");
  const subject = envValue("APP_BRAGA_VAPID_SUBJECT", "WEB_PUSH_SUBJECT", "VAPID_SUBJECT") || "mailto:admin@appbraga.pt";
  if (!publicKey || !privateKey) {
    throw new Error("Faltam APP_BRAGA_VAPID_PUBLIC_KEY e APP_BRAGA_VAPID_PRIVATE_KEY nas variaveis da Firebase Function.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey, subject };
}

function cleanText(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function deviceLabel(device = {}, id = "") {
  return cleanText(device.deviceName || device.name || device.label, id || "dispositivo");
}

function hasWebPush(device = {}) {
  const sub = device.webPush || device.standardWebPush || device.pushSubscription || {};
  return !!(sub.endpoint && sub.keys && sub.keys.p256dh && sub.keys.auth);
}

function webPushSubscription(device = {}) {
  return device.webPush || device.standardWebPush || device.pushSubscription || null;
}

async function writeInbox(deviceId, payload, requestId) {
  await db.collection(INBOX_COLLECTION).add({
    deviceId,
    requestId,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function sendFcm(device, payload) {
  const token = String(device.fcmToken || device.firebaseToken || "").trim();
  if (!token) return { skipped: true };
  await admin.messaging().send({
    token,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: {
      url: payload.url,
      tag: payload.tag,
      requestId: payload.requestId
    },
    webpush: {
      fcmOptions: { link: payload.url },
      notification: {
        title: payload.title,
        body: payload.body,
        tag: payload.tag,
        requireInteraction: false,
        icon: "/icon-192.png",
        badge: "/icon-192.png"
      }
    }
  });
  return { sent: true };
}

async function sendStandardWebPush(device, payload) {
  const subscription = webPushSubscription(device);
  if (!subscription) return { skipped: true };
  await webpush.sendNotification(subscription, JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    url: payload.url,
    data: {
      url: payload.url,
      tag: payload.tag,
      requestId: payload.requestId
    }
  }));
  return { sent: true };
}

exports.notificationHealth = onRequest(PUBLIC_HTTP_OPTIONS, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const vapid = getVapid();
    const snap = await db.collection(DEVICE_COLLECTION).where("enabled", "==", true).get();
    return res.json({
      ok: true,
      collection: DEVICE_COLLECTION,
      activeDevices: snap.size,
      vapidPublicReady: !!vapid.publicKey,
      vapidPrivateReady: !!vapid.privateKey,
      subject: vapid.subject
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

async function handleNotificationBroadcast(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Usa POST." });

  const startedAt = Date.now();
  const body = req.body || {};
  const requestId = cleanText(body.requestId, `notif-${startedAt}`);
  const senderDeviceId = cleanText(body.senderDeviceId, "");
  const payload = {
    requestId,
    title: cleanText(body.title, "App Braga"),
    body: cleanText(body.body, "Alerta App Braga"),
    url: cleanText(body.url, "https://picafern-commits.github.io/App-Tablet/html/index.html"),
    tag: cleanText(body.tag, requestId)
  };

  const result = {
    ok: false,
    requestId,
    totalDevices: 0,
    ignored: 0,
    inboxWritten: 0,
    fcmTargets: 0,
    fcmSent: 0,
    fcmFailed: 0,
    webPushTargets: 0,
    webPushSent: 0,
    webPushFailed: 0,
    failed: 0,
    sent: 0,
    errors: []
  };

  try {
    getVapid();
    const snap = await db.collection(DEVICE_COLLECTION).where("enabled", "==", true).get();
    result.totalDevices = snap.size;

    for (const doc of snap.docs) {
      const device = { id: doc.id, ...doc.data() };
      const deviceId = String(device.deviceId || doc.id);
      if (senderDeviceId && deviceId === senderDeviceId) {
        result.ignored += 1;
        continue;
      }

      let delivered = false;
      const token = String(device.fcmToken || device.firebaseToken || "").trim();
      const usesDesktopInbox = device.desktopInbox === true || device.electron === true;

      if (usesDesktopInbox) {
        try {
          await writeInbox(deviceId, payload, requestId);
          result.inboxWritten += 1;
          delivered = true;
        } catch (error) {
          result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "inbox", error: error.message });
        }
      }

      if (!delivered && hasWebPush(device)) {
        result.webPushTargets += 1;
        try {
          await sendStandardWebPush(device, payload);
          result.webPushSent += 1;
          delivered = true;
        } catch (error) {
          result.webPushFailed += 1;
          result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "webpush", error: error.message });
          if (error.statusCode === 404 || error.statusCode === 410) {
            await doc.ref.set({
              enabled: false,
              disabledAt: admin.firestore.FieldValue.serverTimestamp(),
              disabledReason: `webpush-${error.statusCode}`
            }, { merge: true }).catch(() => null);
          }
        }
      }

      if (!delivered && token) {
        result.fcmTargets += 1;
        try {
          await sendFcm(device, payload);
          result.fcmSent += 1;
          delivered = true;
        } catch (error) {
          result.fcmFailed += 1;
          result.errors.push({ deviceId, device: deviceLabel(device, deviceId), channel: "fcm", error: error.message });
          if (error.code === "messaging/registration-token-not-registered" || error.code === "messaging/invalid-registration-token") {
            await doc.ref.set({
              fcmToken: "",
              fcmDisabledAt: admin.firestore.FieldValue.serverTimestamp(),
              fcmDisabledReason: error.code
            }, { merge: true }).catch(() => null);
          }
        }
      }

      if (!delivered) result.failed += 1;
      else result.sent += 1;
    }

    result.ok = result.sent > 0 || result.inboxWritten > 0;
    await db.collection(HISTORY_COLLECTION).add({
      ...result,
      title: payload.title,
      body: payload.body,
      senderDeviceId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      durationMs: Date.now() - startedAt
    });
    logger.info("sendNotificationBroadcast", result);
    return res.json(result);
  } catch (error) {
    result.error = error.message;
    result.failed = Math.max(result.failed, result.totalDevices - result.ignored - result.sent);
    await db.collection(HISTORY_COLLECTION).add({
      ...result,
      title: payload.title,
      body: payload.body,
      senderDeviceId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      durationMs: Date.now() - startedAt
    }).catch(() => null);
    logger.error("sendNotificationBroadcast failed", error);
    return res.status(500).json(result);
  }
}

exports.sendNotificationBroadcast = onRequest({ ...PUBLIC_HTTP_OPTIONS, timeoutSeconds: 60, memory: "256MiB" }, handleNotificationBroadcast);
exports.sendPushAlert = onRequest({ ...PUBLIC_HTTP_OPTIONS, timeoutSeconds: 60, memory: "256MiB" }, handleNotificationBroadcast);
