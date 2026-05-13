
(function(){

  try{

    if(!window.db){
      console.log("window.db não disponível.");
      return;
    }

    window.db
      .collection("users")
      .onSnapshot((snapshot)=>{

        const dados =
          snapshot.docs.map(doc=>({
            id: doc.id,
            ...doc.data()
          }));

        if(typeof usersData !== "undefined"){

          usersData.length = 0;

          dados.forEach(u=>usersData.push(u));

        }else{

          window.usersData = dados;

        }

        console.log(
          "Users Firebase:",
          dados.length
        );

        if(typeof renderUsers === "function"){
          renderUsers(usersData);
        }

      });

  }catch(error){

    console.error(
      "Erro Firebase Users:",
      error
    );

  }

})();
