const div = document.getElementById("criticos");

db.collection("printers").onSnapshot(snapshot => {
  div.innerHTML = "";
  snapshot.forEach(doc => {
    const d = doc.data();
    const cores = d.toner || {};
    let critico = false;
    Object.values(cores).forEach(v => {
      if (v <= 25) critico = true;
    });
    if (!critico) return;
    div.innerHTML += `<div class="card">⚠️ ${doc.id}</div>`;
  });
});
