
// ===== REAL USERS CRUD =====

window.guardarEdicaoUser = async function(){

  try{

    if(!window.currentEditingUserId){
      alert("Nenhum utilizador selecionado");
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

    await window.db
      .collection("users")
      .doc(window.currentEditingUserId)
      .update(data);

    fecharEditarUser();

  }catch(e){
    console.error(e);
    alert("Erro ao guardar");
  }

};

window.fecharEditarUser = function(){

  const modal =
    document.getElementById("modalEditarUser");

  if(modal){
    modal.style.display = "none";
  }

};
