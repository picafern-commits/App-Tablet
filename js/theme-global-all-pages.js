
/* APP BRAGA - THEME GLOBAL ALL PAGES */
(function(){
  const storageKeys = [
    "appBragaThemeStudioSimpleV3",
    "appBragaThemeStudioPro",
    "appBragaVisualTheme"
  ];

  const fallback = {
    bg:"#020617", bg2:"#0f172a", card:"#111827", border:"#334155", text:"#cbd5e1", title:"#ffffff",
    primary:"#2563eb", primaryText:"#ffffff",
    secondary:"#1f2937", secondaryText:"#f8fafc",
    edit:"#1e3a8a", editText:"#dbeafe",
    danger:"#7f1d1d", dangerText:"#fecaca",
    success:"#14532d", successText:"#bbf7d0",
    warning:"#713f12", warningText:"#fde68a",
    input:"#0f172a", inputText:"#ffffff", inputBorder:"#334155",
    sidebar:"#0f172a", sidebarText:"#f8fafc", sidebarIcon:"#f8fafc",
    sidebarActive:"#2563eb", sidebarActiveText:"#ffffff",
    sidebarButton:"#111827", sidebarButtonHover:"#1f2937", sidebarGlow:"#2563eb", sidebarDivider:"#334155",
    sidebarBrand:"#2563eb", sidebarBrandText:"#ffffff", sidebarTitle:"#ffffff", sidebarSubtitle:"#cbd5e1",
    buttonGlow:"#2563eb", cardGlow:"#2563eb"
  };

  function valid(v,f="#2563eb"){
    v=String(v||"").trim();
    return /^#[0-9a-fA-F]{6}$/.test(v)?v.toLowerCase():f;
  }

  function rgba(hex,a){
    hex=valid(hex).replace("#","");
    return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${a})`;
  }

  function loadTheme(){
    for(const key of storageKeys){
      try{
        const data = JSON.parse(localStorage.getItem(key) || "null");
        if(data && typeof data === "object") return normalize(data);
      }catch(e){}
    }
    return {...fallback};
  }

  function normalize(data){
    return {
      ...fallback,
      ...data,
      bg: data.bg || data.tsBg || data.uiBg || fallback.bg,
      bg2: data.bg2 || data.tsBg2 || fallback.bg2,
      card: data.card || data.tsCard || data.uiCardBg || fallback.card,
      border: data.border || data.tsCardBorder || data.uiCardBorder || fallback.border,
      text: data.text || data.tsText || data.uiTextColor || fallback.text,
      title: data.title || data.tsTitle || data.uiTitleColor || fallback.title,
      primary: data.primary || data.tsPrimaryBg || data.uiPrimaryBg || data.tsAccent || fallback.primary,
      primaryText: data.primaryText || data.tsPrimaryText || data.uiPrimaryText || fallback.primaryText,
      secondary: data.secondary || data.tsSecondaryBg || data.uiSecondaryBg || fallback.secondary,
      secondaryText: data.secondaryText || data.tsSecondaryText || data.uiSecondaryText || fallback.secondaryText,
      edit: data.edit || data.tsEditBg || data.uiEditBg || fallback.edit,
      editText: data.editText || data.tsEditText || data.uiEditText || fallback.editText,
      danger: data.danger || data.tsDangerBg || data.uiDangerBg || fallback.danger,
      dangerText: data.dangerText || data.tsDangerText || data.uiDangerText || fallback.dangerText,
      success: data.success || data.tsSuccessBg || data.uiSuccessBg || fallback.success,
      successText: data.successText || data.tsSuccessText || data.uiSuccessText || fallback.successText,
      input: data.input || data.tsInputBg || fallback.input,
      inputText: data.inputText || data.tsInputText || fallback.inputText,
      inputBorder: data.inputBorder || data.tsInputBorder || fallback.inputBorder,
      sidebar: data.sidebar || data.tsSidebarBg || data.uiSidebarBg || fallback.sidebar,
      sidebarText: data.sidebarText || data.tsSidebarText || data.uiSidebarText || fallback.sidebarText,
      sidebarIcon: data.sidebarIcon || data.tsSidebarIcon || fallback.sidebarIcon,
      sidebarActive: data.sidebarActive || data.tsSidebarActiveBg || data.uiSidebarActiveBg || fallback.sidebarActive,
      sidebarActiveText: data.sidebarActiveText || data.tsSidebarActiveText || data.uiSidebarActiveText || fallback.sidebarActiveText,
      sidebarButton: data.sidebarButton || data.tsSidebarButtonBg || fallback.sidebarButton,
      sidebarButtonHover: data.sidebarButtonHover || data.tsSidebarButtonHoverBg || fallback.sidebarButtonHover,
      sidebarGlow: data.sidebarGlow || data.tsSidebarButtonGlow || fallback.sidebarGlow,
      sidebarDivider: data.sidebarDivider || data.tsSidebarDivider || fallback.sidebarDivider,
      sidebarBrand: data.sidebarBrand || data.tsSidebarBrandBg || fallback.sidebarBrand,
      sidebarBrandText: data.sidebarBrandText || data.tsSidebarBrandText || fallback.sidebarBrandText,
      sidebarTitle: data.sidebarTitle || data.tsSidebarTitle || fallback.sidebarTitle,
      sidebarSubtitle: data.sidebarSubtitle || data.tsSidebarSubtitle || fallback.sidebarSubtitle,
      buttonGlow: data.buttonGlow || data.tsButtonGlow || data.tsGlobalButtonGlow || fallback.buttonGlow,
      cardGlow: data.cardGlow || data.tsCardGlow || fallback.cardGlow
    };
  }

  function set(name,value){
    document.documentElement.style.setProperty(name,value,"important");
  }

  function globalThemeUserEditing(){
    const el = document.activeElement;
    return !!(el && el.matches && el.matches("input,select,textarea"));
  }

  function applyThemeGlobalAllPages(){
    if(globalThemeUserEditing()) return;
    const t = loadTheme();

    set("--ts-bg", valid(t.bg)); set("--ts-bg2", valid(t.bg2));
    set("--ts-card", valid(t.card)); set("--ts-card2", valid(t.card));
    set("--ts-card-border", valid(t.border));
    set("--ts-title", valid(t.title)); set("--ts-text", valid(t.text)); set("--ts-muted", valid(t.text));
    set("--ts-primary-bg", valid(t.primary)); set("--ts-primary-text", valid(t.primaryText)); set("--ts-primary-border", valid(t.primary));
    set("--ts-secondary-bg", valid(t.secondary)); set("--ts-secondary-text", valid(t.secondaryText)); set("--ts-secondary-border", valid(t.border));
    set("--ts-edit-bg", valid(t.edit)); set("--ts-edit-text", valid(t.editText)); set("--ts-edit-border", valid(t.edit));
    set("--ts-danger-bg", valid(t.danger)); set("--ts-danger-text", valid(t.dangerText)); set("--ts-danger-border", valid(t.danger));
    set("--ts-success-bg", valid(t.success)); set("--ts-success-text", valid(t.successText)); set("--ts-success-border", valid(t.success));
    set("--ts-warning-bg", valid(t.warning)); set("--ts-warning-text", valid(t.warningText)); set("--ts-warning-border", valid(t.warning));
    set("--ts-input-bg", valid(t.input)); set("--ts-input-text", valid(t.inputText)); set("--ts-input-border", valid(t.inputBorder));
    set("--ts-sidebar-bg", valid(t.sidebar)); set("--ts-sidebar-text", valid(t.sidebarText)); set("--ts-sidebar-icon", valid(t.sidebarIcon));
    set("--ts-sidebar-active-bg", valid(t.sidebarActive)); set("--ts-sidebar-active-text", valid(t.sidebarActiveText));
    set("--ts-sidebar-button-bg", valid(t.sidebarButton)); set("--ts-sidebar-button-hover-bg", valid(t.sidebarButtonHover));
    set("--ts-sidebar-button-glow", rgba(t.sidebarGlow,.34)); set("--ts-sidebar-divider", valid(t.sidebarDivider));
    set("--ts-sidebar-brand-bg", valid(t.sidebarBrand)); set("--ts-sidebar-brand-text", valid(t.sidebarBrandText)); set("--ts-sidebar-brand-border", valid(t.sidebarBrand));
    set("--ts-sidebar-title", valid(t.sidebarTitle)); set("--ts-sidebar-subtitle", valid(t.sidebarSubtitle));
    set("--ts-global-button-glow", rgba(t.buttonGlow,.28)); set("--ts-global-card-glow", rgba(t.cardGlow,.13));

    set("--app-accent", valid(t.primary));
    set("--app-accent-hover", valid(t.primary));
    set("--app-button-text", valid(t.primaryText));

    inlineApply(t);
  }

  function inlineApply(t){
    const style = (selector,bg,text,border)=>{
      document.querySelectorAll(selector).forEach(el=>{
        el.style.setProperty("background", bg, "important");
        el.style.setProperty("color", text, "important");
        el.style.setProperty("border-color", border, "important");
      });
    };

    style(".primary-btn,.reference-primary,.btn-primary,.add-btn,.save-btn,button[type='submit'],button.primary,.radio-action-main", valid(t.primary), valid(t.primaryText), valid(t.primary));
    style(".secondary-btn,.reference-outline,.btn,.enterprise-btn", valid(t.secondary), valid(t.secondaryText), valid(t.border));
    style(".btn-edit,button[onclick*='editar'],button[title*='Editar']", valid(t.edit), valid(t.editText), valid(t.edit));
    style(".btn-delete,.danger,button.danger,.reference-icon.danger,button[onclick*='apagar'],button[title*='Apagar']", valid(t.danger), valid(t.dangerText), valid(t.danger));
    style(".btn-use,button[onclick*='usar'],button[onclick*='resolver'],button[onclick*='confirmar']", valid(t.success), valid(t.successText), valid(t.success));

    document.querySelectorAll(".card,.panel,.stat-card,.metric-card,.dashboard-card,.pc-card,.radio-card,.info-card,.user-card,.config-card,.modal-card,.enterprise-card,.reference-card,.page-hero,.reference-header,article[class*='card'],div[class*='card']").forEach(el=>{
      if(el.matches("button,[class*='btn']")) return;
      el.style.setProperty("background", valid(t.card), "important");
      el.style.setProperty("border-color", valid(t.border), "important");
      el.style.setProperty("color", valid(t.text), "important");
    });

    document.querySelectorAll("h1,h2,h3,h4,h5,h6,strong,.page-hero-title,.section-header h3,.card-title,.pc-name,.radio-card-main strong").forEach(el=>{
      el.style.setProperty("color", valid(t.title), "important");
    });
  }

  let applyQueued = false;

  function scheduleThemeApply(){
    if(applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(()=>{
      applyQueued = false;
      applyThemeGlobalAllPages();
    });
  }

  function init(){
    applyThemeGlobalAllPages();
    setTimeout(applyThemeGlobalAllPages,250);
    setTimeout(applyThemeGlobalAllPages,900);

    /*
      Importante:
      Não observar atributos/style.
      Isso criava loop infinito porque o próprio tema altera style inline.
    */
    const obs = new MutationObserver(()=>scheduleThemeApply());
    if(document.body) obs.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("pageshow", ()=>setTimeout(applyThemeGlobalAllPages,100));
  window.applyThemeGlobalAllPages = applyThemeGlobalAllPages;
})();
