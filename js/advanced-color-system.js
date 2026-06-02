
/* APP BRAGA - ADVANCED COLOR SYSTEM CLEAN */
(function(){
  const KEY = "appBragaAdvancedColorsV1";
  const ADVANCED_ENABLED_KEY = "appBragaAdvancedColorsEnabled";
  const FIREBASE_COLLECTION = "appSettings";
  const FIREBASE_DOC = "advancedColorSystemV1";
  let activeGroup = "geral";
  let unsub = null;
  let remote = false;

  const presets = {
    enterprise: {
      name:"Enterprise Blue",
      bg:"#020617", bg2:"#0f172a", text:"#cbd5e1", title:"#ffffff", accent:"#2563eb",
      sidebarBg:"#0f172a", sidebarText:"#f8fafc", sidebarIcon:"#f8fafc", sidebarActive:"#2563eb", sidebarDivider:"#334155", sidebarGlow:"#2563eb", brandBg:"#2563eb", brandText:"#ffffff",
      cardBg:"#111827", cardBorder:"#334155", cardText:"#cbd5e1", cardTitle:"#ffffff", cardGlow:"#2563eb",
      btnPrimaryBg:"#2563eb", btnPrimaryText:"#ffffff", btnSecondaryBg:"#1f2937", btnSecondaryText:"#f8fafc", btnEditBg:"#1e3a8a", btnEditText:"#dbeafe", btnDeleteBg:"#7f1d1d", btnDeleteText:"#fecaca", btnSuccessBg:"#14532d", btnSuccessText:"#bbf7d0", btnGlow:"#2563eb",
      inputBg:"#0f172a", inputText:"#ffffff", inputBorder:"#334155", inputFocus:"#2563eb",
      tableHeadBg:"#1e293b", tableHeadText:"#ffffff", tableRowBg:"#111827", tableRowText:"#cbd5e1", tableBorder:"#334155", tableHover:"#1f2937",
      tonerGood:"#22c55e", tonerMedium:"#eab308", tonerLow:"#f97316", tonerCritical:"#dc2626",
      configHeaderBg:"#1f2937", configHeaderText:"#ffffff", configBodyBg:"#111827"
    },
    graphite: {
      name:"Graphite Pro",
      bg:"#09090b", bg2:"#18181b", text:"#d4d4d8", title:"#fafafa", accent:"#71717a",
      sidebarBg:"#09090b", sidebarText:"#fafafa", sidebarIcon:"#d4d4d8", sidebarActive:"#3f3f46", sidebarDivider:"#3f3f46", sidebarGlow:"#71717a", brandBg:"#52525b", brandText:"#ffffff",
      cardBg:"#18181b", cardBorder:"#3f3f46", cardText:"#d4d4d8", cardTitle:"#ffffff", cardGlow:"#71717a",
      btnPrimaryBg:"#52525b", btnPrimaryText:"#ffffff", btnSecondaryBg:"#27272a", btnSecondaryText:"#fafafa", btnEditBg:"#1f2937", btnEditText:"#e5e7eb", btnDeleteBg:"#7f1d1d", btnDeleteText:"#fecaca", btnSuccessBg:"#064e3b", btnSuccessText:"#a7f3d0", btnGlow:"#71717a",
      inputBg:"#18181b", inputText:"#ffffff", inputBorder:"#3f3f46", inputFocus:"#71717a",
      tableHeadBg:"#27272a", tableHeadText:"#ffffff", tableRowBg:"#18181b", tableRowText:"#d4d4d8", tableBorder:"#3f3f46", tableHover:"#27272a",
      tonerGood:"#22c55e", tonerMedium:"#eab308", tonerLow:"#f97316", tonerCritical:"#dc2626",
      configHeaderBg:"#27272a", configHeaderText:"#ffffff", configBodyBg:"#18181b"
    },
    ocean: {
      name:"Ocean Cyan",
      bg:"#071a2b", bg2:"#083344", text:"#cffafe", title:"#ffffff", accent:"#06b6d4",
      sidebarBg:"#071a2b", sidebarText:"#cffafe", sidebarIcon:"#67e8f9", sidebarActive:"#0891b2", sidebarDivider:"#0891b2", sidebarGlow:"#06b6d4", brandBg:"#0891b2", brandText:"#ffffff",
      cardBg:"#0c2538", cardBorder:"#0891b2", cardText:"#cffafe", cardTitle:"#ffffff", cardGlow:"#06b6d4",
      btnPrimaryBg:"#0891b2", btnPrimaryText:"#ffffff", btnSecondaryBg:"#164e63", btnSecondaryText:"#cffafe", btnEditBg:"#075985", btnEditText:"#e0f2fe", btnDeleteBg:"#7f1d1d", btnDeleteText:"#fecaca", btnSuccessBg:"#14532d", btnSuccessText:"#bbf7d0", btnGlow:"#06b6d4",
      inputBg:"#0c2538", inputText:"#ffffff", inputBorder:"#0891b2", inputFocus:"#06b6d4",
      tableHeadBg:"#164e63", tableHeadText:"#ffffff", tableRowBg:"#0c2538", tableRowText:"#cffafe", tableBorder:"#0891b2", tableHover:"#164e63",
      tonerGood:"#22c55e", tonerMedium:"#eab308", tonerLow:"#f97316", tonerCritical:"#dc2626",
      configHeaderBg:"#164e63", configHeaderText:"#ffffff", configBodyBg:"#0c2538"
    },
    violet: {
      name:"Violet Neon",
      bg:"#1e102f", bg2:"#2e1065", text:"#ddd6fe", title:"#ffffff", accent:"#8b5cf6",
      sidebarBg:"#1e102f", sidebarText:"#ede9fe", sidebarIcon:"#c4b5fd", sidebarActive:"#7c3aed", sidebarDivider:"#6d28d9", sidebarGlow:"#8b5cf6", brandBg:"#7c3aed", brandText:"#ffffff",
      cardBg:"#22113f", cardBorder:"#6d28d9", cardText:"#ddd6fe", cardTitle:"#ffffff", cardGlow:"#8b5cf6",
      btnPrimaryBg:"#7c3aed", btnPrimaryText:"#ffffff", btnSecondaryBg:"#312e81", btnSecondaryText:"#ede9fe", btnEditBg:"#3730a3", btnEditText:"#e0e7ff", btnDeleteBg:"#881337", btnDeleteText:"#fce7f3", btnSuccessBg:"#14532d", btnSuccessText:"#bbf7d0", btnGlow:"#8b5cf6",
      inputBg:"#2e1065", inputText:"#ffffff", inputBorder:"#6d28d9", inputFocus:"#8b5cf6",
      tableHeadBg:"#312e81", tableHeadText:"#ffffff", tableRowBg:"#22113f", tableRowText:"#ddd6fe", tableBorder:"#6d28d9", tableHover:"#312e81",
      tonerGood:"#22c55e", tonerMedium:"#eab308", tonerLow:"#f97316", tonerCritical:"#dc2626",
      configHeaderBg:"#312e81", configHeaderText:"#ffffff", configBodyBg:"#22113f"
    }
  };

  const groups = {
    geral: [["bg","Fundo principal"],["bg2","Fundo secundário"],["text","Texto geral"],["title","Títulos"],["accent","Cor destaque"]],
    sidebar: [["sidebarBg","Fundo sidebar"],["sidebarText","Texto sidebar"],["sidebarIcon","Ícones sidebar"],["sidebarActive","Botão ativo"],["sidebarDivider","Linha sidebar/app"],["sidebarGlow","Glow botões sidebar"],["brandBg","Logo BR fundo"],["brandText","Logo BR letra"]],
    cards: [["cardBg","Cards fundo"],["cardBorder","Cards borda"],["cardText","Cards texto"],["cardTitle","Cards títulos"],["cardGlow","Cards glow"]],
    botoes: [["btnPrimaryBg","Principal fundo"],["btnPrimaryText","Principal letra"],["btnSecondaryBg","Secundário fundo"],["btnSecondaryText","Secundário letra"],["btnEditBg","Editar fundo"],["btnEditText","Editar letra"],["btnDeleteBg","Apagar fundo"],["btnDeleteText","Apagar letra"],["btnSuccessBg","Confirmar fundo"],["btnSuccessText","Confirmar letra"],["btnGlow","Glow botões"]],
    inputs: [["inputBg","Inputs fundo"],["inputText","Inputs texto"],["inputBorder","Inputs borda"],["inputFocus","Inputs focus"]],
    tabelas: [["tableHeadBg","Cabeçalho fundo"],["tableHeadText","Cabeçalho texto"],["tableRowBg","Linhas fundo"],["tableRowText","Linhas texto"],["tableBorder","Bordas"],["tableHover","Linha hover"]],
    toner: [["tonerGood","Toner bom"],["tonerMedium","Toner médio"],["tonerLow","Toner baixo"],["tonerCritical","Toner crítico"]],
    configs: [["configHeaderBg","Header colapsável"],["configHeaderText","Texto header"],["configBodyBg","Cor corpo configs"]]
  };

  function valid(v,f="#2563eb"){v=String(v||"").trim();return /^#[0-9a-fA-F]{6}$/.test(v)?v.toLowerCase():f;}
  function rgba(hex,a){hex=valid(hex).replace("#","");return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${a})`;}
  function get(){try{return {...presets.enterprise,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch(e){return {...presets.enterprise};}}
  function save(t,push=true){localStorage.setItem(KEY,JSON.stringify(t));apply();render(false);if(push)pushSoon();}
  function setVar(k,v){document.documentElement.style.setProperty("--acs-"+k.replace(/[A-Z]/g,m=>"-"+m.toLowerCase()),v,"important");}

  function isAdvancedEnabled(){
    return localStorage.getItem(ADVANCED_ENABLED_KEY) !== "0";
  }

  function updateAdvancedToggleUI(){
    const input=document.getElementById("toggleAdvancedColorSystem");
    const note=document.getElementById("advancedColorDisabledNote");
    const root=document.getElementById("advancedColorSystemRoot");
    const enabled=isAdvancedEnabled();
    if(input) input.checked=enabled;
    if(note) note.style.display=enabled?"none":"block";
    if(root) root.style.display=enabled?"":"none";
  }

  function apply(){
    if(!isAdvancedEnabled()){
      updateAdvancedToggleUI();
      return;
    }
    const t=get();
    Object.keys(presets.enterprise).forEach(k=>{
      if(k==="name")return;
      setVar(k,valid(t[k],presets.enterprise[k]));
    });
    document.documentElement.style.setProperty("--app-accent",valid(t.accent),"important");
    document.documentElement.style.setProperty("--app-accent-hover",valid(t.accent),"important");
    document.documentElement.style.setProperty("--app-button-text",valid(t.btnPrimaryText),"important");

    // compatibilidade com sistema global antigo
    document.documentElement.style.setProperty("--ts-bg",valid(t.bg),"important");
    document.documentElement.style.setProperty("--ts-bg2",valid(t.bg2),"important");
    document.documentElement.style.setProperty("--ts-card",valid(t.cardBg),"important");
    document.documentElement.style.setProperty("--ts-card-border",valid(t.cardBorder),"important");
    document.documentElement.style.setProperty("--ts-text",valid(t.text),"important");
    document.documentElement.style.setProperty("--ts-title",valid(t.title),"important");
    document.documentElement.style.setProperty("--ts-primary-bg",valid(t.btnPrimaryBg),"important");
    document.documentElement.style.setProperty("--ts-primary-text",valid(t.btnPrimaryText),"important");
    document.documentElement.style.setProperty("--ts-secondary-bg",valid(t.btnSecondaryBg),"important");
    document.documentElement.style.setProperty("--ts-secondary-text",valid(t.btnSecondaryText),"important");
    document.documentElement.style.setProperty("--ts-sidebar-bg",valid(t.sidebarBg),"important");
    document.documentElement.style.setProperty("--ts-sidebar-text",valid(t.sidebarText),"important");
    document.documentElement.style.setProperty("--ts-sidebar-divider",valid(t.sidebarDivider),"important");
    document.documentElement.style.setProperty("--ts-global-button-glow",rgba(t.btnGlow,.28),"important");
    document.documentElement.style.setProperty("--ts-global-card-glow",rgba(t.cardGlow,.14),"important");
  }

  function preset(id){
    if(!presets[id])return;
    save({...presets[id]});
  }

  function update(k,v){
    const t=get();
    t[k]=valid(v,t[k]);
    localStorage.setItem(KEY,JSON.stringify(t));
    apply();
    if(!document.activeElement || !document.activeElement.matches("input[type=color]")) render(false);
    pushSoon();
  }

  function render(doApply=true){
    updateAdvancedToggleUI();
    const root=document.getElementById("advancedColorSystemRoot");
    if(!isAdvancedEnabled()) return;
    if(!root)return;
    if(doApply)apply();
    const t=get();
    root.innerHTML=`
      <div class="acs-presets">
        ${Object.entries(presets).map(([id,p])=>`<button type="button" class="acs-preset" onclick="advancedColorPreset('${id}')"><strong>${p.name}</strong><span><i style="background:${p.bg}"></i><i style="background:${p.cardBg}"></i><i style="background:${p.btnPrimaryBg}"></i><i style="background:${p.sidebarBg}"></i></span></button>`).join("")}
      </div>
      <div class="acs-tabs">
        ${Object.keys(groups).map(g=>`<button type="button" class="secondary-btn ${activeGroup===g?"active":""}" onclick="advancedColorGroup('${g}')">${labelGroup(g)}</button>`).join("")}
      </div>
      <div class="acs-grid">
        ${groups[activeGroup].map(([k,l])=>`<label class="acs-field"><span>${l}</span><input type="color" value="${valid(t[k],presets.enterprise[k])}" onchange="advancedColorUpdate('${k}',this.value)"></label>`).join("")}
      </div>
      <div class="acs-actions">
        <button type="button" class="primary-btn" onclick="advancedColorApplyNow()">Aplicar Sistema Avançado</button>
      </div>
      <div class="acs-preview">
        <strong>Preview</strong>
        <div><button class="primary-btn">Principal</button><button class="secondary-btn">Secundário</button><button class="secondary-btn btn-edit">Editar</button><button class="secondary-btn danger">Apagar</button></div>
      </div>
    `;
  }

  function labelGroup(g){
    return {geral:"Geral",sidebar:"Sidebar",cards:"Cards",botoes:"Botões",inputs:"Inputs",tabelas:"Tabelas",toner:"Toner",configs:"Configs"}[g]||g;
  }

  let timer=null;
  function pushSoon(){clearTimeout(timer);timer=setTimeout(pushFb,800);}
  function db(){return window.db||(window.firebase&&firebase.firestore?firebase.firestore():null);}
  async function pushFb(){if(remote)return;const x=db();if(!x||!x.collection)return;try{await x.collection("appSettings").doc("advancedColorSystemV1").set({data:get(),updatedAt:Date.now()},{merge:true});}catch(e){}}
  function listen(){const x=db();if(!x||!x.collection){setTimeout(listen,1000);return}if(window.__acsUnsub)return;window.__acsUnsub=x.collection("appSettings").doc("advancedColorSystemV1").onSnapshot(doc=>{if(!doc.exists){pushSoon();return}const p=doc.data()||{};if(!p.data)return;const a=document.activeElement;if(a&&a.matches&&a.matches("input,select,textarea"))return;remote=true;localStorage.setItem(KEY,JSON.stringify(p.data));remote=false;apply();render(false);});}

  window.setAdvancedColorSystemEnabled=function(enabled){
    localStorage.setItem(ADVANCED_ENABLED_KEY, enabled ? "1" : "0");
    updateAdvancedToggleUI();
    if(enabled){ apply(); render(false); pushSoon(); }
    else { pushSoon(); }
  };
  window.advancedColorApplyNow=function(){
    apply();
    pushFb();
    render(false);
  };
  window.advancedColorPreset=preset;
  window.advancedColorUpdate=update;
  window.advancedColorGroup=g=>{activeGroup=g;render(false);};

  document.addEventListener("DOMContentLoaded",()=>{apply();render(false);listen();setTimeout(apply,500);setTimeout(apply,1500);});
  window.addEventListener("pageshow",()=>setTimeout(()=>{apply();render(false);},150));
})();
