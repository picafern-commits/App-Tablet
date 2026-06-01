
/* APP BRAGA - THEME BUILDER FINAL */
(function(){
  const defaults = {
    uiPrimaryBg:"#2563eb", uiPrimaryText:"#ffffff", uiPrimaryBorder:"#2563eb",
    uiSecondaryBg:"#1f2937", uiSecondaryText:"#f8fafc", uiSecondaryBorder:"#475569",
    uiDangerBg:"#7f1d1d", uiDangerText:"#fecaca", uiDangerBorder:"#ef4444",
    uiEditBg:"#1e3a8a", uiEditText:"#dbeafe", uiEditBorder:"#3b82f6",
    uiSuccessBg:"#14532d", uiSuccessText:"#bbf7d0", uiSuccessBorder:"#22c55e",
    uiCardBg:"#111827", uiCardBorder:"#334155", uiTitleColor:"#ffffff", uiTextColor:"#cbd5e1",
    uiSidebarBg:"#0f172a", uiSidebarText:"#f8fafc", uiSidebarActiveBg:"#2563eb", uiSidebarActiveText:"#ffffff"
  };

  const map = {
    uiPrimaryBg:"--ui-primary-bg", uiPrimaryText:"--ui-primary-text", uiPrimaryBorder:"--ui-primary-border",
    uiSecondaryBg:"--ui-secondary-bg", uiSecondaryText:"--ui-secondary-text", uiSecondaryBorder:"--ui-secondary-border",
    uiDangerBg:"--ui-danger-bg", uiDangerText:"--ui-danger-text", uiDangerBorder:"--ui-danger-border",
    uiEditBg:"--ui-edit-bg", uiEditText:"--ui-edit-text", uiEditBorder:"--ui-edit-border",
    uiSuccessBg:"--ui-success-bg", uiSuccessText:"--ui-success-text", uiSuccessBorder:"--ui-success-border",
    uiCardBg:"--ui-card-bg", uiCardBorder:"--ui-card-border", uiTitleColor:"--ui-title-color", uiTextColor:"--ui-text-color",
    uiSidebarBg:"--ui-sidebar-bg", uiSidebarText:"--ui-sidebar-text", uiSidebarActiveBg:"--ui-sidebar-active-bg", uiSidebarActiveText:"--ui-sidebar-active-text"
  };

  function valid(v,fallback){
    v = String(v || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
  }

  function getTheme(){
    try{
      return {...defaults, ...(JSON.parse(localStorage.getItem("appBragaVisualTheme") || "{}"))};
    }catch(e){
      return {...defaults};
    }
  }

  function applyInlineFallback(theme){
    // Aplica diretamente aos elementos também, para vencer CSS antigo com !important
    const set = (selector, bg, text, border) => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.setProperty("background", bg, "important");
        el.style.setProperty("color", text, "important");
        el.style.setProperty("border-color", border, "important");
      });
    };

    set(".primary-btn,.reference-primary,.btn-primary,.add-btn,.save-btn,button[type='submit'],button.primary,.radio-action-main", theme.uiPrimaryBg, theme.uiPrimaryText, theme.uiPrimaryBorder);
    set(".secondary-btn,.reference-outline,.btn,.enterprise-btn", theme.uiSecondaryBg, theme.uiSecondaryText, theme.uiSecondaryBorder);
    set(".btn-edit,button[onclick*='editar'],button[title*='Editar']", theme.uiEditBg, theme.uiEditText, theme.uiEditBorder);
    set(".btn-delete,.danger,button.danger,.reference-icon.danger,button[onclick*='apagar'],button[title*='Apagar']", theme.uiDangerBg, theme.uiDangerText, theme.uiDangerBorder);
    set(".btn-use,button[onclick*='usar'],button[onclick*='resolver'],button[onclick*='confirmar']", theme.uiSuccessBg, theme.uiSuccessText, theme.uiSuccessBorder);

    document.querySelectorAll(".card,.panel,.stat-card,.metric-card,.dashboard-card,.pc-card,.radio-card,.info-card,.config-card,.modal-card,.enterprise-card,.reference-card").forEach(el=>{
      el.style.setProperty("background", theme.uiCardBg, "important");
      el.style.setProperty("border-color", theme.uiCardBorder, "important");
    });

    document.querySelectorAll("h1,h2,h3,.page-hero-title,.section-header h3,.card-title,.pc-name,.radio-card-main strong").forEach(el=>{
      el.style.setProperty("color", theme.uiTitleColor, "important");
    });
  }

  function aplicarVisualThemeAppBraga(){
    const theme = getTheme();

    Object.entries(map).forEach(([key, cssVar])=>{
      document.documentElement.style.setProperty(cssVar, valid(theme[key], defaults[key]), "important");
    });

    Object.entries(theme).forEach(([key,value])=>{
      const input = document.querySelector(`[data-theme-key="${key}"]`);
      if(input) input.value = valid(value, defaults[key]);
    });

    applyInlineFallback(theme);
  }

  function guardarVisualThemeCampoAppBraga(key,value){
    const theme = getTheme();
    theme[key] = valid(value, defaults[key]);
    localStorage.setItem("appBragaVisualTheme", JSON.stringify(theme));
    aplicarVisualThemeAppBraga();
    setTimeout(aplicarVisualThemeAppBraga, 150);
  }

  function resetVisualThemeAppBraga(){
    if(!confirm("Repor cores visuais da APP?")) return;
    localStorage.removeItem("appBragaVisualTheme");
    aplicarVisualThemeAppBraga();
  }

  function exportVisualThemeAppBraga(){
    const blob = new Blob([JSON.stringify(getTheme(),null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "app-braga-tema-visual.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importVisualThemeAppBraga(){
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = ()=>{
      const file = input.files && input.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          const data = JSON.parse(reader.result);
          const finalTheme = {...defaults};
          Object.keys(defaults).forEach(key=>{
            if(data[key]) finalTheme[key] = valid(data[key], defaults[key]);
          });
          localStorage.setItem("appBragaVisualTheme", JSON.stringify(finalTheme));
          aplicarVisualThemeAppBraga();
          if(typeof mostrarMensagem === "function") mostrarMensagem("Tema importado.");
        }catch(e){
          alert("Ficheiro de tema inválido.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    aplicarVisualThemeAppBraga();
    setTimeout(aplicarVisualThemeAppBraga, 300);
    setTimeout(aplicarVisualThemeAppBraga, 1000);
  });

  window.addEventListener("pageshow", ()=>setTimeout(aplicarVisualThemeAppBraga, 100));

  // Reaplica quando a página muda elementos por Firebase/render
  const observer = new MutationObserver(()=>aplicarVisualThemeAppBraga());
  document.addEventListener("DOMContentLoaded", ()=>{
    if(document.body) observer.observe(document.body, {childList:true, subtree:true});
  });

  window.aplicarVisualThemeAppBraga = aplicarVisualThemeAppBraga;
  window.guardarVisualThemeCampoAppBraga = guardarVisualThemeCampoAppBraga;
  window.resetVisualThemeAppBraga = resetVisualThemeAppBraga;
  window.exportVisualThemeAppBraga = exportVisualThemeAppBraga;
  window.importVisualThemeAppBraga = importVisualThemeAppBraga;
})();
