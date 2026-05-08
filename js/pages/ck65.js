// CK65 REALTIME MODULE

import {
  ouvirPistolas,
  criarPistola,
  editarPistola,
  apagarPistola
} from '../firebase/pistolas.service.js';

let pistolasRealtime = [];

function renderCK65(){

  console.log('Render CK65 realtime:', pistolasRealtime.length);

  // próxima fase:
  // mover render real do app.js
}

ouvirPistolas((dados)=>{

  pistolasRealtime = dados;

  renderCK65();

});

window.ck65Realtime = {
  criar: criarPistola,
  editar: editarPistola,
  apagar: apagarPistola
};
