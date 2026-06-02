
(function(){
  const STORE="appBragaPageBoxThemeV2";
  const C="appSettings";
  const D="themePageBoxEditorV2";
  let page="", box="", mode="box", unsub=null, remote=false;

  const pages={
    "index.html":["Dashboard",[["dash-top","Topo / Resumo",[".page-hero",".dashboard-header",".reference-header",".topbar"]],["dash-cards","Equipamentos em Destaque / Cards",[".dashboard-grid",".cards-grid",".dashboard-card",".stat-card",".metric-card"]],["dash-actions","Botões Dashboard",[".toolbar",".card-actions",".item-actions",".dashboard-actions"]]]],
    "impressoras.html":["Impressoras",[["imp-top","Topo / Diagnóstico",[".page-hero",".reference-header",".toner-diagnostics-panel",".toolbar"]],["imp-list","Lista / Tabela Impressoras",["table",".table-card",".printer-card",".pc-card",".cards-grid"]],["imp-toner","Barras Toner",[".printer-toner-box",".printer-toners-grid",".toner-diagnostics-panel"]],["imp-actions","Botões Impressoras",[".card-actions",".item-actions",".toolbar",".diagnostics-actions"]]]],
    "users.html":["Users",[["users-top","Topo / Pesquisa",[".page-hero",".reference-header",".toolbar"]],["users-cards","Cards Users",[".users-grid",".user-card",".pc-card",".cards-grid"]],["users-print","Impressão de Dados",["button[onclick*='imprimir']","button[onclick*='Imprimir']",".print-actions",".card-actions"]],["users-actions","Botões Users",[".item-actions",".card-actions",".toolbar"]]]],
    "radios.html":["Rádios",[["rad-top","Topo / Select",[".page-hero",".reference-header",".radio-toolbar",".radio-selected-actions"]],["rad-cards","Cards Rádios",[".radio-cards-grid",".radio-card"]],["rad-report","Relatório Semanal",[".weekly-radio-row",".radio-record-row",".weekly-record-actions"]],["rad-actions","Botões Rádios",[".radio-selected-buttons",".card-actions",".weekly-record-actions"]]]],
    "pistolas.html":["Pistolas CK65",[["ck-top","Topo / Pesquisa",[".page-hero",".reference-header",".toolbar"]],["ck-cards","Cards Pistolas",[".pistol-card",".pc-card",".cards-grid",".reference-card"]],["ck-actions","Botões Pistolas",[".item-actions",".card-actions",".toolbar"]]]],
    "portas.html":["Portas Rede",[["portas-top","Topo / Pesquisa",[".page-hero",".reference-header",".toolbar"]],["portas-list","Cards / Tabela",[".pc-card",".cards-grid",".table-card","table"]],["portas-actions","Botões Portas",[".item-actions",".card-actions",".toolbar"]]]],
    "informacoes.html":["Informações",[["info-top","Topo / Novo / Pesquisa",[".page-hero",".reference-header",".toolbar"]],["info-cards","Cards Informações",[".info-card",".info-grid",".cards-grid",".reference-card"]],["info-actions","Botões Ver Mais / Editar / Apagar",[".item-actions",".card-actions",".info-actions"]]]],
    "stock.html":["Stock",[["stock-top","Topo / Resumo",[".page-hero",".reference-header",".topbar",".toolbar"]],["stock-cards","Cards Stock",[".stock-card",".card",".cards-grid",".table-card"]],["stock-actions","Botões Stock",[".item-actions",".card-actions",".toolbar"]]]],
    "historico.html":["Histórico",[["hist-top","Filtros / Pesquisa",[".page-hero",".reference-header",".toolbar"]],["hist-list","Registos / Cards",[".history-card",".card",".cards-grid",".table-card","table"]],["hist-actions","Botões Histórico",[".item-actions",".card-actions",".toolbar"]]]],
    "add-toner.html":["Adicionar Toner",[["toner-form","Formulário Toner",["form",".form-card",".panel",".card"]],["toner-actions","Botões Toner",["form button",".card-actions",".form-actions",".toolbar"]]]],
    "manutencao-impressoras.html":["Manutenção Impressoras",[["man-top","Topo / Pesquisa",[".page-hero",".reference-header",".toolbar"]],["man-cards","Cards Manutenção",[".card",".panel",".history-card",".reference-card"]],["man-actions","Botões Manutenção",[".item-actions",".card-actions",".toolbar"]]]],
    "etiquetas-word.html":["Etiquetas Word",[["etiq-form","Formulário / Etiqueta",["form",".form-card",".panel",".card"]],["etiq-actions","Botões Etiquetas",["button",".card-actions",".form-actions",".toolbar"]]]],
    "computadores.html":["Computadores",[["pc-top","Topo / Pesquisa",[".page-hero",".reference-header",".toolbar"]],["pc-cards","Cards Computadores",[".pc-card",".cards-grid",".reference-card"]],["pc-actions","Botões Computadores",[".item-actions",".card-actions",".toolbar"]]]],
    "config.html":["Configurações",[["cfg-theme","Esquemas de Cores",[".theme-studio-pro",".theme-presets-only",".theme-custom-simple"]],["cfg-advanced","Sistema Avançado",[".theme-page-box-editor-v2"]],["cfg-notify","Notificações",[".config-notificacoes-full",".config-card:has(#notifyTonerZero)"]],["cfg-cards","Outras Abas Configs",[".config-card",".settings-grid",".config-grid"]]]]
  };

  const def={boxBg:"#111827",boxBorder:"#334155",boxText:"#cbd5e1",boxTitle:"#ffffff",boxGlow:"#2563eb",btnBg:"#1f2937",btnText:"#f8fafc",btnBorder:"#475569",btnGlow:"#2563eb",radius:"#181818"};

  function cur(){return location.pathname.split("/").pop()||"index.html"}
  function valid(v,f="#2563eb"){v=String(v||"").trim();return /^#[0-9a-fA-F]{6}$/.test(v)?v.toLowerCase():f}
  function rgba(h,a){h=valid(h).replace("#","");return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`}
  function rad(h){h=valid(h,"#181818");return Math.max(10,Math.round(parseInt(h.slice(1,3),16)/255*34))+"px"}
  function store(){try{return JSON.parse(localStorage.getItem(STORE)||"{}")}catch(e){return {}}}
  function save(s,push=true){localStorage.setItem(STORE,JSON.stringify(s));applyAll(); if(push) pushSoon();}
  function pageCfg(p=page){return pages[p]||pages["index.html"]}
  function boxes(p=page){return pageCfg(p)[1].map(x=>({id:x[0],label:x[1],selectors:x[2]}))}
  function boxCfg(p=page,b=box){return boxes(p).find(x=>x.id===b)||boxes(p)[0]}
  function ensure(){if(!page) page=cur(); if(!pages[page]) page="index.html"; if(!box) box=boxes(page)[0].id}
  function data(p=page,b=box){const s=store(); return {...def,...(s[p]&&s[p][b]?s[p][b]:{})}}
  function targets(p,b){let out=[];(boxCfg(p,b).selectors||[]).forEach(sel=>{try{document.querySelectorAll(sel).forEach(e=>out.push(e))}catch(e){}});return [...new Set(out)]}
  function buttons(p,b){let out=[];targets(p,b).forEach(r=>{if(r.matches&&r.matches("button,a.btn,.primary-btn,.secondary-btn,.reference-primary,.reference-outline,[class*='btn']"))out.push(r);if(r.querySelectorAll)r.querySelectorAll("button,a.btn,.primary-btn,.secondary-btn,.reference-primary,.reference-outline,[class*='btn']").forEach(x=>out.push(x))});return [...new Set(out)]}
  function btnLabel(b,i){return (b.textContent||b.title||b.getAttribute("aria-label")||"").replace(/\s+/g," ").trim()||"Botão "+(i+1)}

  function setData(part){ensure();const s=store();s[page]=s[page]||{};s[page][box]={...data(),...part};save(s)}
  function applyBox(el,d){if(el.matches&&el.matches("button,a.btn,.primary-btn,.secondary-btn,.reference-primary,.reference-outline,[class*='btn']"))return;el.style.setProperty("background",valid(d.boxBg,def.boxBg),"important");el.style.setProperty("border-color",valid(d.boxBorder,def.boxBorder),"important");el.style.setProperty("color",valid(d.boxText,def.boxText),"important");el.style.setProperty("border-radius",rad(d.radius),"important");el.style.setProperty("box-shadow",`0 18px 48px ${rgba(d.boxGlow,.16)},0 14px 38px rgba(0,0,0,.22)`,"important");el.querySelectorAll&&el.querySelectorAll("h1,h2,h3,h4,h5,h6,strong,.card-title,.section-title").forEach(t=>t.style.setProperty("color",valid(d.boxTitle,def.boxTitle),"important"))}
  function applyBtn(b,d){b.style.setProperty("background",valid(d.btnBg,def.btnBg),"important");b.style.setProperty("color",valid(d.btnText,def.btnText),"important");b.style.setProperty("border-color",valid(d.btnBorder,def.btnBorder),"important");b.style.setProperty("box-shadow",`0 0 34px ${rgba(d.btnGlow,.34)},0 12px 28px rgba(0,0,0,.24)`,"important")}
  function applyAll(){const s=store(),p=cur();if(!s[p])return;Object.entries(s[p]).forEach(([b,d])=>{targets(p,b).forEach(e=>applyBox(e,d));buttons(p,b).forEach(x=>applyBtn(x,d))})}

  function field(k,l,v){return `<label class="theme-page-box-field"><span>${l}</span><input type="color" value="${valid(v,def[k])}" onchange="themePageBoxUpdate('${k}',this.value)"></label>`}
  function renderDetectedThings(){
    const els = targets(page, box).filter(el => {
      if(!el || !el.tagName) return false;
      if(el.matches && el.matches("script,style,link")) return false;
      return true;
    });

    const btns = buttons(page, box);

    const elementItems = els.slice(0, 18).map((el, i) => {
      const tag = (el.tagName || "div").toLowerCase();
      const cls = (el.className || "").toString().split(/\s+/).filter(Boolean).slice(0,3).join(".");
      const text = (el.textContent || "").replace(/\s+/g," ").trim().slice(0,55);
      const label = text || (cls ? "." + cls : tag);
      return `<span title="${label}">${tag}${cls ? "." + cls : ""}</span>`;
    }).join("");

    const buttonItems = btns.slice(0, 18).map((b, i) => `<span>${btnLabel(b,i)}</span>`).join("");

    return `<div class="theme-page-box-detected-wrap">
      <div class="theme-page-box-detected-title">Elementos encontrados nesta box</div>
      <div class="theme-page-box-detected">${elementItems || "<span>Nenhum elemento encontrado nesta página aberta</span>"}</div>
      <div class="theme-page-box-detected-title">Botões encontrados nesta box</div>
      <div class="theme-page-box-detected">${buttonItems || "<span>Nenhum botão encontrado nesta box</span>"}</div>
      <small class="theme-page-box-note">Nota: para detetar tudo, abre primeiro a página que queres personalizar e depois volta às Configurações. Mesmo assim podes guardar estilos para qualquer página.</small>
    </div>`;
  }

  function render(){
    const root=document.getElementById("themePageBoxEditorRoot"); if(!root)return; ensure(); const pc=pageCfg(), bc=boxCfg(), d=data();
    root.innerHTML=`<div class="theme-page-box-selects"><label><span>Página</span><select onchange="themePageBoxSetPage(this.value)">${Object.entries(pages).map(([k,v])=>`<option value="${k}" ${k===page?"selected":""}>${v[0]}</option>`).join("")}</select></label><label><span>Box / Zona</span><select onchange="themePageBoxSetBox(this.value)">${boxes(page).map(b=>`<option value="${b.id}" ${b.id===box?"selected":""}>${b.label}</option>`).join("")}</select></label></div>
    <div class="theme-page-box-current"><strong>${pc[0]} → ${bc.label}</strong><small>Personaliza a zona escolhida. Se estiveres noutra página, a lista pode aparecer vazia, mas o estilo fica guardado e aplica quando abrires essa página.</small></div>
    ${renderDetectedThings()}
    <div class="theme-page-box-tabs"><button type="button" class="secondary-btn ${mode==="box"?"active":""}" onclick="themePageBoxSetMode('box')">Cores da Box</button><button type="button" class="secondary-btn ${mode==="buttons"?"active":""}" onclick="themePageBoxSetMode('buttons')">Botões da Box</button></div>
    ${mode==="box"?`<div class="theme-page-box-grid">${field("boxBg","Fundo da box",d.boxBg)}${field("boxBorder","Borda da box",d.boxBorder)}${field("boxText","Texto da box",d.boxText)}${field("boxTitle","Títulos da box",d.boxTitle)}${field("boxGlow","Glow da box",d.boxGlow)}${field("radius","Arredondamento",d.radius)}</div>`:`<div class="theme-page-box-grid">${field("btnBg","Cor dos botões",d.btnBg)}${field("btnText","Letra dos botões",d.btnText)}${field("btnBorder","Borda dos botões",d.btnBorder)}${field("btnGlow","Glow dos botões",d.btnGlow)}</div>`}
    <div class="theme-page-box-actions"><button type="button" class="primary-btn" onclick="themePageBoxApplyNow()">Aplicar agora</button><button type="button" class="secondary-btn" onclick="themePageBoxResetCurrent()">Repor esta box</button></div>`;
  }

  function pushSoon(){clearTimeout(window.__pageBoxPush);window.__pageBoxPush=setTimeout(pushFb,700)}
  function db(){return window.db||(window.firebase&&firebase.firestore?firebase.firestore():null)}
  async function pushFb(){if(remote)return;const x=db();if(!x||!x.collection)return;try{await x.collection(C).doc(D).set({data:store(),updatedAt:Date.now()},{merge:true})}catch(e){}}
  function listen(){const x=db();if(!x||!x.collection){setTimeout(listen,1000);return}if(unsub)return;unsub=x.collection(C).doc(D).onSnapshot(doc=>{if(!doc.exists){pushSoon();return}const payload=doc.data()||{};if(!payload.data)return;const active=document.activeElement;if(active&&active.matches&&active.matches("input,select,textarea"))return;remote=true;localStorage.setItem(STORE,JSON.stringify(payload.data));remote=false;applyAll();if(document.getElementById("themePageBoxEditorRoot"))render()})}

  function init(){ensure(); if(cur()==="config.html" && !sessionStorage.getItem("themePageBoxManualPage")){ page="index.html"; box=boxes(page)[0].id; } render();applyAll();listen();setTimeout(applyAll,500);setTimeout(applyAll,1500);const obs=new MutationObserver(()=>applyAll());if(document.body)obs.observe(document.body,{childList:true,subtree:true})}
  window.themePageBoxSetPage=p=>{sessionStorage.setItem("themePageBoxManualPage","1");page=p;box=boxes(page)[0].id;render()};
  window.themePageBoxSetBox=b=>{box=b;render()};
  window.themePageBoxSetMode=m=>{mode=m;render()};
  window.themePageBoxUpdate=(k,v)=>setData({[k]:v});
  window.themePageBoxResetCurrent=()=>{const s=store();if(s[page])delete s[page][box];save(s);render()};
  window.themePageBoxApplyNow=()=>{applyAll();pushFb()};
  document.addEventListener("DOMContentLoaded",init);
  window.addEventListener("pageshow",()=>setTimeout(init,150));
})();
