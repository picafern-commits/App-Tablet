/* =========================
   PISTOLAS FIREBASE
========================= */

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.pistolasData = window.pistolasData || [];

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

console.log("Pistolas Firebase realtime OK");
