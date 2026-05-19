
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

