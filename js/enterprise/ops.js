(function () {
  "use strict";

  const COLLECTIONS = [
    { name: "impressoras", label: "Impressora", page: "impressoras.html", fields: ["modelo", "serie", "serial", "ip", "armazem", "localizacao"] },
    { name: "printers", label: "Impressora", page: "impressoras.html", fields: ["modelo", "model", "serie", "serial", "ip", "location", "localizacao"] },
    { name: "stock", label: "Stock", page: "stock.html", fields: ["equipamento", "cor", "lote", "localizacao", "armazem"] },
    { name: "computadores", label: "Computador", page: "computadores.html", fields: ["nome", "hostname", "serie", "ip", "user", "localizacao"] },
    { name: "pcs", label: "Computador", page: "computadores.html", fields: ["nome", "hostname", "serie", "ip", "user", "localizacao"] },
    { name: "users", label: "User", page: "users.html", fields: ["nome", "name", "email", "numero", "departamento", "funcao"] },
    { name: "pistolas", label: "Pistola CK65", page: "pistolas.html", fields: ["nome", "num", "serial", "sn", "mac", "operador", "armazem"] },
    { name: "portas", label: "Porta Rede", page: "portas.html", fields: ["nome", "porta", "ip", "switch", "localizacao", "armazem"] },
    { name: "radios", label: "Radio", page: "radios.html", fields: ["nome", "mac", "serial", "rf", "user", "estado"] },
    { name: "radioWeeklyRecords", label: "Registo semanal", page: "radios.html", fields: ["weekLabel", "weekStart", "weekEnd", "createdBy"] },
    { name: "manutencoes", label: "Manutencao", page: "manutencao-impressoras.html", fields: ["modelo", "serie", "ip", "estado", "motivo", "user"] },
    { name: "informacoes", label: "Informacao", page: "informacoes.html", fields: ["titulo", "obs", "texto"] },
    { name: "etiquetasWord", label: "Etiqueta Word", page: "etiquetas-word.html", fields: ["titulo", "data", "user", "descricao"] },
    { name: "notificationTokens", label: "Dispositivo push", page: "config.html", fields: ["deviceName", "deviceType", "source", "permission", "token"] },
    { name: "notificationDevices", label: "Dispositivo push", page: "config.html", fields: ["name", "deviceName", "platform", "token", "lastSeenAt"] },
    { name: "pushDevices", label: "Dispositivo push", page: "config.html", fields: ["name", "deviceName", "platform", "token", "lastSeenAt"] }
  ];

  const ICONS = {
    "index.html": "\u2302",
    "add-toner.html": "+",
    "stock.html": "\u25A3",
    "historico.html": "\u2197",
    "etiquetas-word.html": "\u25A4",
    "impressoras.html": "\u25A6",
    "manutencao-impressoras.html": "\u25C7",
    "computadores.html": "\u25AD",
    "users.html": "\u25CE",
    "pistolas.html": "\u2301",
    "portas.html": "\u25A7",
    "radios.html": "\u25CC",
    "informacoes.html": "\u24D8",
    "config.html": "\u2699"
  };

  const state = {
    searchIndex: [],
    collectionCache: {},
    lowToner: [],
    firstSnapshot: {},
    auditReady: false
  };

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function isHtmlPage() {
    return /\/html\//i.test(location.pathname) || location.pathname.endsWith(".html");
  }

  function pagePrefix() {
    return /\/html\//i.test(location.pathname) ? "" : "html/";
  }

  function cleanText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function asPercent(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
  }

  function getTonerPercent(data) {
    if (!data || typeof data !== "object") return null;
    const direct = [
      data.percent,
      data.tonerPercent,
      data.toner_percent,
      data.black,
      data.preto,
      data.k,
      data.K
    ];
    for (const value of direct) {
      const percent = asPercent(value);
      if (percent !== null) return percent;
    }
    if (data.toner && typeof data.toner === "object") {
      const candidates = [data.toner.black, data.toner.preto, data.toner.k, data.toner.K, data.toner.percent];
      for (const value of candidates) {
        const percent = asPercent(value);
        if (percent !== null) return percent;
      }
    }
    if (Array.isArray(data.supplies)) {
      const black = data.supplies.find((item) => cleanText(item.color || item.name).includes("preto") || cleanText(item.color || item.name).includes("black"));
      const percent = asPercent(black?.percent ?? black?.level);
      if (percent !== null) return percent;
    }
    return null;
  }

  function tonerColor(percent) {
    if (percent <= 0) return "#dc2626";
    if (percent < 10) return "#ef4444";
    if (percent < 25) return "#f59e0b";
    if (percent < 55) return "#eab308";
    return "#22c55e";
  }

  function toast(title, body) {
    let stack = document.querySelector(".app-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "app-toast-stack";
      document.body.appendChild(stack);
    }
    const node = document.createElement("div");
    node.className = "app-toast";
    node.innerHTML = `<strong>${escapeHtml(title)}</strong><div>${escapeHtml(body || "")}</div>`;
    stack.appendChild(node);
    setTimeout(() => node.remove(), 5200);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function setupDeviceClasses() {
    const width = Math.min(window.innerWidth || 0, screen.width || window.innerWidth || 0);
    const ua = navigator.userAgent || "";
    const isPhone = width <= 768;
    const isTablet = !isPhone && width <= 1180;
    document.body.classList.toggle("enterprise-device-phone", isPhone);
    document.body.classList.toggle("enterprise-device-tablet", isTablet);
    document.body.classList.toggle("enterprise-device-desktop", !isPhone && !isTablet);
    document.body.classList.toggle("enterprise-ios", /iPhone|iPad|iPod/i.test(ua));
    document.body.classList.toggle("enterprise-android", /Android/i.test(ua));
  }

  function setupSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    sidebar.querySelectorAll("a").forEach((link) => {
      const href = (link.getAttribute("href") || "").split("/").pop();
      link.dataset.icon = ICONS[href] || "\u2022";
      const text = (link.textContent || "").trim();
      if (!link.querySelector(".sidebar-link-text")) {
        link.innerHTML = `<span class="sidebar-link-text">${escapeHtml(text)}</span>`;
      }
    });

    if (!document.querySelector(".app-menu-toggle")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "app-menu-toggle";
      button.setAttribute("aria-label", "Abrir menu");
      button.textContent = "\u2630";
      document.body.appendChild(button);
    }
    if (!document.querySelector(".app-sidebar-overlay")) {
      const overlay = document.createElement("div");
      overlay.className = "app-sidebar-overlay";
      document.body.appendChild(overlay);
    }

    const button = document.querySelector(".app-menu-toggle");
    const overlay = document.querySelector(".app-sidebar-overlay");
    const close = () => {
      sidebar.classList.remove("app-open", "open", "active");
      document.body.classList.remove("sidebar-open");
      overlay?.classList.remove("show");
      if (button) button.textContent = "\u2630";
    };
    const open = () => {
      sidebar.classList.add("app-open", "open", "active");
      document.body.classList.add("sidebar-open");
      overlay?.classList.add("show");
      if (button) button.textContent = "\u00d7";
    };

    if (button && !button.dataset.enterpriseBound) {
      button.dataset.enterpriseBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        sidebar.classList.contains("app-open") ? close() : open();
      });
    }
    if (overlay && !overlay.dataset.enterpriseBound) {
      overlay.dataset.enterpriseBound = "1";
      overlay.addEventListener("click", close);
    }
    sidebar.querySelectorAll("a").forEach((link) => {
      if (link.dataset.enterpriseCloseBound) return;
      link.dataset.enterpriseCloseBound = "1";
      link.addEventListener("click", close);
    });
  }

  function setupSearchShell() {
    if (!isHtmlPage()) return;
    const main = document.querySelector(".main, main");
    if (!main || document.querySelector(".enterprise-search-shell")) return;
    const shell = document.createElement("div");
    shell.className = "enterprise-search-shell";
    shell.innerHTML = `
      <div class="enterprise-search-box">
        <input id="enterpriseGlobalSearch" type="search" placeholder="Pesquisar na APP..." autocomplete="off">
        <button class="secondary-btn" type="button" id="enterpriseSearchClose">Limpar</button>
      </div>
      <div id="enterpriseSearchResults" class="enterprise-search-results"></div>
    `;
    main.insertBefore(shell, main.firstElementChild);
    document.body.classList.add("enterprise-search-ready");

    const input = shell.querySelector("#enterpriseGlobalSearch");
    const results = shell.querySelector("#enterpriseSearchResults");
    shell.querySelector("#enterpriseSearchClose")?.addEventListener("click", () => {
      input.value = "";
      results.classList.remove("is-open");
      results.innerHTML = "";
    });
    input.addEventListener("input", () => renderSearchResults(input.value, results));
  }

  function pageInfo() {
    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const map = {
      "index.html": ["Dashboard", "Resumo operacional da App Braga."],
      "add-toner.html": ["Adicionar Toner", "Registo rapido de entradas e movimentos de toner."],
      "stock.html": ["Stock", "Consulta e controlo de toners disponiveis."],
      "historico.html": ["Historico", "Movimentos e utilizacao ao longo do tempo."],
      "etiquetas-word.html": ["Etiquetas Word", "Etiquetas ordenadas e prontas para impressao."],
      "impressoras.html": ["Impressoras", "Estado, toner e manutencao das impressoras."],
      "manutencao-impressoras.html": ["Manutencao Impressoras", "Pedidos, resolucoes e acompanhamento tecnico."],
      "computadores.html": ["Computadores", "Inventario de computadores e atribuicoes."],
      "users.html": ["Users", "Utilizadores e dados operacionais."],
      "pistolas.html": ["Pistolas CK65", "Equipamentos moveis, operadores e estado."],
      "portas.html": ["Portas Rede", "Portas, IPs e localizacoes de rede."],
      "radios.html": ["Radios", "Radios, users e registos semanais."],
      "informacoes.html": ["Informacoes", "Informacoes gerais sincronizadas na Firebase."],
      "config.html": ["Configuracoes", "Tema, seguranca, notificacoes e saude da app."]
    };
    return map[path] || [document.title || "App Braga", "Area operacional da App Braga."];
  }

  function setupTopbar() {
    if (!isHtmlPage()) return;
    const main = document.querySelector(".main, main");
    if (!main || main.querySelector(".enterprise-page-topbar")) return;
    const [title, subtitle] = pageInfo();
    const existingHero = main.querySelector(".page-hero, .dashboard-header");
    if (existingHero) existingHero.style.display = "none";
    const topbar = document.createElement("div");
    topbar.className = "enterprise-page-topbar";
    topbar.innerHTML = `
      <div>
        <div class="enterprise-breadcrumb"><span>Home</span><span>/</span><span>${escapeHtml(title)}</span></div>
        <div class="enterprise-page-title">${escapeHtml(title)}</div>
        <div class="enterprise-page-subtitle">${escapeHtml(subtitle)}</div>
      </div>
    `;
    main.insertBefore(topbar, main.firstElementChild);
    setupElectronWindowActions(topbar, null);
  }

  function setupElectronWindowActions(topbar, beforeNode) {
    if (!window.electronAPI?.closeApp || topbar.querySelector(".enterprise-window-actions")) return;
    const actions = document.createElement("div");
    actions.className = "enterprise-window-actions";
    actions.innerHTML = `
      <button class="secondary-btn enterprise-window-btn" type="button" data-enterprise-hide>Segundo plano</button>
      <button class="secondary-btn enterprise-window-btn enterprise-window-close" type="button" data-enterprise-close>Fechar App</button>
    `;
    topbar.insertBefore(actions, beforeNode);
    actions.querySelector("[data-enterprise-hide]")?.addEventListener("click", async () => {
      await window.electronAPI.hideApp();
    });
    actions.querySelector("[data-enterprise-close]")?.addEventListener("click", async () => {
      const ok = window.confirm("Queres fechar completamente a App Braga?");
      if (!ok) return;
      await window.electronAPI.closeApp();
    });
  }

  function triggerPrimaryAction() {
    const path = (location.pathname.split("/").pop() || "").toLowerCase();
    const actions = {
      "radios.html": ["adicionarRadio", "abrirModalRadio"],
      "pistolas.html": ["abrirAdicionarPistola", "novaPistola"],
      "portas.html": ["abrirAdicionarPorta", "novaPorta"],
      "users.html": ["abrirAdicionarUser", "novoUser"],
      "impressoras.html": ["abrirAdicionarImpressora", "novaImpressora"],
      "computadores.html": ["abrirAdicionarPC", "novoComputador"],
      "stock.html": ["abrirAdicionarStock", "novoStock"],
      "informacoes.html": ["adicionarInformacao"]
    };
    const candidates = actions[path] || [];
    for (const name of candidates) {
      if (typeof window[name] === "function") {
        window[name]();
        return;
      }
    }
    const button = document.querySelector(".add-btn, .primary-btn[onclick], button[onclick*='adicionar'], button[onclick*='Adicionar'], button[onclick*='novo'], button[onclick*='Novo']");
    if (button && !button.matches("[data-enterprise-main-action]")) button.click();
    else toast("App Braga", "Nao encontrei uma acao principal nesta pagina.");
  }

  function setupDensityControls() {
    const themeCard = document.querySelector(".theme-pro-card");
    if (!themeCard || document.getElementById("appResolution")) return;
    const row = document.createElement("div");
    row.className = "theme-pro-grid";
    row.innerHTML = `
      <label class="theme-pro-field">
        <span>Densidade visual</span>
        <select id="appResolution" onchange="guardarResolucaoApp(this.value)">
          <option value="compact">Compacto PC</option>
          <option value="comfortable">Confortavel</option>
          <option value="wide">Grande Tablet/iPhone</option>
        </select>
      </label>
    `;
    const actions = themeCard.querySelector(".theme-pro-actions");
    themeCard.insertBefore(row, actions || null);
  }

  function polishModalsAndEmptyStates() {
    document.querySelectorAll(".modal-content, .app-modal-content").forEach((modal) => {
      if (modal.dataset.enterprisePolished) return;
      modal.dataset.enterprisePolished = "1";
      const buttons = modal.querySelectorAll("button");
      if (buttons.length && !modal.querySelector(".enterprise-modal-actions")) {
        const actions = document.createElement("div");
        actions.className = "enterprise-modal-actions";
        buttons.forEach((button) => actions.appendChild(button));
        modal.appendChild(actions);
      }
    });
    document.querySelectorAll(".reference-empty, .empty-state").forEach((node) => {
      node.setAttribute("role", "status");
    });
  }

  function itemTitle(collection, data) {
    const fields = collection.fields || [];
    for (const field of fields) {
      if (data[field]) return String(data[field]);
    }
    return data.nome || data.name || data.titulo || data.ip || data.serial || "Registo";
  }

  function itemSubtitle(data) {
    return [data.ip, data.serie || data.serial || data.sn, data.localizacao || data.location, data.armazem, data.estado]
      .filter(Boolean)
      .join(" Â· ");
  }

  function setupRealtimeSearchAndNotifications() {
    if (!window.db?.collection || window.__enterpriseSearchBound) return;
    window.__enterpriseSearchBound = true;

    COLLECTIONS.forEach((collection) => {
      try {
        window.db.collection(collection.name).onSnapshot((snapshot) => {
          const previous = state.collectionCache[collection.name] || {};
          const next = {};
          snapshot.docs.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() };
            next[doc.id] = data;
          });
          state.collectionCache[collection.name] = next;
          rebuildSearchIndex();
          handleCollectionNotifications(collection, previous, next);
          if (collection.name === "printers" || collection.name === "impressoras") {
            updateLowTonerFromPrinters();
          }
          updateDashboardOps();
          updateSystemHealthExtra();
        }, () => {});
      } catch (error) {}
    });
  }

  function rebuildSearchIndex() {
    state.searchIndex = [];
    COLLECTIONS.forEach((collection) => {
      const items = Object.values(state.collectionCache[collection.name] || {});
      items.forEach((data) => {
        const title = itemTitle(collection, data);
        const subtitle = itemSubtitle(data);
        state.searchIndex.push({
          title,
          subtitle,
          label: collection.label,
          page: collection.page,
          haystack: cleanText([collection.label, title, subtitle, ...collection.fields.map((field) => data[field])].join(" \u00b7 "))
        });
      });
    });
  }

  function renderSearchResults(query, target) {
    const q = cleanText(query);
    if (!q) {
      target.classList.remove("is-open");
      target.innerHTML = "";
      return;
    }
    const prefix = pagePrefix();
    const hits = state.searchIndex.filter((item) => item.haystack.includes(q)).slice(0, 12);
    target.classList.add("is-open");
    target.innerHTML = hits.length ? hits.map((item) => `
      <div class="enterprise-search-result" data-page="${escapeHtml(prefix + item.page)}">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.label)}${item.subtitle ? " Â· " + escapeHtml(item.subtitle) : ""}</span>
      </div>
    `).join("") : `<div class="enterprise-search-result"><strong>Sem resultados</strong><span>Tenta outro termo.</span></div>`;
    target.querySelectorAll("[data-page]").forEach((node) => {
      node.addEventListener("click", () => { location.href = node.dataset.page; });
    });
  }

  async function sendAppNotification(title, body, tag) {
    try {
      if (window.appNotificationState && window.appNotificationState.enabled === false) return;
      if ("Notification" in window && Notification.permission === "granted") {
        const reg = await navigator.serviceWorker?.getRegistration?.();
        if (reg?.active) {
          reg.active.postMessage({ type: "APP_BRAGA_NOTIFY", payload: { title, body, tag, data: { url: location.href } } });
          return;
        }
        new Notification(title, { body, tag, icon: "../icon-192.png" });
      }
      toast(title, body);
    } catch (error) {
      toast(title, body);
    }
  }

  function handleCollectionNotifications(collection, previous, next) {
    if (!state.firstSnapshot[collection.name]) {
      state.firstSnapshot[collection.name] = true;
      return;
    }
    const added = Object.keys(next).filter((id) => !previous[id]);
    const changed = Object.keys(next).filter((id) => previous[id] && JSON.stringify(previous[id]) !== JSON.stringify(next[id]));
    if (!added.length && !changed.length) return;

    const label = collection.label;
    const count = added.length + changed.length;
    sendAppNotification("App Braga", `${label}: ${count} alteracao${count === 1 ? "" : "es"}.`, `app-braga-${collection.name}`);
  }

  function updateLowTonerFromPrinters() {
    const byIp = new Map();
    ["printers", "impressoras"].forEach((name) => {
      Object.values(state.collectionCache[name] || {}).forEach((item) => {
        const percent = getTonerPercent(item);
        if (percent === null || percent >= 25) return;
        const key = item.ip || item.id || item.serie || item.serial;
        if (!key) return;
        byIp.set(String(key), {
          id: item.id,
          ip: item.ip || item.id || "-",
          title: item.modelo || item.model || item.nome || item.name || "Impressora",
          subtitle: item.localizacao || item.location || item.serie || item.serial || "",
          percent
        });
      });
    });
    state.lowToner = Array.from(byIp.values()).sort((a, b) => a.percent - b.percent);
    renderLowTonerDashboard();
  }

  function ensureDashboardOps() {
    document.querySelector("#dashboardOpsPanel")?.remove();
  }

  function renderLowTonerDashboard() {
    ensureDashboardOps();
  }

  function updateDashboardOps() {
    ensureDashboardOps();
  }
  function updateSystemHealthExtra() {
    const grid = document.getElementById("systemHealthGrid");
    if (!grid || grid.dataset.enterpriseExpanded) return;
    grid.dataset.enterpriseExpanded = "1";
    const cards = [
      ["Service Worker", "healthServiceWorker"],
      ["Tema", "healthTheme"],
      ["Pesquisa global", "healthSearch"],
      ["Ultima sync", "healthLastSync"]
    ];
    cards.forEach(([label, id]) => {
      const card = document.createElement("div");
      card.className = "health-card";
      card.innerHTML = `<span>${label}</span><strong id="${id}">A verificar</strong>`;
      grid.appendChild(card);
    });
    refreshSystemHealthExtra();
  }

  async function refreshSystemHealthExtra() {
    const set = (id, text, cls) => {
      const node = document.getElementById(id);
      if (!node) return;
      node.textContent = text;
      node.className = cls || "";
    };
    const sw = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
    set("healthServiceWorker", sw ? "Ativo" : "Sem registo", sw ? "ok" : "warn");
    set("healthTheme", window.AppThemePro ? "Ativo" : "Indisponivel", window.AppThemePro ? "ok" : "warn");
    set("healthSearch", state.searchIndex.length ? `${state.searchIndex.length} registos` : "A carregar", state.searchIndex.length ? "ok" : "warn");
    set("healthLastSync", new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }), "ok");
  }

  function setupAuditPatch() {
    if (!window.db || state.auditReady) return;
    const probeCollection = window.db.collection("_appBragaAuditProbe");
    const probeDocument = probeCollection.doc("_probe");
    const docProto = Object.getPrototypeOf(probeDocument);
    const colProto = Object.getPrototypeOf(probeCollection);
    if (!docProto || !colProto || docProto.__appBragaAuditPatched) return;
    state.auditReady = true;
    docProto.__appBragaAuditPatched = true;

    const originalSet = docProto.set;
    const originalUpdate = docProto.update;
    const originalDelete = docProto.delete;
    const originalAdd = colProto.add;

    function shouldAudit(ref) {
      const path = ref?.path || "";
      return path && !path.startsWith("auditLogs");
    }

    function log(action, ref, payload) {
      try {
        if (!shouldAudit(ref) || !window.db?.collection) return;
        window.db.collection("auditLogs").add({
          action,
          path: ref.path,
          payload: payload ? JSON.parse(JSON.stringify(payload).slice(0, 2000)) : null,
          page: location.pathname,
          userAgent: navigator.userAgent,
          createdAt: Date.now()
        }).catch(() => {});
      } catch (error) {}
    }

    docProto.set = function patchedSet(data, options) {
      return originalSet.apply(this, arguments).then((result) => {
        log("set", this, data);
        return result;
      });
    };
    docProto.update = function patchedUpdate(data) {
      return originalUpdate.apply(this, arguments).then((result) => {
        log("update", this, data);
        return result;
      });
    };
    docProto.delete = function patchedDelete() {
      return originalDelete.apply(this, arguments).then((result) => {
        log("delete", this, null);
        return result;
      });
    };
    colProto.add = function patchedAdd(data) {
      return originalAdd.apply(this, arguments).then((result) => {
        log("add", result, data);
        return result;
      });
    };
  }

  function init() {
    setupDeviceClasses();
    setupSidebar();
    setupTopbar();
    setupSearchShell();
    setupDensityControls();
    polishModalsAndEmptyStates();
    ensureDashboardOps();
    updateSystemHealthExtra();
    setTimeout(() => {
      setupAuditPatch();
      setupRealtimeSearchAndNotifications();
      refreshSystemHealthExtra();
    }, 900);
  }

  ready(init);
  window.addEventListener("resize", () => {
    setupDeviceClasses();
    setupSidebar();
  }, { passive: true });
  window.AppBragaEnterpriseOps = {
    refresh: init,
    updateLowTonerFromPrinters,
    sendAppNotification
  };
})();
