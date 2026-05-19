
window.renderUsers = function(lista = window.usersData || []){

  lista = Array.isArray(lista) ? lista : [];

  setText("countUsers", lista.length);

  const container =
    document.querySelector("#listaUsers");

  if(!container) return;

  container.innerHTML = lista.map(u => `

    <div class="pc-card">

      <div class="pc-name">
        ${u.nome || "-"}
      </div>

      <div class="meta-line">
        Email:
        <span class="meta-value">
          ${u.email || "-"}
        </span>
      </div>

    </div>

  `).join("");

}


// ===== APP_BRAGA_THEME_SYSTEM =====

window.loadTheme = function(){

  try{

    const savedTheme =
      localStorage.getItem("app-theme") || "dark";

    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");

    if(savedTheme === "dark"){
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    }

  }catch(e){
    console.log(e);
  }

};

window.saveTheme = function(theme){

  try{
    localStorage.setItem("app-theme", theme);
  }catch(e){
    console.log(e);
  }

};

window.toggleTheme = function(){

  const isDark =
    document.body.classList.contains("dark");

  const newTheme =
    isDark ? "light" : "dark";

  window.saveTheme(newTheme);
  window.loadTheme();

};

document.addEventListener(
  "DOMContentLoaded",
  window.loadTheme
);

window.addEventListener(
  "pageshow",
  window.loadTheme
);



// ===== APP_BRAGA_USER_FIX =====

window.currentEditingUserId = null;

window.openEditUserModal = function(user){

    if(!user) return;

    window.currentEditingUserId =
        user.firebaseId || user.id || null;

};

window.saveExistingUserOnly = async function(data){

    try{

        if(!window.currentEditingUserId){
            console.error("Sem firebaseId");
            return;
        }

        if(!window.db){
            console.error("DB indisponível");
            return;
        }

        await window.db
            .collection("users")
            .doc(window.currentEditingUserId)
            .update(data);

        console.log("User atualizado");

    }catch(e){
        console.error(e);
    }

};

