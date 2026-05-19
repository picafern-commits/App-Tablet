
(function(){

if(!window.db){
  console.error("Firebase indisponível");
  return;
}

const usersRef = window.db.collection("users");

function getField(user, keys){

  for(const k of keys){

    if(user[k] !== undefined &&
       user[k] !== null &&
       user[k] !== ""){
      return user[k];
    }

  }

  return "-";
}

usersRef.onSnapshot((snapshot)=>{

  const lista = [];

  snapshot.forEach((doc)=>{

    lista.push({
      firebaseId: doc.id,
      ...doc.data()
    });

  });

  // ORDENAR ALFABETICAMENTE
  lista.sort((a, b) => {

    const nomeA =
      ((a.nome || a.name || "") + "")
      .toLowerCase();

    const nomeB =
      ((b.nome || b.name || "") + "")
      .toLowerCase();

    return nomeA.localeCompare(nomeB);

  });

  window.usersData = lista;

  


// ===== CONTADORES FIREBASE =====

const total = lista.length;

// COM MO365
const comMO365 = lista.filter(u => {
  return (
    (u.user_mo365 && String(u.user_mo365).trim() !== "") ||
    (u.userMO365 && String(u.userMO365).trim() !== "") ||
    (u.userM365 && String(u.userM365).trim() !== "") ||
    (u.mo365 && String(u.mo365).trim() !== "") ||
    (u.email_bragalis && String(u.email_bragalis).trim() !== "-")
  );
}).length;

// COM PISTOLA
const comPistola = lista.filter(u => {
  return (
    (u.op_pistola && String(u.op_pistola).trim() !== "") ||
    (u.opPistola && String(u.opPistola).trim() !== "") ||
    (u.pass_pistola && String(u.pass_pistola).trim() !== "-")
  );
}).length;

// TOTAL
const totalEl = document.querySelector("#countUsers");
if(totalEl){
  totalEl.textContent = total;
}

// MO365
const mo365El = document.querySelector("#countPistolasBraga");
if(mo365El){
  mo365El.textContent = comMO365;
}

// PISTOLA
const pistolaEl = document.querySelector("#countPistolasReserva");
if(pistolaEl){
  pistolaEl.textContent = comPistola;
}

renderUsers(lista);




});

window.renderUsers = function(lista){

  const container =
    document.getElementById("listaUsers");

  if(!container) return;

  container.innerHTML = "";

  lista.forEach((user)=>{

    const nome = getField(user, ["nome","name"]);
    const zona = getField(user, ["zona","zone"]);
    const userPc = getField(user, ["userPc","user_pc_eye","user_pc"]);
    const passRemote = getField(user, ["passRemote","pass_remote"]);
    const passEyePeak = getField(user, ["passEyePeak","pass_eye_peak"]);
    const opPistola = getField(user, ["opPistola","op_pistola"]);
    const passPistola = getField(user, ["passPistola","pass_pistola"]);
    const nomePc = getField(user, ["nomePc","nome_pc"]);
    const teamviewer = getField(user, ["teamviewer","teamViewer","team_viewer"]);
    const userMO365 = getField(user, ["userMO365","user_mo365"]);
    const pwMO365 = getField(user, ["pwMO365","pw_mo365"]);
    const emailBragalis = getField(user, ["emailBragalis","email_bragalis"]);
    const passBragalis = getField(user, ["passBragalis","pass_bragalis"]);

    const card = document.createElement("div");
    card.className = "pc-card";

    card.innerHTML = `
      <div class="pc-name">${nome}</div>

      <div class="meta-line">Zona: ${zona}</div>
      <div class="meta-line">User PC/EYE: ${userPc}</div>
      <div class="meta-line">Pass Remote: ${passRemote}</div>
      <div class="meta-line">Pass Eye Peak: ${passEyePeak}</div>
      <div class="meta-line">Op. Pistola: ${opPistola}</div>
      <div class="meta-line">Pass Pistola: ${passPistola}</div>
      <div class="meta-line">Nome PC: ${nomePc}</div>
      <div class="meta-line">TeamViewer: ${teamviewer}</div>

      <div class="card-actions">
        <button class="btn-edit">Editar</button>
        <button class="btn-primary">Imprimir Dados</button>
        <button class="btn-danger">Apagar</button>
      </div>
    `;

    // EDITAR
    card.querySelector(".btn-edit").onclick = ()=>{

      const modal =
        document.getElementById("modalEditarUser");

      if(modal){
        modal.style.display = "flex";
        modal.removeAttribute("hidden");
        modal.classList.add("active");
      }

      window.currentEditingUserId =
        user.firebaseId;

      const setVal = (id,val)=>{
        const el = document.getElementById(id);
        if(el) el.value = val || "";
      };

      setVal("editUser_nome", nome);
      setVal("editUser_zona", zona);
      setVal("editUser_user_pc_eye", userPc);
      setVal("editUser_pass_remote", passRemote);
      setVal("editUser_pass_eye_peak", passEyePeak);
      setVal("editUser_op_pistola", opPistola);
      setVal("editUser_pass_pistola", passPistola);
      setVal("editUser_nome_pc", nomePc);
      setVal("editUser_teamviewer", teamviewer);
      setVal("editUser_user_mo365", userMO365);
      setVal("editUser_pw_mo365", pwMO365);
      setVal("editUser_email_bragalis", emailBragalis);
      setVal("editUser_pass_bragalis", passBragalis);

    };

    // PRINT
    card.querySelector(".btn-primary").onclick = ()=>{

      const printWindow = window.open("", "_blank");

      printWindow.document.write(`
        <html>
        <head>
          <title>${nome}</title>
          <style>
            body{
              font-family: Arial;
              padding:20px;
              color:#000;
            }
            h1{
              margin-bottom:20px;
            }
            p{
              margin:8px 0;
              font-size:16px;
            }
          </style>
        </head>
        <body>
          <h1>${nome}</h1>
          <p><b>Zona:</b> ${zona}</p>
          <p><b>User PC/EYE:</b> ${userPc}</p>
          <p><b>Pass Remote:</b> ${passRemote}</p>
          <p><b>Pass Eye Peak:</b> ${passEyePeak}</p>
          <p><b>Op. Pistola:</b> ${opPistola}</p>
          <p><b>Pass Pistola:</b> ${passPistola}</p>
          <p><b>Nome PC:</b> ${nomePc}</p>
          <p><b>TeamViewer:</b> ${teamviewer}</p>
        </body>
        </html>
      `);

      printWindow.document.close();

      setTimeout(()=>{
        printWindow.focus();
        printWindow.print();
      },500);

    };

    // APAGAR
    card.querySelector(".btn-danger").onclick = async ()=>{

      if(!confirm("Apagar utilizador?")){
        return;
      }

      await usersRef
        .doc(user.firebaseId)
        .delete();

    };

    container.appendChild(card);

  });

};

window.guardarEdicaoUser = async function(){

  if(!window.currentEditingUserId){
    alert("Nenhum utilizador selecionado");
    return;
  }

  const data = {
    nome: document.getElementById("editUser_nome")?.value || "",
    zona: document.getElementById("editUser_zona")?.value || "",
    user_pc_eye: document.getElementById("editUser_user_pc_eye")?.value || "",
    pass_remote: document.getElementById("editUser_pass_remote")?.value || "",
    pass_eye_peak: document.getElementById("editUser_pass_eye_peak")?.value || "",
    op_pistola: document.getElementById("editUser_op_pistola")?.value || "",
    pass_pistola: document.getElementById("editUser_pass_pistola")?.value || "",
    nome_pc: document.getElementById("editUser_nome_pc")?.value || "",
    teamviewer: document.getElementById("editUser_teamviewer")?.value || "",
    user_mo365: document.getElementById("editUser_user_mo365")?.value || "",
    pw_mo365: document.getElementById("editUser_pw_mo365")?.value || "",
    email_bragalis: document.getElementById("editUser_email_bragalis")?.value || "",
    pass_bragalis: document.getElementById("editUser_pass_bragalis")?.value || ""
  };

  await usersRef
    .doc(window.currentEditingUserId)
    .update(data);

  fecharEditarUser();

};

window.fecharEditarUser = function(){

  const modal =
    document.getElementById("modalEditarUser");

  if(modal){
    modal.style.display = "none";
    modal.classList.remove("active");
  }

};

})();
