
// ===== REAL USERS CRUD FIX =====

window.saveUser = async function(data){

  try{

    // UPDATE EXISTENTE
    if(window.currentEditingUserId){

      await window.db
        .collection("users")
        .doc(window.currentEditingUserId)
        .update(data);

      console.log(
        "User atualizado"
      );

      return;
    }

    // NOVO USER
    await window.db
      .collection("users")
      .add(data);

    console.log(
      "Novo user criado"
    );

  }catch(e){
    console.error(e);
  }

};
