
function iniciar(){
  
console.log("Stock listener start");

}

if(window.appReady){
  iniciar();
}else{
  document.addEventListener("app-ready", iniciar);
}

// stock-firebase.js
