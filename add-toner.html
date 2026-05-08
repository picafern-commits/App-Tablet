// CK65 REALTIME MODULE

import {
  ouvirPistolas,
  criarPistola,
  editarPistola,
  apagarPistola
} from '../firebase/pistolas.service.js';

let pistolasRealtime = [];

function criarCardCK65(item){

  return `
    <div class="card-pistola">
      <h3>${item.nome || ''}</h3>
      <p><strong>Operador:</strong> ${item.operador || ''}</p>
      <p><strong>Armazém:</strong> ${item.armazem || ''}</p>

      <div class="acoes-card">

        <button onclick="editarCK65('${item.idDoc}')">
          Editar
        </button>

        <button onclick="apagarCK65('${item.idDoc}')">
          Apagar
        </button>

      </div>

    </div>
  `;

}

function renderCK65(){

  const lista = document.getElementById('listaCK65');

  if(!lista) return;

  lista.innerHTML = pistolasRealtime
    .map(criarCardCK65)
    .join('');

}

ouvirPistolas((dados)=>{

  pistolasRealtime = dados;

  renderCK65();

});

window.editarCK65 = async function(id){

  console.log('Editar pistola:', id);

};

window.apagarCK65 = async function(id){

  await apagarPistola(id);

};

window.ck65Realtime = {
  criar: criarPistola,
  editar: editarPistola,
  apagar: apagarPistola
};
