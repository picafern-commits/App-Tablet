
(function(){

  if(!window.db){
    console.error("Firebase DB indisponível");
    return;
  }

  window.db.collection("users")
  .onSnapshot((snapshot)=>{

    window.usersData = snapshot.docs.map(doc=>({
      id: doc.id,
      ...({ firebaseId: doc.id, ...doc.data() })
    }));

    console.log(
      "Users carregados Firebase:",
      window.usersData.length
    );

    if(typeof renderUsers === "function"){
      renderUsers(window.usersData);
    }

  },(error)=>{
    console.error("Erro users Firebase:", error);
  });

})();


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

