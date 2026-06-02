(function () {
  "use strict";

  const COOKIE = "appBragaThemePro";
  const LEGACY_COOKIE = "appAccentColor";
  const ONE_YEAR = 31536000;
  const DEFAULT_THEME = {
    primary: "#ef4444",
    secondary: "#f97316",
    background: "#151515",
    background2: "#101114",
    surface: "#1c1c1e",
    surface2: "#242428",
    text: "#f8fafc",
    muted: "#a8b0bd",
    buttonTextMode: "auto"
  };

  const PRESETS = {
    autozitania: {
      name: "Autozitania",
      primary: "#ef4444",
      secondary: "#f97316",
      background: "#151515",
      background2: "#101114",
      surface: "#1c1c1e",
      surface2: "#242428",
      text: "#f8fafc",
      muted: "#a8b0bd"
    },
    graphite: {
      name: "Grafite",
      primary: "#f59e0b",
      secondary: "#ef4444",
      background: "#151515",
      background2: "#0f0f10",
      surface: "#202124",
      surface2: "#292a2e",
      text: "#fafafa",
      muted: "#b8bec8"
    },
    ocean: {
      name: "Oceano",
      primary: "#06b6d4",
      secondary: "#2563eb",
      background: "#121416",
      background2: "#0e1114",
      surface: "#1b2127",
      surface2: "#222a32",
      text: "#f8fafc",
      muted: "#a7b3c1"
    },
    violet: {
      name: "Violeta",
      primary: "#a855f7",
      secondary: "#ec4899",
      background: "#151515",
      background2: "#111013",
      surface: "#211f25",
      surface2: "#2b2630",
      text: "#fbf7ff",
      muted: "#beb4c8"
    }
  };

  function hex(value, fallback) {
    const clean = String(value || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(clean) ? clean.toLowerCase() : fallback;
  }

  function rgb(hexColor) {
    const clean = hex(hexColor, DEFAULT_THEME.primary).slice(1);
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function brightness(hexColor) {
    const c = rgb(hexColor);
    return ((c.r * 299) + (c.g * 587) + (c.b * 114)) / 1000;
  }

  function cookieGet(name) {
    try {
      const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
      return match ? decodeURIComponent(match[1]) : "";
    } catch (error) {
      return "";
    }
  }

  function cookieSet(name, value, maxAge = ONE_YEAR) {
    try {
      document.cookie = name + "=" + encodeURIComponent(value) + "; Max-Age=" + maxAge + "; Path=/; SameSite=Lax";
    } catch (error) {}
  }

  function normalizeTheme(theme) {
    const legacyAccent = hex(cookieGet(LEGACY_COOKIE), "");
    return {
      primary: hex(theme.primary || theme.accentColor || legacyAccent, DEFAULT_THEME.primary),
      secondary: hex(theme.secondary || theme.accentColor2, DEFAULT_THEME.secondary),
      background: hex(theme.background || theme.bg, DEFAULT_THEME.background),
      background2: hex(theme.background2 || theme.bg2, DEFAULT_THEME.background2),
      surface: hex(theme.surface || theme.panel, DEFAULT_THEME.surface),
      surface2: hex(theme.surface2 || theme.panel2, DEFAULT_THEME.surface2),
      text: hex(theme.text, DEFAULT_THEME.text),
      muted: hex(theme.muted, DEFAULT_THEME.muted),
      buttonTextMode: ["auto", "light", "dark"].includes(theme.buttonTextMode) ? theme.buttonTextMode : DEFAULT_THEME.buttonTextMode
    };
  }

  function parseTheme(value) {
    try {
      const parsed = value ? JSON.parse(value) : {};
      return normalizeTheme(parsed);
    } catch (error) {
      return normalizeTheme({});
    }
  }

  function rgbaString(hexColor, alpha) {
    const c = rgb(hexColor);
    return "rgba(" + c.r + ", " + c.g + ", " + c.b + ", " + alpha + ")";
  }

  function apply(themeInput, options = {}) {
    const theme = normalizeTheme(themeInput || {});
    const root = document.documentElement;
    const primaryRgb = rgb(theme.primary);
    const secondaryRgb = rgb(theme.secondary);
    const buttonText = theme.buttonTextMode === "dark"
      ? "#101114"
      : theme.buttonTextMode === "light"
        ? "#ffffff"
        : brightness(theme.primary) > 168 ? "#101114" : "#ffffff";

    const vars = {
      "--app-primary": theme.primary,
      "--app-secondary": theme.secondary,
      "--app-bg": theme.background,
      "--app-bg-2": theme.background2,
      "--app-surface": rgbaString(theme.surface, .92),
      "--app-surface-2": rgbaString(theme.surface2, .88),
      "--app-text": theme.text,
      "--app-muted": theme.muted,
      "--app-button-text": buttonText,
      "--app-button-icon": buttonText,
      "--app-primary-rgb": primaryRgb.r + " " + primaryRgb.g + " " + primaryRgb.b,
      "--app-secondary-rgb": secondaryRgb.r + " " + secondaryRgb.g + " " + secondaryRgb.b,
      "--app-primary-soft": rgbaString(theme.primary, .16),
      "--app-primary-line": rgbaString(theme.primary, .30),
      "--app-primary-glow": rgbaString(theme.primary, .28),
      "--app-accent": theme.primary,
      "--app-accent-hover": theme.secondary,
      "--app-accent-light": theme.secondary,
      "--app-accent-rgb": primaryRgb.r + " " + primaryRgb.g + " " + primaryRgb.b,
      "--app-accent-soft": rgbaString(theme.primary, .16),
      "--app-accent-softer": rgbaString(theme.primary, .08),
      "--app-accent-line": rgbaString(theme.primary, .30),
      "--app-accent-glow": rgbaString(theme.primary, .28),
      "--az-orange": theme.primary,
      "--az-orange-2": theme.secondary,
      "--az-orange-soft": rgbaString(theme.primary, .16),
      "--az-line": rgbaString(theme.primary, .30),
      "--primary": theme.primary,
      "--primary-hover": theme.secondary,
      "--sidebar-hover": theme.primary,
      "--brinka-pink": theme.primary,
      "--brinka-purple": theme.secondary,
      "--brinka-orange": theme.primary,
      "--brinka-orange2": theme.secondary,
      "--ent-blue": theme.primary,
      "--ent-purple": theme.secondary,
      "--ent-orange": theme.primary,
      "--app-blue": theme.primary,
      "--app-blue-soft": rgbaString(theme.primary, .16)
    };

    Object.keys(vars).forEach((key) => root.style.setProperty(key, vars[key]));
    root.classList.add("dark", "app-dark");
    document.body?.classList.add("dark", "app-dark");
    root.setAttribute("data-button-text-mode", theme.buttonTextMode);

    if (options.persist !== false) {
      cookieSet(COOKIE, JSON.stringify(theme));
      cookieSet(LEGACY_COOKIE, theme.primary);
      cookieSet("appButtonTextMode", theme.buttonTextMode);
    }

    syncControls(theme);
    return theme;
  }

  function getCachedTheme() {
    return parseTheme(cookieGet(COOKIE));
  }

  function syncControls(themeInput) {
    const theme = normalizeTheme(themeInput || getCachedTheme());
    const map = {
      appThemePrimary: theme.primary,
      appThemeSecondary: theme.secondary,
      appThemeBackground: theme.background,
      appThemeBackground2: theme.background2,
      appThemeSurface: theme.surface,
      appThemeSurface2: theme.surface2,
      appThemeText: theme.text,
      appThemeMuted: theme.muted,
      appButtonTextMode: theme.buttonTextMode
    };
    Object.keys(map).forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.value = map[id];
    });
  }

  async function save(themeInput) {
    const theme = apply(themeInput);
    if (window.db?.collection) {
      await window.db.collection("config").doc("layout").set({
        themePro: theme,
        accentColor: theme.primary,
        accentColor2: theme.secondary,
        buttonTextMode: theme.buttonTextMode,
        updatedAt: Date.now()
      }, { merge: true });
    }
    if (typeof window.mostrarMensagem === "function") window.mostrarMensagem("Tema da APP atualizado.");
    return theme;
  }

  function readControls() {
    return normalizeTheme({
      primary: document.getElementById("appThemePrimary")?.value,
      secondary: document.getElementById("appThemeSecondary")?.value,
      background: document.getElementById("appThemeBackground")?.value,
      background2: document.getElementById("appThemeBackground2")?.value,
      surface: document.getElementById("appThemeSurface")?.value,
      surface2: document.getElementById("appThemeSurface2")?.value,
      text: document.getElementById("appThemeText")?.value,
      muted: document.getElementById("appThemeMuted")?.value,
      buttonTextMode: document.getElementById("appButtonTextMode")?.value
    });
  }

  function bindControls() {
    syncControls(getCachedTheme());
    document.querySelectorAll("[data-theme-preset]").forEach((button) => {
      const key = button.getAttribute("data-theme-preset");
      const preset = PRESETS[key];
      if (!preset || button.dataset.boundThemePreset) return;
      button.dataset.boundThemePreset = "1";
      button.style.background = "linear-gradient(135deg, " + preset.primary + ", " + preset.secondary + ")";
      button.addEventListener("click", () => save({ ...getCachedTheme(), ...preset }));
    });
    document.querySelectorAll("[data-theme-live]").forEach((node) => {
      if (node.dataset.boundThemeLive) return;
      node.dataset.boundThemeLive = "1";
      node.addEventListener("input", () => apply(readControls()));
      node.addEventListener("change", () => save(readControls()).catch(console.error));
    });
  }

  function connectFirestore() {
    if (!window.db?.collection || window.__appThemeProFirestoreBound) return;
    window.__appThemeProFirestoreBound = true;
    window.db.collection("config").doc("layout").onSnapshot((doc) => {
      const data = doc.exists ? doc.data() : {};
      const nextTheme = data.themePro || {
        primary: data.accentColor,
        secondary: data.accentColor2,
        buttonTextMode: data.buttonTextMode
      };
      apply({ ...getCachedTheme(), ...nextTheme });
    }, (error) => console.error("Erro ao carregar tema:", error));
  }

  window.AppThemePro = {
    DEFAULT_THEME,
    PRESETS,
    apply,
    save,
    readControls,
    bindControls,
    connectFirestore,
    getCachedTheme,
    normalizeTheme
  };

  apply(getCachedTheme(), { persist: false });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      apply(getCachedTheme(), { persist: false });
      bindControls();
      setTimeout(connectFirestore, 300);
    });
  } else {
    apply(getCachedTheme(), { persist: false });
    bindControls();
    setTimeout(connectFirestore, 300);
  }
})();
