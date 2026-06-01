
/* APP BRAGA - CONFIG COLLAPSIBLE SECTIONS */
(function(){
  const STORAGE_KEY = "appBragaConfigCollapsedV1";

  function getState(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch(e){ return {}; }
  }

  function saveState(state){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function sectionTitle(card, index){
    const heading = card.querySelector("h1,h2,h3,h4,.card-title,.section-title");
    const txt = heading ? heading.textContent.replace(/\s+/g," ").trim() : "";
    return txt || `Secção ${index + 1}`;
  }

  function sectionKey(card, index){
    const title = sectionTitle(card, index)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-|-$/g,"");
    return title || `sec-${index}`;
  }

  function makeCardCollapsible(card, index){
    if(card.dataset.collapsibleReady === "1") return;
    if(card.closest(".modal-card")) return;
    if(card.id === "toast") return;

    const key = sectionKey(card, index);
    const title = sectionTitle(card, index);
    const state = getState();
    const isCollapsed = state[key] === true;

    card.classList.add("config-collapsible-card");
    card.dataset.configCollapseKey = key;
    card.dataset.collapsibleReady = "1";

    const originalChildren = Array.from(card.childNodes);

    const header = document.createElement("button");
    header.type = "button";
    header.className = "config-collapse-header";
    header.setAttribute("aria-expanded", String(!isCollapsed));
    header.innerHTML = `
      <span class="config-collapse-title">${title}</span>
      <span class="config-collapse-icon">${isCollapsed ? "+" : "−"}</span>
    `;

    const body = document.createElement("div");
    body.className = "config-collapse-body";

    originalChildren.forEach(node => {
      if(node.nodeType === 1 && node.matches && node.matches("h1,h2,h3,h4,.card-title,.section-title")){
        node.classList.add("config-original-heading-hidden");
      }
      body.appendChild(node);
    });

    card.appendChild(header);
    card.appendChild(body);

    function applyCollapsed(collapsed){
      card.classList.toggle("is-collapsed", collapsed);
      body.style.display = collapsed ? "none" : "";
      header.setAttribute("aria-expanded", String(!collapsed));
      const icon = header.querySelector(".config-collapse-icon");
      if(icon) icon.textContent = collapsed ? "+" : "−";
    }

    header.addEventListener("click", (event) => {
      event.preventDefault();
      const collapsed = !card.classList.contains("is-collapsed");
      const current = getState();
      current[key] = collapsed;
      saveState(current);
      applyCollapsed(collapsed);
    });

    applyCollapsed(isCollapsed);
  }

  function initConfigCollapsible(){
    const isConfigPage = /config\.html$/i.test(location.pathname) || document.querySelector(".theme-studio-pro");
    if(!isConfigPage) return;

    const cards = Array.from(document.querySelectorAll("main .config-card, main .enterprise-config-card, main .card"))
      .filter(card => !card.classList.contains("theme-preview-card"));

    cards.forEach(makeCardCollapsible);
  }

  function expandAll(){
    const state = getState();
    document.querySelectorAll(".config-collapsible-card").forEach(card => {
      const key = card.dataset.configCollapseKey;
      state[key] = false;
      card.classList.remove("is-collapsed");
      const body = card.querySelector(".config-collapse-body");
      const icon = card.querySelector(".config-collapse-icon");
      const header = card.querySelector(".config-collapse-header");
      if(body) body.style.display = "";
      if(icon) icon.textContent = "−";
      if(header) header.setAttribute("aria-expanded","true");
    });
    saveState(state);
  }

  function collapseAll(){
    const state = getState();
    document.querySelectorAll(".config-collapsible-card").forEach(card => {
      const key = card.dataset.configCollapseKey;
      state[key] = true;
      card.classList.add("is-collapsed");
      const body = card.querySelector(".config-collapse-body");
      const icon = card.querySelector(".config-collapse-icon");
      const header = card.querySelector(".config-collapse-header");
      if(body) body.style.display = "none";
      if(icon) icon.textContent = "+";
      if(header) header.setAttribute("aria-expanded","false");
    });
    saveState(state);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initConfigCollapsible();
    setTimeout(initConfigCollapsible, 500);
    setTimeout(initConfigCollapsible, 1200);
  });

  window.addEventListener("pageshow", () => setTimeout(initConfigCollapsible, 200));

  window.configExpandAll = expandAll;
  window.configCollapseAll = collapseAll;
})();
