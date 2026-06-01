
/* APP BRAGA - THEME STUDIO PRO */
(function(){
  const storageKey = "appBragaThemeStudioPro";

  const presets = {
    enterpriseBlue: {
      name:"Enterprise Blue", desc:"Profissional azul escuro",
      tsBg:"#020617", tsBg2:"#0f172a", tsCard:"#111827", tsCardBorder:"#334155", tsText:"#cbd5e1", tsTitle:"#ffffff",
      tsAccent:"#2563eb", tsAccent2:"#1d4ed8",
      tsPrimaryBg:"#2563eb", tsPrimaryText:"#ffffff", tsPrimaryBorder:"#3b82f6",
      tsSecondaryBg:"#1f2937", tsSecondaryText:"#f8fafc", tsSecondaryBorder:"#475569",
      tsEditBg:"#1e3a8a", tsEditText:"#dbeafe", tsEditBorder:"#3b82f6",
      tsDangerBg:"#7f1d1d", tsDangerText:"#fecaca", tsDangerBorder:"#ef4444",
      tsSuccessBg:"#14532d", tsSuccessText:"#bbf7d0", tsSuccessBorder:"#22c55e",
      tsWarningBg:"#713f12", tsWarningText:"#fde68a", tsWarningBorder:"#f59e0b",
      tsSidebarBg:"#0f172a", tsSidebarText:"#f8fafc", tsSidebarActiveBg:"#2563eb", tsSidebarActiveText:"#ffffff",
      tsInputBg:"#0f172a", tsInputText:"#ffffff", tsInputBorder:"#334155"
    },
    graphite: {
      name:"Graphite Pro", desc:"Cinza premium discreto",
      tsBg:"#09090b", tsBg2:"#18181b", tsCard:"#18181b", tsCardBorder:"#3f3f46", tsText:"#d4d4d8", tsTitle:"#fafafa",
      tsAccent:"#71717a", tsAccent2:"#52525b",
      tsPrimaryBg:"#3f3f46", tsPrimaryText:"#ffffff", tsPrimaryBorder:"#71717a",
      tsSecondaryBg:"#27272a", tsSecondaryText:"#fafafa", tsSecondaryBorder:"#52525b",
      tsEditBg:"#1f2937", tsEditText:"#e5e7eb", tsEditBorder:"#6b7280",
      tsDangerBg:"#7f1d1d", tsDangerText:"#fecaca", tsDangerBorder:"#ef4444",
      tsSuccessBg:"#064e3b", tsSuccessText:"#a7f3d0", tsSuccessBorder:"#10b981",
      tsWarningBg:"#78350f", tsWarningText:"#fde68a", tsWarningBorder:"#f59e0b",
      tsSidebarBg:"#09090b", tsSidebarText:"#fafafa", tsSidebarActiveBg:"#3f3f46", tsSidebarActiveText:"#ffffff",
      tsInputBg:"#18181b", tsInputText:"#ffffff", tsInputBorder:"#3f3f46"
    },
    emerald: {
      name:"Emerald Ops", desc:"Verde operacional",
      tsBg:"#022c22", tsBg2:"#064e3b", tsCard:"#052e2b", tsCardBorder:"#0f766e", tsText:"#ccfbf1", tsTitle:"#ffffff",
      tsAccent:"#10b981", tsAccent2:"#059669",
      tsPrimaryBg:"#059669", tsPrimaryText:"#ffffff", tsPrimaryBorder:"#34d399",
      tsSecondaryBg:"#134e4a", tsSecondaryText:"#ccfbf1", tsSecondaryBorder:"#0f766e",
      tsEditBg:"#065f46", tsEditText:"#d1fae5", tsEditBorder:"#10b981",
      tsDangerBg:"#7f1d1d", tsDangerText:"#fecaca", tsDangerBorder:"#ef4444",
      tsSuccessBg:"#14532d", tsSuccessText:"#bbf7d0", tsSuccessBorder:"#22c55e",
      tsWarningBg:"#713f12", tsWarningText:"#fde68a", tsWarningBorder:"#f59e0b",
      tsSidebarBg:"#022c22", tsSidebarText:"#ecfdf5", tsSidebarActiveBg:"#059669", tsSidebarActiveText:"#ffffff",
      tsInputBg:"#042f2e", tsInputText:"#ffffff", tsInputBorder:"#0f766e"
    },
    violet: {
      name:"Violet Neon", desc:"Moderno roxo premium",
      tsBg:"#1e102f", tsBg2:"#2e1065", tsCard:"#22113f", tsCardBorder:"#6d28d9", tsText:"#ddd6fe", tsTitle:"#ffffff",
      tsAccent:"#8b5cf6", tsAccent2:"#7c3aed",
      tsPrimaryBg:"#7c3aed", tsPrimaryText:"#ffffff", tsPrimaryBorder:"#a78bfa",
      tsSecondaryBg:"#312e81", tsSecondaryText:"#ede9fe", tsSecondaryBorder:"#6d28d9",
      tsEditBg:"#3730a3", tsEditText:"#e0e7ff", tsEditBorder:"#818cf8",
      tsDangerBg:"#881337", tsDangerText:"#fce7f3", tsDangerBorder:"#ec4899",
      tsSuccessBg:"#14532d", tsSuccessText:"#bbf7d0", tsSuccessBorder:"#22c55e",
      tsWarningBg:"#713f12", tsWarningText:"#fde68a", tsWarningBorder:"#f59e0b",
      tsSidebarBg:"#1e102f", tsSidebarText:"#ede9fe", tsSidebarActiveBg:"#7c3aed", tsSidebarActiveText:"#ffffff",
      tsInputBg:"#2e1065", tsInputText:"#ffffff", tsInputBorder:"#6d28d9"
    },
    ruby: {
      name:"Ruby Dark", desc:"Vermelho escuro elegante",
      tsBg:"#1f0a0a", tsBg2:"#450a0a", tsCard:"#2a1010", tsCardBorder:"#7f1d1d", tsText:"#fecaca", tsTitle:"#ffffff",
      tsAccent:"#dc2626", tsAccent2:"#991b1b",
      tsPrimaryBg:"#dc2626", tsPrimaryText:"#ffffff", tsPrimaryBorder:"#f87171",
      tsSecondaryBg:"#3f1d1d", tsSecondaryText:"#fee2e2", tsSecondaryBorder:"#7f1d1d",
      tsEditBg:"#1e3a8a", tsEditText:"#dbeafe", tsEditBorder:"#3b82f6",
      tsDangerBg:"#7f1d1d", tsDangerText:"#fecaca", tsDangerBorder:"#ef4444",
      tsSuccessBg:"#14532d", tsSuccessText:"#bbf7d0", tsSuccessBorder:"#22c55e",
      tsWarningBg:"#713f12", tsWarningText:"#fde68a", tsWarningBorder:"#f59e0b",
      tsSidebarBg:"#1f0a0a", tsSidebarText:"#fee2e2", tsSidebarActiveBg:"#dc2626", tsSidebarActiveText:"#ffffff",
      tsInputBg:"#2a1010", tsInputText:"#ffffff", tsInputBorder:"#7f1d1d"
    },
    ocean: {
      name:"Ocean Cyan", desc:"Azul/ciano tecnológico",
      tsBg:"#071a2b", tsBg2:"#083344", tsCard:"#0c2538", tsCardBorder:"#0891b2", tsText:"#cffafe", tsTitle:"#ffffff",
      tsAccent:"#06b6d4", tsAccent2:"#0891b2",
      tsPrimaryBg:"#0891b2", tsPrimaryText:"#ffffff", tsPrimaryBorder:"#22d3ee",
      tsSecondaryBg:"#164e63", tsSecondaryText:"#cffafe", tsSecondaryBorder:"#0891b2",
      tsEditBg:"#075985", tsEditText:"#e0f2fe", tsEditBorder:"#38bdf8",
      tsDangerBg:"#7f1d1d", tsDangerText:"#fecaca", tsDangerBorder:"#ef4444",
      tsSuccessBg:"#14532d", tsSuccessText:"#bbf7d0", tsSuccessBorder:"#22c55e",
      tsWarningBg:"#713f12", tsWarningText:"#fde68a", tsWarningBorder:"#f59e0b",
      tsSidebarBg:"#071a2b", tsSidebarText:"#cffafe", tsSidebarActiveBg:"#0891b2", tsSidebarActiveText:"#ffffff",
      tsInputBg:"#0c2538", tsInputText:"#ffffff", tsInputBorder:"#0891b2"
    }
  };

  const labels = {
    base: [
      ["tsBg","Fundo principal"],["tsBg2","Fundo secundário"],["tsCard","Cards gerais - fundo"],["tsCardBorder","Cards gerais - borda"],
      ["tsTitle","Títulos"],["tsText","Texto geral"],["tsAccent","Cor destaque"],["tsAccent2","Cor destaque 2"],
      ["tsInputBg","Inputs - fundo"],["tsInputText","Inputs - texto"],["tsInputBorder","Inputs - borda"]
    ],
    buttons: [
      ["tsPrimaryBg","Principal - fundo"],["tsPrimaryText","Principal - letra"],["tsPrimaryBorder","Principal - borda"],
      ["tsSecondaryBg","Secundário - fundo"],["tsSecondaryText","Secundário - letra"],["tsSecondaryBorder","Secundário - borda"],
      ["tsEditBg","Editar - fundo"],["tsEditText","Editar - letra"],["tsEditBorder","Editar - borda"],
      ["tsDangerBg","Apagar - fundo"],["tsDangerText","Apagar - letra"],["tsDangerBorder","Apagar - borda"],
      ["tsSuccessBg","Confirmar - fundo"],["tsSuccessText","Confirmar - letra"],["tsSuccessBorder","Confirmar - borda"],
      ["tsWarningBg","Aviso - fundo"],["tsWarningText","Aviso - letra"],["tsWarningBorder","Aviso - borda"],
      ["tsButtonGlow","Glow dos botões"],["tsButtonGlowSize","Intensidade glow"],["tsCardGlow","Glow dos cards"]
    ],
    cards: [
      ["tsDashboardCardBg","Dashboard cards - fundo"],["tsDashboardCardBorder","Dashboard cards - borda"],["tsDashboardCardText","Dashboard cards - texto"],
      ["tsInfoCardBg","Informações cards - fundo"],["tsInfoCardBorder","Informações cards - borda"],["tsInfoCardText","Informações cards - texto"],
      ["tsRadioCardBg","Rádios cards - fundo"],["tsRadioCardBorder","Rádios cards - borda"],["tsRadioCardText","Rádios cards - texto"],
      ["tsUserCardBg","Users/PC cards - fundo"],["tsUserCardBorder","Users/PC cards - borda"],["tsUserCardText","Users/PC cards - texto"],
      ["tsCardRadius","Arredondamento cards"]
    ],
    sidebar: [
      ["tsSidebarBg","Sidebar - fundo"],["tsSidebarText","Sidebar - texto"],["tsSidebarIcon","Sidebar - símbolos"],["tsSidebarActiveBg","Sidebar ativa - fundo"],["tsSidebarActiveText","Sidebar ativa - texto"],
      ["tsSidebarBrandBg","Logo BR - fundo"],["tsSidebarBrandText","Logo BR - letra"],["tsSidebarBrandBorder","Logo BR - borda"],
      ["tsSidebarTitle","Título App Braga"],["tsSidebarSubtitle","Subtítulo sidebar"]
    ]
  };

  let activeTab = "base";

  function valid(v,f="#2563eb"){
    v = String(v || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : f;
  }

  function defaults(){
    return {
      ...presets.enterpriseBlue,
      tsDashboardCardBg:"#111827", tsDashboardCardBorder:"#334155", tsDashboardCardText:"#cbd5e1",
      tsInfoCardBg:"#111827", tsInfoCardBorder:"#334155", tsInfoCardText:"#cbd5e1",
      tsRadioCardBg:"#111827", tsRadioCardBorder:"#334155", tsRadioCardText:"#cbd5e1",
      tsUserCardBg:"#111827", tsUserCardBorder:"#334155", tsUserCardText:"#cbd5e1",
      tsCardRadius:"#161616",
      tsSidebarIcon:"#f8fafc", tsSidebarBrandBg:"#2563eb", tsSidebarBrandText:"#ffffff", tsSidebarBrandBorder:"#3b82f6",
      tsSidebarTitle:"#ffffff", tsSidebarSubtitle:"#cbd5e1",
      tsButtonGlow:"#2563eb", tsButtonGlowSize:"#262626", tsCardGlow:"#2563eb"
    };
  }

  function getTheme(){
    try { return {...defaults(), ...(JSON.parse(localStorage.getItem(storageKey) || "{}"))}; }
    catch(e){ return defaults(); }
  }

  function saveTheme(theme){
    localStorage.setItem(storageKey, JSON.stringify(theme));
    applyTheme();
    renderStudio();
  }

  function keyToVar(key){
    return "--"+key.replace(/[A-Z]/g, m=>"-"+m.toLowerCase());
  }

  function toCssValue(key,value){
    const v = String(value || "").trim();
    if(key === "tsButtonGlowSize"){
      // color input stores fake grayscale; convert brightness to px
      const hex = valid(v, "#262626");
      const n = parseInt(hex.slice(1,3),16);
      return Math.max(6, Math.round((n / 255) * 70)) + "px";
    }
    if(key === "tsCardRadius"){
      const hex = valid(v, "#161616");
      const n = parseInt(hex.slice(1,3),16);
      return Math.max(8, Math.round((n / 255) * 34)) + "px";
    }
    if(key === "tsButtonGlow" || key === "tsCardGlow"){
      return hexToRgba(valid(v, "#2563eb"), key === "tsButtonGlow" ? .34 : .16);
    }
    return valid(v);
  }

  function hexToRgba(hex, alpha){
    hex = valid(hex, "#2563eb").replace("#","");
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function setVar(key,value){
    document.documentElement.style.setProperty(keyToVar(key), toCssValue(key,value), "important");
  }

  function applyTheme(){
    const t = getTheme();
    Object.keys(defaults()).forEach(key => {
      if(key === "name" || key === "desc") return;
      setVar(key, t[key]);
    });

    // compatibilidade com sistemas antigos
    document.documentElement.style.setProperty("--app-accent", t.tsAccent, "important");
    document.documentElement.style.setProperty("--app-accent-hover", t.tsAccent2, "important");
    document.documentElement.style.setProperty("--app-button-text", t.tsPrimaryText, "important");

    applyInline(t);
  }

  function applyInline(t){
    const set = (selector,bg,text,border)=>{
      document.querySelectorAll(selector).forEach(el=>{
        el.style.setProperty("background", bg, "important");
        el.style.setProperty("color", text, "important");
        el.style.setProperty("border-color", border, "important");
      });
    };

    set(".primary-btn,.reference-primary,.btn-primary,.add-btn,.save-btn,button[type='submit'],button.primary,.radio-action-main", t.tsPrimaryBg, t.tsPrimaryText, t.tsPrimaryBorder);
    set(".secondary-btn,.reference-outline,.btn,.enterprise-btn", t.tsSecondaryBg, t.tsSecondaryText, t.tsSecondaryBorder);
    set(".btn-edit,button[onclick*='editar'],button[title*='Editar']", t.tsEditBg, t.tsEditText, t.tsEditBorder);
    set(".btn-delete,.danger,button.danger,.reference-icon.danger,button[onclick*='apagar'],button[title*='Apagar']", t.tsDangerBg, t.tsDangerText, t.tsDangerBorder);
    set(".btn-use,button[onclick*='usar'],button[onclick*='resolver'],button[onclick*='confirmar']", t.tsSuccessBg, t.tsSuccessText, t.tsSuccessBorder);

    document.querySelectorAll(".card,.panel,.config-card,.modal-card,.enterprise-card,.reference-card,.page-hero,.reference-header").forEach(el=>{
      el.style.setProperty("background", t.tsCard, "important");
      el.style.setProperty("border-color", t.tsCardBorder, "important");
    });
    document.querySelectorAll(".dashboard-card,.stat-card,.metric-card").forEach(el=>{
      el.style.setProperty("background", t.tsDashboardCardBg, "important");
      el.style.setProperty("border-color", t.tsDashboardCardBorder, "important");
      el.style.setProperty("color", t.tsDashboardCardText, "important");
    });
    document.querySelectorAll(".info-card").forEach(el=>{
      el.style.setProperty("background", t.tsInfoCardBg, "important");
      el.style.setProperty("border-color", t.tsInfoCardBorder, "important");
      el.style.setProperty("color", t.tsInfoCardText, "important");
    });
    document.querySelectorAll(".radio-card").forEach(el=>{
      el.style.setProperty("background", t.tsRadioCardBg, "important");
      el.style.setProperty("border-color", t.tsRadioCardBorder, "important");
      el.style.setProperty("color", t.tsRadioCardText, "important");
    });
    document.querySelectorAll(".user-card,.pc-card").forEach(el=>{
      el.style.setProperty("background", t.tsUserCardBg, "important");
      el.style.setProperty("border-color", t.tsUserCardBorder, "important");
      el.style.setProperty("color", t.tsUserCardText, "important");
    });
  }

  function applyPreset(key){
    if(!presets[key]) return;
    saveTheme({...presets[key]});
  }

  function updateColor(key,value){
    const t = getTheme();
    t[key] = valid(value, t[key] || "#2563eb");
    saveTheme(t);
  }

  function renderPresets(){
    const wrap = document.getElementById("themePresetGrid");
    if(!wrap) return;
    wrap.innerHTML = Object.entries(presets).map(([key,p])=>`
      <button type="button" class="theme-preset-card" onclick="themeStudioApplyPreset('${key}')">
        <strong>${p.name}</strong>
        <small>${p.desc}</small>
        <div class="theme-preset-swatches">
          <i style="background:${p.tsBg}"></i>
          <i style="background:${p.tsPrimaryBg}"></i>
          <i style="background:${p.tsSecondaryBg}"></i>
          <i style="background:${p.tsDangerBg}"></i>
          <i style="background:${p.tsSuccessBg}"></i>
        </div>
      </button>
    `).join("");
  }

  function renderEditor(){
    const wrap = document.getElementById("themeEditorContent");
    if(!wrap) return;
    const t = getTheme();
    wrap.innerHTML = Object.entries(labels).map(([tab,items])=>`
      <div class="theme-editor-section ${tab===activeTab?"active":""}" data-theme-section="${tab}">
        <div class="theme-color-grid">
          ${items.map(([key,label])=>`
            <label class="theme-color-field">
              <span>${label}</span>
              <div class="theme-color-field-row">
                <input type="color" value="${valid(t[key])}" onchange="themeStudioUpdateColor('${key}', this.value)">
                <input type="text" value="${valid(t[key]).toUpperCase()}" oninput="themeStudioUpdateColor('${key}', this.value)">
              </div>
            </label>
          `).join("")}
        </div>
      </div>
    `).join("");

    document.querySelectorAll(".theme-editor-tabs button").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.tab === activeTab);
    });
  }

  function renderPreview(){
    const el = document.getElementById("themeStudioPreview");
    if(!el) return;
    const t = getTheme();
    el.innerHTML = `
      <h3>Preview do Tema</h3>
      <p>Vê aqui como ficam os principais elementos antes de usar na APP toda.</p>
      <div class="theme-preview-row">
        <button class="primary-btn">Principal</button>
        <button class="secondary-btn">Secundário</button>
        <button class="secondary-btn" onclick="editarDemoThemeStudio()">Editar</button>
        <button class="secondary-btn danger">Apagar</button>
        <button class="secondary-btn" onclick="confirmarDemoThemeStudio()">Confirmar</button>
      </div>
      <div class="theme-preview-card">
        <strong style="color:${t.tsTitle}">Card exemplo</strong>
        <p style="color:${t.tsText}">Fundo, texto e bordas vão seguir as cores escolhidas.</p>
      </div>
    `;
  }

  function renderStudio(){
    renderPresets();
    renderEditor();
    renderPreview();
  }

  function setTab(tab){
    activeTab = tab;
    renderEditor();
  }

  function resetTheme(){
    if(!confirm("Repor tema Enterprise Blue?")) return;
    localStorage.removeItem(storageKey);
    applyTheme();
    renderStudio();
  }

  function exportTheme(){
    const blob = new Blob([JSON.stringify(getTheme(),null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "app-braga-theme-studio.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importTheme(){
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
          const finalTheme = defaults();
          Object.keys(finalTheme).forEach(key=>{
            if(data[key] && key !== "name" && key !== "desc") finalTheme[key] = valid(data[key], finalTheme[key]);
          });
          finalTheme.name = data.name || "Tema importado";
          finalTheme.desc = data.desc || "Tema personalizado";
          saveTheme(finalTheme);
        }catch(e){
          alert("Ficheiro de tema inválido.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function init(){
    applyTheme();
    renderStudio();
    setTimeout(applyTheme, 300);
    setTimeout(applyTheme, 1000);

    const obs = new MutationObserver(()=>applyTheme());
    if(document.body) obs.observe(document.body, {childList:true, subtree:true});
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("pageshow", ()=>setTimeout(applyTheme, 100));

  window.themeStudioApplyPreset = applyPreset;
  window.themeStudioUpdateColor = updateColor;
  window.themeStudioSetTab = setTab;
  window.themeStudioReset = resetTheme;
  window.themeStudioExport = exportTheme;
  window.themeStudioImport = importTheme;
  window.themeStudioRender = renderStudio;
  window.editarDemoThemeStudio = function(){};
  window.confirmarDemoThemeStudio = function(){};
})();
