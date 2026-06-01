
/* APP BRAGA - THEME FIREBASE SYNC
   Sincroniza cores/zonas/botões entre dispositivos via Firestore v8.
*/
(function () {
  const COLLECTION = "appSettings";
  const THEME_DOC = "themeStudio";
  const ZONE_DOC = "themeZoneEditor";

  const THEME_KEY = "appBragaThemeStudioSimpleV3";
  const ZONE_KEY = "appBragaZoneButtonEditorV1";

  let applyingRemote = false;
  let themeUnsub = null;
  let zoneUnsub = null;
  let lastThemeJson = "";
  let lastZoneJson = "";
  let syncReady = false;

  function safeParse(value, fallback = {}) {
    try {
      const parsed = JSON.parse(value || "{}");
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function getDb() {
    return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null);
  }

  function setSyncStatus(text, state) {
    const el = document.getElementById("themeFirebaseSyncStatus");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("ok", "warn", "bad");
    if (state) el.classList.add(state);
  }

  function currentTheme() {
    return safeParse(localStorage.getItem(THEME_KEY), {});
  }

  function currentZones() {
    return safeParse(localStorage.getItem(ZONE_KEY), {});
  }

  async function uploadDoc(docId, dataKey, data) {
    if (applyingRemote) return;
    const db = getDb();
    if (!db || !db.collection) {
      setSyncStatus("Tema: Firebase indisponível", "bad");
      return;
    }

    try {
      await db.collection(COLLECTION).doc(docId).set({
        data,
        updatedAt: Date.now(),
        updatedBy: (window.currentUserEmail || window.userEmail || localStorage.getItem("userEmail") || "")
      }, { merge: true });

      setSyncStatus("Tema sincronizado na Firebase", "ok");
    } catch (error) {
      console.error("Erro ao sincronizar tema:", error);
      setSyncStatus("Erro ao sincronizar tema", "bad");
    }
  }

  function refreshThemeUI() {
    try {
      if (typeof window.applyThemeGlobalAllPages === "function") window.applyThemeGlobalAllPages();
      if (typeof window.themeZoneApply === "function") window.themeZoneApply();
      if (typeof window.themeZoneRender === "function") window.themeZoneRender();
      if (typeof window.themeStudioRender === "function") window.themeStudioRender();
      if (typeof window.aplicarVisualThemeAppBraga === "function") window.aplicarVisualThemeAppBraga();

      // Forçar render do Theme Simple sem mudar separador.
      const activeBtn = document.querySelector(".theme-mode-tabs button.active");
      if (activeBtn && typeof activeBtn.click === "function") {
        setTimeout(() => activeBtn.click(), 20);
      }
    } catch (error) {
      console.warn("Refresh tema UI falhou:", error);
    }
  }

  function applyRemoteTheme(data) {
    // Se o utilizador acabou de aplicar "O Meu Tema", não deixar snapshot antigo da Firebase voltar atrás.
    try {
      if (localStorage.getItem("appBragaThemeCustomActive") === "1") {
        const local = localStorage.getItem("appBragaThemeStudioSimpleV3") || "";
        if (local && JSON.stringify(data || {}) !== local) {
          setTimeout(pushThemeNow, 250);
          return;
        }
      }
    } catch(e) {}

    const json = JSON.stringify(data || {});
    if (!json || json === "{}") return;
    if (json === lastThemeJson) return;

    applyingRemote = true;
    localStorage.setItem(THEME_KEY, json);
    lastThemeJson = json;
    applyingRemote = false;

    refreshThemeUI();
  }

  function applyRemoteZones(data) {
    const json = JSON.stringify(data || {});
    if (!json || json === "{}") return;
    if (json === lastZoneJson) return;

    applyingRemote = true;
    localStorage.setItem(ZONE_KEY, json);
    lastZoneJson = json;
    applyingRemote = false;

    refreshThemeUI();
  }

  async function pushThemeNow() {
    const data = currentTheme();
    const json = JSON.stringify(data || {});
    if (!json || json === "{}") return;
    lastThemeJson = json;
    await uploadDoc(THEME_DOC, THEME_KEY, data);
  }

  async function pushZonesNow() {
    const data = currentZones();
    const json = JSON.stringify(data || {});
    if (!json || json === "{}") return;
    lastZoneJson = json;
    await uploadDoc(ZONE_DOC, ZONE_KEY, data);
  }

  function setupListeners() {
    const db = getDb();
    if (!db || !db.collection) {
      setSyncStatus("Tema: à espera da Firebase...", "warn");
      setTimeout(setupListeners, 800);
      return;
    }

    if (syncReady) return;
    syncReady = true;

    try {
      themeUnsub = db.collection(COLLECTION).doc(THEME_DOC).onSnapshot((doc) => {
        const payload = doc.exists ? doc.data() : null;
        if (payload && payload.data) {
          applyRemoteTheme(payload.data);
          setSyncStatus("Tema ligado à Firebase", "ok");
        } else {
          // Primeira utilização: sobe o tema local se existir.
          pushThemeNow();
          setSyncStatus("Tema pronto para sincronizar", "ok");
        }
      }, (error) => {
        console.error("Erro listener tema:", error);
        setSyncStatus("Erro no realtime do tema", "bad");
      });

      zoneUnsub = db.collection(COLLECTION).doc(ZONE_DOC).onSnapshot((doc) => {
        const payload = doc.exists ? doc.data() : null;
        if (payload && payload.data) {
          applyRemoteZones(payload.data);
          setSyncStatus("Tema ligado à Firebase", "ok");
        } else {
          pushZonesNow();
        }
      }, (error) => {
        console.error("Erro listener zonas:", error);
        setSyncStatus("Erro no realtime das zonas", "bad");
      });
    } catch (error) {
      console.error("Erro ao iniciar sync tema:", error);
      setSyncStatus("Erro ao iniciar sync tema", "bad");
    }
  }

  function wrapFunction(name, after) {
    const original = window[name];
    if (typeof original !== "function" || original.__themeFirebaseWrapped) return;

    const wrapped = function (...args) {
      const result = original.apply(this, args);
      setTimeout(after, 120);
      setTimeout(after, 650);
      return result;
    };

    wrapped.__themeFirebaseWrapped = true;
    window[name] = wrapped;
  }

  function installWrappers() {
    wrapFunction("themeSimpleUpdate", pushThemeNow);
    wrapFunction("themeSimplePreset", pushThemeNow);
    wrapFunction("themeSimpleReset", pushThemeNow);
    wrapFunction("themeSimpleImport", pushThemeNow);

    wrapFunction("themeStudioApplyPreset", pushThemeNow);
    wrapFunction("themeStudioUpdateColor", pushThemeNow);
    wrapFunction("themeStudioReset", pushThemeNow);
    wrapFunction("themeStudioImport", pushThemeNow);

    wrapFunction("themeZoneUpdateBox", pushZonesNow);
    wrapFunction("themeZoneUpdateButton", pushZonesNow);
    wrapFunction("themeZoneResetCurrent", pushZonesNow);
    wrapFunction("themeZoneImport", pushZonesNow);
  }

  function watchLocalStorageFallback() {
    let lastTheme = localStorage.getItem(THEME_KEY) || "";
    let lastZone = localStorage.getItem(ZONE_KEY) || "";

    setInterval(() => {
      if (applyingRemote) return;

      const theme = localStorage.getItem(THEME_KEY) || "";
      const zone = localStorage.getItem(ZONE_KEY) || "";

      if (theme && theme !== lastTheme) {
        lastTheme = theme;
        pushThemeNow();
      }

      if (zone && zone !== lastZone) {
        lastZone = zone;
        pushZonesNow();
      }
    }, 2000);
  }

  function initThemeFirebaseSync() {
    setSyncStatus("Tema: a ligar Firebase...", "warn");
    setupListeners();
    installWrappers();
    watchLocalStorageFallback();

    setTimeout(installWrappers, 800);
    setTimeout(installWrappers, 2000);
    setTimeout(setupListeners, 1500);
  }

  document.addEventListener("DOMContentLoaded", initThemeFirebaseSync);
  window.addEventListener("pageshow", () => {
    setTimeout(installWrappers, 250);
    setTimeout(setupListeners, 350);
  });

  window.themeFirebasePushNow = async function () {
    await pushThemeNow();
    await pushZonesNow();
  };

  window.themeFirebaseReloadNow = function () {
    if (themeUnsub) themeUnsub();
    if (zoneUnsub) zoneUnsub();
    syncReady = false;
    setupListeners();
  };
})();
