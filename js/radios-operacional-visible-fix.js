
/* =========================================================
   APP BRAGA - RÁDIOS OPERACIONAL VISIBLE FIX
   Não mexe nos listeners Firebase. Só renderiza a partir de radiosData.
   ========================================================= */
(function(){
  let radioAssignId = null;
  let unsubscribeRadioHistoryOpen = null;
  let lastSignature = "";

  function safe(value){
    return String(value ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c] || c));
  }

  function norm(value){
    return String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  }

  function getRadios(){
    if (Array.isArray(window.radiosData)) return window.radiosData;
    return [];
  }

  function getUsers(){
    if (Array.isArray(window.radioUsersData) && window.radioUsersData.length) return window.radioUsersData;
    if (Array.isArray(window.usersData) && window.usersData.length) return window.usersData;
    if (Array.isArray(window.usersGlobal) && window.usersGlobal.length) return window.usersGlobal;
    return [];
  }

  function userLabel(user){
    return user?.nome || user?.name || user?.email || user?.user_pc_eye || user?.id || user?.idDoc || "";
  }

  function userId(user){
    return user?.id || user?.idDoc || user?.firebaseId || user?._ref || userLabel(user);
  }

  function radioId(radio){
    return radio?.id || radio?.idDoc || radio?.firebaseId || radio?.docId || "";
  }

  function radioById(id){
    return getRadios().find(r => String(radioId(r)) === String(id));
  }

  function radioUserName(r){
    return r?.userNome || r?.user || r?.utilizador || r?.operadorAtual || "";
  }

  function radioSearchText(r){
    return norm([r.nome, r.mac, r.serial, r.numeroSerie, r.sn, r.userNome, r.user, r.utilizador, r.operadorAtual].join(" "));
  }

  function filteredRadios(){
    const q = norm(document.getElementById("radioSearch")?.value || "");
    const list = getRadios().slice().sort((a,b)=>String(a.nome||a.serial||a.mac||"").localeCompare(String(b.nome||b.serial||b.mac||""),"pt",{numeric:true,sensitivity:"base"}));
    return q ? list.filter(r => radioSearchText(r).includes(q)) : list;
  }

  function deviceImg(r){
    if(typeof window.radioDeviceImageHtml === "function") return window.radioDeviceImageHtml(r);
    return "";
  }

  window.renderRadiosOperacionalVisible = function(){
    const listNode = document.getElementById("listaRadios");
    if(!listNode) return;

    const radios = filteredRadios();
    const totalNode = document.getElementById("radiosTotal");
    if(totalNode) totalNode.textContent = String(getRadios().length);

    listNode.innerHTML = radios.length ? radios.map(r => {
      const id = radioId(r);
      const user = radioUserName(r);
      const assigned = !!user;
      const assignedAt = r.atribuidoAt ? new Date(Number(r.atribuidoAt)).toLocaleString("pt-PT") : "";
      const jsId = JSON.stringify(String(id));
      return `
        <article class="radio-card">
          <div class="radio-card-icon">${deviceImg(r)}</div>
          <div class="radio-card-main">
            <strong>${safe(r.nome || "Rádio")}</strong>
            <small>MAC ${safe(r.mac || "-")} · Série ${safe(r.serial || r.numeroSerie || "-")}</small>
            <div class="radio-status-pill ${assigned ? "assigned" : "available"}">${assigned ? "Atribuído" : "Disponível"}</div>
            <div class="radio-card-user">${assigned ? "User: " + safe(user) : "Sem user atribuído"}</div>
            ${assignedAt ? `<small>Atribuído em ${safe(assignedAt)}</small>` : ""}
          </div>
          <div class="radio-card-actions">
            <button class="secondary-btn" type="button" onclick='editarRadio(${jsId})'>Editar</button>
            <button class="secondary-btn reference-outline" type="button" onclick='abrirAtribuirRadio(${jsId})'>Atribuir</button>
            <button class="secondary-btn" type="button" onclick='devolverRadio(${jsId})'>Devolver</button>
            <button class="secondary-btn reference-outline" type="button" onclick='abrirHistoricoRadio(${jsId})'>Histórico</button>
            <button class="secondary-btn danger" type="button" onclick='apagarRadio(${jsId})'>Apagar</button>
          </div>
        </article>`;
    }).join("") : `<div class="reference-empty">Sem rádios registados na Firestore.</div>`;
  };

  function ensureUserOptions(selectedId=""){
    const select = document.getElementById("radioAssignUser");
    if(!select) return;
    const options = getUsers().slice().sort((a,b)=>userLabel(a).localeCompare(userLabel(b),"pt",{numeric:true,sensitivity:"base"}))
      .map(u => {
        const id = userId(u);
        return `<option value="${safe(id)}"${String(id)===String(selectedId)?" selected":""}>${safe(userLabel(u))}</option>`;
      }).join("");
    select.innerHTML = `<option value="">Escolher user...</option>` + options;
  }

  window.abrirAtribuirRadio = function(id){
    const radio = radioById(id);
    if(!radio) return alert("Rádio não encontrado.");
    radioAssignId = id;
    const title = document.getElementById("radioAssignTitle");
    if(title) title.textContent = `Atribuir ${radio.nome || "Rádio"}`;
    ensureUserOptions(radio.userId || "");
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

  async function addHistory(radio,tipo,extra={}){
    if(!window.db?.collection || !radioId(radio)) return;
    await window.db.collection("radioHistory").add({
      radioId: String(radioId(radio)),
      radioNome: radio.nome || "",
      radioMac: radio.mac || "",
      radioSerial: radio.serial || radio.numeroSerie || "",
      tipo,
      ...extra,
      createdAt: Date.now(),
      createdLabel: new Date().toLocaleString("pt-PT")
    });
  }

  window.guardarAtribuirRadio = async function(){
    const radio = radioById(radioAssignId);
    if(!radio) return alert("Rádio não encontrado.");
    const select = document.getElementById("radioAssignUser");
    const selected = select?.value || "";
    if(!selected) return alert("Escolhe um user.");
    const u = getUsers().find(item => String(userId(item)) === String(selected));
    const userNome = u ? userLabel(u) : selected;
    const obs = document.getElementById("radioAssignObs")?.value.trim() || "";
    try{
      await window.db.collection("radios").doc(String(radioAssignId)).set({
        userId:selected,
        userNome,
        estado:"atribuido",
        atribuidoAt:Date.now(),
        obsAtribuicao:obs,
        updatedAt:Date.now()
      },{merge:true});
      await addHistory(radio,"atribuido",{userId:selected,userNome,obs});
      window.fecharAtribuirRadio();
      if(typeof mostrarMensagem==="function") mostrarMensagem("Rádio atribuído.");
    }catch(e){
      console.error(e);
      alert("Erro ao atribuir rádio.");
    }
  };

  window.devolverRadio = async function(id){
    const radio = radioById(id);
    if(!radio) return alert("Rádio não encontrado.");
    const userNome = radioUserName(radio);
    if(!userNome && !confirm("Este rádio não tem user associado. Marcar como devolvido mesmo assim?")) return;
    try{
      await window.db.collection("radios").doc(String(id)).set({
        userId:"",
        userNome:"",
        user:"",
        utilizador:"",
        operadorAtual:"",
        estado:"disponivel",
        devolvidoAt:Date.now(),
        updatedAt:Date.now()
      },{merge:true});
      await addHistory(radio,"devolvido",{userNome,obs:"Devolução manual"});
      if(typeof mostrarMensagem==="function") mostrarMensagem("Rádio devolvido.");
    }catch(e){
      console.error(e);
      alert("Erro ao devolver rádio.");
    }
  };

  window.abrirHistoricoRadio = function(id){
    const radio = radioById(id);
    if(!radio) return alert("Rádio não encontrado.");
    const title = document.getElementById("radioHistoryTitle");
    const list = document.getElementById("radioHistoryList");
    if(title) title.textContent = `Histórico · ${radio.nome || "Rádio"}`;
    if(list) list.innerHTML = `<div class="reference-empty">A carregar histórico...</div>`;
    const modal = document.getElementById("radioHistoryModal");
    if(modal) modal.style.display = "flex";

    if(unsubscribeRadioHistoryOpen) unsubscribeRadioHistoryOpen();
    if(!window.db?.collection){
      if(list) list.innerHTML = `<div class="reference-empty">Firebase indisponível.</div>`;
      return;
    }

    unsubscribeRadioHistoryOpen = window.db.collection("radioHistory").where("radioId","==",String(id)).onSnapshot(snap=>{
      const items = snap.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
      if(!list) return;
      list.innerHTML = items.length ? items.map(item=>`
        <div class="radio-history-item">
          <strong>${safe(item.tipo === "atribuido" ? "Atribuído" : item.tipo === "devolvido" ? "Devolvido" : item.tipo || "Evento")}</strong>
          <small>User: ${safe(item.userNome || "-")}</small>
          <small>${safe(item.createdLabel || (item.createdAt ? new Date(Number(item.createdAt)).toLocaleString("pt-PT") : "-"))}</small>
          ${item.obs ? `<small>Obs: ${safe(item.obs)}</small>` : ""}
        </div>`).join("") : `<div class="reference-empty">Sem histórico para este rádio.</div>`;
    }, err=>{
      console.error(err);
      if(list) list.innerHTML = `<div class="reference-empty">Erro ao carregar histórico.</div>`;
    });
  };

  window.fecharHistoricoRadio = function(){
    if(unsubscribeRadioHistoryOpen){
      unsubscribeRadioHistoryOpen();
      unsubscribeRadioHistoryOpen = null;
    }
    const modal = document.getElementById("radioHistoryModal");
    if(modal) modal.style.display = "none";
  };

  // Patch renderRadios existing: keep original Firebase listeners but show operational UI after each render.
  function installPatch(){
    if(window.__radiosOperationalVisiblePatch) return;
    const originalRender = window.renderRadios;
    if(typeof originalRender === "function"){
      window.renderRadios = function(){
        originalRender.apply(this, arguments);
        setTimeout(window.renderRadiosOperacionalVisible, 0);
      };
      window.__radiosOperationalVisiblePatch = true;
    }
  }

  function signature(){
    return JSON.stringify(getRadios().map(r=>[radioId(r),r.nome,r.mac,r.serial,r.userNome,r.estado,r.atribuidoAt]));
  }

  function tick(){
    installPatch();
    const sig = signature() + "|" + (document.getElementById("radioSearch")?.value || "");
    if(sig !== lastSignature){
      lastSignature = sig;
      window.renderRadiosOperacionalVisible();
    }
  }

  document.addEventListener("DOMContentLoaded", function(){
    installPatch();
    setTimeout(tick,300);
    setTimeout(tick,1000);
    setInterval(tick,1500);
  });
  window.addEventListener("pageshow",()=>setTimeout(tick,300));
})();
