const APP_BRAGA_SW = "app-braga-runtime-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./css/autozitania-bragalis.css",
  "./js/app.js",
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
