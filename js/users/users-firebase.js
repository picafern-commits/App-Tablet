
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.usersData = [];
window.__usersListenerLoaded = window.__usersListenerLoaded || false;

document.addEventListener("app-ready", ()=>{

  if(window.__usersListenerLoaded){
    console.log("Users listener already loaded");
    return;
  }

  window.__usersListenerLoaded = true;

  const usersRef =
    collection(window.db, "users");

  onSnapshot(usersRef, (snapshot)=>{

    const uniqueUsers = [];
    const usedIds = new Set();

    snapshot.docs.forEach(d => {

      if(usedIds.has(d.id)) return;

      usedIds.add(d.id);

      uniqueUsers.push({
        idDoc: d.id,
        ...d.data()
      });

    });

    window.usersData = uniqueUsers;

    if(window.renderUsers){
      window.renderUsers(window.usersData);
    }

  });

  console.log("Users connected");

});


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

