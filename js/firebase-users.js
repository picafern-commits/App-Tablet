
(function(){

  if(!window.db){
    console.error("Firebase DB indisponível");
    return;
  }

  window.db.collection("users")
  .onSnapshot((snapshot)=>{

    window.usersData = snapshot.docs.map(doc=>({
      id: doc.id,
      ...({ firebaseId: doc.id, ...doc.data() })
    }));

    console.log(
      "Users carregados Firebase:",
      window.usersData.length
    );

    if(typeof renderUsers === "function"){
      renderUsers(window.usersData);
    }

  },(error)=>{
    console.error("Erro users Firebase:", error);
  });

})();
