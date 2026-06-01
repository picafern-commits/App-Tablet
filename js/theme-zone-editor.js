
/* APP BRAGA - ZONE BUTTON EDITOR */
(function(){
  const STORAGE = "appBragaZoneButtonEditorV1";
  let currentPage = "";
  let currentZone = "";
  let currentTab = "buttons";

  const pages = {
    "index.html": {
      label: "Dashboard",
      zones: [
        {id:"dashboard-hero", label:"Topo / Cabeçalho", selectors:[".dashboard-header",".page-hero",".reference-header"]},
        {id:"dashboard-cards", label:"Cards / Equipamentos em destaque", selectors:[".dashboard-grid",".stats-grid",".cards-grid",".dashboard-card",".stat-card",".metric-card"]},
        {id:"dashboard-actions", label:"Ações da Dashboard", selectors:[".dashboard-actions",".card-actions",".toolbar"]}
      ]
    },
    "users.html": {
      label: "Users",
      zones: [
        {id:"users-toolbar", label:"Topo / Pesquisa / Ações", selectors:[".toolbar",".reference-header",".page-hero"]},
        {id:"users-cards", label:"Cards dos Users", selectors:[".users-grid",".user-card",".pc-card",".cards-grid"]},
        {id:"users-print", label:"Botões de Impressão", selectors:["button[onclick*='imprimir']", "button[onclick*='Imprimir']"]}
      ]
    },
    "radios.html": {
      label: "Rádios",
      zones: [
        {id:"radios-toolbar", label:"Topo / Pesquisa / Select", selectors:[".radio-toolbar",".radio-selected-actions",".reference-header"]},
        {id:"radios-cards", label:"Cards dos Rádios", selectors:[".radio-cards-grid",".radio-card"]},
        {id:"radios-weekly", label:"Relatório Semanal", selectors:[".weekly-radio-row",".radio-record-row",".weekly-record-actions"]}
      ]
    },
    "pistolas.html": {
      label: "Pistolas CK65",
      zones: [
        {id:"pistolas-toolbar", label:"Topo / Ações", selectors:[".toolbar",".reference-header",".page-hero"]},
        {id:"pistolas-cards", label:"Cards das Pistolas", selectors:[".pistol-card",".pc-card",".cards-grid"]},
        {id:"pistolas-actions", label:"Botões dos Cards", selectors:[".item-actions",".card-actions"]}
      ]
    },
    "portas.html": {
      label: "Portas Rede",
      zones: [
        {id:"portas-toolbar", label:"Topo / Ações", selectors:[".toolbar",".reference-header",".page-hero"]},
        {id:"portas-cards", label:"Cards / Tabela Portas", selectors:[".pc-card",".cards-grid",".table-card","table"]},
        {id:"portas-actions", label:"Botões Portas", selectors:[".item-actions",".card-actions"]}
      ]
    },
    "informacoes.html": {
      label: "Informações",
      zones: [
        {id:"infos-toolbar", label:"Topo / Pesquisa / Novo", selectors:[".toolbar",".reference-header",".page-hero"]},
        {id:"infos-cards", label:"Cards Informações", selectors:[".info-card",".info-grid",".cards-grid"]},
        {id:"infos-actions", label:"Botões Ver Mais / Editar / Apagar", selectors:[".item-actions",".card-actions",".info-actions"]}
      ]
    },
    "impressoras.html": {
      label: "Impressoras",
      zones: [
        {id:"impressoras-toolbar", label:"Topo / Ações", selectors:[".toolbar",".reference-header",".page-hero"]},
        {id:"impressoras-cards", label:"Cards Impressoras", selectors:[".printer-card",".pc-card",".cards-grid"]},
        {id:"impressoras-actions", label:"Botões Impressoras", selectors:[".item-actions",".card-actions"]}
      ]
    },
    "manutencao-impressoras.html": {
      label: "Manutenção Impressoras",
      zones: [
        {id:"manutencao-toolbar", label:"Topo / Ações", selectors:[".toolbar",".reference-header",".page-hero"]},
        {id:"manutencao-cards", label:"Cards Manutenção", selectors:[".card",".panel",".history-card"]},
        {id:"manutencao-actions", label:"Botões Manutenção", selectors:[".item-actions",".card-actions",".toolbar"]}
      ]
    },
    "stock.html": {
      label: "Stock",
      zones: [
        {id:"stock-toolbar", label:"Topo / Ações", selectors:[".toolbar",".reference-header",".page-hero"]},
        {id:"stock-cards", label:"Cards Stock", selectors:[".stock-card",".card",".cards-grid"]},
        {id:"stock-actions", label:"Botões Stock", selectors:[".item-actions",".card-actions"]}
      ]
    },
    "historico.html": {
      label: "Histórico",
      zones: [
        {id:"historico-toolbar", label:"Filtros / Pesquisa", selectors:[".toolbar",".reference-header",".page-hero"]},
        {id:"historico-cards", label:"Cards / Registos", selectors:[".history-card",".card",".cards-grid"]},
        {id:"historico-actions", label:"Botões Histórico", selectors:[".item-actions",".card-actions"]}
      ]
    },
    "add-toner.html": {
      label: "Adicionar Toner",
      zones: [
        {id:"add-toner-form", label:"Formulário", selectors:[".form-card",".panel",".card","form"]},
        {id:"add-toner-actions", label:"Botões Formulário", selectors:["form button",".card-actions",".form-actions"]}
      ]
    },
    "computadores.html": {
      label: "Computadores",
      zones: [
        {id:"pcs-toolbar", label:"Topo / Ações", selectors:[".toolbar",".reference-header",".page-hero"]},
        {id:"pcs-cards", label:"Cards Computadores", selectors:[".pc-card",".cards-grid"]},
        {id:"pcs-actions", label:"Botões Computadores", selectors:[".item-actions",".card-actions"]}
      ]
    },
    "etiquetas-word.html": {
      label: "Etiquetas Word",
      zones: [
        {id:"etiquetas-form", label:"Formulário / Scan", selectors:[".form-card",".panel",".card","form"]},
        {id:"etiquetas-actions", label:"Botões Etiquetas", selectors:["button",".card-actions",".form-actions"]}
      ]
    },
    "config.html": {
      label: "Configurações",
      zones: [
        {id:"config-theme", label:"Theme Studio", selectors:[".theme-studio-pro",".theme-simple-layout",".theme-zone-editor"]},
        {id:"config-cards", label:"Cards Configs", selectors:[".config-card",".settings-grid",".config-grid"]},
        {id:"config-actions", label:"Botões Configs", selectors:[".config-card button",".theme-simple-actions",".zone-actions"]}
      ]
    }
  };

  function safe(v){return String(v ?? "").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]||c));}
  function valid(v,f="#2563eb"){v=String(v||"").trim();return /^#[0-9a-fA-F]{6}$/.test(v)?v.toLowerCase():f;}
  function rgba(hex,a){hex=valid(hex).replace("#","");return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${a})`;}

  function getStore(){try{return JSON.parse(localStorage.getItem(STORAGE)||"{}");}catch(e){return {};}}
  function saveStore(data){localStorage.setItem(STORAGE,JSON.stringify(data)); applyZoneStyles(); renderZoneEditor();}
  function pageKey(){return (location.pathname.split("/").pop() || "index.html");}

  function getPageConfig(key=currentPage){return pages[key] || pages["index.html"];}
  function getZoneConfig(page=currentPage, zone=currentZone){
    const p=getPageConfig(page);
    return (p.zones||[]).find(z=>z.id===zone) || (p.zones||[])[0];
  }

  function zoneStore(page=currentPage, zone=currentZone){
    const s=getStore();
    if(!s[page]) s[page]={};
    if(!s[page][zone]) s[page][zone]={box:{},buttons:{}};
    return s[page][zone];
  }

  function getZoneElements(page=pageKey()){
    const p=getPageConfig(page);
    let elements=[];
    (p.zones||[]).forEach(zone=>{
      zone.selectors.forEach(sel=>{
        try{document.querySelectorAll(sel).forEach(el=>elements.push({el,zone}));}catch(e){}
      });
    });
    return elements;
  }

  function getButtonsForZone(page=currentPage, zone=currentZone){
    const z=getZoneConfig(page,zone);
    if(!z) return [];
    let roots=[];
    z.selectors.forEach(sel=>{try{document.querySelectorAll(sel).forEach(el=>roots.push(el));}catch(e){}});
    const buttons=[];
    roots.forEach(root=>{
      if(root.matches && root.matches("button,a.btn,.primary-btn,.secondary-btn,[class*='btn']")) buttons.push(root);
      root.querySelectorAll && root.querySelectorAll("button,a.btn,.primary-btn,.secondary-btn,.reference-primary,.reference-outline,[class*='btn']").forEach(btn=>buttons.push(btn));
    });
    return [...new Set(buttons)].map((btn,idx)=>({
      key: getButtonKey(btn,idx),
      label: getButtonLabel(btn,idx),
      element: btn
    }));
  }

  function getButtonLabel(btn,idx){
    const txt=(btn.textContent||btn.getAttribute("title")||btn.getAttribute("aria-label")||"").replace(/\s+/g," ").trim();
    const onclick=btn.getAttribute("onclick")||"";
    if(txt) return txt;
    if(onclick.includes("imprimir")) return "Imprimir";
    if(onclick.includes("editar")) return "Editar";
    if(onclick.includes("apagar")) return "Apagar";
    if(onclick.includes("guardar")) return "Guardar";
    if(onclick.includes("adicionar")) return "Adicionar";
    return "Botão " + (idx+1);
  }

  function getButtonKey(btn,idx){
    const onclick=(btn.getAttribute("onclick")||"").replace(/[^a-zA-Z0-9_]/g,"").slice(0,42);
    const txt=getButtonLabel(btn,idx).replace(/[^a-zA-Z0-9À-ÿ]/g,"_").slice(0,32);
    return (onclick || txt || "button") + "_" + idx;
  }

  function defaultButtonStyle(label=""){
    const l=label.toLowerCase();
    if(l.includes("apagar")||l.includes("delete")) return {bg:"#7f1d1d",text:"#fecaca",border:"#ef4444",glow:"#ef4444"};
    if(l.includes("editar")) return {bg:"#1e3a8a",text:"#dbeafe",border:"#3b82f6",glow:"#3b82f6"};
    if(l.includes("guardar")||l.includes("confirmar")||l.includes("usar")) return {bg:"#14532d",text:"#bbf7d0",border:"#22c55e",glow:"#22c55e"};
    if(l.includes("imprimir")) return {bg:"#4c1d95",text:"#ede9fe",border:"#8b5cf6",glow:"#8b5cf6"};
    return {bg:"#1f2937",text:"#f8fafc",border:"#475569",glow:"#2563eb"};
  }

  function applyZoneStyles(){
    const store=getStore();
    const page=pageKey();
    const pageData=store[page]||{};

    Object.entries(pageData).forEach(([zoneId,data])=>{
      const zone=(getPageConfig(page).zones||[]).find(z=>z.id===zoneId);
      if(!zone) return;

      let zoneEls=[];
      zone.selectors.forEach(sel=>{try{document.querySelectorAll(sel).forEach(el=>zoneEls.push(el));}catch(e){}});
      zoneEls=[...new Set(zoneEls)];

      const box=data.box||{};
      zoneEls.forEach(el=>{
        if(el.matches && el.matches("button,a.btn,.primary-btn,.secondary-btn,[class*='btn']")) return;
        el.classList.add("theme-zone-target");
        if(box.bg) el.style.setProperty("background",valid(box.bg),"important");
        if(box.border) el.style.setProperty("border-color",valid(box.border),"important");
        if(box.text) el.style.setProperty("color",valid(box.text),"important");
        if(box.glow) el.style.setProperty("box-shadow",`0 18px 48px ${rgba(box.glow,.18)}, 0 14px 40px rgba(0,0,0,.20)`,"important");
      });

      const buttons=getButtonsForZone(page,zoneId);
      buttons.forEach((b,idx)=>{
        const style=(data.buttons||{})[b.key];
        if(!style) return;
        b.element.classList.add("theme-zone-button-custom");
        b.element.style.setProperty("background",valid(style.bg),"important");
        b.element.style.setProperty("color",valid(style.text),"important");
        b.element.style.setProperty("border-color",valid(style.border),"important");
        b.element.style.setProperty("box-shadow",`0 0 34px ${rgba(style.glow,.34)}, 0 12px 28px rgba(0,0,0,.24)`,"important");
      });
    });
  }

  function updateBox(prop,value){
    const s=getStore();
    if(!s[currentPage]) s[currentPage]={};
    if(!s[currentPage][currentZone]) s[currentPage][currentZone]={box:{},buttons:{}};
    s[currentPage][currentZone].box[prop]=valid(value);
    localStorage.setItem(STORAGE,JSON.stringify(s));
    applyZoneStyles();
    renderZoneEditor(false);
  }

  function updateButton(btnKey,prop,value){
    const s=getStore();
    if(!s[currentPage]) s[currentPage]={};
    if(!s[currentPage][currentZone]) s[currentPage][currentZone]={box:{},buttons:{}};
    if(!s[currentPage][currentZone].buttons[btnKey]) s[currentPage][currentZone].buttons[btnKey]={};
    s[currentPage][currentZone].buttons[btnKey][prop]=valid(value);
    localStorage.setItem(STORAGE,JSON.stringify(s));
    applyZoneStyles();
    renderZoneEditor(false);
  }

  function renderPageSelect(){
    return `<label><span>Select página</span><select id="zonePageSelect" onchange="themeZoneSetPage(this.value)">
      ${Object.entries(pages).map(([k,p])=>`<option value="${k}" ${k===currentPage?"selected":""}>${safe(p.label)}</option>`).join("")}
    </select></label>`;
  }

  function renderZoneSelect(){
    const p=getPageConfig();
    return `<label><span>Select Box / Zona</span><select id="zoneBoxSelect" onchange="themeZoneSetZone(this.value)">
      ${(p.zones||[]).map(z=>`<option value="${z.id}" ${z.id===currentZone?"selected":""}>${safe(z.label)}</option>`).join("")}
    </select></label>`;
  }

  function renderBoxEditor(){
    const zs=zoneStore();
    const box={bg:"#111827",border:"#334155",text:"#cbd5e1",glow:"#2563eb",...(zs.box||{})};
    return `<div class="zone-box-style-grid">
      ${[
        ["bg","Fundo da box"],["border","Borda da box"],["text","Texto da box"],["glow","Glow da box"]
      ].map(([k,label])=>`<label class="zone-box-style-field"><span>${label}</span><input type="color" value="${valid(box[k])}" onchange="themeZoneUpdateBox('${k}',this.value)"></label>`).join("")}
    </div>`;
  }

  function renderButtonsEditor(){
    const buttons=getButtonsForZone();
    const data=zoneStore();
    if(!buttons.length) return `<div class="zone-empty">Esta box ainda não tem botões detetados nesta página. Abre a página certa ou escolhe outra box.</div>`;

    return `<div class="zone-buttons-list">
      ${buttons.map((b,idx)=>{
        const d={...defaultButtonStyle(b.label),...((data.buttons||{})[b.key]||{})};
        return `<div class="zone-button-card">
          <div class="zone-button-header">
            <strong>${safe(b.label)}</strong>
            <div class="zone-button-preview" style="background:${valid(d.bg)};color:${valid(d.text)};border-color:${valid(d.border)};box-shadow:0 0 26px ${rgba(d.glow,.34)}">${safe(b.label)}</div>
          </div>
          <div class="zone-button-fields">
            <label class="zone-button-field"><span>Cor botão</span><input type="color" value="${valid(d.bg)}" onchange="themeZoneUpdateButton('${safe(b.key)}','bg',this.value)"></label>
            <label class="zone-button-field"><span>Cor letra</span><input type="color" value="${valid(d.text)}" onchange="themeZoneUpdateButton('${safe(b.key)}','text',this.value)"></label>
            <label class="zone-button-field"><span>Cor borda</span><input type="color" value="${valid(d.border)}" onchange="themeZoneUpdateButton('${safe(b.key)}','border',this.value)"></label>
            <label class="zone-button-field"><span>Glow</span><input type="color" value="${valid(d.glow)}" onchange="themeZoneUpdateButton('${safe(b.key)}','glow',this.value)"></label>
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }

  function renderZoneEditor(refreshSelectors=true){
    const root=document.getElementById("themeZoneEditorRoot");
    if(!root) return;
    if(!currentPage) currentPage=pageKey();
    if(!pages[currentPage]) currentPage="index.html";
    if(!currentZone) currentZone=getPageConfig().zones[0].id;

    const p=getPageConfig();
    const z=getZoneConfig();

    root.innerHTML=`
      <div class="theme-zone-controls">${renderPageSelect()}${renderZoneSelect()}</div>
      <div class="zone-selected-preview">
        <strong>${safe(p.label)} → ${safe(z.label)}</strong>
        <small>Escolhe uma box/zona e edita as cores da própria box ou dos botões detetados dentro dela.</small>
      </div>
      <div class="zone-editor-tabs">
        <button class="secondary-btn ${currentTab==="buttons"?"active":""}" onclick="themeZoneSetTab('buttons')">Botões da box</button>
        <button class="secondary-btn ${currentTab==="box"?"active":""}" onclick="themeZoneSetTab('box')">Cores da box</button>
      </div>
      ${currentTab==="buttons"?renderButtonsEditor():renderBoxEditor()}
      <div class="zone-actions">
        <button class="secondary-btn" onclick="themeZoneResetCurrent()">Repor esta box</button>
        <button class="secondary-btn" onclick="themeZoneExport()">Exportar zonas</button>
        <button class="secondary-btn" onclick="themeZoneImport()">Importar zonas</button>
      </div>
    `;
    applyZoneStyles();
  }

  function resetCurrent(){
    const s=getStore();
    if(s[currentPage] && s[currentPage][currentZone]) delete s[currentPage][currentZone];
    saveStore(s);
  }

  function exp(){
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify(getStore(),null,2)],{type:"application/json"}));
    a.download="app-braga-zonas-botoes.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function imp(){
    const input=document.createElement("input");
    input.type="file"; input.accept="application/json";
    input.onchange=()=>{
      const f=input.files&&input.files[0]; if(!f)return;
      const r=new FileReader();
      r.onload=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(JSON.parse(r.result))); applyZoneStyles(); renderZoneEditor();}catch(e){alert("Ficheiro inválido.");}};
      r.readAsText(f);
    };
    input.click();
  }

  function init(){
    currentPage=pageKey();
    if(!pages[currentPage]) currentPage="index.html";
    currentZone=getPageConfig().zones[0].id;
    renderZoneEditor();
    applyZoneStyles();
    setTimeout(()=>{renderZoneEditor();applyZoneStyles();},500);
    setTimeout(()=>{renderZoneEditor();applyZoneStyles();},1500);

    const obs=new MutationObserver(()=>applyZoneStyles());
    if(document.body) obs.observe(document.body,{childList:true,subtree:true});
  }

  window.themeZoneSetPage=function(p){currentPage=p; currentZone=getPageConfig().zones[0].id; renderZoneEditor();};
  window.themeZoneSetZone=function(z){currentZone=z; renderZoneEditor();};
  window.themeZoneSetTab=function(t){currentTab=t; renderZoneEditor();};
  window.themeZoneUpdateBox=updateBox;
  window.themeZoneUpdateButton=updateButton;
  window.themeZoneResetCurrent=resetCurrent;
  window.themeZoneExport=exp;
  window.themeZoneImport=imp;
  window.themeZoneRender=renderZoneEditor;
  window.themeZoneApply=applyZoneStyles;

  document.addEventListener("DOMContentLoaded",init);
  window.addEventListener("pageshow",()=>setTimeout(()=>{renderZoneEditor();applyZoneStyles();},200));
})();
