
(function(){

    try{

      if(window.currentEditingPistolaId){


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


// ADD/EDIT pistolas fix applied
