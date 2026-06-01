
/* APP BRAGA - THEME PRESETS + CUSTOM ADVANCED */
(function(){
  const STORAGE_KEY = "appBragaThemeStudioSimpleV3";
  const CUSTOM_KEY = "appBragaThemeCustomSimple";
  const CUSTOM_ACTIVE_KEY = "appBragaThemeCustomActive";

  const themes = {
    enterpriseBlue:{name:"Enterprise Blue",desc:"Azul profissional e moderno.",bg:"#020617",bg2:"#0f172a",card:"#111827",border:"#334155",text:"#cbd5e1",title:"#ffffff",primary:"#2563eb",primaryText:"#ffffff",secondary:"#1f2937",secondaryText:"#f8fafc",edit:"#1e3a8a",editText:"#dbeafe",danger:"#7f1d1d",dangerText:"#fecaca",success:"#14532d",successText:"#bbf7d0",input:"#0f172a",inputText:"#ffffff",inputBorder:"#334155",sidebar:"#0f172a",sidebarText:"#f8fafc",sidebarIcon:"#f8fafc",sidebarActive:"#2563eb",sidebarActiveText:"#ffffff",sidebarButton:"#111827",sidebarButtonHover:"#1f2937",sidebarGlow:"#2563eb",sidebarDivider:"#334155",sidebarBrand:"#2563eb",sidebarBrandText:"#ffffff",sidebarTitle:"#ffffff",sidebarSubtitle:"#cbd5e1",buttonGlow:"#2563eb",cardGlow:"#2563eb"},
    graphitePro:{name:"Graphite Pro",desc:"Cinza premium e discreto.",bg:"#09090b",bg2:"#18181b",card:"#18181b",border:"#3f3f46",text:"#d4d4d8",title:"#fafafa",primary:"#52525b",primaryText:"#ffffff",secondary:"#27272a",secondaryText:"#fafafa",edit:"#1f2937",editText:"#e5e7eb",danger:"#7f1d1d",dangerText:"#fecaca",success:"#064e3b",successText:"#a7f3d0",input:"#18181b",inputText:"#ffffff",inputBorder:"#3f3f46",sidebar:"#09090b",sidebarText:"#fafafa",sidebarIcon:"#d4d4d8",sidebarActive:"#3f3f46",sidebarActiveText:"#ffffff",sidebarButton:"#18181b",sidebarButtonHover:"#27272a",sidebarGlow:"#71717a",sidebarDivider:"#3f3f46",sidebarBrand:"#52525b",sidebarBrandText:"#ffffff",sidebarTitle:"#ffffff",sidebarSubtitle:"#d4d4d8",buttonGlow:"#71717a",cardGlow:"#71717a"},
    oceanCyan:{name:"Ocean Cyan",desc:"Tecnológico azul/ciano.",bg:"#071a2b",bg2:"#083344",card:"#0c2538",border:"#0891b2",text:"#cffafe",title:"#ffffff",primary:"#0891b2",primaryText:"#ffffff",secondary:"#164e63",secondaryText:"#cffafe",edit:"#075985",editText:"#e0f2fe",danger:"#7f1d1d",dangerText:"#fecaca",success:"#14532d",successText:"#bbf7d0",input:"#0c2538",inputText:"#ffffff",inputBorder:"#0891b2",sidebar:"#071a2b",sidebarText:"#cffafe",sidebarIcon:"#67e8f9",sidebarActive:"#0891b2",sidebarActiveText:"#ffffff",sidebarButton:"#0c2538",sidebarButtonHover:"#164e63",sidebarGlow:"#06b6d4",sidebarDivider:"#0891b2",sidebarBrand:"#0891b2",sidebarBrandText:"#ffffff",sidebarTitle:"#ffffff",sidebarSubtitle:"#cffafe",buttonGlow:"#06b6d4",cardGlow:"#06b6d4"},
    emeraldOps:{name:"Emerald Ops",desc:"Verde operacional.",bg:"#022c22",bg2:"#064e3b",card:"#052e2b",border:"#0f766e",text:"#ccfbf1",title:"#ffffff",primary:"#059669",primaryText:"#ffffff",secondary:"#134e4a",secondaryText:"#ccfbf1",edit:"#065f46",editText:"#d1fae5",danger:"#7f1d1d",dangerText:"#fecaca",success:"#14532d",successText:"#bbf7d0",input:"#042f2e",inputText:"#ffffff",inputBorder:"#0f766e",sidebar:"#022c22",sidebarText:"#ecfdf5",sidebarIcon:"#99f6e4",sidebarActive:"#059669",sidebarActiveText:"#ffffff",sidebarButton:"#052e2b",sidebarButtonHover:"#134e4a",sidebarGlow:"#10b981",sidebarDivider:"#0f766e",sidebarBrand:"#059669",sidebarBrandText:"#ffffff",sidebarTitle:"#ffffff",sidebarSubtitle:"#ccfbf1",buttonGlow:"#10b981",cardGlow:"#10b981"},
    violetNeon:{name:"Violet Neon",desc:"Roxo moderno premium.",bg:"#1e102f",bg2:"#2e1065",card:"#22113f",border:"#6d28d9",text:"#ddd6fe",title:"#ffffff",primary:"#7c3aed",primaryText:"#ffffff",secondary:"#312e81",secondaryText:"#ede9fe",edit:"#3730a3",editText:"#e0e7ff",danger:"#881337",dangerText:"#fce7f3",success:"#14532d",successText:"#bbf7d0",input:"#2e1065",inputText:"#ffffff",inputBorder:"#6d28d9",sidebar:"#1e102f",sidebarText:"#ede9fe",sidebarIcon:"#c4b5fd",sidebarActive:"#7c3aed",sidebarActiveText:"#ffffff",sidebarButton:"#22113f",sidebarButtonHover:"#312e81",sidebarGlow:"#8b5cf6",sidebarDivider:"#6d28d9",sidebarBrand:"#7c3aed",sidebarBrandText:"#ffffff",sidebarTitle:"#ffffff",sidebarSubtitle:"#ddd6fe",buttonGlow:"#8b5cf6",cardGlow:"#8b5cf6"},
    rubyDark:{name:"Ruby Dark",desc:"Vermelho escuro elegante.",bg:"#1f0a0a",bg2:"#450a0a",card:"#241111",border:"#7f1d1d",text:"#fee2e2",title:"#ffffff",primary:"#dc2626",primaryText:"#ffffff",secondary:"#3f1d1d",secondaryText:"#fee2e2",edit:"#1e3a8a",editText:"#dbeafe",danger:"#7f1d1d",dangerText:"#fecaca",success:"#14532d",successText:"#bbf7d0",input:"#2a1010",inputText:"#ffffff",inputBorder:"#7f1d1d",sidebar:"#1f0a0a",sidebarText:"#fee2e2",sidebarIcon:"#fecaca",sidebarActive:"#dc2626",sidebarActiveText:"#ffffff",sidebarButton:"#241111",sidebarButtonHover:"#3f1d1d",sidebarGlow:"#dc2626",sidebarDivider:"#7f1d1d",sidebarBrand:"#dc2626",sidebarBrandText:"#ffffff",sidebarTitle:"#ffffff",sidebarSubtitle:"#fee2e2",buttonGlow:"#dc2626",cardGlow:"#dc2626"},
    iceWhite:{name:"Ice White",desc:"Claro, limpo e elegante.",bg:"#e5e7eb",bg2:"#f8fafc",card:"#ffffff",border:"#cbd5e1",text:"#334155",title:"#0f172a",primary:"#2563eb",primaryText:"#ffffff",secondary:"#e2e8f0",secondaryText:"#0f172a",edit:"#dbeafe",editText:"#1e3a8a",danger:"#fee2e2",dangerText:"#991b1b",success:"#dcfce7",successText:"#166534",input:"#ffffff",inputText:"#0f172a",inputBorder:"#cbd5e1",sidebar:"#f8fafc",sidebarText:"#0f172a",sidebarIcon:"#334155",sidebarActive:"#2563eb",sidebarActiveText:"#ffffff",sidebarButton:"#ffffff",sidebarButtonHover:"#e2e8f0",sidebarGlow:"#2563eb",sidebarDivider:"#cbd5e1",sidebarBrand:"#2563eb",sidebarBrandText:"#ffffff",sidebarTitle:"#0f172a",sidebarSubtitle:"#334155",buttonGlow:"#2563eb",cardGlow:"#94a3b8"}
  };

  const advancedFields = [
    ["primaryText","Letra botão principal"],["secondary","Botão secundário"],["secondaryText","Letra botão secundário"],
    ["edit","Botão Editar"],["editText","Letra Editar"],["danger","Botão Apagar"],["dangerText","Letra Apagar"],
    ["success","Botão Confirmar"],["successText","Letra Confirmar"],["border","Bordas dos cards"],
    ["input","Inputs fundo"],["inputText","Inputs texto"],["inputBorder","Inputs borda"],
    ["sidebarText","Sidebar texto"],["sidebarIcon","Sidebar símbolos"],["sidebarActive","Sidebar ativo"],
    ["sidebarButton","Sidebar botões"],["sidebarButtonHover","Sidebar hover"],["sidebarDivider","Linha sidebar"],
    ["sidebarBrand","Logo BR"],["sidebarTitle","Título sidebar"],["buttonGlow","Glow botões"],["cardGlow","Glow cards"]
  ];

  function valid(v,f="#2563eb"){v=String(v||"").trim();return /^#[0-9a-fA-F]{6}$/.test(v)?v.toLowerCase():f;}
  function rgba(hex,a){hex=valid(hex).replace("#","");return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${a})`;}
  function shade(hex, amount){hex=valid(hex).replace("#","");let r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);r=Math.max(0,Math.min(255,r+amount));g=Math.max(0,Math.min(255,g+amount));b=Math.max(0,Math.min(255,b+amount));return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");}
  function luminance(hex){hex=valid(hex).replace("#","");const [r,g,b]=[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b;}
  function contrastText(hex){return luminance(hex)>0.45?"#0f172a":"#ffffff";}

  function defaultCustom(){return {name:"O Meu Tema",mode:"dark",primary:"#2563eb",background:"#020617",card:"#111827",text:"#cbd5e1",sidebar:"#0f172a"};}
  function getCustom(){try{return {...defaultCustom(),...(JSON.parse(localStorage.getItem(CUSTOM_KEY)||"{}"))};}catch(e){return defaultCustom();}}
  function buildCustomTheme(){
    const c=getCustom(), dark=c.mode!=="light";
    const primary=valid(c.primary), bg=valid(c.background), card=valid(c.card), text=valid(c.text), sidebar=valid(c.sidebar);
    const title=contrastText(bg)==="#ffffff"?"#ffffff":"#0f172a", primaryText=contrastText(primary);
    const base={
      name:c.name||"O Meu Tema", desc:"Tema personalizado simples.", bg, bg2:dark?shade(bg,18):shade(bg,-8), card,
      border:c.border|| (dark?shade(card,36):shade(card,-42)), text, title, primary, primaryText,
      secondary:c.secondary || (dark?shade(card,18):shade(card,-10)), secondaryText:c.secondaryText || contrastText(c.secondary || (dark?shade(card,18):shade(card,-10))),
      edit:c.edit || (dark?"#1e3a8a":"#dbeafe"), editText:c.editText || (dark?"#dbeafe":"#1e3a8a"),
      danger:c.danger || (dark?"#7f1d1d":"#fee2e2"), dangerText:c.dangerText || (dark?"#fecaca":"#991b1b"),
      success:c.success || (dark?"#14532d":"#dcfce7"), successText:c.successText || (dark?"#bbf7d0":"#166534"),
      input:c.input || (dark?shade(card,-8):"#ffffff"), inputText:c.inputText || title, inputBorder:c.inputBorder || (dark?shade(card,36):shade(card,-42)),
      sidebar, sidebarText:c.sidebarText || contrastText(sidebar), sidebarIcon:c.sidebarIcon || contrastText(sidebar),
      sidebarActive:c.sidebarActive || primary, sidebarActiveText:c.sidebarActiveText || primaryText,
      sidebarButton:c.sidebarButton || (dark?shade(sidebar,14):shade(sidebar,-8)), sidebarButtonHover:c.sidebarButtonHover || (dark?shade(sidebar,28):shade(sidebar,-18)),
      sidebarGlow:c.sidebarGlow || primary, sidebarDivider:c.sidebarDivider || (dark?shade(card,36):shade(card,-42)),
      sidebarBrand:c.sidebarBrand || primary, sidebarBrandText:c.sidebarBrandText || primaryText, sidebarTitle:c.sidebarTitle || contrastText(sidebar), sidebarSubtitle:c.sidebarSubtitle || text,
      buttonGlow:c.buttonGlow || primary, cardGlow:c.cardGlow || primary
    };
    return base;
  }

  function getTheme(){try{return {...themes.enterpriseBlue,...(JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}"))};}catch(e){return {...themes.enterpriseBlue};}}
  function setVar(n,v){document.documentElement.style.setProperty(n,v,"important");}

  function applyTheme(){
    const t=getTheme();
    setVar("--ts-bg",valid(t.bg)); setVar("--ts-bg2",valid(t.bg2)); setVar("--ts-card",valid(t.card)); setVar("--ts-card2",valid(t.card)); setVar("--ts-card-border",valid(t.border));
    setVar("--ts-title",valid(t.title)); setVar("--ts-text",valid(t.text)); setVar("--ts-muted",valid(t.text));
    setVar("--ts-primary-bg",valid(t.primary)); setVar("--ts-primary-text",valid(t.primaryText)); setVar("--ts-primary-border",valid(t.primary));
    setVar("--ts-secondary-bg",valid(t.secondary)); setVar("--ts-secondary-text",valid(t.secondaryText)); setVar("--ts-secondary-border",valid(t.border));
    setVar("--ts-edit-bg",valid(t.edit)); setVar("--ts-edit-text",valid(t.editText)); setVar("--ts-edit-border",valid(t.edit));
    setVar("--ts-danger-bg",valid(t.danger)); setVar("--ts-danger-text",valid(t.dangerText)); setVar("--ts-danger-border",valid(t.danger));
    setVar("--ts-success-bg",valid(t.success)); setVar("--ts-success-text",valid(t.successText)); setVar("--ts-success-border",valid(t.success));
    setVar("--ts-input-bg",valid(t.input)); setVar("--ts-input-text",valid(t.inputText)); setVar("--ts-input-border",valid(t.inputBorder));
    setVar("--ts-sidebar-bg",valid(t.sidebar)); setVar("--ts-sidebar-text",valid(t.sidebarText)); setVar("--ts-sidebar-icon",valid(t.sidebarIcon));
    setVar("--ts-sidebar-active-bg",valid(t.sidebarActive)); setVar("--ts-sidebar-active-text",valid(t.sidebarActiveText)); setVar("--ts-sidebar-button-bg",valid(t.sidebarButton)); setVar("--ts-sidebar-button-hover-bg",valid(t.sidebarButtonHover));
    setVar("--ts-sidebar-button-glow",rgba(t.sidebarGlow,.34)); setVar("--ts-sidebar-divider",valid(t.sidebarDivider)); setVar("--ts-sidebar-brand-bg",valid(t.sidebarBrand)); setVar("--ts-sidebar-brand-text",valid(t.sidebarBrandText)); setVar("--ts-sidebar-brand-border",valid(t.sidebarBrand));
    setVar("--ts-sidebar-title",valid(t.sidebarTitle)); setVar("--ts-sidebar-subtitle",valid(t.sidebarSubtitle)); setVar("--ts-global-button-glow",rgba(t.buttonGlow,.28)); setVar("--ts-global-card-glow",rgba(t.cardGlow,.13));
    setVar("--app-accent",valid(t.primary)); setVar("--app-accent-hover",valid(t.primary)); setVar("--app-button-text",valid(t.primaryText));
    inlineApply(t);
  }

  function inlineApply(t){
    const style=(sel,bg,txt,border)=>document.querySelectorAll(sel).forEach(el=>{el.style.setProperty("background",bg,"important");el.style.setProperty("color",txt,"important");el.style.setProperty("border-color",border,"important");});
    style(".primary-btn,.reference-primary,.btn-primary,.add-btn,.save-btn,button[type='submit'],button.primary,.radio-action-main",t.primary,t.primaryText,t.primary);
    style(".secondary-btn,.reference-outline,.btn,.enterprise-btn",t.secondary,t.secondaryText,t.border);
    style(".btn-edit,button[onclick*='editar'],button[title*='Editar']",t.edit,t.editText,t.edit);
    style(".btn-delete,.danger,button.danger,.reference-icon.danger,button[onclick*='apagar'],button[title*='Apagar']",t.danger,t.dangerText,t.danger);
    style(".btn-use,button[onclick*='usar'],button[onclick*='resolver'],button[onclick*='confirmar']",t.success,t.successText,t.success);
    document.querySelectorAll(".card,.panel,.stat-card,.metric-card,.dashboard-card,.pc-card,.radio-card,.info-card,.user-card,.config-card,.modal-card,.enterprise-card,.reference-card,.page-hero,.reference-header,article[class*='card'],div[class*='card']").forEach(el=>{if(el.matches("button,[class*='btn']"))return;el.style.setProperty("background",t.card,"important");el.style.setProperty("border-color",t.border,"important");el.style.setProperty("color",t.text,"important");});
  }

  function saveTheme(t){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(t));
    applyTheme();
    // Não chamar render aqui para não fechar color picker/select enquanto editas.
    if(typeof window.themeFirebasePushNow==="function"){
      setTimeout(window.themeFirebasePushNow,300);
      setTimeout(window.themeFirebasePushNow,1000);
    }
  }
  function applyPreset(id){if(themes[id]){localStorage.removeItem(CUSTOM_ACTIVE_KEY);saveTheme(themes[id]);setTimeout(render,50);}}
  function applyCustom(){localStorage.setItem(CUSTOM_ACTIVE_KEY,"1"); saveTheme(buildCustomTheme()); setTimeout(render,80);}
  function updateCustom(key,value){const c=getCustom();c[key]=value;localStorage.setItem(CUSTOM_KEY,JSON.stringify(c));render();}
  function updateCustomAndApply(key,value){
    // Apenas guarda o valor no editor. Não aplica nem faz render automático,
    // porque isso fecha o seletor de cores/select no browser.
    const c=getCustom();
    c[key]=value;
    localStorage.setItem(CUSTOM_KEY,JSON.stringify(c));
  }
  function toggleAdvanced(){
    const el=document.getElementById("themeCustomAdvanced");
    const btn=document.getElementById("themeAdvancedBtn");
    if(!el)return;
    const open=el.style.display!=="grid";
    el.style.display=open?"grid":"none";
    if(btn) btn.textContent=open?"Esconder avançado":"Mostrar avançado";
  }

  function render(){
    const root=document.getElementById("themeSimpleRoot"); if(!root)return;
    const current=getTheme().name||"Enterprise Blue", c=getCustom(), activeCustom=localStorage.getItem(CUSTOM_ACTIVE_KEY)==="1";
    const currentBuilt=buildCustomTheme();
    root.innerHTML=`<div class="theme-presets-only">
      <div class="theme-current-box"><strong>Tema atual</strong><span>${current}</span><small>Escolhe um esquema pronto ou cria o teu. O teu tema já não é substituído passados segundos.</small></div>
      <h3>Esquemas prontos</h3>
      <div class="theme-preset-simple-grid">${Object.entries(themes).map(([id,t])=>`<button type="button" class="theme-preset-simple-card ${!activeCustom&&current===t.name?"active":""}" onclick="themePresetOnlyApply('${id}')"><div><strong>${t.name}</strong><small>${t.desc}</small></div><div class="theme-preset-simple-swatches"><i style="background:${t.bg}"></i><i style="background:${t.card}"></i><i style="background:${t.primary}"></i><i style="background:${t.secondary}"></i><i style="background:${t.success}"></i></div></button>`).join("")}</div>
      <div class="theme-custom-simple ${activeCustom?"active":""}">
        <h3>Criar o meu esquema</h3>
        <p>Modo simples: poucas cores e a APP calcula o resto. O avançado fica escondido.</p>
        <div class="theme-custom-grid">
          <label><span>Nome do tema</span><input type="text" value="${c.name||"O Meu Tema"}" oninput="themeCustomUpdate('name',this.value)"></label>
          <label><span>Modo</span><select onchange="themeCustomLive('mode',this.value)"><option value="dark" ${c.mode!=="light"?"selected":""}>Escuro</option><option value="light" ${c.mode==="light"?"selected":""}>Claro</option></select></label>
          <label><span>Cor principal</span><input type="color" value="${valid(c.primary)}" onchange="themeCustomLive('primary',this.value)"></label>
          <label><span>Fundo</span><input type="color" value="${valid(c.background)}" onchange="themeCustomLive('background',this.value)"></label>
          <label><span>Cards</span><input type="color" value="${valid(c.card)}" onchange="themeCustomLive('card',this.value)"></label>
          <label><span>Texto</span><input type="color" value="${valid(c.text)}" onchange="themeCustomLive('text',this.value)"></label>
          <label><span>Sidebar</span><input type="color" value="${valid(c.sidebar)}" onchange="themeCustomLive('sidebar',this.value)"></label>
        </div>
        <button class="primary-btn" type="button" onclick="themeCustomApply()">Aplicar o meu esquema</button>
        <button id="themeAdvancedBtn" class="secondary-btn" type="button" onclick="themeCustomToggleAdvanced()">Mostrar avançado</button>
        <div id="themeCustomAdvanced" class="theme-custom-grid theme-custom-advanced" style="display:none;">
          ${advancedFields.map(([k,label])=>`<label><span>${label}</span><input type="color" value="${valid(c[k]||currentBuilt[k]||"#2563eb")}" onchange="themeCustomLive('${k}',this.value)"></label>`).join("")}
        </div>
      </div>
      <div class="theme-preview"><h3>Preview</h3><p>Pré-visualização do esquema selecionado.</p><div class="theme-preview-row"><button class="primary-btn">Principal</button><button class="secondary-btn">Secundário</button><button class="secondary-btn" onclick="editarDemoThemeStudio()">Editar</button><button class="secondary-btn danger">Apagar</button></div><div class="theme-preview-card"><strong>Card exemplo</strong><p>Cards, botões, sidebar, inputs e grids seguem este esquema.</p></div></div>
    </div>`;
  }

  window.themePresetOnlyApply=applyPreset; window.themeCustomUpdate=updateCustom; window.themeCustomLive=updateCustomAndApply; window.themeCustomApply=applyCustom; window.themeCustomToggleAdvanced=toggleAdvanced;
  window.themeSimplePreset=applyPreset; window.themeSimpleReset=function(){applyPreset("enterpriseBlue")}; window.themeSimpleUpdate=function(){}; window.themeSimpleImport=function(){};
  window.themeStudioRender=function(){
    if(document.activeElement && (document.activeElement.matches("input,select,textarea"))) return;
    render();
  }; window.editarDemoThemeStudio=function(){};
  document.addEventListener("DOMContentLoaded",()=>{applyTheme();render();setTimeout(applyTheme,300);setTimeout(applyTheme,1000);});
  window.addEventListener("pageshow",()=>setTimeout(()=>{applyTheme();render();},100));
})();
