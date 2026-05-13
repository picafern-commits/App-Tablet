
const firebaseConfig = {
  apiKey: "AIzaSyCSgw4rhBLW5mq4QClulubf6e0hf5lDJbo",
  authDomain: "toner-manager-756c4.firebaseapp.com",
  projectId: "toner-manager-756c4"
};

(function(){

  try{

    if(typeof firebase === "undefined"){
      console.log("Firebase library não carregada.");
      return;
    }

    if(!firebase.apps.length){
      firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();

    window.db = db;

    function iniciarUsersRealtime(){

      if(typeof usersData === "undefined"){
        console.log("usersData ainda não existe.");
        return;
      }

      db.collection("users")
      .onSnapshot((snapshot)=>{

        const dados =
          snapshot.docs.map(doc=>({
            id: doc.id,
            ...doc.data()
          }));

        usersData.length = 0;

        dados.forEach(u=>usersData.push(u));

        console.log("Users Firebase:", dados.length);

        if(typeof renderUsers === "function"){
          renderUsers(usersData);
        }

      });

    }

    setTimeout(iniciarUsersRealtime, 3000);

  }catch(error){

    console.error(
      "Erro Firebase Users:",
      error
    );

  }

})();
