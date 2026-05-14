
(function(){

  try{

    if(!window.db){
      console.error("Firebase DB indisponível");
      return;
    }

    window.db.collection("portas")
    .onSnapshot((snapshot)=>{

      window.portasData =
        snapshot.docs.map(doc=>({
          id: doc.id,
          ...doc.data()
        }));

      console.log(
        "Portas Firebase:",
        window.portasData.length
      );

      if(typeof renderPortas === "function"){
        renderPortas(window.portasData);
      }

    });

  }catch(error){

    console.error(
      "Erro Firebase Portas:",
      error
    );

  }

})();
