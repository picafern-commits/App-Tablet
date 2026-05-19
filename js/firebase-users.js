
// ===== USERS SYSTEM (PORTAS STYLE) =====

(function(){

  if(!window.db){
    console.error("Firebase indisponível");
    return;
  }

  let usersCache = [];

  const usersRef =
    window.db.collection("users");

  usersRef.onSnapshot((snapshot)=>{

    usersCache = [];

    snapshot.forEach((doc)=>{

      usersCache.push({
        firebaseId: doc.id,
        ...doc.data()
      });

    });

    renderUsers(usersCache);

    console.log(
      "Users carregados:",
      usersCache.length
    );

  });

  function renderUsers(lista){

    const container =
      document.querySelector("#listaUsers");

    if(!container) return;

    // LIMPA TUDO ANTES
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
          Email:
          <span class="meta-value">
            ${user.email || "-"}
          </span>
        </div>

        <div class="meta-line">
          TeamViewer:
          <span class="meta-value">
            ${user.teamviewer || "-"}
          </span>
        </div>

        <div class="card-actions">
          <button class="btn-edit">
            Editar
          </button>
        </div>
      `;

      const btn =
        card.querySelector(".btn-edit");

      btn.onclick = ()=>{

        window.currentEditingUserId =
          user.firebaseId;

        window.currentEditingUser =
          user;

        // preencher form
        const nome =
          document.querySelector("#nomeUser");

        const email =
          document.querySelector("#emailUser");

        const teamviewer =
          document.querySelector("#teamviewerUser");

        if(nome) nome.value = user.nome || "";
        if(email) email.value = user.email || "";
        if(teamviewer) teamviewer.value = user.teamviewer || "";

      };

      container.appendChild(card);

    });

  }

  // SAVE USER
  window.saveUserFirebase =
    async function(data){

    try{

      // UPDATE
      if(window.currentEditingUserId){

        await usersRef
          .doc(window.currentEditingUserId)
          .update(data);

        console.log(
          "User atualizado"
        );

        return;
      }

      // CREATE
      await usersRef.add(data);

      console.log(
        "Novo user criado"
      );

    }catch(e){
      console.error(e);
    }

  };

})();
