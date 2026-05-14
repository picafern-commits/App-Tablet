
window.renderUsers = function(lista = window.usersData || []){

  lista = Array.isArray(lista) ? lista : [];

  setText("countUsers", lista.length);

  const container =
    document.querySelector("#listaUsers");

  if(!container) return;

  container.innerHTML = lista.map(u => `

    <div class="pc-card">

      <div class="pc-name">
        ${u.nome || "-"}
      </div>

      <div class="meta-line">
        Email:
        <span class="meta-value">
          ${u.email || "-"}
        </span>
      </div>

    </div>

  `).join("");

}
