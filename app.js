// =========================
// FIREBASE
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyCSgw4rhBLW5mq4QClulubf6e0hf5lDJbo",
  authDomain: "toner-manager-756c4.firebaseapp.com",
  projectId: "toner-manager-756c4"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// =========================
// HELPERS
// =========================
const $ = (id) => document.getElementById(id);

function exists(id) {
  return !!$(id);
}

function safeSetHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function safeSetText(id, text) {
  const el = $(id);
  if (el) el.innerText = text;
}

// =========================
// NAVEGAÇÃO
// =========================
const pageIds = [
  "dashboard",
  "impressoras",
  "registo",
  "registo-toners",
  "stock",
  "historico",
  "computadores",
  "config",
  "configuracoes",
  "manutencao",
  "pistolas",
  "ck65",
  "portas",
  "rede",
  "users"
];

function getExistingPages() {
  return pageIds.filter(id => exists(id));
}

window.mostrarPagina = function (id) {
  const pages = getExistingPages();
  pages.forEach(pageId => {
    $(pageId).style.display = "none";
  });

  if (exists(id)) {
    $(id).style.display = "block";
  } else if (pages.length) {
    $(pages[0]).style.display = "block";
  }

  if (id === "computadores") carregarChecklist();
};

window.mudarPagina = window.mostrarPagina;

// Tenta ligar sidebar/menu por data attribute se existir
function ligarBotoesSidebar() {
  document.querySelectorAll("[data-page-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-page-target");
      window.mostrarPagina(target);
    });
  });
}

// =========================
// DARK MODE
// =========================
function aplicarDarkMode(ativo) {
  document.body.classList.toggle("dark", !!ativo);
}

function initDarkMode() {
  const sw = $("darkSwitch") || $("darkMode") || $("modoEscuro");

  const saved = localStorage.getItem("modo");
  if (saved === "dark") {
    aplicarDarkMode(true);
    if (sw) sw.checked = true;
  } else {
    aplicarDarkMode(false);
    if (sw) sw.checked = false;
  }

  if (sw) {
    sw.addEventListener("change", function () {
      aplicarDarkMode(this.checked);
      localStorage.setItem("modo", this.checked ? "dark" : "light");
    });
  }
}

// =========================
// TONERS
// =========================
let stockGlobal = [];

// Gera ID global TON-0001
async function gerarID() {
  const ref = db.collection("config").doc("contador");

  return db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const n = doc.exists ? (doc.data().valor || 0) + 1 : 1;
    t.set(ref, { valor: n });
    return "TON-" + String(n).padStart(4, "0");
  });
}

window.disponivel = async function () {
  try {
    const equipamento = $("equipamento")?.value || "";
    const localizacao = $("localizacao")?.value || "";
    const cor = $("cor")?.value || "";
    const data = $("data")?.value || "";

    if (!equipamento || !cor) {
      alert("Preenche equipamento e cor.");
      return;
    }

    const idInterno = await gerarID();

    await db.collection("stock").add({
      idInterno,
      equipamento,
      localizacao: localizacao || "Sem Localização",
      cor,
      data: data || "Não tem Data",
      created: new Date()
    });

    // limpar campos
    if ($("equipamento")) $("equipamento").value = "";
    if ($("localizacao")) $("localizacao").value = "";
    if ($("cor")) $("cor").value = "";
    if ($("data")) $("data").value = "";
  } catch (e) {
    console.error("Erro ao adicionar toner:", e);
    alert("Erro ao adicionar toner.");
  }
};

window.usar = async function (docId) {
  try {
    const confirmar = window.confirm("Marcar este toner como usado?");
    if (!confirmar) return;

    const ref = db.collection("stock").doc(docId);
    const snap = await ref.get();

    if (!snap.exists) {
      alert("Toner não encontrado.");
      return;
    }

    const dados = snap.data();

    await db.collection("historico").add({
      ...dados,
      usadoEm: new Date().toISOString()
    });

    await ref.delete();
  } catch (e) {
    console.error("Erro ao mover para histórico:", e);
    alert("Erro ao marcar toner como usado.");
  }
};

window.apagarHistorico = async function (docId) {
  try {
    const confirmar = window.confirm("Apagar este registo do histórico?");
    if (!confirmar) return;
    await db.collection("historico").doc(docId).delete();
  } catch (e) {
    console.error("Erro ao apagar histórico:", e);
    alert("Erro ao apagar registo.");
  }
};

// compatibilidade com versões antigas
window.apagar = window.apagarHistorico;

window.filtrar = function () {
  const termo = ($("search")?.value || "").toLowerCase().trim();

  if (!termo) {
    renderStock(stockGlobal);
    return;
  }

  const filtrado = stockGlobal.filter(t =>
    (t.localizacao || "").toLowerCase().includes(termo)
  );

  renderStock(filtrado);
};

