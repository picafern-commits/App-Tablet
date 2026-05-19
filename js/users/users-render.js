
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
        document.querySelector("#modalEditarUser");

      if(modal){
        modal.style.display = "flex";
      }

      const fields = {
        editUser_nome: user.nome,
        editUser_zona: user.zona,
        editUser_user_pc_eye: user.userPc,
        editUser_pass_remote: user.passRemote,
        editUser_pass_eye_peak: user.passEyePeak,
        editUser_op_pistola: user.opPistola,
        editUser_pass_pistola: user.passPistola,
        editUser_nome_pc: user.nomePc,
        editUser_teamviewer: user.teamviewer,
        editUser_user_mo365: user.userMO365,
        editUser_pw_mo365: user.pwMO365,
        editUser_email_bragalis: user.emailBragalis,
        editUser_pass_bragalis: user.passBragalis
      };

      Object.keys(fields).forEach((id)=>{

        const el = document.getElementById(id);

        if(el){
          el.value = fields[id] || "";
        }

      });

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
