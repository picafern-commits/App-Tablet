
// ===== USERS COMPLETE SYSTEM =====

(function(){

  if(!window.db){
    console.error("Firebase indisponível");
    return;
  }

  const usersRef =
    window.db.collection("users");

  let usersCache = [];

  usersRef.onSnapshot((snapshot)=>{

    usersCache = [];

    snapshot.forEach((doc)=>{

      usersCache.push({
        firebaseId: doc.id,
        ...doc.data()
      });

    });

    renderUsers(usersCache);

  });

  function renderUsers(lista){

    const container =
      document.querySelector("#listaUsers");

    if(!container) return;

    container.innerHTML = "";

    lista.forEach((user)=>{

      const card =
        document.createElement("div");

      card.className = "pc-card";

      card.innerHTML = `
        <div class="pc-name">
          ${user.nome || "-"}
        </div>

        <div class="meta-line">
          Zona:
          <span class="meta-value">
            ${user.zona || "-"}
          </span>
        </div>

        <div class="meta-line">
          User PC/EYE:
          <span class="meta-value">
            ${user.userPc || "-"}
          </span>
        </div>

        <div class="meta-line">
          Pass Remote:
          <span class="meta-value">
            ${user.passRemote || "-"}
          </span>
        </div>

        <div class="meta-line">
          Pass Eye Peak:
          <span class="meta-value">
            ${user.passEyePeak || "-"}
          </span>
        </div>

        <div class="meta-line">
          Op. Pistola:
          <span class="meta-value">
            ${user.opPistola || "-"}
          </span>
        </div>

        <div class="meta-line">
          Pass Pistola:
          <span class="meta-value">
            ${user.passPistola || "-"}
          </span>
        </div>

        <div class="meta-line">
          Nome PC:
          <span class="meta-value">
            ${user.nomePc || "-"}
          </span>
        </div>

        <div class="meta-line">
          TeamViewer:
          <span class="meta-value">
            ${user.teamviewer || "-"}
          </span>
        </div>

        <div class="meta-line">
          User MO365:
          <span class="meta-value">
            ${user.userMO365 || "-"}
          </span>
        </div>

        <div class="meta-line">
          Pw MO365:
          <span class="meta-value">
            ${user.pwMO365 || "-"}
          </span>
        </div>

        <div class="meta-line">
          Email Bragalis:
          <span class="meta-value">
            ${user.emailBragalis || "-"}
          </span>
        </div>

        <div class="meta-line">
          Pass Bragalis:
          <span class="meta-value">
            ${user.passBragalis || "-"}
          </span>
        </div>

        <div class="card-actions">
          <button class="btn-edit">
            Editar
          </button>

          <button class="btn-primary">
            Imprimir Dados
          </button>

          <button class="btn-danger">
            Apagar
          </button>
        </div>
      `;

      // EDITAR
      card.querySelector(".btn-edit")
      .onclick = ()=>{

        window.currentEditingUserId =
          user.firebaseId;

        window.currentEditingUser =
          user;

        // modal antigo
        if(typeof window.openUserModal === "function"){
          window.openUserModal(user);
        }

      };

      // APAGAR
      card.querySelector(".btn-danger")
      .onclick = async ()=>{

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
