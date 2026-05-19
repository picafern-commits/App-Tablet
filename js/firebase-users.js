
// ===== FINAL USERS SYSTEM =====

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

        <div class="card-actions">
          <button class="btn-edit">Editar</button>
          <button class="btn-primary">Imprimir Dados</button>
          <button class="btn-danger">Apagar</button>
        </div>
      `;

      // ===== EDITAR =====
      card.querySelector(".btn-edit").onclick = ()=>{

        window.currentEditingUserId = user.firebaseId;

        const modal =
          document.getElementById("modalEditarUser");

        if(modal){
          modal.style.display = "flex";
        }

        const setValue = (id, value)=>{

          const el = document.getElementById(id);

          if(el){
            el.value = value || "";
          }

        };

        setValue("editUser_nome", user.nome);
        setValue("editUser_zona", user.zona);
        setValue("editUser_user_pc_eye", user.userPc);
        setValue("editUser_pass_remote", user.passRemote);
        setValue("editUser_pass_eye_peak", user.passEyePeak);
        setValue("editUser_op_pistola", user.opPistola);
        setValue("editUser_pass_pistola", user.passPistola);
        setValue("editUser_nome_pc", user.nomePc);
        setValue("editUser_teamviewer", user.teamviewer);
        setValue("editUser_user_mo365", user.userMO365);
        setValue("editUser_pw_mo365", user.pwMO365);
        setValue("editUser_email_bragalis", user.emailBragalis);
        setValue("editUser_pass_bragalis", user.passBragalis);

      };

      // ===== IMPRIMIR =====
      card.querySelector(".btn-primary").onclick = ()=>{

        const printable = document.createElement("div");

        printable.innerHTML = `
          <h1>${user.nome || ""}</h1>
          <p><strong>Zona:</strong> ${user.zona || ""}</p>
          <p><strong>User PC/EYE:</strong> ${user.userPc || ""}</p>
          <p><strong>TeamViewer:</strong> ${user.teamviewer || ""}</p>
        `;

        document.body.appendChild(printable);

        window.print();

        setTimeout(()=>{
          printable.remove();
        },500);

      };

      // ===== APAGAR =====
      card.querySelector(".btn-danger").onclick = async ()=>{

        const ok =
          confirm("Apagar utilizador?");

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

  // ===== GUARDAR EDIÇÃO =====
  window.guardarEdicaoUser = async function(){

    try{

      if(!window.currentEditingUserId){
        alert("Nenhum user selecionado");
        return;
      }

      const data = {
        nome: document.getElementById("editUser_nome")?.value || "",
        zona: document.getElementById("editUser_zona")?.value || "",
        userPc: document.getElementById("editUser_user_pc_eye")?.value || "",
        passRemote: document.getElementById("editUser_pass_remote")?.value || "",
        passEyePeak: document.getElementById("editUser_pass_eye_peak")?.value || "",
        opPistola: document.getElementById("editUser_op_pistola")?.value || "",
        passPistola: document.getElementById("editUser_pass_pistola")?.value || "",
        nomePc: document.getElementById("editUser_nome_pc")?.value || "",
        teamviewer: document.getElementById("editUser_teamviewer")?.value || "",
        userMO365: document.getElementById("editUser_user_mo365")?.value || "",
        pwMO365: document.getElementById("editUser_pw_mo365")?.value || "",
        emailBragalis: document.getElementById("editUser_email_bragalis")?.value || "",
        passBragalis: document.getElementById("editUser_pass_bragalis")?.value || ""
      };

      await usersRef
        .doc(window.currentEditingUserId)
        .update(data);

      fecharEditarUser();

    }catch(e){
      console.error(e);
      alert("Erro ao guardar");
    }

  };

  // ===== FECHAR MODAL =====
  window.fecharEditarUser = function(){

    const modal =
      document.getElementById("modalEditarUser");

    if(modal){
      modal.style.display = "none";
    }

  };

})();
