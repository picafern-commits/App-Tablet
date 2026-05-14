
/* CLEAN APP.JS REBUILD */

window.usersData = [];
window.pistolasData = [];
window.portasData = [];




/* =========================
   PISTOLAS
========================= */

function ordenarPistolas(lista=[]){
  return lista.sort((a,b)=>{

    const aTxt = String(
      a.nome ||
      a.num ||
      ""
    ).toLowerCase();

    const bTxt = String(
      b.nome ||
      b.num ||
      ""
    ).toLowerCase();

    return aTxt.localeCompare(
      bTxt,
      'pt',
      {
        numeric:true,
        sensitivity:'base'
      }
    );

  });
}

function atualizarContadoresPistolas(lista=[]){

  setText("countPistolas", lista.length);

  setText(
    "countPistolasBraga",
    lista.filter(p =>
      normalizarTexto(p.armazem)
        .includes("braga")
    ).length
  );

  setText(
    "countPistolasReserva",
    lista.filter(p =>
      normalizarTexto(p.operador)
        .includes("reserva")
    ).length
  );

}

function badgePistolaReserva(valor){

  return normalizarTexto(valor)
    .includes("reserva")

    ? `<span class="badge reserva">Reserva</span>`

    : `<span class="badge ok">Ativa</span>`;

}

function renderPistolas(lista = window.pistolasData){

  lista = Array.isArray(lista)
    ? lista
    : [];

  ordenarPistolas(lista);

  atualizarContadoresPistolas(lista);

  const container =
    document.querySelector("#listaPistolas");

  if(!container) return;

  container.innerHTML = lista.map(p => `

    <div class="pc-card">

      <div class="pc-name">
        ${p.nome || "-"}
      </div>

      <div class="meta-line">
        Nº:
        <span class="meta-value">
          ${p.num || "-"}
        </span>
      </div>

      <div class="meta-line">
        Operador:
        <span class="meta-value">
          ${p.operador || "-"}
        </span>
      </div>

      <div class="meta-line">
        Armazém:
        <span class="meta-value">
          ${p.armazem || "-"}
        </span>
      </div>

      <div class="meta-line">
        Estado:
        <span class="meta-value">
          ${badgePistolaReserva(p.operador)}
        </span>
      </div>

      <div class="item-actions">

        <button
          class="secondary-btn"
          onclick="editarPistola('${p.idDoc}')">
          Editar
        </button>

        <button
          class="secondary-btn"
          onclick="apagarPistola('${p.idDoc}')">
          Apagar
        </button>

      </div>

    </div>

  `).join("");

}

function editarPistola(idDoc){

  const p =
    window.pistolasData.find(
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
  ].forEach(f=>{

    const node = el("editP_" + f);

    if(node){
      node.value = p[f] || "";
    }

  });

  window.pistolaEditId = idDoc;

  if(el("modalEditarPistola")){
    el("modalEditarPistola").style.display = "flex";
  }

}

function filtrarPistolasComFiltros(){

  const texto =
    normalizarTexto(
      el("searchPistolas")?.value
    );

  const filtradas =
    window.pistolasData.filter(p => {

      return [
        p.nome,
        p.num,
        p.password,
        p.cn,
        p.sn,
        p.mac,
        p.operador,
        p.armazem
      ].some(v =>
        normalizarTexto(v)
          .includes(texto)
      );

    });

  renderPistolas(filtradas);

}

window.renderPistolas = renderPistolas;
window.editarPistola = editarPistola;
window.filtrarPistolasComFiltros = filtrarPistolasComFiltros;
