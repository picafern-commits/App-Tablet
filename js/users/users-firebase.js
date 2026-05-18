
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.usersData = [];

window.loadUsersFirebase = function(){

    if(!window.db){
        console.log("Firebase DB indisponível");
        return;
    }

    const usersRef = collection(window.db, "users");

    onSnapshot(usersRef, (snapshot)=>{

        const container =
            document.getElementById("usersContainer") ||
            document.getElementById("usersGrid") ||
            document.querySelector(".users-grid") ||
            document.querySelector(".cards-grid");

        window.usersData = [];

        if(container){
            container.innerHTML = "";
        }

        snapshot.docs.forEach((d)=>{

            const user = {
                firebaseId: d.id,
                ...d.data()
            };

            window.usersData.push(user);

            if(container){

                const card = document.createElement("div");
                card.className = "user-card";

                card.innerHTML = `
                    <div class="pc-name">${user.nome || user.name || "User"}</div>
                    <div class="meta-line">${user.email || ""}</div>
                    <div class="meta-line">${user.role || ""}</div>
                `;

                container.appendChild(card);

            }

        });

        console.log("Users Firebase:", window.usersData.length);

    });

};

document.addEventListener("DOMContentLoaded", ()=>{
    setTimeout(()=>{
        window.loadUsersFirebase();
    }, 300);
});
