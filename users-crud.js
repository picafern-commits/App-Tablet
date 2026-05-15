
window.renderPistolas = function(lista = window.pistolasData || []){

  lista = Array.isArray(lista) ? lista : [];

  lista.sort((a,b)=>{

    const aTxt =
      String(a.nome || a.num || "")
        .toLowerCase();

    const bTxt =
      String(b.nome || b.num || "")
        .toLowerCase();

    return aTxt.localeCompare(
      bTxt,
      'pt',
      {
        numeric:true,
        sensitivity:'base'
      }
    );

  });

  setText("countPistolas", lista.length);

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

      <div class="item-actions">

        <button
          class="secondary-btn"
          onclick="editarPistola('${p.idDoc}')">
          Editar
        </button>

      </div>

    </div>

  `).join("");

}
