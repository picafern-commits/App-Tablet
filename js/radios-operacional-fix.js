
/* =========================================================
   APP BRAGA - RÁDIOS OPERACIONAL
   Atribuir user, devolver, histórico, pesquisa
   ========================================================= */
(function(){
  let radioAssignId = null;
  let radioHistoryData = [];

  function safe(value){
    return String(value ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c] || c));
  }

  function norm(value){
    return String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  }

  function radios(){
    if (Array.isArray(window.radiosData)) return window.radiosData;
    if (Array.isArray(window.radiosRealtime)) return window.radiosRealtime;
    window.radiosData = [];
    return window.radiosData;
  }

  function users(){
    if (Array.isArray(window.radioUsersData)) return window.radioUsersData;
    if (Array.isArray(window.usersData)) return window.usersData;
    if (Array.isArray(window.usersGlobal)) return window.usersGlobal;
    return [];
  }

  function userLabel(user){
    if(!user) return "";
    return user.nome || user.name || user.email || user.user_pc_eye || user.id || user.idDoc || "";
  }

  function userId(user){
    return user?.id || user?.idDoc || user?.firebaseId || user?._ref || userLabel(user);
  }

  function radioById(id){
    return radios().find(r => String(r.id || r.idDoc || r.firebaseId) === String(id));
  }

  function radioUserName(radio){
    return radio.userNome || radio.user || radio.utilizador || radio.operadorAtual || "";
  }

  function radioSearchText(r){
    return norm([
      r.nome, r.mac, r.serial, r.numeroSerie, r.sn, r.userNome, r.user, r.utilizador, r.operadorAtual
    ].join(" "));
  }

  function filteredRadios(){
    const q = norm(document.getElementById("radioSearch")?.value || "");
    const list = radios().slice().sort((a,b)=>String(a.nome||a.serial||"").localeCompare(String(b.nome||b.serial||""),"pt",{numeric:true,sensitivity:"base"}));
    if(!q) return list;
    return list.filter(r => radioSearchText(r).includes(q));
  }

  function renderRadiosOperacional(){
    const listNode = document.getElementById("listaRadios");
    const totalNode = document.getElementById("radiosTotal");
    if(!listNode) return;

    const list = filteredRadios();
    if(totalNode) totalNode.textContent = String(radios().length);

    listNode.innerHTML = list.length ? list.map(r => {
      const id = r.id || r.idDoc || r.firebaseId;
      const assignedName = radioUserName(r);
      const assigned = !!assignedName;
      const jsId = JSON.stringify(String(id));
      return `
        <article class="radio-card">
          <div class="radio-card-icon">${typeof radioDeviceImageHtml === "function" ? radioDeviceImageHtml(r) : ""}</div>
          <div class="radio-card-main">
            <strong>${safe(r.nome || "Rádio")}</strong>
            <small>MAC ${safe(r.mac || "-")} · Série ${safe(r.serial || r.numeroSerie || "-")}</small>
            <div class="radio-status-pill ${assigned ? "assigned" : "available"}">${assigned ? "Atribuído" : "Disponível"}</div>
            <div class="radio-card-user">${assigned ? "User: " + safe(assignedName) : "Sem user atribuído"}</div>
            ${r.atribuidoAt ? `<small>Atribuído em ${safe(new Date(Number(r.atribuidoAt)).toLocaleString("pt-PT"))}</small>` : ""}
          </div>
          <div class="radio-card-actions">
            <button class="secondary-btn" type="button" onclick='editarRadio(${jsId})'>Editar</button>
            <button class="secondary-btn reference-outline" type="button" onclick='abrirAtribuirRadio(${jsId})'>Atribuir</button>
            <button class="secondary-btn" type="button" onclick='devolverRadio(${jsId})'>Devolver</button>
            <button class="secondary-btn reference-outline" type="button" onclick='abrirHistoricoRadio(${jsId})'>Histórico</button>
            <button class="secondary-btn danger" type="button" onclick='apagarRadio(${jsId})'>Apagar</button>
          </div>
        </article>
      `;
    }).join("") : `<div class="reference-empty">Sem rádios registados na Firestore.</div>`;
  }

  function renderUserOptions(selectedId=""){
    const select = document.getElementById("radioAssignUser");
    if(!select) return;
    const opts = users().slice().sort((a,b)=>userLabel(a).localeCompare(userLabel(b),"pt",{numeric:true,sensitivity:"base"}))
      .map(u => {
        const id = userId(u);
        return `<option value="${safe(id)}"${String(id)===String(selectedId)?" selected":""}>${safe(userLabel(u))}</option>`;
      }).join("");
    select.innerHTML = `<option value="">Escolher user...</option>` + opts;
  }

  window.abrirAtribuirRadio = function(id){
    const r = radioById(id);
    if(!r) return alert("Rádio não encontrado.");
    radioAssignId = id;
    const title = document.getElementById("radioAssignTitle");
    if(title) title.textContent = `Atribuir ${r.nome || "Rádio"}`;
    renderUserOptions(r.userId || "");
    const obs = document.getElementById("radioAssignObs");
    if(obs) obs.value = "";
    const modal = document.getElementById("radioAssignModal");
    if(modal) modal.style.display = "flex";
  };

  window.fecharAtribuirRadio = function(){
    radioAssignId = null;
    const modal = document.getElementById("radioAssignModal");
    if(modal) modal.style.display = "none";
  };

  async function addHistory(radio, tipo, extra={}){
    if(!window.db?.collection) return;
    await window.db.collection("radioHistory").add({
      radioId: radio.id || radio.idDoc || radio.firebaseId,
      radioNome: radio.nome || "",
      radioMac: radio.mac || "",
      radioSerial: radio.serial || radio.numeroSerie || "",
      tipo,
      ...extra,
      createdAt: Date.now()
    });
  }

  window.guardarAtribuirRadio = async function(){
    const r = radioById(radioAssignId);
    if(!r) return alert("Rádio não encontrado.");
    const select = document.getElementById("radioAssignUser");
    const userIdValue = select?.value || "";
    if(!userIdValue) return alert("Escolhe um user.");

    const u = users().find(item => String(userId(item)) === String(userIdValue));
    const payload = {
      userId: userIdValue,
      userNome: u ? userLabel(u) : userIdValue,
      estado: "atribuido",
      atribuidoAt: Date.now(),
      obsAtribuicao: document.getElementById("radioAssignObs")?.value.trim() || ""
    };

    try{
      await window.db.collection("radios").doc(String(radioAssignId)).set(payload,{merge:true});
      await addHistory(r,"atribuido",{userId:userIdValue,userNome:payload.userNome,obs:payload.obsAtribuicao});
      window.fecharAtribuirRadio();
      if(typeof mostrarMensagem==="function") mostrarMensagem("Rádio atribuído.");
    }catch(e){
      console.error(e);
      alert("Erro ao atribuir rádio.");
    }
  };

  window.devolverRadio = async function(id){
    const r = radioById(id);
    if(!r) return alert("Rádio não encontrado.");
    const nome = radioUserName(r);
    if(!nome && !confirm("Este rádio não tem user. Marcar como devolvido mesmo assim?")) return;
    try{
      await window.db.collection("radios").doc(String(id)).set({
        userId: "",
        userNome: "",
        user: "",
        utilizador: "",
        operadorAtual: "",
        estado: "disponivel",
        devolvidoAt: Date.now()
      },{merge:true});
      await addHistory(r,"devolvido",{userNome:nome || "", obs:"Devolução manual"});
      if(typeof mostrarMensagem==="function") mostrarMensagem("Rádio devolvido.");
    }catch(e){
      console.error(e);
      alert("Erro ao devolver rádio.");
    }
  };

  window.abrirHistoricoRadio = function(id){
    const r = radioById(id);
    if(!r) return alert("Rádio não encontrado.");
    const title = document.getElementById("radioHistoryTitle");
    if(title) title.textContent = `Histórico · ${r.nome || "Rádio"}`;
    const modal = document.getElementById("radioHistoryModal");
    if(modal) modal.style.display = "flex";

    const list = document.getElementById("radioHistoryList");
    if(list) list.innerHTML = `<div class="reference-empty">A carregar histórico...</div>`;

    if(!window.db?.collection){
      if(list) list.innerHTML = `<div class="reference-empty">Firebase indisponível.</div>`;
      return;
    }

    window.db.collection("radioHistory")
      .where("radioId","==",String(id))
      .onSnapshot(snap => {
        const items = snap.docs.map(doc => ({id:doc.id,...doc.data()}))
          .sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
        if(!list) return;
        list.innerHTML = items.length ? items.map(item => `
          <div class="radio-history-item">
            <strong>${safe(item.tipo === "atribuido" ? "Atribuído" : item.tipo === "devolvido" ? "Devolvido" : item.tipo || "Evento")}</strong>
            <small>User: ${safe(item.userNome || "-")}</small>
            <small>${item.createdAt ? safe(new Date(Number(item.createdAt)).toLocaleString("pt-PT")) : "-"}</small>
            ${item.obs ? `<small>Obs: ${safe(item.obs)}</small>` : ""}
          </div>
        `).join("") : `<div class="reference-empty">Sem histórico para este rádio.</div>`;
      }, err => {
        console.error(err);
        if(list) list.innerHTML = `<div class="reference-empty">Erro ao carregar histórico.</div>`;
      });
  };

  window.fecharHistoricoRadio = function(){
    const modal = document.getElementById("radioHistoryModal");
    if(modal) modal.style.display = "none";
  };

  window.filtrarRadios = function(){
    renderRadiosOperacional();
  };

  // Override render depois do app.js.
  const oldRenderRadios = window.renderRadios;
  window.renderRadios = function(){
    try{
      renderRadiosOperacional();
      if(typeof renderRadioWeeklyForm === "function") renderRadioWeeklyForm();
      // Mantém relatório semanal original atualizado.
      const resumoNode = document.getElementById("radioWeeklySummary");
      if(resumoNode && typeof oldRenderRadios === "function"){
        // não chamar oldRender para não substituir lista; só aceitamos que o original já fez summary no load inicial
      }
    }catch(e){
      console.error("Erro render radios operacional", e);
      if(typeof oldRenderRadios === "function") oldRenderRadios();
    }
  };

  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(renderRadiosOperacional, 700);
    setTimeout(renderRadiosOperacional, 1600);
  });
  window.addEventListener("pageshow",()=>setTimeout(renderRadiosOperacional,300));
})();


/* Etiqueta completa */
.etq-sheet,
.print-label,
.etiqueta-word,
.word-label{
 border:2px solid #000 !important;
 box-sizing:border-box !important;
}

