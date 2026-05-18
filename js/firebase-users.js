
(function(){

  function applyUsers(snapshot){

    window.usersData = [];

    const lista = [];

    snapshot.forEach(function(doc){

      lista.push({
        firebaseId: doc.id,
        ...doc.data()
      });

    });

    window.usersData = lista;

    if(typeof renderUsers === "function"){
      renderUsers(lista);
    }

    console.log("Users Firebase:", lista.length);

  }

  function startUsers(){

    if(!window.db){
      console.log("DB indisponível");
      return;
    }

    window.db
      .collection("users")
      .onSnapshot(
        applyUsers,
        function(error){
          console.error(error);
        }
      );

  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", startUsers);
  }else{
    startUsers();
  }

})();
