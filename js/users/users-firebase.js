
function iniciar(){
  
console.log("Users listener start");

}

if(window.appReady){
  iniciar();
}else{
  document.addEventListener("app-ready", iniciar);
}

import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.usersData = [];

document.addEventListener("app-ready", ()=>{

  const usersRef =
    collection(window.db, "users");

  onSnapshot(usersRef, (snapshot)=>{

    window.usersData =
      snapshot.docs.map(d => ({
        idDoc: d.id,
        ...d.data()
      }));

    if(window.renderUsers){
      window.renderUsers(
        window.usersData
      );
    }

  });

  console.log("Users connected");

});
