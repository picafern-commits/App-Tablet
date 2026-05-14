
function iniciar(){
  
console.log("Portas listener start");

}

if(window.appReady){
  iniciar();
}else{
  document.addEventListener("app-ready", iniciar);
}

// portas-firebase.js