function renderStock(lista) {
  const el = $("listaStock");
  if (!el) return;

  el.innerHTML = "";

  lista.forEach(t => {
    el.innerHTML += `
      <div class="card">
        <input type="checkbox" onchange="usar('${t.idDoc}')">
        <b>${t.idInterno || ""}</b><br>
        ${(t.equipamento || "")} - ${(t.cor || "")}<br>
        ${(t.localizacao || "")}<br>
        ${(t.data || "")}
      </div>
    `;
  });
}

function initStockListener() {
  db.collection("stock")
    .orderBy("created", "desc")
    .onSnapshot(
      (snap) => {
        stockGlobal = [];

        safeSetText("countStock", snap.size);

        snap.forEach(doc => {
          const t = doc.data();
          stockGlobal.push({
            ...t,
            idDoc: doc.id
          });
        });

        renderStock(stockGlobal);
      },
      (err) => {
        console.error("Erro no stock listener:", err);
      }
    );
}

function initHistoricoListener() {
  db.collection("historico")
    .onSnapshot(
      (snap) => {
        safeSetText("countUsados", snap.size);

        const el = $("listaHistorico");
        if (!el) return;

        el.innerHTML = "";

        snap.forEach(doc => {
          const t = doc.data();

          el.innerHTML += `
            <div class="card">
              <b>${t.idInterno || ""}</b><br>
              ${(t.equipamento || "")} - ${(t.cor || "")}<br>
              ${(t.localizacao || "")}<br>
              ${(t.data || "")}
              <button class="delete" onclick="apagarHistorico('${doc.id}')">❌</button>
            </div>
          `;
        });
      },
      (err) => {
        console.error("Erro no histórico listener:", err);
      }
    );
}

// =========================
// COMPUTADORES
// =========================
const passos = [
  "TEAMVIEWER HOST",
  "TEAMS",
  "DNS (192.168.0.204 & 192.168.0.205)",
  "NOME DO SISTEMA",
  "Atribuir Dominio",
  "Desinstalar MCFee",
  "Instalar Sophos",
  "MICROSOFT 365",
  "Instalar Impressora",
  "Alterar Definições de Energia",
  "Apagar User",
  "Criar novo user"
];

function carregarChecklist() {
  const el = $("checklist");
  if (!el) return;

  let html = "";

  passos.forEach((passo, i) => {
    html += `
      <label class="checkItem">
        <input type="checkbox" id="p${i}">
        <span>${passo}</span>
      </label>
    `;
  });

  el.innerHTML = html;
}

window.guardarPC = async function () {
  try {
    const nome = $("nomePC")?.value || "";
    let data = $("dataPC")?.value || "";

    if (!nome.trim()) {
      alert("Nome do computador é obrigatório.");
      return;
    }

    if (!data) data = "Sem Data";

    const dados = passos.map((passo, i) => ({
      passo,
      feito: !!$(`p${i}`)?.checked
    }));

    await db.collection("pcs").add({
      nome: nome.trim(),
      data,
      passos: dados,
      created: new Date()
    });

    if ($("nomePC")) $("nomePC").value = "";
    if ($("dataPC")) $("dataPC").value = "";
    carregarChecklist();
  } catch (e) {
    console.error("Erro ao guardar PC:", e);
    alert("Erro ao guardar instalação.");
  }
};

window.apagarPC = async function (docId) {
  try {
    const confirmar = window.confirm("Apagar este registo?");
    if (!confirmar) return;
    await db.collection("pcs").doc(docId).delete();
  } catch (e) {
    console.error("Erro ao apagar PC:", e);
    alert("Erro ao apagar registo.");
  }
};

function initPCsListener() {
  db.collection("pcs")
    .orderBy("created", "desc")
    .onSnapshot(
      (snap) => {
        const el = $("listaPC");
        if (!el) return;

        el.innerHTML = "";

        snap.forEach(doc => {
          const d = doc.data();

          let passosHtml = "";
          (d.passos || []).forEach(p => {
            passosHtml += `<div>${p.feito ? "✔" : "❌"} ${p.passo}</div>`;
          });

          el.innerHTML += `
            <div class="card">
              <b>${d.nome || ""}</b><br>
              📅 ${d.data || "Sem Data"}<br>
              ${passosHtml}
              <button class="delete" onclick="apagarPC('${doc.id}')">❌</button>
            </div>
          `;
        });
      },
      (err) => {
        console.error("Erro no listener dos PCs:", err);
      }
    );
}

// =========================
// INIT
// =========================
window.onload = function () {
  try {
    ligarBotoesSidebar();
    initDarkMode();
    carregarChecklist();
    initStockListener();
    initHistoricoListener();
    initPCsListener();

    // mostrar primeira página existente
    const primeira =
      exists("dashboard") ? "dashboard" :
      exists("impressoras") ? "impressoras" :
      exists("registo") ? "registo" :
      exists("stock") ? "stock" :
      exists("historico") ? "historico" :
      exists("computadores") ? "computadores" :
      exists("config") ? "config" :
      null;

    if (primeira) {
      window.mostrarPagina(primeira);
    }
  } catch (e) {
    console.error("Erro no arranque da app:", e);
    alert("Erro ao arrancar a app.");
  }
};
