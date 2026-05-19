/* =========================
   CORE HELPERS
========================= */

window.el = function(id){
  return document.getElementById(id);
};

window.q1 = function(sel){
  return document.querySelector(sel);
};

window.qAll = function(sel){
  return document.querySelectorAll(sel);
};

window.setText = function(id, value){

  const node = el(id);

  if(node){
    node.textContent = value;
  }

};

window.show = function(id){

  const node = el(id);

  if(node){
    node.style.display = "flex";
  }

};

window.hide = function(id){

  const node = el(id);

  if(node){
    node.style.display = "none";
  }

};

window.normalizarTexto = function(v){

  return String(v || "")
    .toLowerCase()
    .trim();

};
