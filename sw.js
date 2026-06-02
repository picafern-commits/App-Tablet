const APP_BRAGA_SW = "app-braga-runtime-v11";
const APP_BRAGA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCSgw4rhBLW5mq4QClulubf6e0hf5lDJbo",
  authDomain: "toner-manager-756c4.firebaseapp.com",
  databaseURL: "https://toner-manager-756c4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "toner-manager-756c4",
  storageBucket: "toner-manager-756c4.firebasestorage.app",
  messagingSenderId: "1004492465437",
  appId: "1:1004492465437:web:6a745933c51fc17b04adf4"
};

try {
  importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
  importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");
  if (self.firebase && !firebase.apps.length) firebase.initializeApp(APP_BRAGA_FIREBASE_CONFIG);
  if (self.firebase && firebase.messaging) {
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const notification = payload.notification || {};
      const data = payload.data || {};
      self.registration.showNotification(notification.title || data.title || "App Braga", {
        body: notification.body || data.body || "",
        icon: data.icon || "./icon-192.png",
        badge: "./icon-192.png",
        tag: data.tag || "app-braga-fcm",
        data: { url: data.url || "./index.html" }
      });
    });
  }
} catch (error) {
  console.log("Firebase Messaging indisponivel no SW", error);
}
const APP_SHELL = [
  "./",
  "./index.html",
  "./html/index.html",
  "./html/computadores.html",
  "./html/impressoras.html",
  "./html/radios.html",
  "./html/stock.html",
  "./manifest.json",
  "./css/style.css",
  "./css/autozitania-bragalis.css",
  "./css/app-theme-pro.css",
  "./css/enterprise/ops.css",
  "./css/iphone-force-final.css",
  "./js/app.js",
  "./js/app-theme-pro.js",
  "./js/enterprise/ops.js",
  "./js/core/helpers.js",
  "./js/iphone-force-final.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_BRAGA_SW)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== APP_BRAGA_SW).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(APP_BRAGA_SW)
          .then((cache) => cache.put(request, clone))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "APP_BRAGA_NOTIFY") {
    const payload = event.data.payload || {};
    event.waitUntil(
      self.registration.showNotification(payload.title || "App Braga", {
        body: payload.body || "",
        icon: "./icon-192.png",
        badge: "./icon-192.png",
        tag: payload.tag || "app-braga",
        data: payload.data || {}
      })
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { title: "App Braga", body: event.data ? event.data.text() : "Nova notificacao" };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "App Braga", {
      body: payload.body || "",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: payload.tag || "app-braga-push",
      data: payload.data || { url: "./index.html" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : "./index.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return null;
    })
  );
});
