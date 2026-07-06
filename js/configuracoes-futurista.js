/* AppBraga v1.58.163 — Configurações futurista funcional */
(() => {
  const VERSION = "v1.58.163";
  const SETTINGS_KEY = "appbraga_configuracoes_futurista";
  const LOGS_KEY = "appbraga_configuracoes_logs";
  const DEFAULT_SETTINGS = {
    empresaNome: "AppBraga",
    empresaEmail: "suporte@appbraga.pt",
    empresaTelefone: "+351 912 345 678",
    empresaMorada: "Braga, Portugal",
    empresaWebsite: "https://appbraga.pt",
    idioma: "pt-PT",
    fuso: "Europe/Lisbon",
    data: "DD/MM/YYYY",
    hora: "24",
    moeda: "EUR",
    notifyWeb: false,
    notifyToner25: true,
    notifyToner0: true,
    notifyTonerReset: true,
    quickLock: false
  };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let settings = { ...DEFAULT_SETTINGS };
  let logs = [];
  let counts = { users: 0, admins: 0, blocked: 0, notifications: 0 };
  let startedAt = Date.now();

  function toast(message, type = "info") {
    if (window.mostrarMensagem) return window.mostrarMensagem(message, type === "error" ? "erro" : type);
    let node = $(".cfg-toast");
    if (!node) {
      node = document.createElement("div");
      node.className = "cfg-toast";
      Object.assign(node.style, { position: "fixed", right: "20px", bottom: "20px", zIndex: 300, background: "rgba(6,20,38,.95)", color: "white", padding: "12px 16px", border: "1px solid rgba(80,150,255,.45)", borderRadius: "12px", fontWeight: 900 });
      document.body.appendChild(node);
    }
    node.textContent = message;
    clearTimeout(node._t);
    node._t = setTimeout(() => { node.remove(); }, 2800);
  }

  function getDb() {
    return window.db || (window.firebase?.firestore ? window.firebase.firestore() : null);
  }

  function safeParse(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function loadLocal() {
    settings = { ...DEFAULT_SETTINGS, ...safeParse(localStorage.getItem(SETTINGS_KEY), {}) };
    logs = safeParse(localStorage.getItem(LOGS_KEY), []);
  }

  function saveLocal() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 80)));
  }

  async function loadRemote() {
    const db = getDb();
    if (!db?.collection) return;
    try {
      const snap = await db.collection("config").doc("appSettings").get();
      if (snap.exists) settings = { ...settings, ...snap.data() };
      const logSnap = await db.collection("configLogs").orderBy("createdAt", "desc").limit(30).get().catch(() => null);
      if (logSnap) logs = logSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).concat(logs).slice(0, 80);
      setText("cfgDbInfo", "Conectada");
      $("#cfgDbInfo")?.classList.add("ok");
      setText("cfgFirebaseState", "Conectada");
    } catch (error) {
      console.warn("Config remote indisponível", error);
      setText("cfgDbInfo", "Fallback local");
      setText("cfgFirebaseState", "Fallback local");
    }
  }

  async function saveRemote() {
    const db = getDb();
    if (!db?.collection) return false;
    try {
      await db.collection("config").doc("appSettings").set({ ...settings, version: VERSION, updatedAt: Date.now() }, { merge: true });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async function addLog(title, description = "Administrador", icon = "⚙") {
    const entry = { title, description, icon, createdAt: Date.now(), version: VERSION };
    logs.unshift(entry);
    logs = logs.slice(0, 80);
    saveLocal();
    const db = getDb();
    if (db?.collection) {
      try { await db.collection("configLogs").add(entry); } catch {}
    }
    renderActivity();
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function readForm() {
    settings.empresaNome = $("#cfgEmpresaNome")?.value.trim() || DEFAULT_SETTINGS.empresaNome;
    settings.empresaEmail = $("#cfgEmpresaEmail")?.value.trim() || "";
    settings.empresaTelefone = $("#cfgEmpresaTelefone")?.value.trim() || "";
    settings.empresaMorada = $("#cfgEmpresaMorada")?.value.trim() || "";
    settings.empresaWebsite = $("#cfgEmpresaWebsite")?.value.trim() || "";
    settings.idioma = $("#cfgIdioma")?.value || DEFAULT_SETTINGS.idioma;
    settings.fuso = $("#cfgFuso")?.value || DEFAULT_SETTINGS.fuso;
    settings.data = $("#cfgData")?.value || DEFAULT_SETTINGS.data;
    settings.hora = $("#cfgHora")?.value || DEFAULT_SETTINGS.hora;
    settings.moeda = $("#cfgMoeda")?.value || DEFAULT_SETTINGS.moeda;
    settings.notifyWeb = Boolean($("#cfgNotifyWeb")?.checked);
    settings.notifyToner25 = Boolean($("#cfgNotifyToner25")?.checked);
    settings.notifyToner0 = Boolean($("#cfgNotifyToner0")?.checked);
    settings.notifyTonerReset = Boolean($("#cfgNotifyTonerReset")?.checked);
    settings.quickLock = Boolean($("#cfgQuickLock")?.checked);
  }

  function applyForm() {
    if ($("#cfgEmpresaNome")) $("#cfgEmpresaNome").value = settings.empresaNome || "";
    if ($("#cfgEmpresaEmail")) $("#cfgEmpresaEmail").value = settings.empresaEmail || "";
    if ($("#cfgEmpresaTelefone")) $("#cfgEmpresaTelefone").value = settings.empresaTelefone || "";
    if ($("#cfgEmpresaMorada")) $("#cfgEmpresaMorada").value = settings.empresaMorada || "";
    if ($("#cfgEmpresaWebsite")) $("#cfgEmpresaWebsite").value = settings.empresaWebsite || "";
    if ($("#cfgIdioma")) $("#cfgIdioma").value = settings.idioma || DEFAULT_SETTINGS.idioma;
    if ($("#cfgFuso")) $("#cfgFuso").value = settings.fuso || DEFAULT_SETTINGS.fuso;
    if ($("#cfgData")) $("#cfgData").value = settings.data || DEFAULT_SETTINGS.data;
    if ($("#cfgHora")) $("#cfgHora").value = settings.hora || DEFAULT_SETTINGS.hora;
    if ($("#cfgMoeda")) $("#cfgMoeda").value = settings.moeda || DEFAULT_SETTINGS.moeda;
    if ($("#cfgNotifyWeb")) $("#cfgNotifyWeb").checked = Boolean(settings.notifyWeb);
    if ($("#cfgNotifyToner25")) $("#cfgNotifyToner25").checked = settings.notifyToner25 !== false;
    if ($("#cfgNotifyToner0")) $("#cfgNotifyToner0").checked = settings.notifyToner0 !== false;
    if ($("#cfgNotifyTonerReset")) $("#cfgNotifyTonerReset").checked = settings.notifyTonerReset !== false;
    if ($("#cfgQuickLock")) $("#cfgQuickLock").checked = Boolean(settings.quickLock);
  }

  async function saveAll() {
    readForm();
    saveLocal();
    const remote = await saveRemote();
    await addLog("Configuração geral atualizada", remote ? "Guardado na Firebase" : "Guardado localmente", "⚙");
    updateKpis();
    toast("Configurações guardadas.", "success");
  }

  function showTab(name) {
    $$(".cfg-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.cfgTab === name));
    $$(".cfg-section").forEach((section) => section.classList.toggle("active", section.dataset.cfgSection === name));
  }

  function bindTabs() {
    $$(".cfg-tab").forEach((btn) => btn.addEventListener("click", () => showTab(btn.dataset.cfgTab)));
    $$('[data-cfg-tab-target]').forEach((btn) => btn.addEventListener("click", () => showTab(btn.dataset.cfgTabTarget)));
  }

  async function loadCounts() {
    const db = getDb();
    if (!db?.collection) return;
    try {
      const usersSnap = await db.collection("users").get().catch(() => null);
      if (usersSnap) {
        const rows = usersSnap.docs.map((d) => d.data());
        counts.users = rows.filter((u) => String(u.estado || u.status || "ativo").toLowerCase() !== "bloqueado").length;
        counts.admins = rows.filter((u) => /admin/i.test(String(u.role || u.papel || u.tipo || ""))).length;
        counts.blocked = rows.filter((u) => /bloque|blocked/i.test(String(u.estado || u.status || ""))).length;
      }
      const notSnap = await db.collection("notificacoes").get().catch(() => null);
      counts.notifications = notSnap ? notSnap.size : counts.notifications;
    } catch {}
  }

  function updateKpis() {
    const activeUsers = counts.users || Number(localStorage.getItem("appbraga_last_users_count") || 0) || 0;
    setText("cfgKpiUsers", activeUsers || "0");
    setText("cfgKpiProfiles", Math.max(1, counts.admins || 0) + 3);
    setText("cfgKpiNotifications", counts.notifications || "0");
    setText("cfgKpiBackup", settings.backupEnabled === false ? "Off" : "Ativo");
    setText("cfgKpiSecurity", (settings.quickLock || document.getElementById("appLockTimeout")?.value !== "0") ? "100%" : "85%");
    const dt = new Date(settings.updatedAt || Date.now());
    setText("cfgKpiUpdated", dt.toLocaleString("pt-PT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }));
    setText("cfgKpiUpdatedSub", "Atualizado");
    setText("cfgAdminCount", `${counts.admins || 0} utilizadores`);
    setText("cfgUserCount", `${Math.max(0, (counts.users || 0) - (counts.admins || 0))} utilizadores`);
    setText("cfgBlockedCount", `${counts.blocked || 0} utilizadores`);
    setText("cfgStorageInfo", estimateStorageText());
    updateUptime();
  }

  function updateUptime() {
    const mins = Math.floor((Date.now() - startedAt) / 60000);
    setText("cfgUptimeInfo", mins < 1 ? "Agora" : `${mins} min`);
  }

  function estimateStorageText() {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        total += key.length + String(localStorage.getItem(key) || "").length;
      }
      const mb = total / 1024 / 1024;
      return `${mb.toFixed(2)} MB local`;
    } catch { return "—"; }
  }

  function renderActivity() {
    const fallback = [
      { title: "Configuração geral carregada", description: "Sistema", icon: "⚙", createdAt: Date.now() },
      { title: "Tema padrão ativo", description: "AppBraga", icon: "🎨", createdAt: Date.now() - 3600000 },
      { title: "Backup disponível", description: "Sistema", icon: "☁", createdAt: Date.now() - 7200000 }
    ];
    const rows = (logs.length ? logs : fallback).slice(0, 30);
    const html = rows.map((row) => {
      const time = row.createdAt ? new Date(row.createdAt).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
      return `<div class="cfg-activity-item"><i>${row.icon || "⚙"}</i><div><strong>${escapeHtml(row.title || "Atividade")}</strong><small>${escapeHtml(row.description || "Sistema")}</small></div><time>${time}</time></div>`;
    }).join("");
    if ($("#cfgActivityRecent")) $("#cfgActivityRecent").innerHTML = rows.slice(0, 3).map((row) => {
      const time = row.createdAt ? new Date(row.createdAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "—";
      return `<div class="cfg-activity-item"><i>${row.icon || "⚙"}</i><div><strong>${escapeHtml(row.title || "Atividade")}</strong><small>${escapeHtml(row.description || "Sistema")}</small></div><time>${time}</time></div>`;
    }).join("");
    if ($("#cfgActivityFull")) $("#cfgActivityFull").innerHTML = html;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function exportSettings() {
    readForm();
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`appbraga_configuracoes_${date}.json`, { app: "AppBraga", version: VERSION, exportedAt: new Date().toISOString(), settings, logs: logs.slice(0, 30) });
    setText("cfgBackupStatus", "Configurações exportadas.");
    addLog("Configurações exportadas", "Ficheiro JSON criado", "☁");
  }

  async function importSettings(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      settings = { ...settings, ...(parsed.settings || parsed) };
      if (Array.isArray(parsed.logs)) logs = parsed.logs.concat(logs).slice(0, 80);
      applyForm();
      saveLocal();
      await saveRemote();
      setText("cfgBackupStatus", "Configurações importadas.");
      await addLog("Configurações importadas", file.name, "☁");
      toast("Configurações importadas.", "success");
    } catch (error) {
      console.error(error);
      toast("Erro ao importar configurações.", "error");
    }
  }

  async function clearCache() {
    try {
      if (window.caches?.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      localStorage.setItem("appbraga_cache_cleared_at", String(Date.now()));
      setText("cfgCacheState", "Limpa");
      await addLog("Cache limpa", "Cache local/service worker limpo", "🗑");
      toast("Cache limpa. Recarrega a página se necessário.", "success");
    } catch (error) {
      console.error(error);
      toast("Erro ao limpar cache.", "error");
    }
  }

  function showModal(title, text, bodyHtml) {
    setText("cfgModalTitle", title);
    setText("cfgModalText", text);
    if ($("#cfgModalBody")) $("#cfgModalBody").innerHTML = bodyHtml;
    const modal = $("#cfgModal");
    if (modal) modal.style.display = "grid";
  }

  function hideModal() {
    const modal = $("#cfgModal");
    if (modal) modal.style.display = "none";
  }

  function bindActions() {
    $$('[data-cfg-save]').forEach((btn) => btn.addEventListener("click", saveAll));
    $$('[data-cfg-export-settings]').forEach((btn) => btn.addEventListener("click", exportSettings));
    $("#cfgImportSettings")?.addEventListener("change", (event) => importSettings(event.target.files?.[0]));
    $$('[data-cfg-clear-cache]').forEach((btn) => btn.addEventListener("click", clearCache));
    $$('[data-cfg-hard-reload]').forEach((btn) => btn.addEventListener("click", () => location.reload(true)));
    $$('[data-cfg-close]').forEach((btn) => btn.addEventListener("click", hideModal));
    $("#cfgModal")?.addEventListener("click", (event) => { if (event.target?.id === "cfgModal") hideModal(); });
    $$('[data-cfg-diagnostic]').forEach((btn) => btn.addEventListener("click", () => showModal("Diagnóstico do Sistema", "Estado técnico atual.", `<div class="cfg-card-grid two"><div class="cfg-mini-card"><strong>Firebase</strong><span>${escapeHtml($("#cfgFirebaseState")?.textContent || "—")}</span></div><div class="cfg-mini-card"><strong>Service Worker</strong><span>${escapeHtml($("#cfgSwState")?.textContent || "—")}</span></div><div class="cfg-mini-card"><strong>Storage</strong><span>${escapeHtml(estimateStorageText())}</span></div><div class="cfg-mini-card"><strong>Versão</strong><span>${VERSION}</span></div></div>`)));
    $$('[data-cfg-permissions]').forEach((btn) => btn.addEventListener("click", () => showTab("utilizadores")));
    $$('[data-cfg-shortcuts]').forEach((btn) => btn.addEventListener("click", () => showModal("Atalhos", "Atalhos úteis da AppBraga.", `<div class="cfg-card-grid two"><div class="cfg-mini-card"><strong>Ctrl + K</strong><span>Pesquisa global</span></div><div class="cfg-mini-card"><strong>Esc</strong><span>Fechar modais</span></div><div class="cfg-mini-card"><strong>Portal</strong><span>Voltar ao menu principal</span></div><div class="cfg-mini-card"><strong>Guardar</strong><span>Botões azuis aplicam alterações</span></div></div>`)));
    $$('[data-cfg-new]').forEach((btn) => btn.addEventListener("click", () => showModal("Nova Configuração", "Criação rápida de chave/valor.", `<div class="cfg-form-grid two"><label><span>Chave</span><input id="cfgNewKey" placeholder="ex.: avisoInterno"></label><label><span>Valor</span><input id="cfgNewValue" placeholder="valor"></label></div><div class="cfg-actions-row" style="margin-top:14px"><button class="ck-btn primary" onclick="window.cfgSaveCustomSetting?.()">Guardar</button></div>`)));
    $$('[data-cfg-theme]').forEach((btn) => btn.addEventListener("click", async () => {
      const presets = { ocean: ["#0ea5e9", "#2563eb"], violet: ["#7c3aed", "#2563eb"], graphite: ["#64748b", "#0f172a"] };
      const p = presets[btn.dataset.cfgTheme] || presets.ocean;
      if ($("#appThemePrimary")) $("#appThemePrimary").value = p[0];
      if ($("#appThemeSecondary")) $("#appThemeSecondary").value = p[1];
      await addLog("Tema alterado", btn.dataset.cfgTheme, "🎨");
    }));
    $("#cfgBtnLogo")?.addEventListener("click", () => toast("A alteração direta do logótipo deve ser feita nos assets do projeto.", "info"));
    $("#cfgBtnRemoveLogo")?.addEventListener("click", () => toast("Logótipo padrão mantido por segurança.", "info"));
    $("#cfgQuickLock")?.addEventListener("change", async () => {
      readForm(); saveLocal(); await saveRemote(); await addLog("Bloqueio rápido atualizado", settings.quickLock ? "Ativo" : "Desativo", "🔒");
    });
    $$('[data-cfg-open-users]').forEach((btn) => btn.addEventListener("click", () => { location.href = "users.html"; }));
    $$('[data-cfg-clear-logs]').forEach((btn) => btn.addEventListener("click", () => { if (confirm("Limpar registos locais de configuração?")) { logs = []; saveLocal(); renderActivity(); } }));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") hideModal(); });
  }

  window.cfgSaveCustomSetting = async function cfgSaveCustomSetting() {
    const key = $("#cfgNewKey")?.value.trim();
    const value = $("#cfgNewValue")?.value.trim();
    if (!key) return toast("Escreve a chave da configuração.", "error");
    settings.custom = { ...(settings.custom || {}), [key]: value };
    saveLocal();
    await saveRemote();
    await addLog("Configuração personalizada criada", key, "⚙");
    hideModal();
    toast("Configuração criada.", "success");
  };

  async function initServiceWorkerInfo() {
    if (!("serviceWorker" in navigator)) return setText("cfgSwState", "Indisponível");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      setText("cfgSwState", reg ? "Ativo" : "Não registado");
    } catch { setText("cfgSwState", "Erro"); }
  }

  async function init() {
    loadLocal();
    bindTabs();
    bindActions();
    await loadRemote();
    await loadCounts();
    applyForm();
    updateKpis();
    renderActivity();
    initServiceWorkerInfo();
    setInterval(updateUptime, 30000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
