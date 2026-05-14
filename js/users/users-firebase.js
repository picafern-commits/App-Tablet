
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.usersData = [];

function iniciarUsers(){

  if(!window.db){
    setTimeout(iniciarUsers, 500);
    return;
  }

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

}

iniciarUsers();

console.log("Users realtime OK");
