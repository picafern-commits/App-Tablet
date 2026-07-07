const APP_BRAGA_SW = "appbraga-v1.58.169-github-electron-etiquetas-word-fix";
const APP_BRAGA_VERSION = "1.58.169";

const ROUTES = new Map([
  ["dashboard", "dashboard.html"],
  ["impressoras", "impressoras.html"],
  ["add-toner", "add-toner.html"],
  ["stock", "stock.html"],
  ["historico", "historico.html"],
  ["etiquetas", "etiquetas-word.html"],
  ["etiquetas-word", "etiquetas-word.html"],
  ["manutencao-impressoras", "manutencao-impressoras.html"],
  ["pistolas", "pistolas.html"],
  ["radios", "radios.html"],
  ["computadores", "computadores.html"],
  ["tarefas", "tarefas.html"],
  ["informacoes", "informacoes.html"],
  ["portas", "portas.html"],
  ["users", "users.html"],
  ["diretorio", "diretorio.html"],
  ["equipas-semanais", "equipas-semanais.html"],
  ["scanner-ia", "scanner-ia.html"],
  ["diagnostico", "diagnostico.html"],
  ["notificacoes", "notificacoes.html"],
  ["config", "config.html"],
  ["configuracoes", "config.html"],
  ["assistente", "index.html"],
  ["equipamento", "portal-equipamentos.html"],
  ["zonas", "index.html"]
]);

function pathParts(url) { return url.pathname.split("/").filter(Boolean); }
function slugFromUrl(url) {
  const parts = pathParts(url);
  const last = parts.length ? parts[parts.length - 1] : "index.html";
  return last.replace(/\.html?$/i, "").toLowerCase();
}
function isInsideHtml(url) { return pathParts(url).includes("html"); }
function projectBase(url) {
  const parts = pathParts(url);
  const htmlIndex = parts.indexOf("html");
  if (htmlIndex >= 0) return "/" + parts.slice(0, htmlIndex).join("/") + (htmlIndex ? "/" : "");
  if (!parts.length) return "/";
  const last = parts[parts.length - 1];
  if (/\.html?$/i.test(last)) return "/" + parts.slice(0, -1).join("/") + (parts.length > 1 ? "/" : "/");
  return "/" + parts.join("/") + "/";
}
function htmlTarget(url, file) {
  const base = projectBase(url).replace(/\/\/+$/g, "/");
  return new URL(base + "html/" + file + "?v=" + APP_BRAGA_VERSION + "&legacy=sw-clean", url.origin).toString();
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigate = request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  if (isNavigate && !isInsideHtml(url)) {
    const slug = slugFromUrl(url);
    const mapped = ROUTES.get(slug) || (slug === "index" ? "index.html" : null);
    if (mapped) {
      event.respondWith(Response.redirect(htmlTarget(url, mapped), 302));
      return;
    }
  }

  event.respondWith(fetch(request, { cache: "no-store" }).catch(() => caches.match("/html/index.html")));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "CLEAR_OLD_VISUAL_CACHE") {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))));
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
    data: { url: data.url || payload.url || "./html/index.html?v=1.58.169", requestId: data.requestId || payload.requestId || "" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "./html/index.html?v=1.58.169";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) { client.navigate(target).catch(() => null); return client.focus(); }
      }
      return self.clients.openWindow(target);
    })
  );
});
