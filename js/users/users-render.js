
// ===== REAL USERS RENDER FIX =====

window.renderUsers = function(lista){

  const container =
    document.querySelector("#listaUsers");

  if(!container) return;

  container.innerHTML = "";

  lista.forEach((user)=>{

    const card = document.createElement("div");

    card.className = "pc-card";

    card.innerHTML = `
      <div class="pc-name">${user.nome || "-"}</div>

      <div class="meta-line">
        Zona:
        <span class="meta-value">
          ${user.zona || "-"}
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

        <button class="btn-print">
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

      const modal =
        document.querySelector("#userModal");

      if(modal){
        modal.style.display = "flex";
      }

    };

    // PRINT
    card.querySelector(".btn-print")
    .onclick = ()=>{

      const w = window.open("");

      w.document.write(`
        <pre>
Nome: ${user.nome || ""}
Zona: ${user.zona || ""}
TeamViewer: ${user.teamviewer || ""}
        </pre>
      `);

      w.print();

    };

    // DELETE
    card.querySelector(".btn-danger")
    .onclick = async ()=>{

      const ok = confirm(
        "Apagar utilizador?"
      );

      if(!ok) return;

      await window.db
        .collection("users")
        .doc(user.firebaseId)
        .delete();

    };

    container.appendChild(card);

  });

};
