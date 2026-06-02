
/* APP BRAGA - CENTRO DE CORES UNIFICADO FINAL */
(function(){
  const KEY = "appBragaColorCenterUnifiedV1";
  const COLLECTION = "appSettings";
  const DOC = "colorCenterUnifiedV1";
  let activeTab = "geral";
  let unsub = null;
  let remote = false;

  const presets = {
    enterprise:{name:"Enterprise Blue",bg:"#020617",bg2:"#0f172a",text:"#cbd5e1",title:"#ffffff",accent:"#2563eb",sidebarBg:"#0f172a",sidebarText:"#f8fafc",sidebarIcon:"#f8fafc",sidebarActive:"#2563eb",sidebarDivider:"#334155",sidebarGlow:"#2563eb",brandBg:"#2563eb",brandText:"#ffffff",cardBg:"#111827",cardBorder:"#334155",cardText:"#cbd5e1",cardTitle:"#ffffff",cardGlow:"#2563eb",btnPrimaryBg:"#2563eb",btnPrimaryText:"#ffffff",btnSecondaryBg:"#1f2937",btnSecondaryText:"#f8fafc",btnEditBg:"#1e3a8a",btnEditText:"#dbeafe",btnDeleteBg:"#7f1d1d",btnDeleteText:"#fecaca",btnSuccessBg:"#14532d",btnSuccessText:"#bbf7d0",btnGlow:"#2563eb",inputBg:"#0f172a",inputText:"#ffffff",inputBorder:"#334155",inputFocus:"#2563eb",tableHeadBg:"#1e293b",tableHeadText:"#ffffff",tableRowBg:"#111827",tableRowText:"#cbd5e1",tableBorder:"#334155",tableHover:"#1f2937",tonerGood:"#22c55e",tonerMedium:"#eab308",tonerLow:"#f97316",tonerCritical:"#dc2626",configHeaderBg:"#1f2937",configHeaderText:"#ffffff",configBodyBg:"#111827"},
    graphite:{name:"Graphite Pro",bg:"#09090b",bg2:"#18181b",text:"#d4d4d8",title:"#fafafa",accent:"#71717a",sidebarBg:"#09090b",sidebarText:"#fafafa",sidebarIcon:"#d4d4d8",sidebarActive:"#3f3f46",sidebarDivider:"#3f3f46",sidebarGlow:"#71717a",brandBg:"#52525b",brandText:"#ffffff",cardBg:"#18181b",cardBorder:"#3f3f46",cardText:"#d4d4d8",cardTitle:"#ffffff",cardGlow:"#71717a",btnPrimaryBg:"#52525b",btnPrimaryText:"#ffffff",btnSecondaryBg:"#27272a",btnSecondaryText:"#fafafa",btnEditBg:"#1f2937",btnEditText:"#e5e7eb",btnDeleteBg:"#7f1d1d",btnDeleteText:"#fecaca",btnSuccessBg:"#064e3b",btnSuccessText:"#a7f3d0",btnGlow:"#71717a",inputBg:"#18181b",inputText:"#ffffff",inputBorder:"#3f3f46",inputFocus:"#71717a",tableHeadBg:"#27272a",tableHeadText:"#ffffff",tableRowBg:"#18181b",tableRowText:"#d4d4d8",tableBorder:"#3f3f46",tableHover:"#27272a",tonerGood:"#22c55e",tonerMedium:"#eab308",tonerLow:"#f97316",tonerCritical:"#dc2626",configHeaderBg:"#27272a",configHeaderText:"#ffffff",configBodyBg:"#18181b"},
    ocean:{name:"Ocean Cyan",bg:"#071a2b",bg2:"#083344",text:"#cffafe",title:"#ffffff",accent:"#06b6d4",sidebarBg:"#071a2b",sidebarText:"#cffafe",sidebarIcon:"#67e8f9",sidebarActive:"#0891b2",sidebarDivider:"#0891b2",sidebarGlow:"#06b6d4",brandBg:"#0891b2",brandText:"#ffffff",cardBg:"#0c2538",cardBorder:"#0891b2",cardText:"#cffafe",cardTitle:"#ffffff",cardGlow:"#06b6d4",btnPrimaryBg:"#0891b2",btnPrimaryText:"#ffffff",btnSecondaryBg:"#164e63",btnSecondaryText:"#cffafe",btnEditBg:"#075985",btnEditText:"#e0f2fe",btnDeleteBg:"#7f1d1d",btnDeleteText:"#fecaca",btnSuccessBg:"#14532d",btnSuccessText:"#bbf7d0",btnGlow:"#06b6d4",inputBg:"#0c2538",inputText:"#ffffff",inputBorder:"#0891b2",inputFocus:"#06b6d4",tableHeadBg:"#164e63",tableHeadText:"#ffffff",tableRowBg:"#0c2538",tableRowText:"#cffafe",tableBorder:"#0891b2",tableHover:"#164e63",tonerGood:"#22c55e",tonerMedium:"#eab308",tonerLow:"#f97316",tonerCritical:"#dc2626",configHeaderBg:"#164e63",configHeaderText:"#ffffff",configBodyBg:"#0c2538"},
    violet:{name:"Violet Neon",bg:"#1e102f",bg2:"#2e1065",text:"#ddd6fe",title:"#ffffff",accent:"#8b5cf6",sidebarBg:"#1e102f",sidebarText:"#ede9fe",sidebarIcon:"#c4b5fd",sidebarActive:"#7c3aed",sidebarDivider:"#6d28d9",sidebarGlow:"#8b5cf6",brandBg:"#7c3aed",brandText:"#ffffff",cardBg:"#22113f",cardBorder:"#6d28d9",cardText:"#ddd6fe",cardTitle:"#ffffff",cardGlow:"#8b5cf6",btnPrimaryBg:"#7c3aed",btnPrimaryText:"#ffffff",btnSecondaryBg:"#312e81",btnSecondaryText:"#ede9fe",btnEditBg:"#3730a3",btnEditText:"#e0e7ff",btnDeleteBg:"#881337",btnDeleteText:"#fce7f3",btnSuccessBg:"#14532d",btnSuccessText:"#bbf7d0",btnGlow:"#8b5cf6",inputBg:"#2e1065",inputText:"#ffffff",inputBorder:"#6d28d9",inputFocus:"#8b5cf6",tableHeadBg:"#312e81",tableHeadText:"#ffffff",tableRowBg:"#22113f",tableRowText:"#ddd6fe",tableBorder:"#6d28d9",tableHover:"#312e81",tonerGood:"#22c55e",tonerMedium:"#eab308",tonerLow:"#f97316",tonerCritical:"#dc2626",configHeaderBg:"#312e81",configHeaderText:"#ffffff",configBodyBg:"#22113f"},
    ice:{name:"Ice White",bg:"#e5e7eb",bg2:"#f8fafc",text:"#334155",title:"#0f172a",accent:"#2563eb",sidebarBg:"#f8fafc",sidebarText:"#0f172a",sidebarIcon:"#334155",sidebarActive:"#2563eb",sidebarDivider:"#cbd5e1",sidebarGlow:"#2563eb",brandBg:"#2563eb",brandText:"#ffffff",cardBg:"#ffffff",cardBorder:"#cbd5e1",cardText:"#334155",cardTitle:"#0f172a",cardGlow:"#94a3b8",btnPrimaryBg:"#2563eb",btnPrimaryText:"#ffffff",btnSecondaryBg:"#e2e8f0",btnSecondaryText:"#0f172a",btnEditBg:"#dbeafe",btnEditText:"#1e3a8a",btnDeleteBg:"#fee2e2",btnDeleteText:"#991b1b",btnSuccessBg:"#dcfce7",btnSuccessText:"#166534",btnGlow:"#2563eb",inputBg:"#ffffff",inputText:"#0f172a",inputBorder:"#cbd5e1",inputFocus:"#2563eb",tableHeadBg:"#e2e8f0",tableHeadText:"#0f172a",tableRowBg:"#ffffff",tableRowText:"#334155",tableBorder:"#cbd5e1",tableHover:"#f1f5f9",tonerGood:"#22c55e",tonerMedium:"#eab308",tonerLow:"#f97316",tonerCritical:"#dc2626",configHeaderBg:"#e2e8f0",configHeaderText:"#0f172a",configBodyBg:"#ffffff"}
  };

  const groups = {
    geral:[["bg","Fundo principal"],["bg2","Fundo secundário"],["text","Texto geral"],["title","Títulos"],["accent","Cor destaque"]],
    sidebar:[["sidebarBg","Fundo sidebar"],["sidebarText","Texto sidebar"],["sidebarIcon","Ícones sidebar"],["sidebarActive","Botão ativo"],["sidebarDivider","Linha sidebar/app"],["sidebarGlow","Glow sidebar"],["brandBg","Logo BR fundo"],["brandText","Logo BR letra"]],
    cards:[["cardBg","Cards fundo"],["cardBorder","Cards borda"],["cardText","Cards texto"],["cardTitle","Cards títulos"],["cardGlow","Cards glow"]],
    botoes:[["btnPrimaryBg","Principal fundo"],["btnPrimaryText","Principal letra"],["btnSecondaryBg","Secundário fundo"],["btnSecondaryText","Secundário letra"],["btnEditBg","Editar fundo"],["btnEditText","Editar letra"],["btnDeleteBg","Apagar fundo"],["btnDeleteText","Apagar letra"],["btnSuccessBg","Confirmar fundo"],["btnSuccessText","Confirmar letra"],["btnBorder","Linha/Borda dos botões"],["btnGlow","Glow botões"]],
    inputs:[["inputBg","Inputs fundo"],["inputText","Inputs texto"],["inputBorder","Inputs borda"],["inputFocus","Inputs focus"]],
    tabelas:[["tableHeadBg","Cabeçalho fundo"],["tableHeadText","Cabeçalho texto"],["tableRowBg","Linhas fundo"],["tableRowText","Linhas texto"],["tableBorder","Bordas"],["tableHover","Hover"]],
    toner:[["tonerGood","Toner bom"],["tonerMedium","Toner médio"],["tonerLow","Toner baixo"],["tonerCritical","Toner crítico"]],
    configs:[["configHeaderBg","Header colapsável"],["configHeaderText","Texto header"],["configBodyBg","Cor corpo configs"]]
  };

  function valid(v,f="#2563eb"){v=String(v||"").trim();return /^#[0-9a-fA-F]{6}$/.test(v)?v.toLowerCase():f;}
  function rgba(hex,a){hex=valid(hex).replace("#","");return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${a})`;}
  function get(){try{return {...presets.enterprise,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch(e){return {...presets.enterprise};}}
  function setVar(k,v){document.documentElement.style.setProperty("--cc-"+k.replace(/[A-Z]/g,m=>"-"+m.toLowerCase()),v,"important");}
  function save(t,push=true){localStorage.setItem(KEY,JSON.stringify(t));apply();render(false);if(push)pushSoon();}

  function apply(){
    const t=get();
    Object.keys(presets.enterprise).forEach(k=>{if(k!=="name")setVar(k,valid(t[k],presets.enterprise[k]));});
    const compat={"--ts-bg":t.bg,"--ts-bg2":t.bg2,"--ts-card":t.cardBg,"--ts-card-border":t.cardBorder,"--ts-text":t.text,"--ts-title":t.title,"--ts-primary-bg":t.btnPrimaryBg,"--ts-primary-text":t.btnPrimaryText,"--ts-secondary-bg":t.btnSecondaryBg,"--ts-secondary-text":t.btnSecondaryText,"--ts-sidebar-bg":t.sidebarBg,"--ts-sidebar-text":t.sidebarText,"--ts-sidebar-divider":t.sidebarDivider,"--app-accent":t.accent,"--app-accent-hover":t.accent,"--app-button-text":t.btnPrimaryText};
    Object.entries(compat).forEach(([k,v])=>document.documentElement.style.setProperty(k,valid(v),"important"));
    document.documentElement.style.setProperty("--ts-global-button-glow",rgba(t.btnGlow,.28),"important");
    document.documentElement.style.setProperty("--ts-global-card-glow",rgba(t.cardGlow,.14),"important");
    applyLegacyAliases();
    applyHardOverrides();
    applyGlowKill();
  }



  function applyLegacyAliases(){
    const t=get();
    const aliases = {
      "--orange": t.accent,
      "--pink": t.accent,
      "--red": t.btnDeleteBg,
      "--green": t.btnSuccessBg,
      "--blue": t.btnPrimaryBg,
      "--primary": t.btnPrimaryBg,
      "--primary-color": t.btnPrimaryBg,
      "--secondary": t.btnSecondaryBg,
      "--accent": t.accent,
      "--brand": t.accent,
      "--app-primary": t.btnPrimaryBg,
      "--app-accent": t.accent,
      "--app-accent-hover": t.accent,
      "--app-button-text": t.btnPrimaryText,
      "--button-bg": t.btnPrimaryBg,
      "--button-text": t.btnPrimaryText,
      "--button-border": t.btnBorder || t.cardBorder,
      "--text": t.text,
      "--muted": t.text,
      "--title": t.title,
      "--bg": t.bg,
      "--bg2": t.bg2,
      "--card": t.cardBg,
      "--line": t.cardBorder,
      "--border": t.cardBorder,

      "--ts-bg": t.bg,
      "--ts-bg2": t.bg2,
      "--ts-card": t.cardBg,
      "--ts-card2": t.cardBg,
      "--ts-card-border": t.cardBorder,
      "--ts-text": t.text,
      "--ts-muted": t.text,
      "--ts-title": t.title,
      "--ts-primary-bg": t.btnPrimaryBg,
      "--ts-primary-text": t.btnPrimaryText,
      "--ts-primary-border": t.btnBorder || t.btnPrimaryBg,
      "--ts-secondary-bg": t.btnSecondaryBg,
      "--ts-secondary-text": t.btnSecondaryText,
      "--ts-secondary-border": t.btnBorder || t.cardBorder,
      "--ts-edit-bg": t.btnEditBg,
      "--ts-edit-text": t.btnEditText,
      "--ts-edit-border": t.btnBorder || t.btnEditBg,
      "--ts-danger-bg": t.btnDeleteBg,
      "--ts-danger-text": t.btnDeleteText,
      "--ts-danger-border": t.btnBorder || t.btnDeleteBg,
      "--ts-success-bg": t.btnSuccessBg,
      "--ts-success-text": t.btnSuccessText,
      "--ts-success-border": t.btnBorder || t.btnSuccessBg,
      "--ts-input-bg": t.inputBg,
      "--ts-input-text": t.inputText,
      "--ts-input-border": t.inputBorder,
      "--ts-sidebar-bg": t.sidebarBg,
      "--ts-sidebar-text": t.sidebarText,
      "--ts-sidebar-icon": t.sidebarIcon,
      "--ts-sidebar-active-bg": t.sidebarActive,
      "--ts-sidebar-active-text": "#ffffff",
      "--ts-sidebar-divider": t.sidebarDivider,
      "--ts-sidebar-brand-bg": t.brandBg,
      "--ts-sidebar-brand-text": t.brandText
    };
    Object.entries(aliases).forEach(([k,v])=>{
      document.documentElement.style.setProperty(k, valid(v), "important");
    });
    document.documentElement.style.setProperty("--ts-global-button-glow", rgba(t.btnGlow,.28), "important");
    document.documentElement.style.setProperty("--ts-global-card-glow", rgba(t.cardGlow,.14), "important");
  }


  function applyHardOverrides(){
    const t=get();
    const style=(selector,bg,txt,border)=>{
      document.querySelectorAll(selector).forEach(el=>{
        el.style.setProperty("background", valid(bg), "important");
        el.style.setProperty("color", valid(txt), "important");
        el.style.setProperty("border-color", valid(border), "important");
      });
    };

    style("button,.btn,.secondary-btn,.reference-outline,.enterprise-btn", t.btnSecondaryBg, t.btnSecondaryText, t.cardBorder);
    style(".primary-btn,.reference-primary,.btn-primary,.add-btn,.save-btn,button[type='submit'],button.primary,button[onclick*='guardar'],button[onclick*='Guardar'],button[onclick*='adicionar'],button[onclick*='Adicionar'],button[onclick*='export'],button[onclick*='Export'],button[onclick*='verificar'],button[onclick*='Verificar']", t.btnPrimaryBg, t.btnPrimaryText, t.btnPrimaryBg);
    style(".btn-edit,.edit-btn,button[onclick*='editar'],button[onclick*='Editar'],button[title*='Editar']", t.btnEditBg, t.btnEditText, t.btnEditBg);
    style(".danger,.btn-delete,.delete-btn,button.danger,button[onclick*='apagar'],button[onclick*='Apagar'],button[title*='Apagar']", t.btnDeleteBg, t.btnDeleteText, t.btnDeleteBg);
    style(".btn-use,.success,button[onclick*='confirmar'],button[onclick*='Confirmar'],button[onclick*='usar'],button[onclick*='Usar']", t.btnSuccessBg, t.btnSuccessText, t.btnSuccessBg);

    document.querySelectorAll("h1,h2,h3,h4,h5,h6,strong,b,.card-title,.section-title,.reference-header h1,.reference-panel h3,.config-card h3").forEach(el=>{
      el.style.setProperty("color", valid(t.title), "important");
    });

    document.querySelectorAll("p,span,small,label,td,option,.section-subtitle,.meta-line,.radio-card-user,.reference-empty").forEach(el=>{
      if(el.closest("button")) return;
      el.style.setProperty("color", valid(t.text), "important");
    });

    document.querySelectorAll(".sidebar a,.enterprise-sidebar a,.nav-link,.menu-item").forEach(el=>{
      el.style.setProperty("color", valid(t.sidebarText), "important");
    });
  }


  function applyGlowKill(){
    const t = get();
    const btnShadow = `0 0 30px ${rgba(t.btnGlow,.34)}, 0 12px 28px rgba(0,0,0,.24)`;
    const cardShadow = `0 18px 48px ${rgba(t.cardGlow,.18)}, 0 14px 40px rgba(0,0,0,.22)`;
    const sideShadow = `0 0 36px ${rgba(t.sidebarGlow,.42)}`;

    document.querySelectorAll("button,.btn,.primary-btn,.secondary-btn,.reference-primary,.reference-outline,.enterprise-btn,[class*='btn']").forEach(el=>{
      el.style.setProperty("box-shadow", btnShadow, "important");
      el.style.setProperty("border-color", valid(t.btnBorder || t.cardBorder), "important");
      el.style.setProperty("text-shadow", "none", "important");
    });

    document.querySelectorAll(".card,.panel,.reference-panel,.reference-card,.config-card,.enterprise-config-card,.dashboard-card,.stat-card,.metric-card,.pc-card,.radio-card,.info-card,.info-list-item,.user-card,.printer-card,.stock-card,.history-card,.modal-card,.table-card,.form-card").forEach(el=>{
      el.style.setProperty("box-shadow", cardShadow, "important");
      el.style.setProperty("text-shadow", "none", "important");
    });

    document.querySelectorAll(".sidebar a.active,.enterprise-sidebar a.active,.app-sidebar a.active,.nav-link.active,.menu-item.active").forEach(el=>{
      el.style.setProperty("box-shadow", sideShadow, "important");
      el.style.setProperty("text-shadow", "none", "important");
    });

    document.querySelectorAll(".printer-toner-bar,.toner-fill,.toner-bar-fill,.progress-fill,.stock-progress-fill").forEach(el=>{
      el.style.setProperty("box-shadow", "none", "important");
    });
  }


  function groupLabel(g){return {geral:"Geral",sidebar:"Sidebar",cards:"Cards",botoes:"Botões",inputs:"Inputs",tabelas:"Tabelas",toner:"Toner",configs:"Configs"}[g]||g;}

  function render(doApply=true){
    const root=document.getElementById("colorCenterRoot");
    if(!root)return;
    if(doApply)apply();
    const t=get();
    root.innerHTML = `
      <div class="cc-presets">${Object.entries(presets).map(([id,p])=>`
        <button type="button" class="cc-preset" onclick="colorCenterPreset('${id}')">
          <strong>${p.name}</strong>
          <span><i style="background:${p.bg}"></i><i style="background:${p.cardBg}"></i><i style="background:${p.btnPrimaryBg}"></i><i style="background:${p.sidebarBg}"></i></span>
        </button>`).join("")}</div>
      <div class="cc-tabs">${Object.keys(groups).map(g=>`<button type="button" class="secondary-btn ${activeTab===g?"active":""}" onclick="colorCenterTab('${g}')">${groupLabel(g)}</button>`).join("")}</div>
      <div class="cc-grid">${groups[activeTab].map(([k,l])=>`<label class="cc-field"><span>${l}</span><input type="color" value="${valid(t[k],presets.enterprise[k])}" onchange="colorCenterUpdate('${k}',this.value)"></label>`).join("")}</div>
      <div class="cc-actions"><button type="button" class="primary-btn" onclick="colorCenterApply()">Aplicar Centro de Cores</button><span id="colorCenterStatus"></span></div>
      <div class="cc-preview"><strong>Preview</strong><div><button class="primary-btn">Principal</button><button class="secondary-btn">Secundário</button><button class="secondary-btn btn-edit">Editar</button><button class="secondary-btn danger">Apagar</button></div></div>
    `;
  }

  function preset(id){if(presets[id])save({...presets[id]});}
  function update(k,v){const t=get();t[k]=valid(v,t[k]);localStorage.setItem(KEY,JSON.stringify(t));apply();pushSoon();}
  function forceApply(){apply();pushFb();try{if(typeof window.configExpandAll==="function"){} }catch(e){} const s=document.getElementById("colorCenterStatus"); if(s){s.textContent="Aplicado.";s.classList.add("ok");setTimeout(()=>{s.textContent="";s.classList.remove("ok");},2000);}}

  let timer=null;
  function pushSoon(){clearTimeout(timer);timer=setTimeout(pushFb,700);}
  function db(){return window.db||(window.firebase&&firebase.firestore?firebase.firestore():null);}
  async function pushFb(){if(remote)return;const x=db();if(!x||!x.collection)return;try{await x.collection(COLLECTION).doc(DOC).set({data:get(),updatedAt:Date.now()},{merge:true});}catch(e){}}
  function listen(){const x=db();if(!x||!x.collection){setTimeout(listen,1000);return;}if(unsub)return;unsub=x.collection(COLLECTION).doc(DOC).onSnapshot(doc=>{if(!doc.exists){pushSoon();return;}const p=doc.data()||{};if(!p.data)return;const a=document.activeElement;if(a&&a.matches&&a.matches("input,select,textarea"))return;remote=true;localStorage.setItem(KEY,JSON.stringify(p.data));remote=false;apply();render(false);});}

  window.colorCenterPreset=preset;
  window.colorCenterUpdate=update;
  window.colorCenterTab=function(g){activeTab=g;render(false);};
  window.colorCenterApply=forceApply;
  window.initColorCenterUnified=function(){apply();render(false);listen();};

  document.addEventListener("DOMContentLoaded",()=>{ try{ apply(); }catch(e){}; if(document.getElementById("colorCenterRoot")) window.initColorCenterUnified(); });
  window.addEventListener("pageshow",()=>setTimeout(()=>{ try{ apply(); }catch(e){}; if(document.getElementById("colorCenterRoot")) window.initColorCenterUnified(); },120));
})();
