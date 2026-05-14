
function iniciar(){
  
console.log("Pistolas listener start");

}

if(window.appReady){
  iniciar();
}else{
  document.addEventListener("app-ready", iniciar);
}

import {
  collection,
  onSnapshot,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.pistolasData = [];

document.addEventListener("app-ready", ()=>{

  const pistolasRef =
    collection(window.db, "pistolas");

  onSnapshot(pistolasRef, (snapshot)=>{

    window.pistolasData =
      snapshot.docs.map(d => ({
        idDoc: d.id,
        ...d.data()
      }));

    if(window.renderPistolas){
      window.renderPistolas(
        window.pistolasData
      );
    }

  });

  console.log("Pistolas connected");

});

window.guardarEdicaoPistola =
async function(){

  if(!window.pistolaEditId) return;

  const payload = {};

  [
    "num",
    "nome",
    "password",
    "cn",
    "sn",
    "mac",
    "operador",
    "armazem",
    "prontas"
  ].forEach(f=>{

    payload[f] =
      el("editP_" + f)?.value || "";

  });

  await updateDoc(
    doc(
      window.db,
      "pistolas",
      window.pistolaEditId
    ),
    payload
  );

  hide("modalEditarPistola");

};
