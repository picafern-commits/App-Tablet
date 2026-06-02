
(function(){
  const STORE="appBragaElementThemeV4";
  const C="appSettings";
  const D="themeElementEditorV4";
  let page="", zone="", element="", mode="element", unsub=null, remote=false;

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
    "config.html":["Configurações",[["cfg-theme","Esquemas de Cores",[".theme-studio-pro",".theme-presets-only",".theme-custom-simple"]],["cfg-advanced","Sistema Avançado",[".theme-page-box-editor-v2"]],["cfg-notify","Notificações",[".config-notificacoes-full",".config-card:has(#notifyTonerZero)"]],["cfg-cards","Outras Abas Configs",[".config-card",".settings-grid",".config-grid"]],["cfg-sidebar","Sidebar",[".sidebar",".enterprise-sidebar"]]]]
  };

  const def={bg:"#111827",border:"#334155",text:"#cbd5e1",title:"#ffffff",glow:"#2563eb",hoverBg:"#1f2937",hoverText:"#ffffff",radius:"#181818"};

  function cur(){return location.pathname.split("/").pop()||"index.html"}
  function valid(v,f="#2563eb"){v=String(v||"").trim();return /^#[0-9a-fA-F]{6}$/.test(v)?v.toLowerCase():f}
  function rgba(h,a){h=valid(h).replace("#","");return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`}
  function rad(h){h=valid(h,"#181818");return Math.max(10,Math.round(parseInt(h.slice(1,3),16)/255*34))+"px"}
  function store(){try{return JSON.parse(localStorage.getItem(STORE)||"{}")}catch(e){return {}}}
  function save(s,push=true){localStorage.setItem(STORE,JSON.stringify(s));applyAll(); if(push) pushSoon();}
  function pageCfg(p=page){return pages[p]||pages["index.html"]}
  function zones(p=page){return pageCfg(p)[1].map(x=>({id:x[0],label:x[1],selectors:x[2]}))}
  function zoneCfg(p=page,z=zone){return zones(p).find(x=>x.id===z)||zones(p)[0]}
  function ensure(){if(!page)page=cur();if(!pages[page])page="index.html";if(!zone)zone=zones(page)[0].id;if(!element)element="__zone__"}
  function baseKey(p,z,e){return `${p}::${z}::${e}`}
  function data(p=page,z=zone,e=element){const s=store();return {...def,...(s[baseKey(p,z,e)]||{})}}

  function queryTargets(p,z){let out=[];(zoneCfg(p,z).selectors||[]).forEach(sel=>{try{document.querySelectorAll(sel).forEach(e=>out.push(e))}catch(e){}});return [...new Set(out)].filter(e=>e&&e.tagName)}
  function queryButtons(p,z){let out=[];queryTargets(p,z).forEach(r=>{if(r.matches&&r.matches("button,a.btn,.primary-btn,.secondary-btn,.reference-primary,.reference-outline,[class*='btn']"))out.push(r);if(r.querySelectorAll)r.querySelectorAll("button,a.btn,.primary-btn,.secondary-btn,.reference-primary,.reference-outline,[class*='btn']").forEach(x=>out.push(x))});return [...new Set(out)]}
  function label(el,i){let txt=(el.textContent||el.title||el.getAttribute("aria-label")||"").replace(/\s+/g," ").trim();if(!txt){const oc=(el.getAttribute("onclick")||"").toLowerCase();if(oc.includes("imprimir"))txt="Imprimir";else if(oc.includes("editar"))txt="Editar";else if(oc.includes("apagar"))txt="Apagar";else if(oc.includes("guardar"))txt="Guardar";else txt=(el.tagName||"Elemento")+" "+(i+1)}return txt.slice(0,55)}
  function keyFor(el,i,type){const tag=(el.tagName||"el").toLowerCase();const cls=(el.className||"").toString().split(/\s+/).filter(Boolean).slice(0,2).join("_");const txt=label(el,i).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,28);return `${type}_${tag}_${cls}_${txt}_${i}`}

  function elements(){
    const list=[{key:"__zone__",label:"Toda a Box/Zona",type:"zone"}];
    queryTargets(page,zone).slice(0,20).forEach((el,i)=>list.push({key:keyFor(el,i,"el"),label:label(el,i),type:"element",node:el}));
    queryButtons(page,zone).slice(0,30).forEach((el,i)=>list.push({key:keyFor(el,i,"btn"),label:label(el,i),type:"button",node:el}));
    list.push({key:"__tables__",label:"Tabelas desta zona",type:"table"});
    list.push({key:"__inputs__",label:"Inputs desta zona",type:"input"});
    list.push({key:"__titles__",label:"Títulos desta zona",type:"title"});
    return list;
  }

  function selectorForElementKey(k){
    if(k==="__zone__")return queryTargets(page,zone);
    if(k==="__tables__")return queryTargets(page,zone).flatMap(r=>[...((r.matches&&r.matches("table,th,td,tr"))?[r]:[]),...(r.querySelectorAll?[...r.querySelectorAll("table,th,td,tr")]:[])]);
    if(k==="__inputs__")return queryTargets(page,zone).flatMap(r=>[...((r.matches&&r.matches("input,select,textarea"))?[r]:[]),...(r.querySelectorAll?[...r.querySelectorAll("input,select,textarea")]:[])]);
    if(k==="__titles__")return queryTargets(page,zone).flatMap(r=>[...((r.matches&&r.matches("h1,h2,h3,h4,h5,h6,strong,.card-title,.section-title"))?[r]:[]),...(r.querySelectorAll?[...r.querySelectorAll("h1,h2,h3,h4,h5,h6,strong,.card-title,.section-title")]:[])]);
    const found=elements().find(x=>x.key===k);
    return found&&found.node?[found.node]:[];
  }

  function applyStyle(el,d,type){
    el.classList.add("theme-element-v4-target");
    el.style.setProperty("background",valid(d.bg,def.bg),"important");
    el.style.setProperty("color",valid(d.text,def.text),"important");
    el.style.setProperty("border-color",valid(d.border,def.border),"important");
    el.style.setProperty("border-radius",rad(d.radius),"important");
    el.style.setProperty("box-shadow",`0 0 34px ${rgba(d.glow,.28)},0 12px 28px rgba(0,0,0,.22)`,"important");
    if(type==="zone"||type==="element"){
      el.querySelectorAll&&el.querySelectorAll("h1,h2,h3,h4,h5,h6,strong,.card-title,.section-title").forEach(t=>t.style.setProperty("color",valid(d.title,def.title),"important"));
    }
  }

  function applyAll(){
    const s=store(),p=cur();
    Object.keys(s).forEach(k=>{
      const parts=k.split("::"); if(parts[0]!==p)return;
      const z=parts[1], e=parts.slice(2).join("::"), d={...def,...s[k]};
      const oldPage=page, oldZone=zone; page=p; zone=z;
      selectorForElementKey(e).forEach(el=>applyStyle(el,d,e==="__zone__"?"zone":"element"));
      page=oldPage; zone=oldZone;
    });
  }

  function setData(part){ensure();const s=store();s[baseKey(page,zone,element)]={...data(),...part};save(s)}
  function field(k,l,v){return `<label class="theme-page-box-field"><span>${l}</span><input type="color" value="${valid(v,def[k])}" onchange="themeElementUpdate('${k}',this.value)"></label>`}

  function render(){
    const root=document.getElementById("themePageBoxEditorRoot"); if(!root)return; ensure();
    const pc=pageCfg(), zc=zoneCfg(), els=elements(), d=data();
    if(!els.find(x=>x.key===element))element="__zone__";
    const current=els.find(x=>x.key===element)||els[0];
    root.innerHTML=`<div class="theme-page-box-selects">
      <label><span>Página</span><select onchange="themeElementSetPage(this.value)">${Object.entries(pages).map(([k,v])=>`<option value="${k}" ${k===page?"selected":""}>${v[0]}</option>`).join("")}</select></label>
      <label><span>Box / Zona</span><select onchange="themeElementSetZone(this.value)">${zones(page).map(z=>`<option value="${z.id}" ${z.id===zone?"selected":""}>${z.label}</option>`).join("")}</select></label>
      <label><span>Elemento</span><select onchange="themeElementSetElement(this.value)">${els.map(e=>`<option value="${e.key}" ${e.key===element?"selected":""}>${e.type==="button"?"🔘 ":e.type==="zone"?"📦 ":e.type==="table"?"📋 ":e.type==="input"?"⌨️ ":e.type==="title"?"🔤 ":"◼️ "}${e.label}</option>`).join("")}</select></label>
    </div>
    <div class="theme-page-box-current"><strong>${pc[0]} → ${zc.label} → ${current.label}</strong><small>Agora editas este elemento individual. Para botões como Imprimir Dados, Editar ou Apagar, escolhe o botão no select Elemento.</small></div>
    <div class="theme-page-box-detected-wrap"><div class="theme-page-box-detected-title">Elementos desta box</div><div class="theme-page-box-detected">${els.slice(0,36).map(e=>`<span>${e.type==="button"?"🔘":e.type==="zone"?"📦":"◼️"} ${e.label}</span>`).join("")}</div></div>
    <div class="theme-page-box-grid">
      ${field("bg","Fundo",d.bg)}${field("text","Texto",d.text)}${field("border","Borda",d.border)}${field("title","Título",d.title)}${field("glow","Glow",d.glow)}${field("radius","Arredondamento",d.radius)}${field("hoverBg","Hover fundo",d.hoverBg)}${field("hoverText","Hover texto",d.hoverText)}
    </div>
    <div class="theme-page-box-actions"><button type="button" class="primary-btn" onclick="themeElementApplyNow()">Aplicar agora</button><button type="button" class="secondary-btn" onclick="themeElementResetCurrent()">Repor elemento</button></div>`;
  }

  function pushSoon(){clearTimeout(window.__elementPush);window.__elementPush=setTimeout(pushFb,700)}
  function db(){return window.db||(window.firebase&&firebase.firestore?firebase.firestore():null)}
  async function pushFb(){if(remote)return;const x=db();if(!x||!x.collection)return;try{await x.collection(C).doc(D).set({data:store(),updatedAt:Date.now()},{merge:true})}catch(e){}}
  function listen(){const x=db();if(!x||!x.collection){setTimeout(listen,1000);return}if(unsub)return;unsub=x.collection(C).doc(D).onSnapshot(doc=>{if(!doc.exists){pushSoon();return}const payload=doc.data()||{};if(!payload.data)return;const active=document.activeElement;if(active&&active.matches&&active.matches("input,select,textarea"))return;remote=true;localStorage.setItem(STORE,JSON.stringify(payload.data));remote=false;applyAll();if(document.getElementById("themePageBoxEditorRoot"))render()})}

  function init(){if(!page){page=cur();if(page==="config.html")page="index.html"}if(!pages[page])page="index.html";if(!zone)zone=zones(page)[0].id;if(!element)element="__zone__";render();applyAll();listen();setTimeout(applyAll,500);setTimeout(applyAll,1500);const obs=new MutationObserver(()=>applyAll());if(document.body)obs.observe(document.body,{childList:true,subtree:true})}
  window.themeElementSetPage=p=>{page=p;zone=zones(page)[0].id;element="__zone__";render()};
  window.themeElementSetZone=z=>{zone=z;element="__zone__";render()};
  window.themeElementSetElement=e=>{element=e;render()};
  window.themeElementUpdate=(k,v)=>setData({[k]:v});
  window.themeElementResetCurrent=()=>{const s=store();delete s[baseKey(page,zone,element)];save(s);render()};
  window.themeElementApplyNow=()=>{applyAll();pushFb()};
  window.themePageBoxApplyAll=applyAll;
  document.addEventListener("DOMContentLoaded",init);
  window.addEventListener("pageshow",()=>setTimeout(init,150));
})();
