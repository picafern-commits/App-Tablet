const APP_BRAGA_SW = "appbraga-v1.58.163";
const APP_BRAGA_VERSION = "1.58.163";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/";
  if (isHtml) {
    event.respondWith(fetch(request, { cache: "no-store" }).catch(() => caches.match(request).then((cached) => cached || caches.match("./html/index.html"))));
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(APP_BRAGA_SW).then((cache) => cache.put(request, clone)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(request))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "CLEAR_OLD_VISUAL_CACHE") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (error) { payload = { title: "App Braga", body: event.data ? event.data.text() : "Nova notificacao" }; }
  const title = payload.title || payload.notification?.title || "App Braga";
  const body = payload.body || payload.notification?.body || "Nova notificacao App Braga";
  const data = payload.data || payload;
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: payload.tag || data.tag || "app-braga",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: { url: data.url || payload.url || "./html/index.html", requestId: data.requestId || payload.requestId || "" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "./html/index.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) { client.navigate(target).catch(() => null); return client.focus(); }
      }
      return self.clients.openWindow(target);
    })
  );
});

// APP BRAGA V1.58.163 clean-old-visual-final
