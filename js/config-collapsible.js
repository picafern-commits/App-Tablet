
(function(){
  const KEY="appBragaConfigCollapsedFinal";
  function state(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s))}
  function title(card,i){const h=card.querySelector("h1,h2,h3,h4,.card-title");return h?h.textContent.replace(/\s+/g," ").trim():`Secção ${i+1}`}
  function key(t){return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
  function setup(){
    if(!/config\.html$/i.test(location.pathname))return;
    const cards=[...document.querySelectorAll("main .config-card, main .enterprise-config-card")];
    cards.forEach((card,i)=>{
      if(card.dataset.collapseReady==="1"||card.closest(".modal-card"))return;
      const t=title(card,i), k=key(t)||("sec-"+i), s=state();
      const children=[...card.childNodes];
      const head=document.createElement("button");head.type="button";head.className="config-collapse-header";head.innerHTML=`<span class="config-collapse-title">${t}</span><span class="config-collapse-icon">−</span>`;
      const body=document.createElement("div");body.className="config-collapse-body";
      children.forEach(n=>{if(n.nodeType===1&&n.matches("h1,h2,h3,h4,.card-title"))n.style.display="none";body.appendChild(n)});
      card.appendChild(head);card.appendChild(body);card.dataset.collapseReady="1";card.dataset.key=k;
      function apply(c){card.classList.toggle("is-collapsed",c);body.style.display=c?"none":"";head.querySelector(".config-collapse-icon").textContent=c?"+":"−"}
      head.onclick=e=>{e.preventDefault();const c=!card.classList.contains("is-collapsed");const st=state();st[k]=c;save(st);apply(c)};
      apply(s[k]===true);
    });
  }
  window.configExpandAll=()=>{const s=state();document.querySelectorAll(".config-collapsible-card,.config-card,.enterprise-config-card").forEach(c=>{if(c.dataset.key)s[c.dataset.key]=false});save(s);document.querySelectorAll(".config-collapse-body").forEach(b=>b.style.display="");document.querySelectorAll(".config-collapse-icon").forEach(i=>i.textContent="−")};
  window.configCollapseAll=()=>{const s=state();document.querySelectorAll(".config-card,.enterprise-config-card").forEach(c=>{if(c.dataset.key)s[c.dataset.key]=true});save(s);document.querySelectorAll(".config-collapse-body").forEach(b=>b.style.display="none");document.querySelectorAll(".config-collapse-icon").forEach(i=>i.textContent="+")};
  document.addEventListener("DOMContentLoaded",()=>{setup();setTimeout(setup,500);setTimeout(setup,1500)});
  window.addEventListener("pageshow",()=>setTimeout(setup,200));
})();


/* Etiqueta completa */
.etq-sheet,
.print-label,
.etiqueta-word,
.word-label{
 border:2px solid #000 !important;
 box-sizing:border-box !important;
}

