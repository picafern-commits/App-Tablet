
window.editarPistola = function(idDoc){

  const p =
    (window.pistolasData || []).find(
      x => x.idDoc === idDoc
    );

  if(!p) return;

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
  ].forEach(f => {

    const node = el("editP_" + f);

    if(node){
      node.value = p[f] || "";
    }

  });

  window.pistolaEditId = idDoc;

  show("modalEditarPistola");

}
