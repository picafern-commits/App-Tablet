
// ===== FIRESTORE USERS ONLY =====

window.usersData = [];

window.loadUsersFirebase = function(){

    if(!window.db){
        console.log("Firebase DB indisponível");
        return;
    }

    const container =
        document.getElementById("usersContainer") ||
        document.getElementById("usersGrid") ||
        document.querySelector(".users-grid") ||
        document.querySelector(".cards-grid");

    window.db.collection("users").onSnapshot((snapshot)=>{

        window.usersData = [];

        if(container){
            container.innerHTML = "";
        }

        snapshot.forEach((doc)=>{

            const user = {
                firebaseId: doc.id,
                ...doc.data()
            };

            window.usersData.push(user);

            if(container){

                const card = document.createElement("div");
                card.className = "user-card";

                card.innerHTML = `
                    <div class="pc-name">${user.nome || user.name || "User"}</div>
                    <div class="meta-line">
                        ${user.email || ""}
                    </div>
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
    }, 500);
});
