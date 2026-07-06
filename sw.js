const APP_BRAGA_SW = "appbraga-v1.58.166-github-electron-clean";
const APP_BRAGA_VERSION = "1.58.166";

const LEGACY_ROUTE_MAP = new Map([
  ["/dashboard", "/html/dashboard.html"], ["/dashboard.html", "/html/dashboard.html"],
  ["/impressoras", "/html/impressoras.html"], ["/impressoras.html", "/html/impressoras.html"],
  ["/add-toner", "/html/add-toner.html"], ["/add-toner.html", "/html/add-toner.html"],
  ["/stock", "/html/stock.html"], ["/stock.html", "/html/stock.html"],
  ["/historico", "/html/historico.html"], ["/historico.html", "/html/historico.html"],
  ["/etiquetas", "/html/etiquetas-word.html"], ["/etiquetas.html", "/html/etiquetas-word.html"],
  ["/etiquetas-word", "/html/etiquetas-word.html"], ["/etiquetas-word.html", "/html/etiquetas-word.html"],
  ["/manutencao-impressoras", "/html/manutencao-impressoras.html"], ["/manutencao-impressoras.html", "/html/manutencao-impressoras.html"],
  ["/pistolas", "/html/pistolas.html"], ["/pistolas.html", "/html/pistolas.html"],
  ["/radios", "/html/radios.html"], ["/radios.html", "/html/radios.html"],
  ["/computadores", "/html/computadores.html"], ["/computadores.html", "/html/computadores.html"],
  ["/tarefas", "/html/tarefas.html"], ["/tarefas.html", "/html/tarefas.html"],
  ["/informacoes", "/html/informacoes.html"], ["/informacoes.html", "/html/informacoes.html"],
  ["/portas", "/html/portas.html"], ["/portas.html", "/html/portas.html"],
  ["/users", "/html/users.html"], ["/users.html", "/html/users.html"],
  ["/diretorio", "/html/diretorio.html"], ["/diretorio.html", "/html/diretorio.html"],
  ["/equipas-semanais", "/html/equipas-semanais.html"], ["/equipas-semanais.html", "/html/equipas-semanais.html"],
  ["/scanner-ia", "/html/scanner-ia.html"], ["/scanner-ia.html", "/html/scanner-ia.html"],
  ["/diagnostico", "/html/diagnostico.html"], ["/diagnostico.html", "/html/diagnostico.html"],
  ["/notificacoes", "/html/notificacoes.html"], ["/notificacoes.html", "/html/notificacoes.html"],
  ["/config", "/html/config.html"], ["/config.html", "/html/config.html"]
]);

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

  const mapped = LEGACY_ROUTE_MAP.get(url.pathname);
  if (mapped && !url.pathname.startsWith("/html/")) {
    event.respondWith(Response.redirect(new URL(`${mapped}?v=${APP_BRAGA_VERSION}&legacy=sw-clean`, url.origin).toString(), 302));
    return;
  }

  event.respondWith(fetch(request, { cache: "no-store" }).catch(() => caches.match("/html/index.html")));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_OLD_VISUAL_CACHE") {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))));
  }
});
