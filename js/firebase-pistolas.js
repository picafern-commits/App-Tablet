
(function(){

    try{

    if(!window.db){
      console.error("Firebase DB indisponível");
      return;
    }

    window.db.collection("pistolas")
    .onSnapshot((snapshot)=>{

      window.pistolasData =
        snapshot.docs.map(doc=>({
          id: doc.id,
          ...({ firebaseId: doc.id, ...doc.data() })
        }));

      console.log(
        "Pistolas Firebase:",
        window.pistolasData.length
      );

      if(typeof renderPistolas === "function"){
        renderPistolas(window.pistolasData);
      }

    });

  }catch(error){

    console.error(
      "Erro Firebase Pistolas:",
      error
    );

    }

})();
