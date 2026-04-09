const lista = document.getElementById("lista");

db.collection("printers").onSnapshot(snapshot => {
  lista.innerHTML = "";
  snapshot.forEach(doc => {
    const d = doc.data();
    const cores = d.toner || {};
    const waste = d.waste || 0;

    function getCor(v){
      if(v<=10) return "red";
      if(v<=25) return "orange";
      return "green";
    }

    let barras = "";
    Object.keys(cores).forEach(c => {
      let v = cores[c];
      barras += `
        ${c}: ${v}%
        <div class="bar ${getCor(v)}" style="width:${v}%"></div>
      `;
    });

    lista.innerHTML += `
      <tr>
        <td>${d.modelo}</td>
        <td>${d.serie}</td>
        <td>${d.local}</td>
        <td>${d.ip}</td>
        <td>${d.estado}</td>
        <td>${barras}</td>
        <td>
          ${waste}%
          <div class="bar ${getCor(waste)}" style="width:${waste}%"></div>
        </td>
      </tr>
    `;
  });
});
