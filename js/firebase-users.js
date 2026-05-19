
// ===== USERS COMPLETE SYSTEM WITH ACTIONS =====

(function(){

  if(!window.db){
    console.error("Firebase indisponível");
    return;
  }

  const usersRef = window.db.collection("users");

  usersRef.onSnapshot((snapshot)=>{

    const lista = [];

    snapshot.forEach((doc)=>{

      lista.push({
        firebaseId: doc.id,
        ...doc.data()
      });

    });

    renderUsers(lista);

  });

  function renderUsers(lista){

    const container =
      document.querySelector("#listaUsers");

    if(!container) return;

    container.innerHTML = "";

    lista.forEach((user)=>{

      const card = document.createElement("div");

      card.className = "pc-card";

      card.innerHTML = `
        <div class="pc-name">${user.nome || "-"}</div>

        <div class="meta-line">Zona: <span class="meta-value">${user.zona || "-"}</span></div>
        <div class="meta-line">User PC/EYE: <span class="meta-value">${user.userPc || "-"}</span></div>
        <div class="meta-line">Pass Remote: <span class="meta-value">${user.passRemote || "-"}</span></div>
        <div class="meta-line">Pass Eye Peak: <span class="meta-value">${user.passEyePeak || "-"}</span></div>
        <div class="meta-line">Op. Pistola: <span class="meta-value">${user.opPistola || "-"}</span></div>
        <div class="meta-line">Pass Pistola: <span class="meta-value">${user.passPistola || "-"}</span></div>
        <div class="meta-line">Nome PC: <span class="meta-value">${user.nomePc || "-"}</span></div>
        <div class="meta-line">TeamViewer: <span class="meta-value">${user.teamviewer || "-"}</span></div>
        <div class="meta-line">User MO365: <span class="meta-value">${user.userMO365 || "-"}</span></div>
        <div class="meta-line">Pw MO365: <span class="meta-value">${user.pwMO365 || "-"}</span></div>
        <div class="meta-line">Email Bragalis: <span class="meta-value">${user.emailBragalis || "-"}</span></div>
        <div class="meta-line">Pass Bragalis: <span class="meta-value">${user.passBragalis || "-"}</span></div>

        <div class="card-actions">
          <button class="btn-edit">Editar</button>
          <button class="btn-primary">Imprimir Dados</button>
          <button class="btn-danger">Apagar</button>
        </div>
      `;

      // EDITAR
      card.querySelector(".btn-edit").onclick = ()=>{

        window.currentEditingUserId = user.firebaseId;
        window.currentEditingUser = user;

        const modal =
          document.querySelector("#userModal") ||
          document.querySelector(".user-modal");

        if(modal){
          modal.style.display = "flex";
        }

        const map = {
          nomeUser: user.nome,
          zonaUser: user.zona,
          userPcUser: user.userPc,
          passRemoteUser: user.passRemote,
          passEyePeakUser: user.passEyePeak,
          opPistolaUser: user.opPistola,
          passPistolaUser: user.passPistola,
          nomePcUser: user.nomePc,
          teamviewerUser: user.teamviewer,
          userMO365User: user.userMO365,
          pwMO365User: user.pwMO365,
          emailBragalisUser: user.emailBragalis,
          passBragalisUser: user.passBragalis
        };

        Object.keys(map).forEach((id)=>{
          const el = document.getElementById(id);
          if(el){
            el.value = map[id] || "";
          }
        });

      };

      // IMPRIMIR
      card.querySelector(".btn-primary").onclick = ()=>{

        const texto = `
Nome: ${user.nome || ""}
Zona: ${user.zona || ""}
User PC/EYE: ${user.userPc || ""}
Pass Remote: ${user.passRemote || ""}
Pass Eye Peak: ${user.passEyePeak || ""}
Op Pistola: ${user.opPistola || ""}
Pass Pistola: ${user.passPistola || ""}
Nome PC: ${user.nomePc || ""}
TeamViewer: ${user.teamviewer || ""}
User MO365: ${user.userMO365 || ""}
Pw MO365: ${user.pwMO365 || ""}
Email Bragalis: ${user.emailBragalis || ""}
Pass Bragalis: ${user.passBragalis || ""}
`;

        const w = window.open("", "_blank");
        w.document.write("<pre>"+texto+"</pre>");
        w.print();

      };

      // APAGAR
      card.querySelector(".btn-danger").onclick = async ()=>{

        const ok = confirm(
          "Apagar utilizador?"
        );

        if(!ok) return;

        try{

          await usersRef
            .doc(user.firebaseId)
            .delete();

        }catch(e){
          console.error(e);
        }

      };

      container.appendChild(card);

    });

  }

})();
