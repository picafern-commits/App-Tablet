
window.usersData = window.usersData || [];
window.pistolasData = window.pistolasData || [];
window.portasData = window.portasData || [];


const firebaseConfig = {
  apiKey: "AIzaSyCSgw4rhBLW5mq4QClulubf6e0hf5lDJbo",
  authDomain: "toner-manager-756c4.firebaseapp.com",
  databaseURL: "https://toner-manager-756c4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "toner-manager-756c4",
  storageBucket: "toner-manager-756c4.firebasestorage.app",
  messagingSenderId: "1004492465437",
  appId: "1:1004492465437:web:6a745933c51fc17b04adf4"
};

if(typeof firebase !== "undefined"){

  if(!firebase.apps.length){
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();

  window.db = db;

}

const APP_VERSION = "1.20.1";



const BACKUP_KEYS_APP_BRAGA = {
  stock: "appBraga_backup_stock",
  historico: "appBraga_backup_historico",
  pcs: "appBraga_backup_pcs",
  manutencoes: "appBraga_backup_manutencoes"
};

function saveBackupAppBraga(key, data) {

  try {
    localStorage.setItem(key, JSON.stringify(data || []));
  } catch (e) {
    console.error("Erro backup local:", e);
  }
}

function loadBackupAppBraga(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Erro a ler backup local:", e);
    return [];
  }
}

function showBackupBadge() {
  document.querySelectorAll(".version-pill").forEach(node => {
    if (!node.dataset.backupShown) {
      node.dataset.backupShown = "1";
      node.innerHTML = `${node.textContent} <span class="backup-badge">Backup local</span>`;
    }
  });
}

function hideBackupBadge() {
  document.querySelectorAll(".version-pill").forEach(node => {
    if (node.dataset.backupShown === "1") {
      node.dataset.backupShown = "";
      node.textContent = node.textContent.replace(" Backup local", "").trim();
      if (typeof APP_BRAGA_VERSION !== "undefined") node.textContent = APP_BRAGA_VERSION;
    }
  });
}

let stockGlobal = [];
let historicoGlobal = [];
let pcsGlobal = [];
let manutencoesGlobal = [];
let appNotificationTimer = null;

const appNotificationState = {
  enabled: false,
  tonerZero: true,
  stockMin: true,
  maintenance: true,
  radios: true,
  intervalMinutes: 15,
  vapidKey: "",
  fcmToken: "",
  sent: {},
  realtimeBoot: {},
  realtimeLast: {},
  devicesUnsubscribe: null,
  restoreRunning: false,
  restoredTokenDocId: ""
};

function el(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const node = el(id);
  if (node) node.innerText = value;
}

function normalizarTexto(valor) {
  return String(valor || "").toLowerCase().trim();
}

function gerarCodigoEtiquetaTonerAppBraga() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ABT-${stamp}-${random}`;
}

function getCodigoEtiquetaAtualAppBraga() {
  const input = el("codigoEtiqueta");
  if (input && !input.value) input.value = gerarCodigoEtiquetaTonerAppBraga();
  return (input && input.value) || gerarCodigoEtiquetaTonerAppBraga();
}

function prepararCodigoEtiquetaTonerAppBraga(force = false) {
  const input = el("codigoEtiqueta");
  if (!input) return "";
  if (force || !input.value) input.value = gerarCodigoEtiquetaTonerAppBraga();
  return input.value;
}

function extrairCodigoEtiquetaTonerAppBraga(texto) {
  const raw = String(texto || "").trim();
  const match = raw.match(/ABT-\d{14}-[A-Z0-9]{6}/i);
  return match ? match[0].toUpperCase() : "";
}

function buildPayloadQrTonerAppBraga(codigo) {
  return `APPBRAGA:TONER:${codigo}`;
}

function dataUrlToUint8ArrayAppBraga(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function gerarQrDataUrlAppBraga(texto, size = 180) {
  return new Promise((resolve) => {
    if (typeof QRCode === "undefined") return resolve("");
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-9999px";
    host.style.top = "-9999px";
    document.body.appendChild(host);
    try {
      new QRCode(host, {
        text: String(texto || ""),
        width: size,
        height: size,
        correctLevel: QRCode.CorrectLevel.M
      });
      setTimeout(() => {
        const img = host.querySelector("img");
        const canvas = host.querySelector("canvas");
        const dataUrl = canvas ? canvas.toDataURL("image/png") : (img ? img.src : "");
        host.remove();
        resolve(dataUrl);
      }, 120);
    } catch (error) {
      host.remove();
      resolve("");
    }
  });
}

function renderQrCodesAppBraga(root = document) {
  if (typeof QRCode === "undefined") return;
  root.querySelectorAll("[data-etq-qr]").forEach((node) => {
    if (node.dataset.qrRendered) return;
    node.dataset.qrRendered = "1";
    new QRCode(node, {
      text: node.getAttribute("data-etq-qr") || "",
      width: 112,
      height: 112,
      correctLevel: QRCode.CorrectLevel.M
    });
  });
}

function getFirestoreSortValue(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortFirestoreCreatedDesc(lista = []) {
  return lista.sort((a, b) => getFirestoreSortValue(b.created || b.createdAt || b.updatedAt) - getFirestoreSortValue(a.created || a.createdAt || a.updatedAt));
}

function mostrarMensagem(texto, tipo = "sucesso") {
  let toast = el("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast-app";
    document.body.appendChild(toast);
  }

  toast.className = `toast-app ${tipo}`;
  toast.innerText = texto;
  toast.style.display = "block";

  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.display = "none";
  }, 2200);
}

/* =========================
   DADOS IMPRESSORAS
========================= */
const impressorasData = [
  { modelo: "Kyocera P3155dn", serie: "R4B2229805", armazem: "Braga", localizacao: "Ilha 01", ip: "192.168.10.178" },
  { modelo: "Ecosys PA5500x", serie: "WD44336210", armazem: "Braga", localizacao: "Ilha 02", ip: "192.168.10.179" },
  { modelo: "Kyocera P3155dn", serie: "R4B1395508", armazem: "Braga", localizacao: "Ilha 03", ip: "192.168.10.180" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293179", armazem: "Braga", localizacao: "Ilha 04", ip: "192.168.10.181" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293180", armazem: "Braga", localizacao: "Ilha 05", ip: "192.168.10.182" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293183", armazem: "Braga", localizacao: "Balcão 01", ip: "192.168.10.184" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293184", armazem: "Braga", localizacao: "Balcão 02", ip: "192.168.10.183" },
  { modelo: "Kyocera P3155dn", serie: "R4B2230012", armazem: "Braga", localizacao: "Dep. Logistica", ip: "192.168.10.185" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293173", armazem: "Braga", localizacao: "G/Encomendas", ip: "192.168.10.186" },
  { modelo: "Kyocera P3155dn", serie: "R4B1395261", armazem: "Braga", localizacao: "Devoluções", ip: "192.168.10.187" },
  { modelo: "TASKalfa 2554ci", serie: "RVP0Z03770", armazem: "Braga", localizacao: "Escritorio", ip: "192.168.10.197" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293169", armazem: "Vila Real", localizacao: "Ilha 01", ip: "192.168.11.110" },
  { modelo: "Kyocera P3155dn", serie: "R4B1293174", armazem: "Vila Real", localizacao: "Ilha 02", ip: "192.168.11.108" },
  { modelo: "TASKalfa 2554ci", serie: "RVP0Z03715", armazem: "Vila Real", localizacao: "Ilha 03", ip: "192.168.11.197" }
];

const IMPRESSORAS_STORAGE_KEY = "appbraga_impressoras_v1";

const manutencaoLocais = [
  "Ilha 01",
  "Ilha 02",
  "Ilha 03",
  "Ilha 04",
  "Ilha 05",
  "Balcão 01",
  "Balcão 02",
  "Dep. Logistica",
  "G/Encomendas",
  "Devoluções",
  "Escritorio"
];

const USERS_STORAGE_KEY = 'appbraga_users_custom_v1';

function prepararRefsUsers() {
  window.usersData.forEach((u, i) => {
    if (!u.idDoc && !u._ref) u._ref = `local-user-${i}`;
  });
}

function guardarUsersLocal() {
  try {
    const serializavel = window.usersData.map(u => ({ ...u }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(serializavel));
  } catch (e) {
    console.warn('Nao foi possivel guardar users no localStorage.', e);
  }
}

function carregarUsersLocal() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      prepararRefsUsers();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      prepararRefsUsers();
      return;
    }
    window.usersData.splice(0, window.usersData.length, ...parsed);
    prepararRefsUsers();
  } catch (e) {
    console.warn('Nao foi possivel carregar users do localStorage.', e);
    prepararRefsUsers();
  }
}


/* =========================
   IMPRESSORAS / MANUTENÇÃO
========================= */
function obterEstadoImpressora(ip) {
  const relacionados = manutencoesGlobal.filter(m => m.ip === ip);
  if (!relacionados.length) return "OK";
  return relacionados[0].estado || "OK";
}

function badgeEstado(estado) {
  if (estado === "Pendente") return `<span class="badge pendente">Pendente</span>`;
  if (estado === "Em reparação") return `<span class="badge reparacao">Em reparação</span>`;
  if (estado === "Resolvido") return `<span class="badge resolvido">Resolvido</span>`;
  return `<span class="badge ok">OK</span>`;
}

function abrirIP(ip) {
  window.open(`http://${ip}`, "_blank");
}

function abrirManutencaoDireta(item) {
  localStorage.setItem("manutencaoPreenchida", JSON.stringify(item));
  window.location.href = "manutencao-impressoras.html";
}

function mapModeloManutencao(modelo) {
  if (modelo === "Kyocera P3155dn") return "P3155DN";
  if (modelo === "TASKalfa 2554ci") return "TASKalfa_255ci";
  if (modelo === "Ecosys PA5500x") return "PA5500x";
  return modelo;
}

function sincronizarCamposImpressora() {
  const serie = el("manutencaoSerie")?.value || "";
  const ip = el("manutencaoIP")?.value || "";

  if (serie) {
    const item = impressorasData.find(i => i.serie === serie);
    if (item) {
      if (el("manutencaoModelo")) el("manutencaoModelo").value = mapModeloManutencao(item.modelo);
      if (el("manutencaoArmazem")) el("manutencaoArmazem").value = item.armazem;
      if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = item.localizacao;
      if (el("manutencaoIP")) el("manutencaoIP").value = item.ip;
      return;
    }
  }

  if (ip) {
    const item = impressorasData.find(i => i.ip === ip);
    if (item) {
      if (el("manutencaoModelo")) el("manutencaoModelo").value = mapModeloManutencao(item.modelo);
      if (el("manutencaoArmazem")) el("manutencaoArmazem").value = item.armazem;
      if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = item.localizacao;
      if (el("manutencaoSerie")) el("manutencaoSerie").value = item.serie;
    }
  }
}

function preencherLocaisManutencao() {
  const selectLoc = el("manutencaoLocalizacao");
  if (selectLoc) {
    selectLoc.innerHTML = `
      <option value="">Selecionar localização</option>
      ${manutencaoLocais.map(loc => `<option value="${loc}">${loc}</option>`).join("")}
    `;
  }

  const selectIP = el("manutencaoIP");
  if (selectIP) {
    selectIP.innerHTML = `
      <option value="">Selecionar IP</option>
      ${impressorasData.map(item => `
        <option value="${item.ip}">
          ${item.ip} - ${item.localizacao} (${item.armazem})
        </option>
      `).join("")}
    `;
  }

  const selectSerie = el("manutencaoSerie");
  if (selectSerie) {
    selectSerie.innerHTML = `
      <option value="">Selecionar nº série</option>
      ${impressorasData.map(item => `
        <option value="${item.serie}">${item.serie}</option>
      `).join("")}
    `;
  }
}

function preencherFormularioManutencao() {
  const dados = localStorage.getItem("manutencaoPreenchida");
  if (!dados) return;

  try {
    const item = JSON.parse(dados);

    if (el("manutencaoModelo")) el("manutencaoModelo").value = mapModeloManutencao(item.modelo);
    if (el("manutencaoSerie")) el("manutencaoSerie").value = item.serie || "";
    if (el("manutencaoArmazem")) el("manutencaoArmazem").value = item.armazem || "";
    if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = item.localizacao || "";
    if (el("manutencaoIP")) el("manutencaoIP").value = item.ip || "";
    if (el("manutencaoEstado")) el("manutencaoEstado").value = "Pendente";

    localStorage.removeItem("manutencaoPreenchida");
  } catch (e) {
    console.error(e);
  }
}

function limparFormularioManutencao() {
  if (el("manutencaoTecnico")) el("manutencaoTecnico").value = "";
  if (el("manutencaoEstado")) el("manutencaoEstado").value = "Pendente";
  if (el("manutencaoArmazem")) el("manutencaoArmazem").value = "";
  if (el("manutencaoLocalizacao")) el("manutencaoLocalizacao").value = "";
  if (el("manutencaoModelo")) el("manutencaoModelo").value = "";
  if (el("manutencaoSerie")) el("manutencaoSerie").value = "";
  if (el("manutencaoIP")) el("manutencaoIP").value = "";
  if (el("manutencaoPedido")) el("manutencaoPedido").value = "";
  if (el("manutencaoResolucao")) el("manutencaoResolucao").value = "";
  if (el("manutencaoMotivo")) el("manutencaoMotivo").value = "";
}

async function gerarID() {
  const ref = db.collection("config").doc("contador");
  return db.runTransaction(async t => {
    const doc = await t.get(ref);
    const n = doc.exists ? ({ firebaseId: doc.id, ...doc.data() }).valor + 1 : 1;
    t.set(ref, { valor: n });
    return "TON-" + String(n).padStart(4, "0");
  });
}

async function disponivel() {
  const equipamento = el("equipamento");
  const localizacao = el("localizacao");
  const cor = el("cor");
  const data = el("data");
  const lote = el("lote");
  const sdsRef = el("sdsRef");
  const codigoEtiqueta = getCodigoEtiquetaAtualAppBraga();

  if (!equipamento || !cor) return;

  const eq = equipamento.value;
  const loc = localizacao ? localizacao.value : "";
  const corValue = cor.value;
  const dataValue = data ? data.value : "";
  const loteValue = lote ? lote.value : "";
  const sdsRefValue = sdsRef ? sdsRef.value.trim() : "";

  if (!eq || !corValue) {
    mostrarMensagem("Preenche o equipamento e a cor.", "erro");
    return;
  }

  try {
    const id = await gerarID();

    await db.collection("stock").add({
      idInterno: id,
      equipamento: eq,
      localizacao: loc || "Sem Localização",
      cor: corValue,
      data: dataValue || "Sem Data",
      dataFolha: (el("dataFolha") && el("dataFolha").value) || "Sem Data da Folha",
      lote: loteValue || "",
      sdsRef: sdsRefValue || "",
      codigoEtiqueta,
      codigoScan: buildPayloadQrTonerAppBraga(codigoEtiqueta),
      estado: "stock",
      created: new Date()
    });

    equipamento.value = "";
    if (localizacao) localizacao.value = "";
    cor.value = "";
    if (data) data.value = "";
    if (el("dataFolha")) el("dataFolha").value = "";
    if (lote) lote.value = "";
    if (sdsRef) sdsRef.value = "";
    prepararCodigoEtiquetaTonerAppBraga(true);

    mostrarMensagem("Toner adicionado com sucesso.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao adicionar toner.", "erro");
  }
}

db.collection("stock").onSnapshot(snap => {
  notificarAlteracaoRealtimeApp("stock", snap);
  stockGlobal = [];
  setText("countStock", snap.size);

  snap.forEach(doc => {
    const t = ({ firebaseId: doc.id, ...doc.data() });
    t.idDoc = doc.id;
    stockGlobal.push(t);
  });
  sortFirestoreCreatedDesc(stockGlobal);

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.stock, stockGlobal);
  hideBackupBadge();
  renderDashboardCards(stockGlobal);
  renderStockCards(stockGlobal);
  renderStockMinimoPainel();
  renderAlertasInteligentes();
  renderDashboardResumoInteligente();
  renderModoGestorExtremo();
}, error => {
  console.error(error);
  stockGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.stock);
  setText("countStock", stockGlobal.length);
  showBackupBadge();
  renderDashboardCards(stockGlobal);
  renderStockCards(stockGlobal);
  renderStockMinimoPainel();
  renderAlertasInteligentes();
  renderDashboardResumoInteligente();
  renderModoGestorExtremo();
});

db.collection("historico").onSnapshot(snap => {
  historicoGlobal = [];
  setText("countUsados", snap.size);

  snap.forEach(doc => {
    const t = ({ firebaseId: doc.id, ...doc.data() });
    t.idDoc = doc.id;
    historicoGlobal.push(t);
  });
  sortFirestoreCreatedDesc(historicoGlobal);

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.historico, historicoGlobal);
  hideBackupBadge();
  renderHistoricoCards(historicoGlobal);
  renderAlertasInteligentes();
  renderModoGestorExtremo();
  renderDashboardResumoInteligente();
}, error => {
  console.error(error);
  historicoGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.historico);
  setText("countUsados", historicoGlobal.length);
  showBackupBadge();
  renderHistoricoCards(historicoGlobal);
  renderAlertasInteligentes();
  renderModoGestorExtremo();
  renderDashboardResumoInteligente();
});

db.collection("pcs").onSnapshot(snap => {
  pcsGlobal = [];
  setText("countPCs", snap.size);

  snap.forEach(doc => {
    const d = ({ firebaseId: doc.id, ...doc.data() });
    d.idDoc = doc.id;
    pcsGlobal.push(d);
  });
  sortFirestoreCreatedDesc(pcsGlobal);

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.pcs, pcsGlobal);
  hideBackupBadge();
  renderPCCards(pcsGlobal);
  renderModoGestorExtremo();
}, error => {
  console.error(error);
  pcsGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.pcs);
  setText("countPCs", pcsGlobal.length);
  showBackupBadge();
  renderPCCards(pcsGlobal);
  renderModoGestorExtremo();
});

db.collection("manutencoes").onSnapshot(snap => {
  notificarAlteracaoRealtimeApp("manutencoes", snap);
  manutencoesGlobal = [];

  snap.forEach(doc => {
    const item = ({ firebaseId: doc.id, ...doc.data() });
    item.idDoc = doc.id;
    manutencoesGlobal.push(item);
  });
  sortFirestoreCreatedDesc(manutencoesGlobal);

  saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.manutencoes, manutencoesGlobal);
  hideBackupBadge();
  atualizarContadoresManutencao();
  renderManutencoes(manutencoesGlobal);
  renderImpressoras();
}, error => {
  console.error(error);
  manutencoesGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.manutencoes);
  showBackupBadge();
  atualizarContadoresManutencao();
  renderManutencoes(manutencoesGlobal);
  renderImpressoras();
});

function atualizarContadoresManutencao() {
  setText("countManutTotal", manutencoesGlobal.length);
  setText("countManutPendentes", manutencoesGlobal.filter(i => i.estado === "Pendente").length);
  setText("countManutReparacao", manutencoesGlobal.filter(i => i.estado === "Em reparação").length);
  setText("countManutResolvidos", manutencoesGlobal.filter(i => i.estado === "Resolvido").length);
}


function getCriticalityBucketsAppBraga() {
  let critical = 0;
  let warning = 0;
  let normal = 0;

  impressorasData.forEach(item => {
    const info = tonerInfoState[item.ip] || null;
    const colors = Array.isArray(info?.colors) ? info.colors : [];
    const monoPercent = typeof info?.percent === "number" ? info.percent : null;
    const allPercents = colors.map(c => c.percent).filter(v => typeof v === "number");
    if (!allPercents.length && monoPercent !== null) allPercents.push(monoPercent);

    if (!allPercents.length) {
      normal++;
      return;
    }

    const minValue = Math.min(...allPercents);
    if (isTonerEmpty(minValue)) critical++;
    else normal++;
  });

  return { critical, warning, normal };
}

function getTopLocalizacoesHistorico(limit = 3) {
  const counts = {};
  historicoGlobal.forEach(item => {
    const key = String(item.localizacao || "Sem Localização");
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, limit);
}

function getUltimosMovimentos(limit = 3) {
  return [...historicoGlobal]
    .sort((a,b) => {
      const ad = a.created && a.created.seconds ? a.created.seconds : 0;
      const bd = b.created && b.created.seconds ? b.created.seconds : 0;
      return bd - ad;
    })
    .slice(0, limit);
}

function renderDashboardResumoInteligente() {
  const host = el("dashboardResumoInteligente");
  if (!host) return;

  const buckets = getCriticalityBucketsAppBraga();
  const topLocs = getTopLocalizacoesHistorico(4);
  const ultimos = getUltimosMovimentos(4);

  const critLabel = buckets.critical > 0 ? "Ação imediata" : "Sem críticos";
  const warnLabel = buckets.warning > 0 ? "Vigiar" : "Sem avisos";

  host.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <h4>Criticidade Real</h4>
        <div class="summary-value">${buckets.critical}</div>
        <div class="meta-line">${critLabel} · toner a 0%</div>
      </div>
      <div class="summary-card">
        <h4>Atenção</h4>
        <div class="summary-value">${buckets.warning}</div>
        <div class="meta-line">${warnLabel} · sem avisos intermédios de toner</div>
      </div>
      <div class="summary-card">
        <h4>Top Localizações</h4>
        <ul class="summary-list">${topLocs.length ? topLocs.map(([k,v]) => `<li>${k} — ${v}</li>`).join("") : "<li>Sem dados ainda</li>"}</ul>
      </div>
      <div class="summary-card">
        <h4>Últimos Movimentos</h4>
        <ul class="summary-list">${ultimos.length ? ultimos.map(item => `<li>${item.equipamento || "-"} · ${item.cor || "-"} · ${item.localizacao || "-"}</li>`).join("") : "<li>Sem histórico ainda</li>"}</ul>
      </div>
    </div>`;
}

function getDashboardPrinterImage(item = {}) {
  const modelo = normalizarTexto(item.modelo || "");
  if (modelo.includes("taskalfa")) return "../img/taskalfa2554ci.png";
  if (modelo.includes("pa5500")) return "../img/pa5500x.png";
  if (modelo.includes("p3155")) return "../img/kyocerap3155dn.png";
  return "../img/printer.png";
}

function renderDashboardCards(items) {
  try { updateEnterpriseDashboard(); } catch (e) { console.error(e); }
  const lista = el("listaDashboardStock");
  if (!lista) return;

  const searchTxt = normalizarTexto(el("searchDashboard")?.value || "");

  const criticas = impressorasData.map(item => {
    const info = tonerInfoState[item.ip] || null;
    const colors = Array.isArray(info?.colors) ? info.colors : [];
    const residue = info?.residue || null;

    const criticalColors = colors.filter(c => isDashboardTonerLow(c.percent));
    const monoPercent = typeof info?.percent === "number" ? info.percent : null;
    const monoCritical = colors.length === 0 && isDashboardTonerLow(monoPercent);

    const isCritical = criticalColors.length > 0 || monoCritical;
    return { item, info, criticalColors, monoCritical, residue, isCritical };
  }).filter(entry => entry.isCritical).filter(entry => {
    if (!searchTxt) return true;
    const haystack = [
      entry.item.modelo,
      entry.item.serie,
      entry.item.ip,
      entry.item.localizacao,
      entry.item.armazem,
      ...(entry.criticalColors || []).map(c => c.label),
      entry.monoCritical ? "Preto" : ""
    ].join(" ");
    return normalizarTexto(haystack).includes(searchTxt);
  });

  if (!criticas.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem toners abaixo de 25%</h3><p>As impressoras com toner a 25% ou menos vão aparecer aqui.</p></div>`;
    return;
  }

  lista.innerHTML = criticas.map(({ item, info, criticalColors, monoCritical, residue }) => {
    const supplyHtml = criticalColors.length
      ? criticalColors.map(c => gerarHTMLBarraToner(c.percent, c.label, c.key)).join("")
      : (monoCritical ? gerarHTMLBarraToner(info.percent, "Preto", "black") : "");

    const residueHtml = residue ? gerarHTMLBarraToner(residue.percent, residue.label || "Resíduo", "waste") : "";

    const printerImage = getDashboardPrinterImage(item);
    return `
      <div class="dashboard-card dashboard-critical-card">
        <div class="equipment-art equipment-photo">
          <img class="equipment-real-image" src="${printerImage}" alt="${safeRefHtml(item.modelo)}" loading="lazy" onerror="this.src='../img/printer.png'">
        </div>
        <div class="stock-id">${item.modelo}</div>
        <div class="meta-line">Série: <span class="meta-value">${item.serie}</span></div>
        <div class="meta-line">Local: <span class="meta-value">${item.localizacao} (${item.armazem})</span></div>
        <div class="meta-line">IP: <span class="meta-value">${item.ip}</span></div>
        <div class="printer-toners-grid" style="margin-top:10px;">${supplyHtml}${residueHtml}</div>
      </div>
    `;
  }).join("");
}

function renderStockCards(items) {
  const lista = el("listaStock");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem toners em stock</h3><p>Quando adicionares toners, aparecem aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map(t => `
    <div class="stock-card">
      <div class="stock-id">${t.idInterno}</div>
      <div class="meta-line">Equipamento: <span class="meta-value">${t.equipamento}</span></div>
      <div class="meta-line">Cor: <span class="meta-value">${t.cor}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${t.localizacao}</span></div>
      <div class="meta-line">Lote: <span class="meta-value">${t.lote || "-"}</span></div>
      <div class="meta-line">SDS Ref: <span class="meta-value">${t.sdsRef || "-"}</span></div>
      <div class="meta-line">Código etiqueta: <span class="meta-value">${t.codigoEtiqueta || "-"}</span></div>
      <div class="meta-line">Data Scan: <span class="meta-value">${t.data || "Sem Data"}</span></div>
      <div class="meta-line">Data Folha: <span class="meta-value">${t.dataFolha || "Sem Data da Folha"}</span></div>
      <div class="card-actions">
        <button class="small-btn btn-use" onclick="usar('${t.idDoc}')">Marcar usado</button>
        <button class="small-btn btn-edit" onclick="abrirEditarStockModal('${t.idDoc}')">Editar</button>
        <button class="small-btn btn-delete" onclick="apagarStockItem('${t.idDoc}')">Apagar</button>
      </div>
    </div>
  `).join("");
}

function renderHistoricoCards(items) {
  const lista = el("listaHistorico");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem histórico</h3><p>Os toners usados vão aparecer aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map(t => `
    <div class="history-card">
      <div class="history-id">${t.idInterno}</div>
      <div class="meta-line">Equipamento: <span class="meta-value">${t.equipamento}</span></div>
      <div class="meta-line">Cor: <span class="meta-value">${t.cor || "-"}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${t.localizacao || "Sem Localização"}</span></div>
      <div class="meta-line">Lote: <span class="meta-value">${t.lote || "-"}</span></div>
      <div class="meta-line">SDS Ref: <span class="meta-value">${t.sdsRef || "-"}</span></div>
      <div class="meta-line">Código etiqueta: <span class="meta-value">${t.codigoEtiqueta || "-"}</span></div>
      <div class="meta-line">Data Scan: <span class="meta-value">${t.data || "Sem Data"}</span></div>
      <div class="meta-line">Data Folha: <span class="meta-value">${t.dataFolha || "Sem Data da Folha"}</span></div>
      <div class="card-actions">
        <button class="small-btn btn-edit" onclick="abrirEditarHistoricoModal('${t.idDoc}')">Editar</button>
        <button class="small-btn btn-delete" onclick="apagar('${t.idDoc}')">Apagar</button>
      </div>
    </div>
  `).join("");
}

async function usar(id) {
  try {
    const ref = db.collection("stock").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      mostrarMensagem("Toner não encontrado.", "erro");
      return;
    }

    await db.collection("historico").add({
      ...snap.data(),
      estado: "usado",
      usadoAt: new Date(),
      stockDocId: id,
      created: new Date()
    });

    await ref.delete();
    mostrarMensagem("Toner movido para histórico.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao mover para histórico.", "erro");
  }
}

async function usarPorCodigoEtiquetaToner(codigoOuPayload) {
  const codigo = extrairCodigoEtiquetaTonerAppBraga(codigoOuPayload);
  const raw = String(codigoOuPayload || "").trim();
  const rawUpper = extrairABTDoQrStock(raw);

  if (!codigo && !rawUpper) return false;

  try {
    let id = "";

    const matchLocal = stockGlobal.find((item) => {
      const codigoEtiqueta = String(item.codigoEtiqueta || "").toUpperCase();
      const codigoScan = String(item.codigoScan || "").toUpperCase();
      const idInterno = String(item.idInterno || "").toUpperCase();
      const serie = String(item.serie || "").toUpperCase();

      return (
        (codigo && codigoEtiqueta === codigo) ||
        (codigo && codigoScan.includes(codigo)) ||
        (codigo && idInterno === codigo) ||
        (codigo && serie === codigo) ||
        (rawUpper && codigoScan === rawUpper) ||
        (rawUpper && codigoScan.includes(rawUpper)) ||
        (rawUpper && codigoEtiqueta === rawUpper)
      );
    });

    if (matchLocal?.idDoc) id = matchLocal.idDoc;

    if (!id && db?.collection) {
      if (codigo) {
        let snap = await db.collection("stock").where("codigoEtiqueta", "==", codigo).limit(1).get();
        if (!snap.empty) id = snap.docs[0].id;

        if (!id) {
          snap = await db.collection("stock").where("idInterno", "==", codigo).limit(1).get();
          if (!snap.empty) id = snap.docs[0].id;
        }

        if (!id) {
          snap = await db.collection("stock").where("serie", "==", codigo).limit(1).get();
          if (!snap.empty) id = snap.docs[0].id;
        }
      }

      if (!id && rawUpper) {
        const snapAll = await db.collection("stock").limit(200).get();
        snapAll.forEach((doc) => {
          if (id) return;
          const item = doc.data() || {};
          const codigoEtiqueta = String(item.codigoEtiqueta || "").toUpperCase();
          const codigoScan = String(item.codigoScan || "").toUpperCase();
          const idInterno = String(item.idInterno || "").toUpperCase();
          const serie = String(item.serie || "").toUpperCase();

          if (
            codigoEtiqueta === rawUpper ||
            codigoScan === rawUpper ||
            codigoScan.includes(rawUpper) ||
            (codigo && codigoScan.includes(codigo)) ||
            idInterno === rawUpper ||
            serie === rawUpper
          ) {
            id = doc.id;
          }
        });
      }
    }

    if (!id) {
      mostrarMensagem("Código de toner não encontrado em stock.", "erro");
      return true;
    }

    await usar(id);
    mostrarMensagem(`Toner ${codigo || rawUpper} passado para histórico.`);
    return true;
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao passar toner para usado.", "erro");
    return true;
  }
}

async function apagar(id) {
  try {
    await db.collection("historico").doc(id).delete();
    mostrarMensagem("Histórico apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar.", "erro");
  }
}

function editar(id) {
  const t = stockGlobal.find(x => x.idDoc === id);
  if (!t) return;

  localStorage.setItem("editarToner", JSON.stringify(t));
  window.location.href = "add-toner.html";
}

function exportar() { exportarExcelStock(); }

function filtrar() { filtrarStockDebounced(); }

function filtrarDashboard() { filtrarDashDebounced(); }

/* =========================
   COMPUTADORES
========================= */
const passos = [
  "TEAMVIEWER HOST",
  "TEAMS",
  "DNS",
  "NOME DO SISTEMA",
  "Atribuir Dominio",
  "Desinstalar MCFee",
  "Instalar Sophos",
  "MICROSOFT 365",
  "Instalar Impressora",
  "Alterar Energia",
  "Apagar User",
  "Criar novo user"
];

function carregarChecklist() {
  const checklist = el("checklist");
  if (!checklist) return;

  checklist.innerHTML = passos.map((p, i) => `
    <label class="checkItem">
      <input type="checkbox" id="p${i}">
      <span>${escapeHtmlAppBraga(p)}</span>
    </label>
  `).join("");
}

function renderPCCards(items) {
  const lista = el("listaPC");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem registos de computadores</h3><p>Os computadores guardados aparecem aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map(d => {
    const htmlPassos = (d.passos || []).map(p => `
      <div class="meta-line">${p.feito ? "✔" : "❌"} <span class="meta-value">${p.passo}</span></div>
    `).join("");

    return `
      <div class="pc-card">
        <div class="pc-name">${d.nome}</div>
        <div class="meta-line">Data: <span class="meta-value">${d.data || "Sem Data"}</span></div>
        <div class="pc-meta" style="margin-top:12px;">
          ${htmlPassos}
        </div>
        <div class="card-actions">
          <button class="small-btn btn-delete" onclick="apagarPC('${d.idDoc}')">Apagar</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderPCCards(items) {
  const lista = el("listaPC");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `<div class="panel empty-state"><h3>Sem registos de computadores</h3><p>Os computadores guardados aparecem aqui.</p></div>`;
    return;
  }

  lista.innerHTML = items.map(d => {
    const steps = Array.isArray(d.passos) ? d.passos : [];
    const total = steps.length || passos.length || 1;
    const done = steps.filter(p => !!p.feito).length;
    const progress = Math.round((done / total) * 100);
    const statusClass = progress >= 100 ? "ok" : (progress >= 60 ? "warn" : "bad");
    const htmlPassos = steps.map(p => `
      <div class="computer-step ${p.feito ? "is-done" : "is-open"}">
        <span class="computer-step-dot"></span>
        <span>${escapeHtmlAppBraga(p.passo || "-")}</span>
      </div>
    `).join("");

    return `
      <div class="pc-card computer-card">
        <div class="computer-card-head">
          <div>
            <div class="pc-name">${escapeHtmlAppBraga(d.nome || "Computador")}</div>
            <div class="meta-line">Data: <span class="meta-value">${escapeHtmlAppBraga(d.data || "Sem Data")}</span></div>
          </div>
          <span class="health-status ${statusClass}">${progress}%</span>
        </div>
        <div class="computer-progress"><span style="width:${progress}%"></span></div>
        <div class="computer-step-grid">
          ${htmlPassos || `<div class="meta-line">Sem passos registados.</div>`}
        </div>
        <div class="card-actions">
          <button class="secondary-btn btn-delete" onclick="apagarPC('${escapeHtmlAppBraga(d.idDoc)}')">Apagar</button>
        </div>
      </div>
    `;
  }).join("");
}

async function guardarPC() {
  const nomePC = el("nomePC");
  const dataPC = el("dataPC");

  if (!nomePC) return;

  const nome = nomePC.value.trim();
  let data = dataPC ? dataPC.value : "";

  if (!nome) {
    mostrarMensagem("Nome obrigatório.", "erro");
    return;
  }

  if (!data) data = "Sem Data";

  const dados = [];
  passos.forEach((p, i) => {
    dados.push({
      passo: p,
      feito: el("p" + i)?.checked || false
    });
  });

  try {
    await db.collection("pcs").add({
      nome,
      data,
      passos: dados,
      created: new Date()
    });

    nomePC.value = "";
    if (dataPC) dataPC.value = "";
    carregarChecklist();
    mostrarMensagem("Computador guardado com sucesso.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar computador.", "erro");
  }
}

async function apagarPC(id) {
  try {
    await db.collection("pcs").doc(id).delete();
    mostrarMensagem("Registo apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar registo.", "erro");
  }
}

/* =========================
   MANUTENÇÃO
========================= */
async function guardarManutencao() {
  const tecnico = el("manutencaoTecnico")?.value || "";
  const estado = el("manutencaoEstado")?.value || "Pendente";
  const armazem = el("manutencaoArmazem")?.value || "";
  const localizacao = el("manutencaoLocalizacao")?.value || "";
  const modelo = el("manutencaoModelo")?.value || "";
  const serie = el("manutencaoSerie")?.value || "";
  const ip = el("manutencaoIP")?.value || "";
  const motivo = el("manutencaoMotivo")?.value || "";
  const dataPedido = el("manutencaoPedido")?.value || "";
  const dataResolucao = el("manutencaoResolucao")?.value || "";

  if (!tecnico || !armazem || !localizacao || !modelo || !serie || !ip || !motivo || !dataPedido) {
    mostrarMensagem("Preenche os campos obrigatórios da manutenção.", "erro");
    return;
  }

  try {
    await db.collection("manutencoes").add({
      tecnico,
      estado,
      armazem,
      localizacao,
      modelo,
      serie,
      ip,
      motivo,
      dataPedido,
      dataResolucao: dataResolucao || "Sem resolução",
      created: new Date()
    });

    limparFormularioManutencao();
    mostrarMensagem("Manutenção guardada com sucesso.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar manutenção.", "erro");
  }
}

function renderManutencoes(items) {
  const lista = el("listaManutencoes");
  if (!lista) return;

  if (!items.length) {
    lista.innerHTML = `
      <div class="panel empty-state">
        <h3>Sem pedidos de manutenção</h3>
        <p>Os pedidos vão aparecer aqui.</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = items.map(item => `
    <div class="pc-card manut-card">
      <div class="manut-card-top">
        <div>
          <div class="pc-name">${item.modelo || "-"}</div>
          <div class="meta-line">Série: <span class="meta-value">${item.serie || "-"}</span></div>
        </div>
        <div>${badgeEstado(item.estado || "Pendente")}</div>
      </div>

      <div class="meta-line">Técnico: <span class="meta-value">${item.tecnico}</span></div>
      <div class="meta-line">Armazém: <span class="meta-value">${item.armazem}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${item.localizacao}</span></div>
      <div class="meta-line">IP: <span class="meta-value"><a href="http://${item.ip}" target="_blank" rel="noopener noreferrer">${item.ip}</a></span></div>
      <div class="meta-line">Pedido: <span class="meta-value">${item.dataPedido}</span></div>
      <div class="meta-line">Resolução: <span class="meta-value">${item.dataResolucao || "Sem resolução"}</span></div>
      <div class="meta-line">Motivo: <span class="meta-value">${item.motivo}</span></div>

      <div class="card-actions">
        <button class="small-btn btn-use" onclick="marcarResolvido('${item.idDoc}')">Resolver</button>
        <button class="small-btn btn-delete" onclick="apagarManutencao('${item.idDoc}')">Apagar</button>
      </div>
    </div>
  `).join("");
}

function filtrarManutencoes() {
  const texto = normalizarTexto(el("searchManutencoes")?.value || "");
  const estado = el("filterEstadoManutencao")?.value || "";
  const armazem = el("filterArmazemManutencao")?.value || "";

  const filtradas = manutencoesGlobal.filter(item => {
    const passaTexto =
      normalizarTexto(item.modelo).includes(texto) ||
      normalizarTexto(item.serie).includes(texto) ||
      normalizarTexto(item.ip).includes(texto) ||
      normalizarTexto(item.localizacao).includes(texto) ||
      normalizarTexto(item.motivo).includes(texto);

    const passaEstado = !estado || item.estado === estado;
    const passaArmazem = !armazem || item.armazem === armazem;

    return passaTexto && passaEstado && passaArmazem;
  });

  renderManutencoes(filtradas);
}

async function marcarResolvido(id) {
  try {
    await db.collection("manutencoes").doc(id).update({
      estado: "Resolvido",
      dataResolucao: new Date().toISOString().split("T")[0]
    });

    mostrarMensagem("Manutenção marcada como resolvida.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao atualizar manutenção.", "erro");
  }
}

async function apagarManutencao(id) {
  try {
    await db.collection("manutencoes").doc(id).delete();
    mostrarMensagem("Registo de manutenção apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar manutenção.", "erro");
  }
}

function carregarEdicaoToner() {
  const item = localStorage.getItem("editarToner");
  if (!item || !el("equipamento")) return;

  try {
    const toner = JSON.parse(item);
    el("equipamento").value = toner.equipamento || "";
    el("localizacao").value = toner.localizacao || "";
    el("cor").value = toner.cor || "";
    el("data").value = toner.data || "";
    if (el("lote")) el("lote").value = toner.lote || "";
    if (el("dataFolha")) el("dataFolha").value = toner.dataFolha || "";
  } catch (e) {
    console.error(e);
  }
}

function extrairPercentagemTonerDoHTML(html) {
  if (!html) return null;

  const texto = String(html);
  const linhaPreto = texto.match(/Preto[\s\S]{0,160}?(\d{1,3})\s*%/i) || texto.match(/Black[\s\S]{0,160}?(\d{1,3})\s*%/i);
  if (linhaPreto) {
    const valor = parseInt(linhaPreto[1], 10);
    if (!Number.isNaN(valor) && valor >= 0 && valor <= 100) return valor;
  }

  const match = texto.match(/(\d{1,3})\s?%/i);
  if (match) {
    const valor = parseInt(match[1], 10);
    if (!Number.isNaN(valor) && valor >= 0 && valor <= 100) return valor;
  }
  return null;
}

const tonerAlertState = {};
const tonerInfoState = {};
const TONER_EMPTY_THRESHOLD = 0;
const DASHBOARD_TONER_LOW_THRESHOLD = 25;

function isTonerEmpty(percentagem) {
  return typeof percentagem === "number" && percentagem <= TONER_EMPTY_THRESHOLD;
}

function isDashboardTonerLow(percentagem) {
  return typeof percentagem === "number" && percentagem <= DASHBOARD_TONER_LOW_THRESHOLD;
}

function corBarraToner(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined || Number.isNaN(Number(percentagem))) return "#64748b";

  const value = Math.max(0, Math.min(100, Number(percentagem)));

  // Resíduo é ao contrário: quanto maior pior.
  if (cor === "waste") {
    if (value >= 85) return "#dc2626"; // vermelho
    if (value >= 65) return "#f97316"; // laranja
    if (value >= 45) return "#eab308"; // amarelo
    return "#22c55e";                 // verde
  }

  // Toner normal: quanto maior melhor.
  if (value <= 10) return "#dc2626";  // vermelho crítico
  if (value <= 25) return "#f97316";  // laranja baixo
  if (value <= 50) return "#eab308";  // amarelo médio
  return "#22c55e";                  // verde bom
}

function estadoBarraToner(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined || Number.isNaN(Number(percentagem))) return "Sem leitura";

  const value = Math.max(0, Math.min(100, Number(percentagem)));

  if (cor === "waste") {
    if (value >= 85) return "Crítico";
    if (value >= 65) return "Alto";
    if (value >= 45) return "Médio";
    return "OK";
  }

  if (value <= 10) return "Crítico";
  if (value <= 25) return "Baixo";
  if (value <= 50) return "Médio";
  return "Bom";
}

function classeEstadoToner(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined || Number.isNaN(Number(percentagem))) return "is-muted";

  const value = Math.max(0, Math.min(100, Number(percentagem)));

  if (cor === "waste") {
    if (value >= 85) return "is-critical";
    if (value >= 65) return "is-low";
    if (value >= 45) return "is-medium";
    return "is-good";
  }

  if (value <= 10) return "is-critical";
  if (value <= 25) return "is-low";
  if (value <= 50) return "is-medium";
  return "is-good";
}

function tonerBarClass(percentagem, cor = "black") {
  if (percentagem === null || percentagem === undefined || Number.isNaN(Number(percentagem))) return "toner-muted";
  const value = Math.max(0, Math.min(100, Number(percentagem)));

  if (cor === "waste") {
    if (value >= 85) return "toner-critical";
    if (value >= 65) return "toner-low";
    if (value >= 45) return "toner-medium";
    return "toner-good";
  }

  if (value <= 10) return "toner-critical";
  if (value <= 25) return "toner-low";
  if (value <= 50) return "toner-medium";
  return "toner-good";
}

function gerarHTMLBarraToner(percentagem, label = "Toner", cor = "black") {
  const estado = estadoBarraToner(percentagem, cor);
  const estadoClasse = classeEstadoToner(percentagem, cor);

  if (percentagem === null || percentagem === undefined) {
    return `
      <div class="printer-toner-box toner-muted">
        <div class="printer-toner-head">
          <span class="printer-toner-title">${label}</span>
          <span class="printer-toner-status ${estadoClasse}">${estado}</span>
        </div>
        <div class="printer-toner-bar-wrap">
          <div class="printer-toner-bar printer-toner-bar-empty" style="width:100%;"></div>
        </div>
        <div class="printer-toner-foot">
          <span class="printer-toner-value">N/D</span>
        </div>
      </div>
    `;
  }

  const largura = Math.max(0, Math.min(100, percentagem));
  const barraCor = corBarraToner(percentagem, cor);
  const barraClasse = tonerBarClass(percentagem, cor);

  return `
    <div class="printer-toner-box ${barraClasse}" style="--toner-color:${barraCor};">
      <div class="printer-toner-head">
        <span class="printer-toner-title">${label}</span>
        <span class="printer-toner-status ${estadoClasse}">${estado}</span>
      </div>
      <div class="printer-toner-bar-wrap">
        <div class="printer-toner-bar ${barraClasse}" style="width:${largura}%; background:${barraCor} !important; box-shadow:0 0 18px ${barraCor};"></div>
      </div>
      <div class="printer-toner-foot">
        <span class="printer-toner-value">${largura}%</span>
      </div>
    </div>
  `;
}

function gerarHTMLToners(info) {
  const colorItems = info && Array.isArray(info.colors) ? info.colors : [];
  const residueItem = info && info.residue ? info.residue : null;
  const monoPercent = info && typeof info.percent === "number" ? info.percent : null;

  if (!colorItems.length && !residueItem && monoPercent === null) {
    return gerarHTMLBarraToner(null, "Toner", "black");
  }

  const blocks = [];
  colorItems.forEach((c) => blocks.push(gerarHTMLBarraToner(c.percent, c.label, c.key)));

  if (!colorItems.length && monoPercent !== null) {
    blocks.push(gerarHTMLBarraToner(monoPercent, "Preto", "black"));
  }

  if (residueItem) {
    blocks.push(gerarHTMLBarraToner(residueItem.percent, residueItem.label || "Resíduo", "waste"));
  }

  return `<div class="printer-toners-grid">${blocks.join("")}</div>`;
}

function maybeNotifyCriticalSupply(ip, info) {
  if (!info) return;

  const printer = impressorasData.find(i => i.ip === ip);
  const printerLabel = printer ? `${printer.modelo} - ${printer.localizacao}` : ip;
  const issues = [];

  (info.colors || []).forEach((item) => {
    if (isTonerEmpty(item.percent)) {
      issues.push(`${item.label}: ${item.percent}%`);
    }
  });

  const key = issues.join(" | ");
  if (!key) {
    tonerAlertState[ip] = "";
    return;
  }
  if (tonerAlertState[ip] === key) return;
  tonerAlertState[ip] = key;

  const message = `Toner vazio em ${printerLabel} — ${key}`;
  mostrarMensagem(message, "erro");

  enviarNotificacaoApp("Toner vazio", message, `toner-${ip}-${key}`, { url: "html/impressoras.html" });
}

function aplicarConfigNotificacoesApp(config = {}) {
  appNotificationState.enabled = config.notificationEnabled === true;
  appNotificationState.tonerZero = config.notifyTonerZero !== false;
  appNotificationState.stockMin = config.notifyStockMin !== false;
  appNotificationState.maintenance = config.notifyMaintenance !== false;
  appNotificationState.radios = config.notifyRadios === true;
  appNotificationState.intervalMinutes = Math.max(5, Number(config.notificationIntervalMinutes || 15));
  appNotificationState.vapidKey = String(config.notificationVapidKey || "").trim();

  const setChecked = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.checked = !!value;
  };
  setChecked("notifyEnabled", appNotificationState.enabled);
  setChecked("notifyTonerZero", appNotificationState.tonerZero);
  setChecked("notifyStockMin", appNotificationState.stockMin);
  setChecked("notifyMaintenance", appNotificationState.maintenance);
  setChecked("notifyRadios", appNotificationState.radios);
  const interval = document.getElementById("notifyIntervalMinutes");
  if (interval) interval.value = String(appNotificationState.intervalMinutes);
  const vapid = document.getElementById("notifyVapidKey");
  if (vapid) vapid.value = appNotificationState.vapidKey;

  iniciarMonitorNotificacoesApp();
  carregarDispositivosNotificacoesApp(false);
  restaurarRegistoPushAtualApp();
}

function notificationPermissionApp() {
  if (window.electronAPI?.showNotification) return "electron";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function pedirPermissaoNotificacoesApp() {
  if (window.electronAPI?.showNotification) {
    await guardarConfigNotificacoesApp({ notificationEnabled: true });
    await enviarNotificacaoApp("App Braga", "Notificações ativas no Electron.", "test-electron", { force: true });
    return;
  }

  if (!("Notification" in window)) {
    mostrarMensagem("Este dispositivo não suporta notificações Web.", "erro");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registarServiceWorkerAppBraga();
      await guardarConfigNotificacoesApp({ notificationEnabled: true });
      await enviarNotificacaoApp("App Braga", "Notificações ativas neste dispositivo.", "test-web", { force: true });
    } else {
      mostrarMensagem("Permissão de notificações recusada.", "erro");
    }
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao ativar notificações.", "erro");
  }
}

async function guardarConfigNotificacoesApp(overrides = null) {
  const data = overrides || {
    notificationEnabled: !!document.getElementById("notifyEnabled")?.checked,
    notifyTonerZero: !!document.getElementById("notifyTonerZero")?.checked,
    notifyStockMin: !!document.getElementById("notifyStockMin")?.checked,
    notifyMaintenance: !!document.getElementById("notifyMaintenance")?.checked,
    notifyRadios: !!document.getElementById("notifyRadios")?.checked,
    notificationIntervalMinutes: Number(document.getElementById("notifyIntervalMinutes")?.value || 15),
    notificationVapidKey: String(document.getElementById("notifyVapidKey")?.value || appNotificationState.vapidKey || "").trim()
  };

  if (overrides) {
    if (typeof data.notifyTonerZero === "undefined") data.notifyTonerZero = appNotificationState.tonerZero;
    if (typeof data.notifyStockMin === "undefined") data.notifyStockMin = appNotificationState.stockMin;
    if (typeof data.notifyMaintenance === "undefined") data.notifyMaintenance = appNotificationState.maintenance;
    if (typeof data.notifyRadios === "undefined") data.notifyRadios = appNotificationState.radios;
    if (typeof data.notificationIntervalMinutes === "undefined") data.notificationIntervalMinutes = appNotificationState.intervalMinutes;
    if (typeof data.notificationVapidKey === "undefined") data.notificationVapidKey = appNotificationState.vapidKey;
  }

  aplicarConfigNotificacoesApp(data);

  if (!window.db || !window.db.collection) {
    mostrarMensagem("Firebase indisponível para guardar notificações.", "erro");
    return;
  }

  try {
    await window.db.collection("config").doc("layout").set({
      ...data,
      updatedAt: Date.now()
    }, { merge: true });
    mostrarMensagem("Notificações atualizadas.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar notificações.", "erro");
  }
}

async function enviarNotificacaoApp(title, body, tag = "app-braga", options = {}) {
  if (!options.force && !appNotificationState.enabled) return false;

  try {
    if (window.electronAPI?.showNotification) {
      const result = await window.electronAPI.showNotification({ title, body, tag, data: options });
      return !!result?.ok;
    }

    if (!("Notification" in window) || Notification.permission !== "granted") return false;

    const payload = { title, body, tag, data: options };
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: location.pathname.includes("/html/") ? "../icon-192.png" : "icon-192.png",
          badge: location.pathname.includes("/html/") ? "../icon-192.png" : "icon-192.png",
          tag,
          data: options
        });
        return true;
      }
      navigator.serviceWorker.controller?.postMessage({ type: "APP_BRAGA_NOTIFY", payload });
    }

    new Notification(title, { body, tag });
    return true;
  } catch (error) {
    console.error("Erro notificação:", error);
    return false;
  }
}

function buildAlertasNotificacoesApp() {
  const alerts = [];

  if (appNotificationState.stockMin && typeof buildAlertasInteligentes === "function") {
    buildAlertasInteligentes()
      .filter((item) => item.tipo === "stock")
      .forEach((item) => alerts.push({
        key: `stock-${item.titulo}-${item.detalhe}`,
        title: "Stock abaixo do mínimo",
        body: `${item.titulo}: ${item.detalhe}`,
        url: "html/stock.html"
      }));
  }

  if (appNotificationState.tonerZero && typeof impressorasData !== "undefined" && typeof tonerInfoState !== "undefined") {
    impressorasData.forEach((printer) => {
      const info = tonerInfoState[printer.ip];
      const colors = Array.isArray(info?.colors) ? info.colors : [];
      const empty = colors.filter((item) => isTonerEmpty(item.percent));
      if (!empty.length) return;
      alerts.push({
        key: `toner-${printer.ip}-${empty.map((item) => `${item.label}-${item.percent}`).join("-")}`,
        title: "Toner vazio",
        body: `${printer.modelo} ${printer.localizacao}: ${empty.map((item) => `${item.label} ${item.percent}%`).join(", ")}`,
        url: "html/impressoras.html"
      });
    });
  }

  if (appNotificationState.maintenance && Array.isArray(manutencoesGlobal)) {
    manutencoesGlobal
      .filter((item) => String(item.estado || "").toLowerCase().includes("pendente"))
      .slice(0, 5)
      .forEach((item) => alerts.push({
        key: `manut-${item.idDoc || item.ip || item.numeroSerie || item.modelo || item.dataPedido}`,
        title: "Manutenção pendente",
        body: `${item.modelo || item.numeroSerie || "Impressora"} - ${item.localizacao || item.ip || "sem local"}`,
        url: "html/manutencao-impressoras.html"
      }));
  }

  return alerts;
}

async function verificarAlertasNotificacoesApp(force = false) {
  if (!force && !appNotificationState.enabled) return;
  const alerts = buildAlertasNotificacoesApp();
  if (force && !alerts.length) {
    mostrarMensagem("Sem alertas ativos para notificar.");
    return;
  }

  for (const alert of alerts) {
    if (!force && appNotificationState.sent[alert.key]) continue;
    appNotificationState.sent[alert.key] = Date.now();
    await enviarNotificacaoApp(alert.title, alert.body, alert.key, { url: alert.url, force });
  }
}

function getSnapshotChangeSummaryApp(snapshot) {
  const summary = { added: 0, modified: 0, removed: 0, total: snapshot?.size || 0 };
  if (!snapshot || typeof snapshot.docChanges !== "function") return summary;
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") summary.added += 1;
    if (change.type === "modified") summary.modified += 1;
    if (change.type === "removed") summary.removed += 1;
  });
  return summary;
}

function formatRealtimeChangeBodyApp(summary, label) {
  const parts = [];
  if (summary.added) parts.push(`${summary.added} novo${summary.added > 1 ? "s" : ""}`);
  if (summary.modified) parts.push(`${summary.modified} alterado${summary.modified > 1 ? "s" : ""}`);
  if (summary.removed) parts.push(`${summary.removed} apagado${summary.removed > 1 ? "s" : ""}`);
  return parts.length ? `${label}: ${parts.join(", ")}.` : `${label}: dados atualizados.`;
}

function canNotifyRealtimeCollectionApp(collectionKey) {
  if (!appNotificationState.enabled) return false;
  if (collectionKey === "stock") return appNotificationState.stockMin;
  if (collectionKey === "manutencoes") return appNotificationState.maintenance;
  if (collectionKey === "printers") return appNotificationState.tonerZero;
  return false;
}

async function notificarAlteracaoRealtimeApp(collectionKey, snapshot) {
  if (!snapshot || typeof snapshot.docChanges !== "function") return;

  if (!appNotificationState.realtimeBoot[collectionKey]) {
    appNotificationState.realtimeBoot[collectionKey] = true;
    return;
  }

  if (!canNotifyRealtimeCollectionApp(collectionKey)) return;

  const summary = getSnapshotChangeSummaryApp(snapshot);
  const changedCount = summary.added + summary.modified + summary.removed;
  if (!changedCount) return;

  const config = {
    stock: {
      title: "Stock atualizado",
      label: "Stock",
      url: "html/stock.html"
    },
    manutencoes: {
      title: "Manutenção atualizada",
      label: "Manutenções",
      url: "html/manutencao-impressoras.html"
    },
    printers: {
      title: "Impressoras atualizadas",
      label: "Impressoras / toner",
      url: "html/impressoras.html"
    }
  }[collectionKey];

  if (!config) return;

  const body = formatRealtimeChangeBodyApp(summary, config.label);
  const tag = `realtime-${collectionKey}-${Date.now()}`;
  await enviarNotificacaoApp(config.title, body, tag, { url: config.url });

  if (collectionKey === "stock" || collectionKey === "manutencoes" || collectionKey === "printers") {
    window.setTimeout(() => verificarAlertasNotificacoesApp(false), 350);
  }
}

function iniciarMonitorNotificacoesApp() {
  clearInterval(appNotificationTimer);
  if (!appNotificationState.enabled) return;
  const intervalMs = Math.max(5, appNotificationState.intervalMinutes) * 60 * 1000;
  appNotificationTimer = setInterval(() => verificarAlertasNotificacoesApp(false), intervalMs);
}

async function testarNotificacaoApp() {
  const ok = await enviarNotificacaoApp("App Braga", "Teste de notificação concluído.", "app-braga-test", { force: true, url: "html/config.html" });
  mostrarMensagem(ok ? "Notificação de teste enviada." : "Ativa as permissões de notificações primeiro.", ok ? "sucesso" : "erro");
}

async function entrarFullscreenApp() {
  try {
    if (document.fullscreenElement) {
      guardarFullscreenPreferidoApp(false);
      await document.exitFullscreen?.();
      mostrarMensagem("Fullscreen desligado.");
      atualizarBotaoFullscreenApp();
      return;
    }
    guardarFullscreenPreferidoApp(true);
    await pedirFullscreenApp(true);
  } catch (error) {
    console.warn("Erro fullscreen:", error);
    atualizarBotaoFullscreenApp();
    mostrarMensagem("Nao foi possivel trocar fullscreen.", "erro");
  }
}

const APP_FULLSCREEN_PREF_KEY = "appBragaFullscreenPreferido";

function fullscreenPreferidoApp() {
  try {
    return localStorage.getItem(APP_FULLSCREEN_PREF_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function guardarFullscreenPreferidoApp(value) {
  try {
    localStorage.setItem(APP_FULLSCREEN_PREF_KEY, value ? "1" : "0");
  } catch (error) {
    console.warn("Nao foi possivel guardar fullscreen.", error);
  }
}

function atualizarBotaoFullscreenApp() {
  const btn = document.getElementById("fullscreenToggleBtn");
  if (!btn) return;
  const active = !!document.fullscreenElement || fullscreenPreferidoApp();
  btn.textContent = active ? "Sair do fullscreen" : "Entrar em fullscreen";
  btn.classList.toggle("is-active", active);
}

async function pedirFullscreenApp(showMessage = true) {
  const root = document.documentElement;
  if (document.fullscreenElement) {
    if (showMessage) mostrarMensagem("Fullscreen ativo.");
    atualizarBotaoFullscreenApp();
    return true;
  }

  if (!root.requestFullscreen) {
    if (showMessage) mostrarMensagem("Instala a APP no ecra inicial para fullscreen no Android.", "erro");
    atualizarBotaoFullscreenApp();
    return false;
  }

  try {
    await root.requestFullscreen({ navigationUI: "hide" });
    if (showMessage) mostrarMensagem("Fullscreen ativo.");
    atualizarBotaoFullscreenApp();
    return true;
  } catch (error) {
    console.warn("Erro fullscreen:", error);
    if (showMessage) mostrarMensagem("Toca outra vez para ativar fullscreen.", "erro");
    atualizarBotaoFullscreenApp();
    return false;
  }
}

function initFullscreenPreferidoApp() {
  atualizarBotaoFullscreenApp();
  document.addEventListener("fullscreenchange", atualizarBotaoFullscreenApp);
  if (!fullscreenPreferidoApp() || document.fullscreenElement) return;
  window.setTimeout(() => pedirFullscreenApp(false), 800);
}

function setNotificationTokenStatus(text, state = "warn") {
  const node = document.getElementById("notifyTokenStatus");
  if (!node) return;
  node.textContent = text;
  node.className = `health-status ${state}`;
}

function carregarScriptAppBraga(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      if (window.firebase?.messaging) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function garantirFirebaseMessagingApp() {
  if (window.electronAPI?.showNotification) throw new Error("FCM Web Push e para Web/PWA; Electron usa notificacoes nativas.");
  if (!window.isSecureContext) throw new Error("Push Service precisa de HTTPS.");
  if (!("serviceWorker" in navigator)) throw new Error("Service Worker indisponivel neste dispositivo.");
  if (!("PushManager" in window)) throw new Error("Push Service indisponivel neste dispositivo/browser.");
  if (!window.firebase || !firebase.apps?.length) throw new Error("Firebase v8 nao esta carregado.");
  if (!firebase.messaging) {
    await carregarScriptAppBraga("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");
  }
  if (!firebase.messaging) throw new Error("Firebase Messaging indisponível.");
  const supported = firebase.messaging.isSupported ? await Promise.resolve(firebase.messaging.isSupported()) : true;
  if (!supported) throw new Error("Este browser/dispositivo não suporta Firebase Messaging.");
  return firebase.messaging();
}

function getNotificationTokenDocId(token) {
  return encodeURIComponent(String(token || "")).replace(/\./g, "%2E").slice(0, 1400);
}

function webPushDisponivelApp() {
  return !!(window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window);
}

function getNotificationDeviceTypeApp() {
  if (window.electronAPI?.showNotification) return "pc-electron";
  return window.appBragaDeviceType || (document.body.classList.contains("device-tablet") ? "tablet" : (document.body.classList.contains("device-phone") ? "phone" : "pc"));
}

function getLocalNotificationDeviceIdApp(source = "web-local") {
  return `${source}-${encodeURIComponent(navigator.platform || "device")}-${Math.abs(hashTextoAppBraga(navigator.userAgent || ""))}`;
}

function normalizeTimestampApp(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTimestampApp(value) {
  const time = normalizeTimestampApp(value);
  if (!time) return "-";
  return new Date(time).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderDispositivosNotificacoesApp(items = []) {
  const host = document.getElementById("notifyDevicesList");
  if (!host) return;

  const activeItems = items
    .filter((item) => item.active !== false)
    .sort((a, b) => normalizeTimestampApp(b.updatedAt || b.createdAt) - normalizeTimestampApp(a.updatedAt || a.createdAt));

  if (!activeItems.length) {
    host.innerHTML = `<div class="empty-state mini">Ainda não há dispositivos ativos.</div>`;
    return;
  }

  host.innerHTML = activeItems.map((item) => {
    const isCurrent = item.id === appNotificationState.restoredTokenDocId || (appNotificationState.fcmToken && item.token === appNotificationState.fcmToken);
    const source = item.source || "desconhecido";
    const device = item.deviceType || item.platform || "Dispositivo";
    const permission = item.permission || "sem dados";
    const updated = formatTimestampApp(item.updatedAt || item.createdAt);
    return `
      <div class="notification-device-card ${isCurrent ? "is-current" : ""}">
        <div>
          <strong>${escapeHtmlAppBraga(device)}</strong>
          <span>${escapeHtmlAppBraga(source)} · ${escapeHtmlAppBraga(permission)}</span>
          <small>Atualizado: ${escapeHtmlAppBraga(updated)}</small>
        </div>
        <span class="health-status ${isCurrent ? "ok" : "warn"}">${isCurrent ? "Este" : "Ativo"}</span>
      </div>
    `;
  }).join("");
}

function carregarDispositivosNotificacoesApp(force = false) {
  const host = document.getElementById("notifyDevicesList");
  if (!host || !window.db?.collection) return;
  if (appNotificationState.devicesUnsubscribe && !force) return;
  if (appNotificationState.devicesUnsubscribe && force) {
    appNotificationState.devicesUnsubscribe();
    appNotificationState.devicesUnsubscribe = null;
  }

  appNotificationState.devicesUnsubscribe = window.db.collection("notificationTokens").onSnapshot((snapshot) => {
    const items = [];
    snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
    renderDispositivosNotificacoesApp(items);
  }, (error) => {
    console.error("Erro ao carregar dispositivos:", error);
    host.innerHTML = `<div class="empty-state mini">Erro ao carregar dispositivos.</div>`;
  });
}

async function restaurarRegistoPushAtualApp() {
  if (appNotificationState.restoreRunning || !window.db?.collection) return;
  appNotificationState.restoreRunning = true;
  try {
    if (window.electronAPI?.showNotification) {
      const docId = "electron-native";
      const doc = await window.db.collection("notificationTokens").doc(docId).get();
      if (doc.exists && doc.data()?.active !== false) {
        appNotificationState.restoredTokenDocId = docId;
        await window.db.collection("notificationTokens").doc(docId).set({
          active: true,
          appVersion: APP_VERSION,
          deviceType: "pc-electron",
          permission: "native",
          updatedAt: Date.now()
        }, { merge: true });
        setNotificationTokenStatus("Electron registado", "ok");
      }
      return;
    }

    const permission = "Notification" in window ? Notification.permission : "unsupported";
    if (permission !== "granted") {
      setNotificationTokenStatus(permission === "denied" ? "Permissão bloqueada" : "Sem permissão", permission === "denied" ? "bad" : "warn");
      return;
    }

    const vapidKey = String(appNotificationState.vapidKey || document.getElementById("notifyVapidKey")?.value || "").trim();
    if (vapidKey && webPushDisponivelApp()) {
      await registarServiceWorkerAppBraga();
      const messaging = await garantirFirebaseMessagingApp();
      const registration = await navigator.serviceWorker.ready;
      const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: registration });
      if (token) {
        const docId = getNotificationTokenDocId(token);
        appNotificationState.fcmToken = token;
        appNotificationState.restoredTokenDocId = docId;
        await window.db.collection("notificationTokens").doc(docId).set({
          token,
          active: true,
          source: "web-push",
          appVersion: APP_VERSION,
          deviceType: getNotificationDeviceTypeApp(),
          userAgent: navigator.userAgent,
          platform: navigator.platform || "",
          permission,
          updatedAt: Date.now()
        }, { merge: true });
        setNotificationTokenStatus("Registado", "ok");
        return;
      }
    }

    const localId = getLocalNotificationDeviceIdApp("web-local-no-push");
    const localDoc = await window.db.collection("notificationTokens").doc(localId).get();
    if (localDoc.exists && localDoc.data()?.active !== false) {
      appNotificationState.restoredTokenDocId = localId;
      await window.db.collection("notificationTokens").doc(localId).set({
        active: true,
        appVersion: APP_VERSION,
        deviceType: getNotificationDeviceTypeApp(),
        permission,
        updatedAt: Date.now()
      }, { merge: true });
      setNotificationTokenStatus("Local ativo", "warn");
    }
  } catch (error) {
    console.warn("Não foi possível restaurar registo push:", error);
  } finally {
    appNotificationState.restoreRunning = false;
    carregarDispositivosNotificacoesApp(false);
  }
}

async function registarDispositivoLocalNotificacoesApp(source = "web-local") {
  await guardarConfigNotificacoesApp({ notificationEnabled: true, notificationVapidKey: appNotificationState.vapidKey });
  if (window.db?.collection) {
    const id = getLocalNotificationDeviceIdApp(source);
    appNotificationState.restoredTokenDocId = id;
    await window.db.collection("notificationTokens").doc(id).set({
      active: true,
      source,
      appVersion: APP_VERSION,
      deviceType: getNotificationDeviceTypeApp(),
      userAgent: navigator.userAgent,
      platform: navigator.platform || "",
      permission: "Notification" in window ? Notification.permission : "unsupported",
      pushAvailable: webPushDisponivelApp(),
      updatedAt: Date.now(),
      createdAt: Date.now()
    }, { merge: true });
  }
  setNotificationTokenStatus("Local ativo", "warn");
  await enviarNotificacaoApp("App Braga", "Notificacoes locais ativas neste dispositivo.", `${source}-register`, { force: true });
  mostrarMensagem("Push remoto indisponivel; notificacoes locais ativadas.");
}

async function registarDispositivoPushApp() {
  try {
    if (!window.db || !window.db.collection) throw new Error("Firestore indisponivel.");
    const vapidKey = String(document.getElementById("notifyVapidKey")?.value || appNotificationState.vapidKey || "").trim();

    if (window.electronAPI?.showNotification) {
      await guardarConfigNotificacoesApp({ notificationEnabled: true, notificationVapidKey: vapidKey });
      appNotificationState.restoredTokenDocId = "electron-native";
      await window.db.collection("notificationTokens").doc("electron-native").set({
        active: true,
        source: "electron-native",
        appVersion: APP_VERSION,
        deviceType: "pc-electron",
        userAgent: navigator.userAgent,
        platform: navigator.platform || "",
        permission: "native",
        updatedAt: Date.now(),
        createdAt: Date.now()
      }, { merge: true });
      setNotificationTokenStatus("Electron nativo", "ok");
      await enviarNotificacaoApp("App Braga", "Este PC ficou registado com notificacoes nativas.", "electron-register", { force: true });
      mostrarMensagem("PC registado com notificacoes nativas.");
      return;
    }

    if (!vapidKey) {
      mostrarMensagem("Coloca primeiro a VAPID key do Firebase.", "erro");
      setNotificationTokenStatus("Falta VAPID key", "bad");
      return;
    }

    await guardarConfigNotificacoesApp({ notificationEnabled: true, notificationVapidKey: vapidKey });
    await pedirPermissaoNotificacoesApp();
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    if (!webPushDisponivelApp()) {
      await registarDispositivoLocalNotificacoesApp("web-local-no-push");
      return;
    }

    setNotificationTokenStatus("A registar...", "warn");
    await registarServiceWorkerAppBraga();
    const messaging = await garantirFirebaseMessagingApp();
    const registration = await navigator.serviceWorker.ready;
    const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: registration });
    if (!token) throw new Error("Firebase nao devolveu token.");

    appNotificationState.fcmToken = token;
    appNotificationState.restoredTokenDocId = getNotificationTokenDocId(token);
    await window.db.collection("notificationTokens").doc(getNotificationTokenDocId(token)).set({
      token,
      active: true,
      source: "web-push",
      appVersion: APP_VERSION,
      deviceType: getNotificationDeviceTypeApp(),
      userAgent: navigator.userAgent,
      platform: navigator.platform || "",
      permission: Notification.permission,
      updatedAt: Date.now(),
      createdAt: Date.now()
    }, { merge: true });

    await guardarConfigNotificacoesApp({ notificationEnabled: true, notificationVapidKey: vapidKey });
    setNotificationTokenStatus("Registado", "ok");
    mostrarMensagem("Dispositivo registado para push.");
  } catch (error) {
    console.error("Erro ao registar push:", error);
    setNotificationTokenStatus("Erro no registo", "bad");
    const code = String(error?.code || "");
    const message = String(error?.message || "");
    let friendly = message || "Erro ao registar push.";
    if (code.includes("messaging/permission-blocked")) friendly = "As notificacoes estao bloqueadas neste dispositivo/browser.";
    if (code.includes("messaging/unsupported-browser")) friendly = "Este browser/dispositivo nao suporta Firebase Cloud Messaging.";
    if (code.includes("messaging/invalid-vapid-key")) friendly = "A VAPID key nao e valida. Confirma a chave Web Push no Firebase.";
    if (code.includes("messaging/token-subscribe-failed")) friendly = "Falhou a subscricao push. Confirma permissoes e a VAPID key.";
    if (message.toLowerCase().includes("push service")) {
      await registarDispositivoLocalNotificacoesApp("web-local-no-push");
      return;
    }
    mostrarMensagem(friendly, "erro");
  }
}

async function obterTonerInfo(ip) {
  try {
    if (!window.electronAPI || !window.electronAPI.getTonerSNMP) return null;
    const resposta = await window.electronAPI.getTonerSNMP(ip);

    if (resposta && resposta.ok) {
      return {
        colors: Array.isArray(resposta.colors) ? resposta.colors : [],
        residue: resposta.residue || null,
        percent: typeof resposta.percent === "number" ? resposta.percent : null
      };
    }

    if (window.electronAPI.getPrinterHTML) {
      const htmlResp = await window.electronAPI.getPrinterHTML(ip);
      if (htmlResp && htmlResp.ok && htmlResp.body) {
        const percent = extrairPercentagemTonerDoHTML(htmlResp.body);
        return { colors: [{ key: "black", label: "Preto", percent }], residue: null };
      }
    }
    return null;
  } catch (error) {
    console.error("Erro ao obter toner da impressora:", error);
    return null;
  }
}

async function testarTonerImpressora(ip, outputId) {
  const output = el(outputId);
  if (output) {
    output.innerHTML = `
      <div class="printer-toner-box">
        <div class="printer-toner-head">
          <span class="printer-toner-title">Consumíveis</span>
          <span class="printer-toner-status is-muted">A testar</span>
        </div>
        <div class="printer-toner-bar-wrap">
          <div class="printer-toner-bar" style="width:35%;"></div>
        </div>
        <div class="printer-toner-foot">
          <span class="printer-toner-value">...</span>
        </div>
      </div>
    `;
  }

  const info = await obterTonerInfo(ip);
  tonerInfoState[ip] = info || null;

  if (output) output.innerHTML = gerarHTMLToners(info);
  if (info) maybeNotifyCriticalSupply(ip, info);
  updateTonerDiagnosticStatus(info ? "ok" : "error", { running: false, lastRunAt: new Date(), successCount: info ? 1 : 0, totalCount: 1, source: resolveDiagSource() });
  pushTonerDiagnosticLog(ip, info ? summarizeTonerInfo(info) : "sem resposta");
  renderDashboardCards();
}

async function testarTodasAsImpressoras() {
  for (const item of impressorasData) {
    const alvoId = `toner-${item.ip.replace(/\./g, "-")}`;

    if (el(alvoId)) {
      await testarTonerImpressora(item.ip, alvoId);
    } else {
      const info = await obterTonerInfo(item.ip);
      tonerInfoState[item.ip] = info || null;
      if (info) maybeNotifyCriticalSupply(item.ip, info);
    }
  }

  renderDashboardCards();
}

window.testarTonerImpressora = testarTonerImpressora;


function filtrarHistoricoPorImpressora(item) {
  const serie = String(item.serie || "");
  const loc = String(item.localizacao || "");
  const arm = String(item.armazem || "");

  return historicoGlobal.filter(h => {
    const hLoc = String(h.localizacao || "");
    const hEq = String(h.equipamento || "");
    return hLoc.includes(serie) ||
      hLoc.includes(loc) ||
      (hLoc.includes(arm) && hLoc.includes(loc)) ||
      normalizarTexto(hEq).includes(normalizarTexto(item.modelo));
  });
}

function abrirHistoricoImpressora(item) {
  const host = el("historicoImpressoraPanel");
  if (!host) return;

  const itens = filtrarHistoricoPorImpressora(item);
  const ultimo = itens[0] || null;

  host.innerHTML = `
    <div class="printer-history-card">
      <div class="section-header">
        <div>
          <h3>${item.modelo} — ${item.serie}</h3>
          <p class="section-subtitle">${item.armazem} · ${item.localizacao}</p>
        </div>
      </div>

      <div class="history-mini-grid">
        <div class="summary-card">
          <h4>Total de Toners</h4>
          <div class="summary-value">${itens.length}</div>
        </div>
        <div class="summary-card">
          <h4>Último Registo</h4>
          <div class="meta-line">${ultimo ? `${ultimo.cor || "-"} · ${ultimo.data || "Sem Data"}` : "Sem registos"}</div>
        </div>
      </div>

      <div class="printer-history-items">
        ${itens.length ? itens.slice(0,8).map(h => `
          <div class="printer-history-item">
            <div class="meta-line">ID: <span class="meta-value">${h.idInterno || "-"}</span></div>
            <div class="meta-line">Cor: <span class="meta-value">${h.cor || "-"}</span></div>
            <div class="meta-line">Data: <span class="meta-value">${h.data || "Sem Data"}</span></div>
            <div class="meta-line">Localização: <span class="meta-value">${h.localizacao || "Sem Localização"}</span></div>
          </div>
        `).join("") : `<div class="panel empty-state"><h3>Sem histórico para esta impressora</h3><p>Quando houver movimentos associados, aparecem aqui.</p></div>`}
      </div>
    </div>
  `;
}

function guardarImpressorasLocal() {
  try {
    impressorasData.forEach((item, i) => { if (!item._ref) item._ref = item.idDoc || `local-impressora-${i}`; });
    localStorage.setItem(IMPRESSORAS_STORAGE_KEY, JSON.stringify(impressorasData.map(i => ({ ...i }))));
  } catch (e) { console.warn('Nao foi possivel guardar impressoras no localStorage.', e); }
}

function carregarImpressorasLocal() {
  try {
    const raw = localStorage.getItem(IMPRESSORAS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return;
    parsed.forEach((item, i) => { if (!item._ref) item._ref = item.idDoc || `local-impressora-${i}`; });
    impressorasData.splice(0, impressorasData.length, ...parsed);
  } catch (e) { console.warn('Nao foi possivel carregar impressoras do localStorage.', e); }
}

function renderImpressoras(lista = impressorasData) {
  const tbody = el("impressorasTableBody");
  if (!tbody) return;

  const total = impressorasData.length;
  const ok = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "OK").length;
  const problema = impressorasData.filter(i => {
    const e = obterEstadoImpressora(i.ip);
    return e === "Pendente" || e === "Em reparação";
  }).length;
  const resolvidas = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "Resolvido").length;

  setText("countImpressoras", total);
  setText("countImpressorasOk", ok);
  setText("countImpressorasProblema", problema);
  setText("countImpressorasResolvidas", resolvidas);

  tbody.innerHTML = lista.map(item => {
    const estado = obterEstadoImpressora(item.ip);
    const tonerId = `toner-${item.ip.replace(/\./g, "-")}`;

    return `
      <tr>
        <td>${item.modelo}</td>
        <td>${item.serie}</td>
        <td>${item.armazem}</td>
        <td>${item.localizacao}</td>
        <td><a href="http://${item.ip}" target="_blank" rel="noopener noreferrer">${item.ip}</a></td>
        <td>${badgeEstado(estado)}</td>
        <td>
          <div id="${tonerId}">${gerarHTMLBarraToner(null)}</div>
          <div class="table-actions" style="margin-top:8px;">
            <button class="action-btn ip" onclick="abrirIP('${item.ip}')">Abrir IP</button>
            <button class="action-btn manut" onclick='abrirManutencaoDireta(${JSON.stringify(item)})'>Manutenção</button>
            <button class="action-btn" onclick='abrirHistoricoImpressora(${JSON.stringify(item)})'>Histórico</button>
            <button class="action-btn" onclick="window.testarTonerImpressora('${item.ip}', '${tonerId}')">Testar toner</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function filtrarImpressoras() {
  const texto = normalizarTexto(el("searchImpressoras")?.value || "");
  const armazem = el("filterArmazem")?.value || "";
  const estado = el("filterEstadoImpressora")?.value || "";

  const filtrada = impressorasData.filter(item => {
    const estadoAtual = obterEstadoImpressora(item.ip);

    const passaTexto =
      normalizarTexto(item.modelo).includes(texto) ||
      normalizarTexto(item.serie).includes(texto) ||
      normalizarTexto(item.ip).includes(texto) ||
      normalizarTexto(item.localizacao).includes(texto) ||
      normalizarTexto(item.armazem).includes(texto);

    const passaArmazem = !armazem || item.armazem === armazem;
    const passaEstado = !estado || estadoAtual === estado;

    return passaTexto && passaArmazem && passaEstado;
  });

  renderImpressoras(filtrada);
}

/* =========================
   PISTOLAS - EMPRESA EXTREMO
========================= */
function badgePistolaReserva(valor) {
 
  return String(valor || "")
    .toLowerCase()
    .includes("reserva")
 
    ? `<span class="badge reserva">Reserva</span>`
 
    : `<span class="badge ok">Ativa</span>`;
 
}

function renderPistolas(lista = window.pistolasData) {

  lista = Array.isArray(lista) ? lista : [];


 
  lista = Array.isArray(lista) ? lista : [];
 
  lista.sort((a,b)=>{
 
    const aTxt =
      String(
        a.nome ||
        a.codigo ||
        a.numero ||
        a.num ||
        ""
      )
      .toLowerCase()
      .trim();
 
    const bTxt =
      String(
        b.nome ||
        b.codigo ||
        b.numero ||
        b.num ||
        ""
      )
      .toLowerCase()
      .trim();
 
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

  setText(
    "countPistolasBraga",
    lista.filter(p =>
      String(p.armazem || "")
        .toLowerCase()
        .includes("braga")
    ).length
  );

  setText(
    "countPistolasReserva",
    lista.filter(p =>
      String(p.operador || "")
        .toLowerCase()
        .includes("reserva")
    ).length
  );

 
  const container = document.querySelector("#listaPistolas");
 
  if (!container) return;
 
  container.innerHTML = lista.map((p, index) => {
 
	const ref = "'" + (p.idDoc || ("local-pistola-" + index)) + "'";
 
    return `
    <div class="pc-card">

      <div class="pc-name">${p.nome || "-"}</div>
 
      <div class="meta-line">
        Nº:
        <span class="meta-value">${p.num || "-"}</span>
      </div>
 
      <div class="meta-line">
        Password:
        <span class="meta-value">${p.password || "-"}</span>
      </div>
 
      <div class="meta-line">
        CN:
        <span class="meta-value">${p.cn || "-"}</span>
      </div>
 
      <div class="meta-line">
        SN:
        <span class="meta-value">${p.sn || "-"}</span>
      </div>
 
      <div class="meta-line">
        MAC:
        <span class="meta-value">${p.mac || "-"}</span>
      </div>
 
      <div class="meta-line">
        Operador:
        <span class="meta-value">${p.operador || "-"}</span>
      </div>
 
      <div class="meta-line">
        Armazém:
        <span class="meta-value">${p.armazem || "-"}</span>
      </div>
 
      <div class="meta-line">
        Prontas:
        <span class="meta-value">${p.prontas || "-"}</span>
      </div>
 
      <div class="meta-line">
        Estado:
        <span class="meta-value">
          ${badgePistolaReserva(p.operador)}
        </span>
      </div>
 
      <div class="item-actions">
        <button class="secondary-btn" onclick="editarPistola(${ref})">
          Editar
        </button>
 
        <button class="secondary-btn" onclick="apagarPistola(${ref})">
          Apagar
        </button>
      </div>
 
    </div>
    `;
 
  }).join("");

 renderUsers(filtrado);
}	
	
function filtrarUsersComFiltros() {
  const texto = el("searchUsers")?.value || "";
  filtrarUsers(texto);
}

/* =========================
   PORTAS - EMPRESA EXTREMO
========================= */
function estadoPorta(porta) {
  const temIP = normalizarTexto(porta.ip) !== "";
  const temUser = normalizarTexto(porta.user) !== "";

  if (!temIP && !temUser) return "livre";
  if (temIP && temUser) return "ocupado";
  if (temIP && !temUser) return "semUser";
  return "livre";
}

function badgePorta(estado) {
  if (estado === "ocupado") return `<span class="badge ocupado">Ocupado</span>`;
  if (estado === "livre") return `<span class="badge livre">Livre</span>`;
  if (estado === "semUser") return `<span class="badge aviso">Sem user</span>`;
  return `<span class="badge">-</span>`;
}

function atualizarContadoresPortas(lista = window.portasData) {
  let total = lista.length;
  let usadas = 0;
  let livres = 0;
  let semUser = 0;

  lista.forEach(porta => {
    const estado = estadoPorta(porta);
    if (estado === "ocupado") usadas++;
    if (estado === "livre") livres++;
    if (estado === "semUser") semUser++;
  });

  setText("countPortas", total);
  setText("countPortasUsadas", usadas);
  setText("countPortasLivres", livres);
  setText("countPortasSemUser", semUser);
}

function renderPortas(lista = window.portasData) {
  const container = el("listaPortas");
  if (!container) return;

  atualizarContadoresPortas(lista);

  container.innerHTML = lista.map((p, index) => {
    const estado = estadoPorta(p);
    const ref = p.idDoc ? `'${p.idDoc}'` : `'${p._ref || `local-porta-${window.portasData.indexOf(p)}`}'`;
    return `
      <div class="pc-card">
        <div class="pc-name">Porta ${p.porta || "-"}</div>
        <div class="meta-line">Local: <span class="meta-value">${p.local || "-"}</span></div>
        <div class="meta-line">User: <span class="meta-value">${p.user || "-"}</span></div>
        <div class="meta-line">Equipamento: <span class="meta-value">${p.equipamento || "-"}</span></div>
        <div class="meta-line">IP: <span class="meta-value">${p.ip ? `<a href="http://${p.ip}" target="_blank">${p.ip}</a>` : "-"}</span></div>
        <div class="meta-line">Estado: <span class="meta-value">${badgePorta(estado)}</span></div>
        <div class="item-actions">
          <button
            class="secondary-btn"
            onclick="editarPorta(${ref})">
            Editar
          </button>
          <button class="secondary-btn" onclick="apagarPorta(${ref})">Apagar</button>
        </div>
      </div>
    `;
  }).join("");
}

function filtrarPortas(txt = "") {
  const texto = normalizarTexto(txt);
  const estadoSelecionado = normalizarTexto(el("filterEstadoPortas")?.value || "");

  const filtradas = window.portasData.filter(p => {
    const passaTexto =
      normalizarTexto(p.porta).includes(texto) ||
      normalizarTexto(p.local).includes(texto) ||
      normalizarTexto(p.user).includes(texto) ||
      normalizarTexto(p.ip).includes(texto);

    const passaEstado = !estadoSelecionado || estadoPorta(p) === estadoSelecionado;

    return passaTexto && passaEstado;
  });

  renderPortas(filtradas);
}

function filtrarPortasComEstado() {
  const texto = el("searchPortas")?.value || "";
  filtrarPortas(texto);
}


const PISTOLAS_STORAGE_KEY = 'appbraga_pistolas_custom_v1';
const PORTAS_STORAGE_KEY = 'appbraga_portas_custom_v1';

function prepararRefsPistolas() {
  window.pistolasData.forEach((p, i) => {
    if (!p.idDoc && !p._ref) p._ref = `local-pistola-${i}`;
  });
}

function guardarPistolasLocal() {
  try {
    const serializavel = window.pistolasData.map(p => ({ ...p }));
    localStorage.setItem(PISTOLAS_STORAGE_KEY, JSON.stringify(serializavel));
  } catch (e) {
    console.warn('Nao foi possivel guardar pistolas no localStorage.', e);
  }
}

function carregarPistolasLocal() {
  try {
    const raw = localStorage.getItem(PISTOLAS_STORAGE_KEY);
    if (!raw) {
      prepararRefsPistolas();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      prepararRefsPistolas();
      return;
    }
    window.pistolasData.splice(0, window.pistolasData.length, ...parsed);
    prepararRefsPistolas();
  } catch (e) {
    console.warn('Nao foi possivel carregar pistolas do localStorage.', e);
    prepararRefsPistolas();
  }
}

function prepararRefsPortas() {
  window.portasData.forEach((p, i) => {
    if (!p.idDoc && !p._ref) p._ref = `local-porta-${i}`;
  });
}

function guardarPortasLocal() {
  try {
    const serializavel = window.portasData.map(p => ({ ...p }));
    localStorage.setItem(PORTAS_STORAGE_KEY, JSON.stringify(serializavel));
  } catch (e) {
    console.warn('Nao foi possivel guardar portas no localStorage.', e);
  }
}

function carregarPortasLocal() {
  try {
    const raw = localStorage.getItem(PORTAS_STORAGE_KEY);
    if (!raw) {
      prepararRefsPortas();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      prepararRefsPortas();
      return;
    }
    window.portasData.splice(0, window.portasData.length, ...parsed);
    prepararRefsPortas();
  } catch (e) {
    console.warn('Nao foi possivel carregar portas do localStorage.', e);
    prepararRefsPortas();
  }
}

/* =========================
   USERS - EMPRESA EXTREMO
========================= */
function utilizadorTemMO365(u) {
  return normalizarTexto(u.user_mo365) !== "";
}

function utilizadorTemPistola(u) {
  return normalizarTexto(u.op_pistola) !== "";
}

function utilizadorTemTeamviewer(u) {
  return normalizarTexto(u.teamviewer) !== "";
}

function badgeUser(valor) {
  return valor ? `<span class="badge ok">Sim</span>` : `<span class="badge livre">Não</span>`;
}

function atualizarContadoresUsers(lista = window.usersData) {
  setText("countUsers", lista.length);
  setText("countUsersMO365", lista.filter(utilizadorTemMO365).length);
  setText("countUsersPistola", lista.filter(utilizadorTemPistola).length);
  setText("countUsersTV", lista.filter(utilizadorTemTeamviewer).length);
}

function renderUsers(lista = window.usersData) {
  const container = el("listaUsers");
  if (!container) return;

  const usersList = Array.isArray(lista) ? [...lista] : [];
  atualizarContadoresUsers(usersList);

usersList.sort((a,b)=>{
 
  const aTxt =
    String(a.nome || "")
      .toLowerCase()
      .trim();
 
  const bTxt =
    String(b.nome || "")
      .toLowerCase()
      .trim();
 
  return aTxt.localeCompare(
    bTxt,
    'pt',
    {
      numeric:true,
      sensitivity:'base'
    }
  );
 
});
  
  container.innerHTML = usersList.length ? usersList.map((u, index) => {
    const refValue = u.idDoc || u.firebaseId || u._ref || `local-user-${index}`;
    const ref = `'${escapeHtmlAppBraga(refValue)}'`;
    return `
    <div class="pc-card">
      <div class="pc-name">${escapeHtmlAppBraga(u.nome || "Sem nome")}</div>
      <div class="meta-line">Zona: <span class="meta-value">${u.zona || "-"}</span></div>
      <div class="meta-line">User PC/EYE: <span class="meta-value">${u.user_pc_eye || "-"}</span></div>
      <div class="meta-line">Pass Remote: <span class="meta-value">${u.pass_remote || "-"}</span></div>
      <div class="meta-line">Pass Eye Peak: <span class="meta-value">${u.pass_eye_peak || "-"}</span></div>
      <div class="meta-line">Op. Pistola: <span class="meta-value">${u.op_pistola || "-"}</span></div>
      <div class="meta-line">Pass Pistola: <span class="meta-value">${u.pass_pistola || "-"}</span></div>
      <div class="meta-line">Nome PC: <span class="meta-value">${u.nome_pc || "-"}</span></div>
      <div class="meta-line">TeamViewer: <span class="meta-value">${u.teamviewer || "-"}</span></div>
      <div class="meta-line">User MO365: <span class="meta-value">${u.user_mo365 || "-"}</span></div>
      <div class="meta-line">Pw MO365: <span class="meta-value">${u.pw_mo365 || "-"}</span></div>
      <div class="meta-line">Email Bragalis: <span class="meta-value">${u.email_bragalis || "-"}</span></div>
      <div class="meta-line">Pass Bragalis: <span class="meta-value">${u.pass_bragalis || "-"}</span></div>
      <div class="item-actions">
        <button class="secondary-btn" onclick="editarUser(${ref})">Editar</button>
		<button class="secondary-btn" onclick='imprimirUser(${JSON.stringify(u)})'>Imprimir Dados</button>
        <button class="secondary-btn" onclick="apagarUser(${ref})">Apagar</button>
      </div>
    </div>
  `;
  }).join("") : `<div class="reference-empty">Sem users carregados da Firebase.</div>`;
}

function filtrarUsers(txt = "") {
  const texto = normalizarTexto(txt);
  const filtroMO365 = normalizarTexto(el("filterUsersMO365")?.value || "");
  const filtroPistola = normalizarTexto(el("filterUsersPistola")?.value || "");

  const filtrado = window.usersData.filter(u => {
    const passaTexto =
      normalizarTexto(u.nome).includes(texto) ||
      normalizarTexto(u.zona).includes(texto) ||
      normalizarTexto(u.user_pc_eye).includes(texto) ||
      normalizarTexto(u.pass_remote).includes(texto) ||
      normalizarTexto(u.pass_eye_peak).includes(texto) ||
      normalizarTexto(u.op_pistola).includes(texto) ||
      normalizarTexto(u.pass_pistola).includes(texto) ||
      normalizarTexto(u.nome_pc).includes(texto) ||
      normalizarTexto(u.teamviewer).includes(texto) ||
      normalizarTexto(u.user_mo365).includes(texto) ||
      normalizarTexto(u.pw_mo365).includes(texto) ||
      normalizarTexto(u.email_bragalis).includes(texto) ||
      normalizarTexto(u.pass_bragalis).includes(texto);

    let passaMO365 = true;
    if (filtroMO365 === "sim") passaMO365 = utilizadorTemMO365(u);
    if (filtroMO365 === "nao") passaMO365 = !utilizadorTemMO365(u);

    let passaPistola = true;
    if (filtroPistola === "sim") passaPistola = utilizadorTemPistola(u);
    if (filtroPistola === "nao") passaPistola = !utilizadorTemPistola(u);

    return passaTexto && passaMO365 && passaPistola;
  });

  renderUsers(filtrado);
}

function filtrarUsersComFiltros() {
  const texto = el("searchUsers")?.value || "";
  filtrarUsers(texto);
}

function applyAppTheme(mode) {
  const isDark = mode !== "light";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("app-dark", isDark);
  document.documentElement.classList.toggle("app-light", !isDark);
  document.body.classList.toggle("dark", isDark);
  document.body.classList.toggle("app-dark", isDark);
  document.body.classList.toggle("app-light", !isDark);

  document.querySelectorAll(".theme-toggle").forEach((button) => {
    button.textContent = isDark ? "Modo claro" : "Modo escuro";
    button.setAttribute("aria-pressed", String(isDark));
  });

  const sw = el("darkSwitch");
  if (sw) sw.checked = isDark;
}

function initGlobalTheme() {
  applyAppTheme("dark");
  if (window.AppThemePro) {
    window.AppThemePro.apply(window.AppThemePro.getCachedTheme(), { persist: false });
    window.AppThemePro.bindControls?.();
    window.AppThemePro.connectFirestore?.();
  }

  const sidebar = document.querySelector(".sidebar");
  if (sidebar && !document.querySelector(".theme-toggle")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.addEventListener("click", () => {
      applyAppTheme("dark");
    });

    const brand = sidebar.querySelector(".brand, .premium-brand, .brand-block");
    if (brand && brand.parentNode) {
      brand.insertAdjacentElement("afterend", button);
    } else {
      sidebar.insertBefore(button, sidebar.firstChild);
    }
  }

  if (sidebar && !sidebar.querySelector(".sidebar-user-card")) {
    const footer = document.createElement("div");
    footer.className = "sidebar-user-card";
    footer.innerHTML = `
      <div class="sidebar-user-avatar">BR</div>
      <div>
        <strong>Administrador</strong>
        <span>admin@appbraga.pt</span>
      </div>
    `;
    sidebar.appendChild(footer);
  }

  const sw = el("darkSwitch");
  if (sw && !sw.dataset.themeBound) {
    sw.dataset.themeBound = "1";
    sw.addEventListener("change", () => {
      applyAppTheme("dark");
    });
  }

  applyAppTheme("dark");
}

function aplicarResolucaoApp(mode = "comfortable") {
  const value = ["compact", "comfortable", "wide"].includes(mode) ? mode : "comfortable";
  document.body.classList.remove("resolution-compact", "resolution-comfortable", "resolution-wide");
  document.documentElement.classList.remove("resolution-compact", "resolution-comfortable", "resolution-wide");
  document.body.classList.add(`resolution-${value}`);
  document.documentElement.classList.add(`resolution-${value}`);
  const select = document.getElementById("appResolution");
  if (select) select.value = value;
}

const APP_DEFAULT_ACCENT = "#ef4444";
const appSecurityState = {
  pinHash: "",
  pinLength: 0,
  authMethod: "pin",
  biometricEnabled: false,
  biometricCredentialId: "",
  lockTimeoutMinutes: 0,
  unlocked: false,
  timer: null,
  overlay: null,
  autoUnlockTimer: null
};

function normalizarCorApp(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : APP_DEFAULT_ACCENT;
}

function hexToRgbAppBraga(hex) {
  const clean = normalizarCorApp(hex).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function ajustarCorAppBraga(hex, amount = -28) {
  const rgb = hexToRgbAppBraga(hex);
  const next = [rgb.r, rgb.g, rgb.b].map((value) => Math.max(0, Math.min(255, value + amount)));
  return `#${next.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function getCachedCorApp() {
  if (window.AppThemePro) return window.AppThemePro.getCachedTheme().primary;
  const match = document.cookie.match(/(?:^|;\s*)appAccentColor=([^;]+)/);
  return match ? normalizarCorApp(decodeURIComponent(match[1])) : "";
}

function cacheCorApp(value) {
  const color = normalizarCorApp(value);
  document.cookie = `appAccentColor=${encodeURIComponent(color)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function getCookieAppBraga(name) {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : "";
  } catch (error) {
    return "";
  }
}

function setCookieAppBraga(name, value, maxAgeSeconds = null) {
  try {
  const age = Number.isFinite(maxAgeSeconds) ? `; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}` : "";
  document.cookie = `${name}=${encodeURIComponent(String(value || ""))}${age}; Path=/; SameSite=Lax`;
  } catch (error) {
    console.warn("Cookie indisponível", error);
  }
}

function deleteCookieAppBraga(name) {
  try {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch (error) {
    console.warn("Cookie indisponível", error);
  }
}

function getSessionAppBraga(name) {
  try {
    return window.sessionStorage?.getItem(name) || "";
  } catch (error) {
    return "";
  }
}

function setSessionAppBraga(name, value) {
  try {
    window.sessionStorage?.setItem(name, String(value || ""));
  } catch (error) {
    console.warn("Sessão temporária indisponível", error);
  }
}

function deleteSessionAppBraga(name) {
  try {
    window.sessionStorage?.removeItem(name);
  } catch (error) {
    console.warn("Sessão temporária indisponível", error);
  }
}

function aplicarCorApp(value = APP_DEFAULT_ACCENT) {
  if (window.AppThemePro) {
    window.AppThemePro.apply({ ...window.AppThemePro.getCachedTheme(), primary: value });
    return;
  }
  const color = normalizarCorApp(value);
  const hover = ajustarCorAppBraga(color, -28);
  const light = ajustarCorAppBraga(color, 34);
  const rgb = hexToRgbAppBraga(color);
  const soft = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .16)`;
  const softer = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .08)`;
  const glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .28)`;
  const line = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .22)`;
  const vars = {
    "--app-accent": color,
    "--app-accent-hover": hover,
    "--app-accent-light": light,
    "--app-accent-rgb": `${rgb.r} ${rgb.g} ${rgb.b}`,
    "--app-accent-soft": soft,
    "--app-accent-softer": softer,
    "--app-accent-line": line,
    "--app-accent-glow": glow,
    "--az-orange": color,
    "--az-orange-2": hover,
    "--az-orange-soft": soft,
    "--az-line": line,
    "--primary": color,
    "--primary-hover": hover,
    "--sidebar-hover": color,
    "--brinka-pink": color,
    "--brinka-purple": hover,
    "--brinka-orange": color,
    "--brinka-orange2": light,
    "--ent-blue": color,
    "--ent-purple": hover,
    "--ent-orange": color,
    "--app-blue": color,
    "--app-blue-soft": soft
  };
  Object.entries(vars).forEach(([key, val]) => document.documentElement.style.setProperty(key, val));
  const picker = document.getElementById("appAccentColor");
  if (picker) picker.value = color;
}

function initResolucaoApp() {
  aplicarResolucaoApp("comfortable");
  if (window.AppThemePro) {
    window.AppThemePro.apply(window.AppThemePro.getCachedTheme(), { persist: false });
    window.AppThemePro.bindControls?.();
    window.AppThemePro.connectFirestore?.();
  } else {
    aplicarCorApp(getCachedCorApp() || APP_DEFAULT_ACCENT);
  }
  if (!window.db || !window.db.collection) return;
  window.db.collection("config").doc("layout").onSnapshot((doc) => {
    const data = doc.exists ? doc.data() : {};
    aplicarResolucaoApp(data.resolution || "comfortable");
    if (window.AppThemePro) {
      window.AppThemePro.apply({
        ...window.AppThemePro.getCachedTheme(),
        ...(data.themePro || {}),
        primary: data.themePro?.primary || data.accentColor || window.AppThemePro.getCachedTheme().primary,
        secondary: data.themePro?.secondary || data.accentColor2 || window.AppThemePro.getCachedTheme().secondary,
        buttonTextMode: data.buttonTextMode || data.themePro?.buttonTextMode || window.AppThemePro.getCachedTheme().buttonTextMode
      });
    } else {
      const accentColor = data.accentColor || getCachedCorApp() || APP_DEFAULT_ACCENT;
      aplicarCorApp(accentColor);
      cacheCorApp(accentColor);
    }
    setCookieAppBraga("appButtonTextMode", data.buttonTextMode || getButtonTextMode(), 31536000);
    if (typeof aplicarModoTextoBotoes === "function") aplicarModoTextoBotoes(data.buttonTextMode || getButtonTextMode());
    aplicarConfigNotificacoesApp(data);
    aplicarSegurancaApp(data.pinHash || "", data.lockTimeoutMinutes || 0, data.pinLength || 0, data.authMethod || "pin", data.biometricEnabled || false, data.biometricCredentialId || "");
  }, (error) => console.error("Erro ao carregar resolução:", error));
}

async function guardarResolucaoApp(value) {
  aplicarResolucaoApp(value);
  if (!window.db || !window.db.collection) return;
  try {
    await window.db.collection("config").doc("layout").set({
      resolution: value,
      updatedAt: Date.now()
    }, { merge: true });
    mostrarMensagem("Resolução atualizada.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar resolução.", "erro");
  }
}

async function guardarCorApp(value) {
  if (window.AppThemePro) {
    await window.AppThemePro.save({ ...window.AppThemePro.getCachedTheme(), primary: value });
    return;
  }
  const accentColor = normalizarCorApp(value);
  aplicarCorApp(accentColor);
  cacheCorApp(accentColor);
  if (!window.db || !window.db.collection) return;
  try {
    await window.db.collection("config").doc("layout").set({
      accentColor,
      updatedAt: Date.now()
    }, { merge: true });
    mostrarMensagem("Cor da APP atualizada.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar cor da APP.", "erro");
  }
}

async function guardarTemaApp() {
  if (!window.AppThemePro) return guardarCorApp(getCachedCorApp() || APP_DEFAULT_ACCENT);
  try {
    await window.AppThemePro.save(window.AppThemePro.readControls());
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar tema da APP.", "erro");
  }
}

async function reporTemaApp() {
  if (!window.AppThemePro) return guardarCorApp(APP_DEFAULT_ACCENT);
  try {
    await window.AppThemePro.save(window.AppThemePro.PRESETS.autozitania);
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao repor tema da APP.", "erro");
  }
}

async function hashAppPin(pin) {
  const text = String(pin || "");
  if (!text) return "";
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text);
    const hash = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash) + text.charCodeAt(i);
  return `fallback-${Math.abs(hash)}`;
}

function setLockTimeoutInput(value) {
  const select = document.getElementById("appLockTimeout");
  if (select) select.value = String(Math.max(0, Number(value) || 0));
}

function setAuthMethodInput(value) {
  const select = document.getElementById("appAuthMethod");
  if (select) select.value = ["pin", "biometric", "both"].includes(value) ? value : "pin";
}

function getSecurityTokenApp() {
  return appSecurityState.pinHash || appSecurityState.biometricCredentialId || "";
}

function hasSecurityEnabledApp() {
  const method = appSecurityState.authMethod || "pin";
  const pinOk = Boolean(appSecurityState.pinHash && method !== "biometric");
  const bioOk = Boolean(appSecurityState.biometricEnabled && appSecurityState.biometricCredentialId && method !== "pin");
  return pinOk || bioOk;
}

function webAuthnDisponivelApp() {
  return Boolean(window.PublicKeyCredential && navigator.credentials?.create && navigator.credentials?.get && window.crypto?.getRandomValues);
}

function randomBytesApp(length = 32) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

function base64UrlFromBufferApp(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bufferFromBase64UrlApp(value) {
  const padded = String(value || "").replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function renderAppLockOverlayContent(overlay) {
  const canUsePin = Boolean(appSecurityState.pinHash && appSecurityState.authMethod !== "biometric");
  const canUseBio = Boolean(appSecurityState.biometricEnabled && appSecurityState.biometricCredentialId && appSecurityState.authMethod !== "pin");
  overlay.innerHTML = `
    <div class="app-lock-card">
      <div class="brand-badge">BR</div>
      <h2>APP bloqueada</h2>
      <p>${canUseBio ? "Usa Face ID, impressão digital ou o PIN disponível." : "Introduz o PIN para continuar."}</p>
      ${canUseBio ? `<button class="primary-btn biometric-unlock-btn" type="button" onclick="desbloquearAppComBiometria()">Face ID / impressão digital</button>` : ""}
      ${canUsePin ? `<input id="appPinUnlock" type="password" inputmode="numeric" maxlength="12" placeholder="PIN" autocomplete="off">
      <button class="secondary-btn" type="button" onclick="desbloquearAppComPin()">Desbloquear com PIN</button>` : ""}
      <small id="appPinError"></small>
    </div>
  `;
}

function criarAppLockOverlay() {
  let overlay = document.getElementById("appLockOverlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "appLockOverlay";
  overlay.className = "app-lock-overlay";
  document.body.appendChild(overlay);
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Enter") desbloquearAppComPin();
  });
  overlay.addEventListener("input", (event) => {
    if (event.target?.id !== "appPinUnlock") return;
    if (appSecurityState.autoUnlockTimer) clearTimeout(appSecurityState.autoUnlockTimer);
    appSecurityState.autoUnlockTimer = setTimeout(() => tentarDesbloquearPinAutomatico(), 120);
  });
  return overlay;
}

function mostrarBloqueioApp() {
  if (!hasSecurityEnabledApp()) return;
  limparSessaoPinApp();
  const overlay = criarAppLockOverlay();
  renderAppLockOverlayContent(overlay);
  appSecurityState.overlay = overlay;
  appSecurityState.unlocked = false;
  overlay.classList.add("show");
  setTimeout(() => {
    document.getElementById("appPinUnlock")?.focus();
    if (appSecurityState.authMethod === "biometric") desbloquearAppComBiometria();
  }, 120);
}

function esconderBloqueioApp() {
  appSecurityState.overlay?.classList.remove("show");
  appSecurityState.unlocked = true;
  renovarSessaoPinApp();
  reiniciarTemporizadorBloqueioApp();
}

function renovarSessaoPinApp() {
  if (!hasSecurityEnabledApp() || !appSecurityState.unlocked || !appSecurityState.lockTimeoutMinutes) return;
  const until = Date.now() + (appSecurityState.lockTimeoutMinutes * 60000);
  setSessionAppBraga("appPinUnlockedUntil", String(until));
  setSessionAppBraga("appPinHash", getSecurityTokenApp());
}

function sessaoPinAindaValida() {
  const savedHash = getSessionAppBraga("appPinHash");
  const sessionUntil = Number(getSessionAppBraga("appPinUnlockedUntil") || 0);
  const until = sessionUntil;
  const token = getSecurityTokenApp();
  return Boolean(until && until > Date.now() && (!savedHash || savedHash === token));
}

function limparSessaoPinApp() {
  deleteCookieAppBraga("appPinUnlockedUntil");
  deleteSessionAppBraga("appPinUnlockedUntil");
  deleteSessionAppBraga("appPinHash");
}

function reiniciarTemporizadorBloqueioApp() {
  if (appSecurityState.timer) clearTimeout(appSecurityState.timer);
  appSecurityState.timer = null;
  if (!appSecurityState.pinHash || !appSecurityState.unlocked || !appSecurityState.lockTimeoutMinutes) return;
  renovarSessaoPinApp();
  appSecurityState.timer = setTimeout(() => mostrarBloqueioApp(), appSecurityState.lockTimeoutMinutes * 60000);
}

function aplicarSegurancaApp(pinHash, lockTimeoutMinutes, pinLength = 0, authMethod = "pin", biometricEnabled = false, biometricCredentialId = "") {
  const previousToken = getSecurityTokenApp();
  appSecurityState.pinHash = String(pinHash || "");
  appSecurityState.pinLength = Math.max(0, Number(pinLength) || 0);
  appSecurityState.authMethod = ["pin", "biometric", "both"].includes(authMethod) ? authMethod : "pin";
  appSecurityState.biometricEnabled = Boolean(biometricEnabled);
  appSecurityState.biometricCredentialId = String(biometricCredentialId || "");
  appSecurityState.lockTimeoutMinutes = Math.max(0, Number(lockTimeoutMinutes) || 0);
  setLockTimeoutInput(appSecurityState.lockTimeoutMinutes);
  setAuthMethodInput(appSecurityState.authMethod);
  if (!hasSecurityEnabledApp()) {
    appSecurityState.unlocked = true;
    limparSessaoPinApp();
    esconderBloqueioApp();
    return;
  }
  if (!appSecurityState.lockTimeoutMinutes) {
    appSecurityState.unlocked = true;
    limparSessaoPinApp();
    esconderBloqueioApp();
    return;
  }
  if (previousToken !== getSecurityTokenApp() || !appSecurityState.unlocked) {
    appSecurityState.unlocked = sessaoPinAindaValida();
  }
  if (!appSecurityState.unlocked) mostrarBloqueioApp();
  reiniciarTemporizadorBloqueioApp();
}

function initAppSecurityActivity() {
  if (window.__appSecurityActivityBound) return;
  window.__appSecurityActivityBound = true;
  ["click", "keydown", "touchstart", "mousemove", "scroll"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (!appSecurityState.overlay?.classList.contains("show")) reiniciarTemporizadorBloqueioApp();
    }, { passive: true });
  });
}

async function desbloquearAppComPin() {
  const input = document.getElementById("appPinUnlock");
  const error = document.getElementById("appPinError");
  const pin = input?.value || "";
  if (!pin) {
    if (error) error.textContent = "Escreve o PIN.";
    return;
  }
  const hash = await hashAppPin(pin);
  if (hash !== appSecurityState.pinHash) {
    if (error) error.textContent = "PIN incorreto.";
    if (input) input.value = "";
    return;
  }
  if (error) error.textContent = "";
  if (input) input.value = "";
  esconderBloqueioApp();
}

async function tentarDesbloquearPinAutomatico() {
  const input = document.getElementById("appPinUnlock");
  const pin = input?.value || "";
  if (!appSecurityState.pinHash || pin.length < 1) return;
  if (appSecurityState.pinLength && pin.length < appSecurityState.pinLength) return;
  const hash = await hashAppPin(pin);
  if (hash !== appSecurityState.pinHash) return;
  const error = document.getElementById("appPinError");
  if (error) error.textContent = "";
  if (input) input.value = "";
  esconderBloqueioApp();
}

async function ativarBiometriaApp() {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  if (!webAuthnDisponivelApp()) return mostrarMensagem("Este dispositivo não suporta Face ID / fingerprint nesta app.", "erro");
  try {
    const userId = randomBytesApp(16);
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: randomBytesApp(32),
        rp: { name: "App Braga" },
        user: {
          id: userId,
          name: "admin@appbraga.pt",
          displayName: "Administrador"
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred"
        },
        timeout: 60000,
        attestation: "none"
      }
    });
    if (!credential?.rawId) return mostrarMensagem("Não foi possível ativar biometria.", "erro");
    const biometricCredentialId = base64UrlFromBufferApp(credential.rawId);
    await window.db.collection("config").doc("layout").set({
      biometricEnabled: true,
      biometricCredentialId,
      biometricLabel: "Face ID / impressão digital",
      authMethod: document.getElementById("appAuthMethod")?.value || "both",
      updatedAt: Date.now()
    }, { merge: true });
    mostrarMensagem("Face ID / fingerprint ativado neste dispositivo.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Ativação biométrica cancelada ou indisponível.", "erro");
  }
}

async function desbloquearAppComBiometria() {
  if (!webAuthnDisponivelApp()) return mostrarMensagem("Biometria indisponível neste dispositivo.", "erro");
  if (!appSecurityState.biometricCredentialId) return mostrarMensagem("Ativa primeiro a biometria nas Configurações.", "erro");
  try {
    await navigator.credentials.get({
      publicKey: {
        challenge: randomBytesApp(32),
        allowCredentials: [{
          type: "public-key",
          id: bufferFromBase64UrlApp(appSecurityState.biometricCredentialId)
        }],
        userVerification: "required",
        timeout: 60000
      }
    });
    esconderBloqueioApp();
  } catch (error) {
    console.error(error);
    const message = document.getElementById("appPinError");
    if (message) message.textContent = "Face ID / fingerprint cancelado.";
  }
}

async function guardarMetodoEntradaApp(value) {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  const authMethod = ["pin", "biometric", "both"].includes(value) ? value : "pin";
  if (authMethod === "biometric" && !appSecurityState.biometricCredentialId) {
    setAuthMethodInput(appSecurityState.authMethod);
    return mostrarMensagem("Ativa primeiro Face ID / fingerprint neste dispositivo.", "erro");
  }
  try {
    await window.db.collection("config").doc("layout").set({
      authMethod,
      updatedAt: Date.now()
    }, { merge: true });
    appSecurityState.authMethod = authMethod;
    mostrarMensagem("Método de entrada atualizado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar método de entrada.", "erro");
  }
}

async function removerBiometriaApp() {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  if (!window.confirm("Remover Face ID / fingerprint desta APP?")) return;
  try {
    await window.db.collection("config").doc("layout").set({
      biometricEnabled: false,
      biometricCredentialId: "",
      authMethod: appSecurityState.pinHash ? "pin" : "pin",
      updatedAt: Date.now()
    }, { merge: true });
    limparSessaoPinApp();
    mostrarMensagem("Biometria removida.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao remover biometria.", "erro");
  }
}

async function guardarPinApp() {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  const input = document.getElementById("appPinCode");
  const pin = input?.value.trim() || "";
  if (!pin) return mostrarMensagem("Escreve um PIN novo antes de guardar.", "erro");
  const pinHash = await hashAppPin(pin);
  const pinLength = pin.length;
  const lockTimeoutMinutes = Math.max(0, Number(document.getElementById("appLockTimeout")?.value || appSecurityState.lockTimeoutMinutes) || 0);
  try {
    await window.db.collection("config").doc("layout").set({
      pinHash,
      pinLength,
      lockTimeoutMinutes,
      updatedAt: Date.now()
    }, { merge: true });
    if (input) input.value = "";
    mostrarMensagem("PIN da APP atualizado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar PIN.", "erro");
  }
}

async function guardarTempoBloqueioApp(value) {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  const lockTimeoutMinutes = Math.max(0, Number(value) || 0);
  try {
    await window.db.collection("config").doc("layout").set({
      lockTimeoutMinutes,
      updatedAt: Date.now()
    }, { merge: true });
    aplicarSegurancaApp(appSecurityState.pinHash, lockTimeoutMinutes, appSecurityState.pinLength, appSecurityState.authMethod, appSecurityState.biometricEnabled, appSecurityState.biometricCredentialId);
    mostrarMensagem("Tempo de bloqueio atualizado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar tempo de bloqueio.", "erro");
  }
}

async function removerPinApp() {
  if (!window.db || !window.db.collection) return mostrarMensagem("Firebase indisponível.", "erro");
  if (!window.confirm("Remover o PIN de bloqueio da APP?")) return;
  try {
    await window.db.collection("config").doc("layout").set({
      pinHash: "",
      pinLength: 0,
      lockTimeoutMinutes: 0,
      authMethod: appSecurityState.biometricCredentialId ? "biometric" : "pin",
      updatedAt: Date.now()
    }, { merge: true });
    limparSessaoPinApp();
    aplicarSegurancaApp("", 0);
    mostrarMensagem("PIN removido.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao remover PIN.", "erro");
  }
}

function bloquearAppAgora() {
  if (!appSecurityState.pinHash) return mostrarMensagem("Define um PIN primeiro.", "erro");
  mostrarBloqueioApp();
}

document.addEventListener("DOMContentLoaded", initAppSecurityActivity);

function setHealthStatus(id, label, state = "ok") {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = label;
  node.className = `health-status ${state}`;
}

async function verificarSistemasApp() {
  if (!document.getElementById("systemHealthGrid")) return;
  setHealthStatus("healthNetwork", navigator.onLine ? "Online" : "Offline", navigator.onLine ? "ok" : "bad");
  setHealthStatus("healthDevice", window.appBragaDeviceType || (document.body.classList.contains("device-phone") ? "Telemóvel" : (document.body.classList.contains("device-tablet") ? "Tablet" : "PC")), "ok");
  setHealthStatus("healthPin", appSecurityState.biometricEnabled ? "Biometria ativa" : (appSecurityState.pinHash ? "PIN ativo" : "Desligado"), hasSecurityEnabledApp() ? "ok" : "warn");
  const notifyPermission = notificationPermissionApp();
  const notifyOk = notifyPermission === "granted" || notifyPermission === "electron";
  setHealthStatus("healthNotifications", notifyOk ? "Ativas" : (notifyPermission === "unsupported" ? "Sem suporte" : "Sem permissao"), notifyOk ? "ok" : "warn");
  setHealthStatus("healthFirebase", window.firebase ? "Carregado" : "Indisponível", window.firebase ? "ok" : "bad");
  setHealthStatus("healthAuth", window.firebase?.auth ? "Carregado" : "Indisponível", window.firebase?.auth ? "ok" : "warn");

  if (!window.db || typeof window.db.collection !== "function") {
    setHealthStatus("healthFirestore", "Indisponível", "bad");
    return;
  }

  setHealthStatus("healthFirestore", "A testar", "warn");
  try {
    await window.db.collection("config").doc("layout").get();
    setHealthStatus("healthFirestore", "Realtime OK", "ok");
  } catch (error) {
    console.error("Erro no diagnóstico Firestore:", error);
    setHealthStatus("healthFirestore", "Erro", "bad");
  }
}

document.addEventListener("DOMContentLoaded", () => setTimeout(verificarSistemasApp, 900));

function initFullScreenScroll() {
  if (window.__appBragaFullScrollBound) return;
  window.__appBragaFullScrollBound = true;

  const forwardWheelToPage = (event) => {
    const modalOpen = document.querySelector('.modal-overlay[style*="flex"], .modal-overlay.show');
    if (modalOpen && modalOpen.contains(event.target)) return;

    const interactive = event.target.closest("input, textarea, select, option");
    if (interactive) return;

    const fixedZone = event.target.closest(".sidebar, .app-menu-toggle, .app-sidebar-overlay");
    if (!fixedZone) return;

    event.preventDefault();
    window.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: "auto"
    });
  };

  document.addEventListener("wheel", forwardWheelToPage, { passive: false, capture: true });
}

document.addEventListener("DOMContentLoaded", initFullScreenScroll);

function initDeviceViewportMode() {
  const apply = () => {
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    const height = window.innerHeight || document.documentElement.clientHeight || 0;
    const ua = navigator.userAgent || "";

    const isAndroid = /Android/i.test(ua);
    const isIosPhone = /iPhone|iPod/i.test(ua);
    const isIpad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const hasTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

    const minSide = Math.min(width, height);
    const maxSide = Math.max(width, height);

    /*
      Android tablets em Chrome/Samsung/desktop mode podem ter largura > 1400px.
      Antes a APP marcava isso como PC.
      Agora:
      - Android + touch + ecrã grande = tablet
      - iPad = tablet
      - telemóveis continuam phone
      - só é PC quando NÃO é Android/iPad touch tablet
    */
    const isPhone =
      isIosPhone ||
      (isAndroid && minSide < 700) ||
      width <= 760;

    const isAndroidTablet =
      isAndroid && hasTouch && minSide >= 700;

    const isTablet =
      isIpad ||
      isAndroidTablet ||
      (!isPhone && hasTouch && minSide >= 700 && maxSide <= 1800) ||
      (width > 760 && width <= 1400);

    const isDesktop =
      !isPhone && !isTablet;

    document.documentElement.style.setProperty("--app-vh", `${height * 0.01}px`);

    document.body.classList.toggle("device-phone", isPhone);
    document.body.classList.toggle("device-tablet", isTablet);
    document.body.classList.toggle("device-desktop", isDesktop);

    document.body.classList.toggle("tablet-portrait", isTablet && height >= width);
    document.body.classList.toggle("tablet-landscape", isTablet && width > height);

    document.body.classList.toggle("is-ios", isIosPhone || isIpad);
    document.body.classList.toggle("is-android", isAndroid);
    document.body.classList.toggle("is-android-tablet", isAndroidTablet);
    document.body.classList.toggle("is-ipad", isIpad);

    window.appBragaDeviceType = isPhone
      ? (isAndroid ? "Android Telemóvel" : "iPhone/Telemóvel")
      : (isAndroidTablet ? "Tablet Android" : (isIpad ? "iPad" : (isTablet ? "Tablet" : "PC")));
  };

  apply();
  window.addEventListener("resize", apply, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(apply, 250), { passive: true });
}

document.addEventListener("DOMContentLoaded", initDeviceViewportMode);

let radiosData = [];
let radioEditId = null;
let unsubscribeRadios = null;
let radioUsersData = [];
let radioWeeklyRecords = [];
let radioWeeklyEditId = null;
let unsubscribeRadioUsers = null;
let unsubscribeRadioWeekly = null;
let informacoesData = [];
let informacaoSelecionada = null;
let unsubscribeInformacoes = null;

function nowPt() {
  return new Date().toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function safeRefHtml(value) {
  if (typeof escapeHtmlAppBraga === "function") return escapeHtmlAppBraga(value);
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[char] || char));
}

function getRadioWeekInfo(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  const start = new Date(date);
  const currentDay = start.getDay() || 7;
  start.setDate(start.getDate() - currentDay + 1);
  start.setHours(0, 0, 0, 0);
  const endDate = new Date(start);
  endDate.setDate(start.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  const fmt = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  return {
    year: start.getFullYear(),
    week,
    start,
    end: endDate,
    key: `${start.getFullYear()}-W${String(week).padStart(2, "0")}`,
    label: `Semana ${week} de ${fmt.format(start)} a ${fmt.format(endDate)}`
  };
}

function radioUserLabel(user) {
  return user?.nome || user?.user_pc_eye || user?.email_bragalis || user?.user_mo365 || "User sem nome";
}

function radioUserId(user) {
  return user?.id || user?.firebaseId || user?.idDoc || user?._ref || radioUserLabel(user);
}

function radioCssEscape(value) {
  const text = String(value || "");
  return window.CSS && typeof window.CSS.escape === "function" ? window.CSS.escape(text) : text.replace(/"/g, '\\"');
}

function getRadioWeeklyRecord(weekKey = getRadioWeekInfo().key) {
  return getSortedRadioWeeklyRecords().find(item => item.weekKey === weekKey) || null;
}

function getSortedRadioWeeklyRecords() {
  return [...radioWeeklyRecords].sort((a, b) => {
    const ad = Number(a.createdAt || a.updatedAt || a.startAt || 0);
    const bd = Number(b.createdAt || b.updatedAt || b.startAt || 0);
    if (ad !== bd) return bd - ad;
    return String(b.weekKey || "").localeCompare(String(a.weekKey || ""), "pt", { numeric: true });
  });
}

function getRadioWeeklyRecordId(record) {
  return record?.recordId || record?.id || record?.weekKey || "REG";
}

function getRadiosFiltrados() {
  const search = normalizarTexto(document.getElementById("radioSearch")?.value || "");
  return radiosData.filter((item) => {
    const text = `${item.nome || ""} ${item.mac || ""} ${item.serial || ""}`;
    return !search || normalizarTexto(text).includes(search);
  });
}

function appAssetPath(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  const isHtmlPage = /\/html\//i.test(window.location.pathname || "");
  return `${isHtmlPage ? "../" : ""}${clean}`;
}

function getRadioImageSource(radio = {}) {
  return radio.imagem || radio.imageUrl || radio.foto || radio.photoUrl || appAssetPath("img/motorola-tlk25-radio.webp");
}

function radioDeviceImageHtml(radio = {}) {
  const serial = String(radio.serial || radio.nome || "Radio").trim();
  return `<img class="radio-device-img" src="${safeRefHtml(getRadioImageSource(radio))}" alt="${safeRefHtml(serial)}" loading="lazy">`;
}

function radioCurrentUserName(radio = {}) {
  return radio.userNome || radio.user || radio.utilizador || radio.operadorAtual || "";
}

function radioSearchText(item = {}) {
  return normalizarTexto([
    item.nome,
    item.mac,
    item.serial,
    item.numeroSerie,
    item.sn,
    item.userNome,
    item.user,
    item.utilizador,
    item.operadorAtual
  ].join(" "));
}

function renderRadios() {
  const listaNode = document.getElementById("listaRadios");
  const totalNode = document.getElementById("radiosTotal");
  const semanaNode = document.getElementById("radioSemanaLabel");
  const detalheNode = document.getElementById("radioDetalhesLista");
  const resumoNode = document.getElementById("radioWeeklySummary");
  if (!listaNode) return;

  const search = normalizarTexto(document.getElementById("radioSearch")?.value || "");
  const lista = radiosData
    .filter((item) => !search || radioSearchText(item).includes(search))
    .slice()
    .sort((a, b) => String(a.nome || a.serial || a.mac || "").localeCompare(String(b.nome || b.serial || b.mac || ""), "pt", { numeric: true, sensitivity: "base" }));

  const weekInfo = getRadioWeekInfo();
  const records = getSortedRadioWeeklyRecords();

  if (totalNode) totalNode.textContent = String(radiosData.length);
  if (semanaNode) semanaNode.textContent = records.length
    ? `${records.length} registo${records.length === 1 ? "" : "s"} semanal${records.length === 1 ? "" : "is"} guardado${records.length === 1 ? "" : "s"}`
    : weekInfo.label;

  listaNode.innerHTML = lista.length ? lista.map((item) => {
    const currentUser = radioCurrentUserName(item);
    const assigned = !!currentUser;
    const assignedAt = item.atribuidoAt ? new Date(Number(item.atribuidoAt)).toLocaleString("pt-PT") : "";
    return `
    <article class="radio-card" data-radio-id="${safeRefHtml(item.id)}" onclick="atualizarRadioSelecionado('${safeRefHtml(item.id)}')">
      <div class="radio-card-icon">${radioDeviceImageHtml(item)}</div>
      <div class="radio-card-main">
        <strong>${safeRefHtml(item.nome || "Sem nome")}</strong>
        <small>MAC ${safeRefHtml(item.mac || "-")} · Série ${safeRefHtml(item.serial || item.numeroSerie || "-")}</small>
        <div class="radio-status-pill ${assigned ? "assigned" : "available"}">${assigned ? "Atribuído" : "Disponível"}</div>
        <div class="radio-card-user">${assigned ? `User: ${safeRefHtml(currentUser)}` : "Sem user atribuído"}</div>
        ${assignedAt ? `<small>Atribuído em ${safeRefHtml(assignedAt)}</small>` : ""}
      </div>

    </article>
  `;
  }).join("") : `<div class="reference-empty">Sem rádios registados na Firestore.</div>`;

  if (resumoNode) {
    resumoNode.innerHTML = records.length ? records.map((record) => {
      const assignments = Array.isArray(record.assignments) ? record.assignments : [];
      const usedCount = assignments.filter(item => item.userNome || item.userId).length;
      const recordId = getRadioWeeklyRecordId(record);
      return `
      <div class="weekly-radio-row compact radio-record-row">
        <div>
          <strong>${safeRefHtml(recordId)}</strong>
          <span>${safeRefHtml(record.label || "Semana sem intervalo")}</span>
          <small>${usedCount}/${assignments.length} rádios com user associado</small>
        </div>
        <div class="weekly-record-actions">
          <button class="secondary-btn reference-outline" type="button" onclick="abrirRelatorioRadios('${safeRefHtml(record.id)}')">Ver mais</button>
          <button class="secondary-btn" type="button" onclick="abrirEditarRegistoSemanalRadios('${safeRefHtml(record.id)}')">Editar</button>
          <button class="secondary-btn danger" type="button" onclick="apagarRegistoSemanalRadios('${safeRefHtml(record.id)}')">Apagar</button>
        </div>
      </div>
    `;
    }).join("") : `<div class="reference-empty">Ainda não existem registos semanais.</div>`;
  }

  if (detalheNode) {
    detalheNode.innerHTML = `<div class="reference-empty">Escolhe um registo e clica em Ver mais.</div>`;
  }

  atualizarRadioSelectOptions();
  atualizarRadioSelecionado(radioSelectedId);
}

function initRadiosPage() {
  if (!document.getElementById("listaRadios")) return;
  const dbRef = window.db;
  if (!dbRef || typeof dbRef.collection !== "function") {
    const listaNode = document.getElementById("listaRadios");
    if (listaNode) listaNode.innerHTML = `<div class="reference-empty">Firebase indisponível. Confirma a ligação da app.</div>`;
    return;
  }

  if (unsubscribeRadios) unsubscribeRadios();
  unsubscribeRadios = dbRef.collection("radios").onSnapshot((snapshot) => {
    radiosData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    radiosData.sort((a, b) => String(a.nome || a.serial || a.mac || "").localeCompare(String(b.nome || b.serial || b.mac || ""), "pt", { numeric: true, sensitivity: "base" }));
    renderRadios();
  }, (error) => {
    console.error("Erro realtime radios:", error);
    const listaNode = document.getElementById("listaRadios");
    if (listaNode) listaNode.innerHTML = `<div class="reference-empty">Erro ao carregar rádios da Firestore.</div>`;
  });


  if (unsubscribeRadioUsers) unsubscribeRadioUsers();
  unsubscribeRadioUsers = dbRef.collection("users").onSnapshot((snapshot) => {
    radioUsersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    radioUsersData.sort((a, b) => radioUserLabel(a).localeCompare(radioUserLabel(b), "pt", { numeric: true, sensitivity: "base" }));
    window.usersData = radioUsersData;
    renderRadioWeeklyForm();
  }, (error) => console.error("Erro realtime users para radios:", error));

  if (unsubscribeRadioWeekly) unsubscribeRadioWeekly();
  unsubscribeRadioWeekly = dbRef.collection("radioWeeklyRecords").onSnapshot((snapshot) => {
    radioWeeklyRecords = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderRadios();
    renderRadioWeeklyForm();
  }, (error) => console.error("Erro realtime radioWeeklyRecords:", error));
}

function adicionarRadio() {
  abrirModalRadio();
}

function abrirModalRadio(id = null) {
  radioEditId = id;
  const item = id ? radiosData.find((radio) => radio.id === id) : null;
  const title = document.getElementById("radioModalTitle");
  const nome = document.getElementById("radioNome");
  const mac = document.getElementById("radioMac");
  const serial = document.getElementById("radioSerial");
  if (title) title.textContent = id ? "Editar Rádio" : "Novo Rádio";
  if (nome) nome.value = item?.nome || "";
  if (mac) mac.value = item?.mac || "";
  if (serial) serial.value = item?.serial || "";
  const modal = document.getElementById("radioModal");
  if (modal) modal.style.display = "flex";
}

function fecharModalRadio() {
  radioEditId = null;
  const modal = document.getElementById("radioModal");
  if (modal) modal.style.display = "none";
}

async function guardarRadio() {
  const nome = document.getElementById("radioNome")?.value.trim() || "";
  const mac = document.getElementById("radioMac")?.value.trim() || "";
  const serial = document.getElementById("radioSerial")?.value.trim() || "";
  if (!nome) {
    mostrarMensagem("Preenche o nome do rádio.", "erro");
    return;
  }

  const payload = { nome, mac, serial, updatedAt: Date.now() };

  try {
    if (radioEditId) {
      await window.db.collection("radios").doc(radioEditId).update(payload);
      mostrarMensagem("Rádio atualizado.");
    } else {
      await window.db.collection("radios").add({ ...payload, createdAt: Date.now() });
      mostrarMensagem("Rádio criado.");
    }
    fecharModalRadio();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar rádio.", "erro");
  }
}

function editarRadio(id) {
  abrirModalRadio(id);
}

async function apagarRadio(id) {
  try {
    await window.db.collection("radios").doc(id).delete();
    mostrarMensagem("Rádio apagado.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar rádio.", "erro");
  }
}

function filtrarRadios() {
  renderRadios();
}

function renderRadioWeeklyRecordDetails(recordId) {
  const detalheNode = document.getElementById("radioDetalhesLista");
  if (!detalheNode) return;
  const record = radioWeeklyRecords.find(item => item.id === recordId || item.recordId === recordId);
  if (!record) {
    detalheNode.innerHTML = `<div class="reference-empty">Registo não encontrado.</div>`;
    return;
  }

  const assignments = Array.isArray(record.assignments) ? record.assignments : [];
  detalheNode.innerHTML = `
    <div class="weekly-radio-row compact radio-record-row">
      <div>
        <strong>${safeRefHtml(getRadioWeeklyRecordId(record))}</strong>
        <span>${safeRefHtml(record.label || "Semana sem intervalo")}</span>
        <small>Registo criado em ${safeRefHtml(record.createdLabel || record.updatedLabel || "-")}</small>
      </div>
    </div>
    ${assignments.length ? assignments.map((item) => {
      const user1 = item.user1Nome || item.userNome || "";
      const user2 = item.user2Nome || "";
      const piso = item.piso || "Nenhum";
      return `
      <div class="weekly-radio-row">
        <strong>${safeRefHtml(item.radioNome || "Rádio")}</strong>
        <span>User 1: ${safeRefHtml(user1 || "Sem user selecionado")}</span>
        <span>User 2: ${safeRefHtml(user2 || "Sem user selecionado")}</span>
        <span>Piso: ${safeRefHtml(piso)}</span>
        <small>MAC ${safeRefHtml(item.radioMac || "-")} | Serial ${safeRefHtml(item.radioSerial || "-")}</small>
      </div>
    `;
    }).join("") : `<div class="reference-empty">Este registo não tem rádios associados.</div>`}
  `;
}

function abrirRelatorioRadios(recordId = null) {
  if (recordId) renderRadioWeeklyRecordDetails(recordId);
  const modal = document.getElementById("radioWeeklyModal");
  if (modal) modal.style.display = "flex";
}

function fecharRelatorioRadios() {
  const modal = document.getElementById("radioWeeklyModal");
  if (modal) modal.style.display = "none";
}

function setRadioWeeklyDateDefault() {
  const input = document.getElementById("radioWeeklyDate");
  if (!input || input.value) return;
  input.valueAsDate = new Date();
}

function setRadioWeeklyDateFromTimestamp(timestamp) {
  const input = document.getElementById("radioWeeklyDate");
  if (!input || !timestamp) return;
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return;
  input.value = date.toISOString().slice(0, 10);
}

function getRadioWeeklySelectedInfo() {
  const input = document.getElementById("radioWeeklyDate");
  const date = input?.value ? new Date(`${input.value}T12:00:00`) : new Date();
  return getRadioWeekInfo(date);
}

function renderRadioWeeklyForm() {
  const rows = document.getElementById("radioWeeklyRows");
  if (!rows) return;
  const label = document.getElementById("radioWeeklyRecordLabel");
  const editRecord = radioWeeklyEditId ? radioWeeklyRecords.find(item => item.id === radioWeeklyEditId || item.recordId === radioWeeklyEditId) : null;
  const weekInfo = editRecord ? getRadioWeekInfo(new Date(Number(editRecord.startAt || Date.now()))) : getRadioWeeklySelectedInfo();
  const record = editRecord || getRadioWeeklyRecord(weekInfo.key);
  const saved = Array.isArray(record?.assignments) ? record.assignments : [];
  if (label) label.textContent = editRecord ? `${getRadioWeeklyRecordId(editRecord)} · ${weekInfo.label}` : weekInfo.label;

  const users = (radioUsersData.length ? radioUsersData : window.usersData || [])
    .slice()
    .sort((a, b) => radioUserLabel(a).localeCompare(radioUserLabel(b), "pt", { sensitivity: "base" }));

  const pisoOptions = ["Nenhum", "Piso 0", "Piso 1", "Piso 2"];

  function buildUserOptions(selectedId = "") {
    return [
      `<option value="">Sem user</option>`,
      ...users.map(user => {
        const userId = radioUserId(user);
        const selected = String(selectedId || "") === String(userId) ? " selected" : "";
        return `<option value="${safeRefHtml(userId)}"${selected}>${safeRefHtml(radioUserLabel(user))}</option>`;
      })
    ].join("");
  }

  rows.innerHTML = radiosData.length ? radiosData.map((radio) => {
    const current = saved.find(item => item.radioId === radio.id) || {};
    const user1Id = current.user1Id || current.userId || "";
    const user2Id = current.user2Id || "";
    const pisoAtual = current.piso || "Nenhum";
    const pisoSelect = pisoOptions.map((piso) => {
      const selected = pisoAtual === piso ? " selected" : "";
      return `<option value="${safeRefHtml(piso)}"${selected}>${safeRefHtml(piso)}</option>`;
    }).join("");

    return `
      <div class="radio-week-row radio-week-row-v2" data-radio-id="${safeRefHtml(radio.id)}">
        <div class="radio-week-device">
          <strong>${safeRefHtml(radio.nome || "Sem nome")}</strong>
          <span>MAC ${safeRefHtml(radio.mac || "-")} | Serial ${safeRefHtml(radio.serial || "-")}</span>
        </div>
        <label><span>User 1</span><select data-radio-user1="${safeRefHtml(radio.id)}">${buildUserOptions(user1Id)}</select></label>
        <label><span>User 2</span><select data-radio-user2="${safeRefHtml(radio.id)}">${buildUserOptions(user2Id)}</select></label>
        <label><span>Piso</span><select data-radio-piso="${safeRefHtml(radio.id)}">${pisoSelect}</select></label>
      </div>
    `;
  }).join("") : `<div class="reference-empty">Cria rádios primeiro para conseguires fazer o registo semanal.</div>`;
}

function abrirRegistoSemanalRadios() {
  radioWeeklyEditId = null;
  const title = document.getElementById("radioWeeklyModalTitle");
  if (title) title.textContent = "Novo registo semanal";
  const input = document.getElementById("radioWeeklyDate");
  if (input) input.valueAsDate = new Date();
  setRadioWeeklyDateDefault();
  renderRadioWeeklyForm();
  const modal = document.getElementById("radioWeeklyRecordModal");
  if (modal) modal.style.display = "flex";
}

function abrirEditarRegistoSemanalRadios(recordId) {
  const record = radioWeeklyRecords.find(item => item.id === recordId || item.recordId === recordId);
  if (!record) return mostrarMensagem("Registo semanal não encontrado.", "erro");
  radioWeeklyEditId = record.id;
  const title = document.getElementById("radioWeeklyModalTitle");
  if (title) title.textContent = `Editar ${getRadioWeeklyRecordId(record)}`;
  setRadioWeeklyDateFromTimestamp(record.startAt);
  renderRadioWeeklyForm();
  const modal = document.getElementById("radioWeeklyRecordModal");
  if (modal) modal.style.display = "flex";
}

function fecharRegistoSemanalRadios() {
  radioWeeklyEditId = null;
  const modal = document.getElementById("radioWeeklyRecordModal");
  if (modal) modal.style.display = "none";
}

async function guardarRegistoSemanalRadios() {
  if (!window.db) return mostrarMensagem("Firebase indisponível.", "erro");
  const weekInfo = getRadioWeeklySelectedInfo();
  const users = radioUsersData.length ? radioUsersData : window.usersData || [];
  const assignments = radiosData.map((radio) => {
    const user1Select = document.querySelector(`[data-radio-user1="${radioCssEscape(radio.id)}"]`);
    const user2Select = document.querySelector(`[data-radio-user2="${radioCssEscape(radio.id)}"]`);
    const pisoSelect = document.querySelector(`[data-radio-piso="${radioCssEscape(radio.id)}"]`);

    const user1Id = user1Select?.value || "";
    const user2Id = user2Select?.value || "";
    const user1 = users.find(item => radioUserId(item) === user1Id);
    const user2 = users.find(item => radioUserId(item) === user2Id);
    const piso = pisoSelect?.value || "Nenhum";

    return {
      radioId: radio.id,
      radioNome: radio.nome || "",
      radioMac: radio.mac || "",
      radioSerial: radio.serial || "",

      // Compatibilidade com registos antigos
      userId: user1Id,
      userNome: user1 ? radioUserLabel(user1) : "",

      // Novo sistema semanal
      user1Id,
      user1Nome: user1 ? radioUserLabel(user1) : "",
      user2Id,
      user2Nome: user2 ? radioUserLabel(user2) : "",
      piso
    };
  });

  try {
    const docRef = radioWeeklyEditId
      ? window.db.collection("radioWeeklyRecords").doc(radioWeeklyEditId)
      : window.db.collection("radioWeeklyRecords").doc();
    const existing = radioWeeklyEditId ? radioWeeklyRecords.find(item => item.id === radioWeeklyEditId) : null;
    const recordId = existing?.recordId || `REG-${weekInfo.key}-${docRef.id.slice(-5).toUpperCase()}`;
    const payload = {
      recordId,
      weekKey: weekInfo.key,
      week: weekInfo.week,
      year: weekInfo.year,
      label: weekInfo.label,
      startAt: weekInfo.start.getTime(),
      endAt: weekInfo.end.getTime(),
      assignments,
      updatedAt: Date.now()
    };
    if (!existing) {
      payload.createdAt = Date.now();
      payload.createdLabel = nowPt();
    }
    await docRef.set(payload, { merge: true });
    mostrarMensagem(existing ? "Registo semanal atualizado." : "Registo semanal guardado.");
    fecharRegistoSemanalRadios();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar registo semanal.", "erro");
  }
}

async function apagarRegistoSemanalRadios(recordId) {
  if (!window.db) return mostrarMensagem("Firebase indisponível.", "erro");
  const record = radioWeeklyRecords.find(item => item.id === recordId || item.recordId === recordId);
  if (!record) return mostrarMensagem("Registo semanal não encontrado.", "erro");
  if (!window.confirm(`Apagar ${getRadioWeeklyRecordId(record)}?`)) return;
  try {
    await window.db.collection("radioWeeklyRecords").doc(record.id).delete();
    mostrarMensagem("Registo semanal apagado.");
    renderRadios();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar registo semanal.", "erro");
  }
}

function getInformacoesFiltradas() {
  const pesquisa = normalizarTexto(document.getElementById("pesquisaInfo")?.value || "");
  if (!pesquisa) return informacoesData;
  return informacoesData.filter((item) => {
    const texto = `${item.titulo || ""} ${item.obs || ""}`;
    return normalizarTexto(texto).includes(pesquisa);
  });
}

function renderInformacoes() {
  const lista = document.getElementById("informacoesLista");
  if (!lista) return;
  const listaFiltrada = getInformacoesFiltradas();
  lista.innerHTML = listaFiltrada.length ? listaFiltrada.map(item => `
    <article class="info-list-item ${informacaoSelecionada === item.id ? "active" : ""}">
      <strong>${safeRefHtml(item.titulo || "Sem título")}</strong>
      <span>${safeRefHtml(item.obs || "Sem observações")}</span>
      <div class="meta-line">${safeRefHtml(item.updatedLabel || item.createdLabel || "")}</div>
      <div class="info-card-actions">
        <button class="secondary-btn reference-outline" type="button" onclick="verInformacao('${item.id}')">Ver mais</button>
        <button class="secondary-btn" type="button" onclick="editarInformacao('${item.id}')">Editar</button>
        <button class="secondary-btn danger" type="button" onclick="apagarInformacao('${item.id}')">Apagar</button>
      </div>
    </article>
  `).join("") : `<div class="info-empty">Ainda sem informações guardadas na Firebase.</div>`;
}

function initInformacoesPage() {
  if (!document.getElementById("informacoesLista")) return;
  const pesquisa = document.getElementById("pesquisaInfo");
  if (pesquisa) pesquisa.addEventListener("input", renderInformacoes);

  if (!window.db || typeof window.db.collection !== "function") {
    const lista = document.getElementById("informacoesLista");
    if (lista) lista.innerHTML = `<div class="info-empty">Firebase indisponível. Confirma a ligação da app.</div>`;
    return;
  }

  if (unsubscribeInformacoes) unsubscribeInformacoes();
  unsubscribeInformacoes = window.db.collection("informacoes").onSnapshot((snapshot) => {
    informacoesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    informacoesData.sort((a, b) => {
      const ad = Number(a.updatedAt || a.createdAt || 0);
      const bd = Number(b.updatedAt || b.createdAt || 0);
      if (ad !== bd) return bd - ad;
      return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt", { numeric: true, sensitivity: "base" });
    });
    renderInformacoes();
  }, (error) => {
    console.error("Erro realtime informacoes:", error);
    const lista = document.getElementById("informacoesLista");
    if (lista) lista.innerHTML = `<div class="info-empty">Erro ao carregar informações da Firebase.</div>`;
  });
}

async function adicionarInformacao() {
  const titulo = document.getElementById("infoTitulo")?.value || "";
  const obs = document.getElementById("infoObs")?.value || "";
  if (!normalizarTexto(titulo) && !normalizarTexto(obs)) {
    mostrarMensagem("Preenche pelo menos um título ou observação.", "erro");
    return;
  }

  if (!window.db || typeof window.db.collection !== "function") {
    mostrarMensagem("Firebase indisponível.", "erro");
    return;
  }

  const payload = {
    titulo,
    obs,
    updatedAt: Date.now(),
    updatedLabel: nowPt()
  };

  try {
    if (informacaoSelecionada) {
      await window.db.collection("informacoes").doc(informacaoSelecionada).set(payload, { merge: true });
      mostrarMensagem("Informação atualizada.");
    } else {
      await window.db.collection("informacoes").add({
        ...payload,
        createdAt: Date.now(),
        createdLabel: nowPt()
      });
      mostrarMensagem("Informação criada.");
    }
    document.getElementById("infoTitulo").value = "";
    document.getElementById("infoObs").value = "";
    informacaoSelecionada = null;
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar informação.", "erro");
  }
}

function selecionarInformacao(id) {
  editarInformacao(id);
}

function verInformacao(id) {
  const item = informacoesData.find(info => info.id === id);
  if (!item) return mostrarMensagem("Informação não encontrada.", "erro");
  const modal = document.getElementById("infoModal");
  const titulo = document.getElementById("modalInfoTitulo");
  const descricao = document.getElementById("modalInfoDescricao");
  if (titulo) titulo.textContent = item.titulo || "Informação";
  if (descricao) descricao.textContent = item.obs || "Sem observações";
  if (modal) modal.classList.remove("hidden");
}

function fecharInfoModal() {
  const modal = document.getElementById("infoModal");
  if (modal) modal.classList.add("hidden");
}

function editarInformacao(id) {
  const item = informacoesData.find(info => info.id === id);
  if (!item) return mostrarMensagem("Informação não encontrada.", "erro");
  informacaoSelecionada = id;
  document.getElementById("infoTitulo").value = item.titulo || "";
  document.getElementById("infoObs").value = item.obs || "";
  renderInformacoes();
}

async function apagarInformacao(id) {
  const item = informacoesData.find(info => info.id === id);
  if (!item) return mostrarMensagem("Informação não encontrada.", "erro");
  if (!window.confirm(`Apagar "${item.titulo || "esta informação"}"?`)) return;
  try {
    await window.db.collection("informacoes").doc(id).delete();
    if (informacaoSelecionada === id) {
      informacaoSelecionada = null;
      const titulo = document.getElementById("infoTitulo");
      const obs = document.getElementById("infoObs");
      if (titulo) titulo.value = "";
      if (obs) obs.value = "";
    }
    mostrarMensagem("Informação apagada.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar informação.", "erro");
  }
}

function verInformacaoSelecionada() {
  if (!informacaoSelecionada) return mostrarMensagem("Seleciona uma informação primeiro.", "erro");
  verInformacao(informacaoSelecionada);
}

function editarInformacaoSelecionada() {
  if (!informacaoSelecionada) return mostrarMensagem("Seleciona uma informação primeiro.", "erro");
  editarInformacao(informacaoSelecionada);
}

function apagarInformacaoSelecionada() {
  if (!informacaoSelecionada) return mostrarMensagem("Seleciona uma informação primeiro.", "erro");
  apagarInformacao(informacaoSelecionada);
}

function guardarInformacoes() {
  adicionarInformacao();
}

let radioAssignId = null;
let unsubscribeRadioHistoryOpen = null;

function getRadioById(id) {
  return radiosData.find((radio) => String(radio.id) === String(id));
}

function getRadioUsersList() {
  return (radioUsersData.length ? radioUsersData : (window.usersData || []));
}

function renderRadioAssignUsers(selectedId = "") {
  const select = document.getElementById("radioAssignUser");
  if (!select) return;

  const users = getRadioUsersList()
    .slice()
    .sort((a, b) => radioUserLabel(a).localeCompare(radioUserLabel(b), "pt", { numeric: true, sensitivity: "base" }));

  select.innerHTML = `<option value="">Escolher user...</option>` + users.map((user) => {
    const id = radioUserId(user);
    return `<option value="${safeRefHtml(id)}"${String(id) === String(selectedId) ? " selected" : ""}>${safeRefHtml(radioUserLabel(user))}</option>`;
  }).join("");
}

function abrirAtribuirRadio(id) {
  const radio = getRadioById(id);
  if (!radio) return mostrarMensagem("Rádio não encontrado.", "erro");
  radioAssignId = id;

  const title = document.getElementById("radioAssignTitle");
  if (title) title.textContent = `Atribuir ${radio.nome || "Rádio"}`;

  renderRadioAssignUsers(radio.userId || "");

  const obs = document.getElementById("radioAssignObs");
  if (obs) obs.value = "";

  const modal = document.getElementById("radioAssignModal");
  if (modal) modal.style.display = "flex";
}

function fecharAtribuirRadio() {
  radioAssignId = null;
  const modal = document.getElementById("radioAssignModal");
  if (modal) modal.style.display = "none";
}

async function guardarHistoricoRadio(radio, tipo, extra = {}) {
  if (!window.db?.collection || !radio?.id) return;
  await window.db.collection("radioHistory").add({
    radioId: String(radio.id),
    radioNome: radio.nome || "",
    radioMac: radio.mac || "",
    radioSerial: radio.serial || radio.numeroSerie || "",
    tipo,
    ...extra,
    createdAt: Date.now(),
    createdLabel: nowPt()
  });
}

async function guardarAtribuirRadio() {
  if (!window.db) return mostrarMensagem("Firebase indisponível.", "erro");

  const radio = getRadioById(radioAssignId);
  if (!radio) return mostrarMensagem("Rádio não encontrado.", "erro");

  const userId = document.getElementById("radioAssignUser")?.value || "";
  if (!userId) return mostrarMensagem("Escolhe um user.", "erro");

  const user = getRadioUsersList().find((item) => radioUserId(item) === userId);
  const userNome = user ? radioUserLabel(user) : userId;
  const obs = document.getElementById("radioAssignObs")?.value.trim() || "";

  try {
    await window.db.collection("radios").doc(radio.id).set({
      userId,
      userNome,
      estado: "atribuido",
      atribuidoAt: Date.now(),
      obsAtribuicao: obs,
      updatedAt: Date.now()
    }, { merge: true });

    await guardarHistoricoRadio(radio, "atribuido", { userId, userNome, obs });
    fecharAtribuirRadio();
    mostrarMensagem("Rádio atribuído.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao atribuir rádio.", "erro");
  }
}

async function devolverRadio(id) {
  if (!window.db) return mostrarMensagem("Firebase indisponível.", "erro");

  const radio = getRadioById(id);
  if (!radio) return mostrarMensagem("Rádio não encontrado.", "erro");

  const userNome = radioCurrentUserName(radio);
  if (!userNome && !window.confirm("Este rádio não tem user associado. Marcar como devolvido mesmo assim?")) return;

  try {
    await window.db.collection("radios").doc(radio.id).set({
      userId: "",
      userNome: "",
      user: "",
      utilizador: "",
      operadorAtual: "",
      estado: "disponivel",
      devolvidoAt: Date.now(),
      updatedAt: Date.now()
    }, { merge: true });

    await guardarHistoricoRadio(radio, "devolvido", { userNome, obs: "Devolução manual" });
    mostrarMensagem("Rádio devolvido.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao devolver rádio.", "erro");
  }
}

function abrirHistoricoRadio(id) {
  const radio = getRadioById(id);
  if (!radio) return mostrarMensagem("Rádio não encontrado.", "erro");

  const title = document.getElementById("radioHistoryTitle");
  const list = document.getElementById("radioHistoryList");

  if (title) title.textContent = `Histórico · ${radio.nome || "Rádio"}`;
  if (list) list.innerHTML = `<div class="reference-empty">A carregar histórico...</div>`;

  const modal = document.getElementById("radioHistoryModal");
  if (modal) modal.style.display = "flex";

  if (unsubscribeRadioHistoryOpen) unsubscribeRadioHistoryOpen();

  if (!window.db?.collection) {
    if (list) list.innerHTML = `<div class="reference-empty">Firebase indisponível.</div>`;
    return;
  }

  unsubscribeRadioHistoryOpen = window.db.collection("radioHistory")
    .where("radioId", "==", String(radio.id))
    .onSnapshot((snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      if (!list) return;
      list.innerHTML = items.length ? items.map((item) => `
        <div class="radio-history-item">
          <strong>${safeRefHtml(item.tipo === "atribuido" ? "Atribuído" : item.tipo === "devolvido" ? "Devolvido" : item.tipo || "Evento")}</strong>
          <small>User: ${safeRefHtml(item.userNome || "-")}</small>
          <small>${safeRefHtml(item.createdLabel || (item.createdAt ? new Date(Number(item.createdAt)).toLocaleString("pt-PT") : "-"))}</small>
          ${item.obs ? `<small>Obs: ${safeRefHtml(item.obs)}</small>` : ""}
        </div>
      `).join("") : `<div class="reference-empty">Sem histórico para este rádio.</div>`;
    }, (error) => {
      console.error(error);
      if (list) list.innerHTML = `<div class="reference-empty">Erro ao carregar histórico.</div>`;
    });
}

function fecharHistoricoRadio() {
  if (unsubscribeRadioHistoryOpen) {
    unsubscribeRadioHistoryOpen();
    unsubscribeRadioHistoryOpen = null;
  }
  const modal = document.getElementById("radioHistoryModal");
  if (modal) modal.style.display = "none";
}



let radioSelectedId = "";

function getRadioSelected() {
  return radiosData.find((radio) => String(radio.id) === String(radioSelectedId));
}

function atualizarRadioSelectOptions() {
  const select = document.getElementById("radioSelectedId");
  if (!select) return;

  const current = select.value || radioSelectedId || "";
  const lista = radiosData
    .slice()
    .sort((a, b) => String(a.nome || a.serial || a.mac || "").localeCompare(String(b.nome || b.serial || b.mac || ""), "pt", { numeric: true, sensitivity: "base" }));

  select.innerHTML = `<option value="">Selecionar rádio...</option>` + lista.map((radio) => {
    const label = `${radio.nome || "Rádio"}${radio.mac ? " · " + radio.mac : ""}${radio.serial ? " · " + radio.serial : ""}`;
    return `<option value="${safeRefHtml(radio.id)}"${String(radio.id) === String(current) ? " selected" : ""}>${safeRefHtml(label)}</option>`;
  }).join("");

  if (current && lista.some((radio) => String(radio.id) === String(current))) {
    select.value = current;
    radioSelectedId = current;
  } else if (radioSelectedId && !lista.some((radio) => String(radio.id) === String(radioSelectedId))) {
    radioSelectedId = "";
    select.value = "";
  }
}

function atualizarRadioSelecionado(id = null) {
  const select = document.getElementById("radioSelectedId");

  if (id !== null) {
    radioSelectedId = String(id || "");
    if (select) select.value = radioSelectedId;
  } else {
    radioSelectedId = select?.value || "";
  }

  const radio = getRadioSelected();
  const info = document.getElementById("radioSelectedInfo");

  document.querySelectorAll(".radio-card").forEach((card) => {
    card.classList.toggle("is-selected", String(card.dataset.radioId || "") === String(radioSelectedId));
  });

  if (info) {
    if (!radio) {
      info.textContent = "Seleciona um rádio para mexer.";
    } else {
      const user = radioCurrentUserName(radio);
      info.textContent = `${radio.nome || "Rádio"} · MAC ${radio.mac || "-"} · Série ${radio.serial || radio.numeroSerie || "-"} · ${user ? "User: " + user : "Disponível"}`;
    }
  }
}

function radioAcaoSelecionada(acao) {
  const radio = getRadioSelected();
  if (!radio) {
    mostrarMensagem("Seleciona primeiro um rádio.", "erro");
    return;
  }

  const id = radio.id;

  if (acao === "editar") return editarRadio(id);
  if (acao === "atribuir") return abrirAtribuirRadio(id);
  if (acao === "devolver") return devolverRadio(id);
  if (acao === "historico") return abrirHistoricoRadio(id);
  if (acao === "apagar") return apagarRadio(id);
}


document.addEventListener("DOMContentLoaded", initRadiosPage);
document.addEventListener("DOMContentLoaded", initInformacoesPage);
document.addEventListener("DOMContentLoaded", initResolucaoApp);
document.addEventListener("DOMContentLoaded", initFullscreenPreferidoApp);
window.adicionarRadio = adicionarRadio;
window.editarRadio = editarRadio;
window.guardarRadio = guardarRadio;
window.fecharModalRadio = fecharModalRadio;
window.apagarRadio = apagarRadio;
window.filtrarRadios = filtrarRadios;
window.abrirRelatorioRadios = abrirRelatorioRadios;
window.fecharRelatorioRadios = fecharRelatorioRadios;
window.abrirRegistoSemanalRadios = abrirRegistoSemanalRadios;
window.abrirEditarRegistoSemanalRadios = abrirEditarRegistoSemanalRadios;
window.fecharRegistoSemanalRadios = fecharRegistoSemanalRadios;
window.renderRadioWeeklyForm = renderRadioWeeklyForm;
window.guardarRegistoSemanalRadios = guardarRegistoSemanalRadios;
window.apagarRegistoSemanalRadios = apagarRegistoSemanalRadios;

window.abrirAtribuirRadio = abrirAtribuirRadio;
window.fecharAtribuirRadio = fecharAtribuirRadio;
window.guardarAtribuirRadio = guardarAtribuirRadio;
window.devolverRadio = devolverRadio;
window.abrirHistoricoRadio = abrirHistoricoRadio;
window.fecharHistoricoRadio = fecharHistoricoRadio;

window.atualizarRadioSelecionado = atualizarRadioSelecionado;
window.radioAcaoSelecionada = radioAcaoSelecionada;


window.guardarResolucaoApp = guardarResolucaoApp;
window.guardarCorApp = guardarCorApp;
window.guardarTemaApp = guardarTemaApp;
window.reporTemaApp = reporTemaApp;
window.guardarPinApp = guardarPinApp;
window.guardarTempoBloqueioApp = guardarTempoBloqueioApp;
window.guardarMetodoEntradaApp = guardarMetodoEntradaApp;
window.removerPinApp = removerPinApp;
window.ativarBiometriaApp = ativarBiometriaApp;
window.removerBiometriaApp = removerBiometriaApp;
window.bloquearAppAgora = bloquearAppAgora;
window.desbloquearAppComPin = desbloquearAppComPin;
window.desbloquearAppComBiometria = desbloquearAppComBiometria;
window.entrarFullscreenApp = entrarFullscreenApp;
window.carregarDispositivosNotificacoesApp = carregarDispositivosNotificacoesApp;
window.registarDispositivoPushApp = registarDispositivoPushApp;
window.guardarConfigNotificacoesApp = guardarConfigNotificacoesApp;
window.verificarAlertasNotificacoesApp = verificarAlertasNotificacoesApp;
window.testarNotificacaoApp = testarNotificacaoApp;
window.pedirPermissaoNotificacoesApp = pedirPermissaoNotificacoesApp;
window.verificarSistemasApp = verificarSistemasApp;
window.adicionarInformacao = adicionarInformacao;
window.selecionarInformacao = selecionarInformacao;
window.verInformacao = verInformacao;
window.editarInformacao = editarInformacao;
window.apagarInformacao = apagarInformacao;
window.fecharInfoModal = fecharInfoModal;
window.verInformacaoSelecionada = verInformacaoSelecionada;
window.editarInformacaoSelecionada = editarInformacaoSelecionada;
window.apagarInformacaoSelecionada = apagarInformacaoSelecionada;
window.guardarInformacoes = guardarInformacoes;

function updateEnterpriseDashboard() {
  const totalEquipamentosEl = el("dashTotalEquipamentos");
  if (!totalEquipamentosEl) return;

  const impressorasTotal = Array.isArray(impressorasData) ? impressorasData.length : 0;
  const pcsTotal = Array.isArray(pcsGlobal) ? pcsGlobal.length : 0;
  const pistolasTotal = Array.isArray(window.pistolasData) ? window.pistolasData.length : 0;
  const portasTotal = Array.isArray(window.portasData) ? window.portasData.length : 0;
  const stockTotal = Array.isArray(stockGlobal) ? stockGlobal.length : 0;
  const ticketsAbertos = Array.isArray(manutencoesGlobal)
    ? manutencoesGlobal.filter(item => item.estado === "Pendente" || item.estado === "Em reparação").length
    : 0;
  const impressorasOk = Array.isArray(impressorasData)
    ? impressorasData.filter(item => obterEstadoImpressora(item.ip) === "OK").length
    : 0;
  const totalEquipamentos = impressorasTotal + pcsTotal + pistolasTotal + portasTotal;

  setText("dashTotalEquipamentos", totalEquipamentos);
  setText("dashStockTotal", stockTotal);
  setText("dashTicketsAbertos", ticketsAbertos);
  setText("dashImpressorasOk", impressorasOk);
  setText("dashDonutTotal", totalEquipamentos);
}

/* =========================
   INIT
========================= */
window.addEventListener("DOMContentLoaded", () => {
  if (el("historicoImpressoraPanel") && impressorasData && impressorasData.length) { abrirHistoricoImpressora(impressorasData[0]); }
  initGlobalTheme();

  carregarChecklist();
  carregarEdicaoToner();
  ensureLoteFieldOnEdit();
  tryRenderAppBraga(renderStockMinimoConfig);
  tryRenderAppBraga(renderStockMinimoPainel);
  tryRenderAppBraga(renderAlertasInteligentes);
  tryRenderAppBraga(() => enhanceScannerStatus("Leitura pronta."));
  preencherLocaisManutencao();
  preencherFormularioManutencao();

  carregarImpressorasLocal();
  renderImpressoras();
  renderManutencoes(manutencoesGlobal);
  carregarPistolasLocal();
  carregarPortasLocal();
  renderPistolas();
  renderPortas();
  carregarUsersLocal();
  renderUsers();

  if (el("manutencaoSerie")) {
    el("manutencaoSerie").addEventListener("change", sincronizarCamposImpressora);
  }

  if (el("manutencaoIP")) {
    el("manutencaoIP").addEventListener("change", sincronizarCamposImpressora);
  }

  const estaNaPaginaImpressoras = !!el("impressorasTableBody");
  const estaNoDashboard = !!el("listaDashboardStock") || !!el("searchDashboard");

  if (estaNaPaginaImpressoras || estaNoDashboard) {
    setTimeout(() => {
      testarTodasAsImpressoras();
    }, 600);

    setInterval(() => {
      testarTodasAsImpressoras();
    }, 60000);
  }

});

/* =========================
   TABLET / FIREBASE COMPLETO
========================= */
const printerFirebaseState = {};
const printerFirebaseSyncState = {};

function normalizePrinterIp(ip) {
  return String(ip || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function hasUsablePrinterInfo(info) {
  if (!info) return false;
  if (Array.isArray(info.colors) && info.colors.length) return true;
  if (info.residue && typeof info.residue.percent === "number") return true;
  return typeof info.percent === "number";
}

function buildPrinterFirebasePayload(ip, info) {
  const payload = {
    ip: normalizePrinterIp(ip),
    syncSource: "desktop-snmp",
    updatedAtMs: Date.now(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (Array.isArray(info.colors) && info.colors.length) {
    payload.toner = {};
    info.colors.forEach((color) => {
      if (!color || typeof color.percent !== "number") return;
      const key = String(color.key || "").toLowerCase();
      if (["black", "cyan", "magenta", "yellow"].includes(key)) {
        payload.toner[key] = Math.max(0, Math.min(100, Math.round(color.percent)));
      }
    });
  }

  if (info.residue && typeof info.residue.percent === "number") {
    payload.waste = Math.max(0, Math.min(100, Math.round(info.residue.percent)));
  }

  if (typeof info.percent === "number") {
    payload.percent = Math.max(0, Math.min(100, Math.round(info.percent)));
  } else if (payload.toner && typeof payload.toner.black === "number") {
    payload.percent = payload.toner.black;
  }

  return payload;
}

async function syncPrinterInfoToFirebase(ip, info) {
  const cleanIp = normalizePrinterIp(ip);
  if (!cleanIp || !db || !db.collection || !hasUsablePrinterInfo(info)) return false;

  const payload = buildPrinterFirebasePayload(cleanIp, info);
  const compareKey = JSON.stringify({
    ip: payload.ip,
    toner: payload.toner || null,
    waste: typeof payload.waste === "number" ? payload.waste : null,
    percent: typeof payload.percent === "number" ? payload.percent : null
  });

  if (printerFirebaseSyncState[cleanIp] === compareKey) return true;

  await db.collection("printers").doc(cleanIp).set(payload, { merge: true });
  printerFirebaseSyncState[cleanIp] = compareKey;
  printerFirebaseState[cleanIp] = Object.assign({}, printerFirebaseState[cleanIp] || {}, payload);
  tonerInfoState[cleanIp] = mapFirebasePrinterInfo(printerFirebaseState[cleanIp]);
  return true;
}

function normalizePrinterColorsFromFirebase(printerDoc) {
  const toner = printerDoc && printerDoc.toner ? printerDoc.toner : {};
  const colors = [];

  const colorMap = [
    ["black", "Preto", "black"],
    ["cyan", "Ciano", "cyan"],
    ["magenta", "Magenta", "magenta"],
    ["yellow", "Amarelo", "yellow"]
  ];

  const normalizePercentValue = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
    if (typeof value === "string") {
      const match = value.replace(",", ".").match(/\d{1,3}(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }
    return null;
  };

  if (Array.isArray(printerDoc && printerDoc.colors)) {
    printerDoc.colors.forEach((item) => {
      if (!item) return;
      const key = String(item.key || item.color || item.cor || "").toLowerCase();
      const percent = normalizePercentValue(item.percent ?? item.value ?? item.valor ?? item.nivel);
      if (percent === null) return;
      const known = colorMap.find(([field,, mappedKey]) => key === field || key === mappedKey);
      colors.push({
        key: known ? known[2] : (key || "black"),
        label: item.label || item.cor || (known ? known[1] : "Toner"),
        percent
      });
    });
  }

  colorMap.forEach(([field, label, key]) => {
    const value =
      toner[field] ??
      toner[label] ??
      printerDoc?.[field] ??
      printerDoc?.[`${field}Percent`] ??
      printerDoc?.[`${field}_percent`];

    const percent = normalizePercentValue(value);
    if (percent !== null && !colors.some(c => c.key === key)) {
      colors.push({ key, label, percent });
    }
  });

  return colors;
}

function normalizePrinterResidueFromFirebase(printerDoc) {
  const wasteValue = printerDoc && typeof printerDoc.waste === "number"
    ? printerDoc.waste
    : (printerDoc && typeof printerDoc.residue === "number" ? printerDoc.residue : null);

  if (typeof wasteValue !== "number") return null;

  return {
    key: "waste",
    label: "Resíduo",
    percent: Math.max(0, Math.min(100, Math.round(wasteValue)))
  };
}

function mapFirebasePrinterInfo(printerDoc) {
  const colors = normalizePrinterColorsFromFirebase(printerDoc);
  const residue = normalizePrinterResidueFromFirebase(printerDoc);
  const normalizePercentValue = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
    if (typeof value === "string") {
      const match = value.replace(",", ".").match(/\d{1,3}(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }
    return null;
  };
  let percent = normalizePercentValue(
    printerDoc?.percent ??
    printerDoc?.tonerPercent ??
    printerDoc?.toner_percent ??
    printerDoc?.nivelToner ??
    printerDoc?.nivel ??
    printerDoc?.percentage
  );

  if (percent === null && colors.length === 1 && colors[0].key === "black") {
    percent = colors[0].percent;
  }

  return { colors, residue, percent };
}

function bindPrintersFirebaseRealtime() {
  if (!db || !db.collection) return;

  db.collection("printers").onSnapshot((snap) => {
    notificarAlteracaoRealtimeApp("printers", snap);
    snap.forEach((doc) => {
      const data = ({ firebaseId: doc.id, ...doc.data() }) || {};
      const ip = normalizePrinterIp(data.ip || doc.id);
      if (!ip) return;

      const mapped = mapFirebasePrinterInfo(data);
      printerFirebaseState[ip] = Object.assign({}, data, { ip });
      tonerInfoState[ip] = mapped;
      maybeNotifyCriticalSupply(ip, mapped);
    });

    renderDashboardCards();
    renderImpressoras();
    renderTonerDiagnostics();

    const dashboardHasSearch = !!el("searchDashboard");
    if (dashboardHasSearch && normalizarTexto(el("searchDashboard")?.value || "")) {
      renderDashboardCards();
    }
  }, (error) => {
    console.error("Erro ao ler coleção printers:", error);
  });
}

const __originalObterTonerInfo = obterTonerInfo;
obterTonerInfo = async function(ip) {
  const cleanIp = normalizePrinterIp(ip);
  const desktopMode = !!(window.electronAPI && window.electronAPI.getTonerSNMP);

  if (desktopMode) {
    const freshInfo = await __originalObterTonerInfo(cleanIp);
    if (hasUsablePrinterInfo(freshInfo)) {
      try {
        await syncPrinterInfoToFirebase(cleanIp, freshInfo);
      } catch (error) {
        console.error("Erro ao sincronizar impressora para Firebase:", cleanIp, error);
      }
      return freshInfo;
    }

    if (printerFirebaseState[cleanIp]) {
      return mapFirebasePrinterInfo(printerFirebaseState[cleanIp]);
    }

    return freshInfo;
  }

  if (printerFirebaseState[cleanIp]) {
    return mapFirebasePrinterInfo(printerFirebaseState[cleanIp]);
  }
  return await __originalObterTonerInfo(cleanIp);
};

const __originalTestarTodasAsImpressoras = testarTodasAsImpressoras;
testarTodasAsImpressoras = async function() {
  const webMode = !(window.electronAPI && window.electronAPI.getTonerSNMP);
  if (webMode) {
    impressorasData.forEach((item) => {
      const info = printerFirebaseState[item.ip] ? mapFirebasePrinterInfo(printerFirebaseState[item.ip]) : null;
      tonerInfoState[item.ip] = info;
      const alvoId = `toner-${item.ip.replace(/\./g, "-")}`;
      if (el(alvoId)) {
        el(alvoId).innerHTML = gerarHTMLToners(info);
      }
      if (info) maybeNotifyCriticalSupply(item.ip, info);
    });
    renderDashboardCards();
    return;
  }
  return await __originalTestarTodasAsImpressoras();
};

const __originalAbrirIP = abrirIP;
abrirIP = function(ip) {
  // No tablet/web o IP fica só de leitura
  const webMode = !(window.electronAPI && window.electronAPI.getTonerSNMP);
  if (webMode) return;
  return __originalAbrirIP(ip);
};

const __originalRenderImpressoras = renderImpressoras;
renderImpressoras = function(lista = impressorasData) {
  const tbody = el("impressorasTableBody");
  if (!tbody) return __originalRenderImpressoras(lista);

  const total = impressorasData.length;
  const ok = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "OK").length;
  const problema = impressorasData.filter(i => {
    const e = obterEstadoImpressora(i.ip);
    return e === "Pendente" || e === "Em reparação";
  }).length;
  const resolvidas = impressorasData.filter(i => obterEstadoImpressora(i.ip) === "Resolvido").length;

  setText("countImpressoras", total);
  setText("countImpressorasOk", ok);
  setText("countImpressorasProblema", problema);
  setText("countImpressorasResolvidas", resolvidas);

  const webMode = !(window.electronAPI && window.electronAPI.getTonerSNMP);

  tbody.innerHTML = lista.map(item => {
    const estado = obterEstadoImpressora(item.ip);
    const tonerId = `toner-${item.ip.replace(/\./g, "-")}`;
    const info = printerFirebaseState[item.ip] ? mapFirebasePrinterInfo(printerFirebaseState[item.ip]) : (tonerInfoState[item.ip] || null);
    const ipHtml = webMode ? item.ip : `<a href="http://${item.ip}" target="_blank" rel="noopener noreferrer">${item.ip}</a>`;

    return `
      <tr>
        <td>${item.modelo}</td>
        <td>${item.serie}</td>
        <td>${item.armazem}</td>
        <td>${item.localizacao}</td>
        <td>${ipHtml}</td>
        <td>${badgeEstado(estado)}</td>
        <td>
          <div id="${tonerId}">${gerarHTMLToners(info)}</div>
          <div class="table-actions" style="margin-top:8px;">
            ${webMode ? "" : `<button class="action-btn ip" onclick="abrirIP('${item.ip}')">Abrir IP</button>`}
            <button class="action-btn manut" onclick='abrirManutencaoDireta(${JSON.stringify(item)})'>Manutenção</button>
            ${webMode ? "" : `<button class="action-btn" onclick="window.testarTonerImpressora('${item.ip}', '${tonerId}')">Testar toner</button>`}
          </div>
        </td>
      </tr>
    `;
  }).join("");
};

window.addEventListener("DOMContentLoaded", () => {
  if (el("historicoImpressoraPanel") && impressorasData && impressorasData.length) { abrirHistoricoImpressora(impressorasData[0]); }
  bindPrintersFirebaseRealtime();
});





/* =========================
   DIAGNÓSTICO DO TONER
========================= */
const tonerDiagnosticsState = {
  running: false,
  lastRunAt: null,
  source: "—",
  successCount: 0,
  totalCount: 0,
  status: "idle",
  log: []
};

function formatDiagTime(date) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" }).format(date);
  } catch (e) {
    return date.toLocaleString();
  }
}

function resolveDiagSource() {
  return (window.electronAPI && window.electronAPI.getTonerSNMP) ? "Leitura real SNMP" : "Firebase";
}


const tonerDiagUiState = { logsVisible: false };

function renderTonerDiagLogVisibility() {
  const wrapEl = el("tonerDiagLogWrap");
  const btnEl = el("toggleTonerDiagLogBtn");
  if (!wrapEl || !btnEl) return;
  wrapEl.classList.toggle("is-collapsed", !tonerDiagUiState.logsVisible);
  btnEl.textContent = tonerDiagUiState.logsVisible ? "Esconder logs" : "Ver logs";
}

function toggleTonerDiagLog(force) {
  tonerDiagUiState.logsVisible = typeof force === "boolean" ? force : !tonerDiagUiState.logsVisible;
  renderTonerDiagLogVisibility();
}
window.toggleTonerDiagLog = toggleTonerDiagLog;

function renderTonerDiagnostics() {
  const statusEl = el("tonerDiagStatus");
  const dotEl = el("tonerDiagDot");
  const lastRunEl = el("tonerDiagLastRun");
  const sourceEl = el("tonerDiagSource");
  const summaryEl = el("tonerDiagSummary");
  const logEl = el("tonerDiagLog");
  if (!statusEl || !dotEl || !lastRunEl || !sourceEl || !summaryEl || !logEl) return;
  renderTonerDiagLogVisibility();

  const map = {
    idle: ["Sem teste", "is-idle"],
    running: ["A testar", "is-running"],
    ok: ["A funcionar", "is-ok"],
    warn: ["Parcial", "is-warn"],
    error: ["Com falhas", "is-error"]
  };

  const current = map[tonerDiagnosticsState.status] || map.idle;
  statusEl.textContent = current[0];
  dotEl.className = `diag-dot ${current[1]}`;
  lastRunEl.textContent = formatDiagTime(tonerDiagnosticsState.lastRunAt);
  sourceEl.textContent = tonerDiagnosticsState.source || "—";

  if (tonerDiagnosticsState.running) {
    summaryEl.textContent = `A testar ${tonerDiagnosticsState.totalCount || impressorasData.length || 0} impressoras`;
  } else if (!tonerDiagnosticsState.lastRunAt) {
    summaryEl.textContent = "À espera de teste";
  } else {
    summaryEl.textContent = `${tonerDiagnosticsState.successCount}/${tonerDiagnosticsState.totalCount || 0} impressoras com leitura`;
  }

  if (!tonerDiagnosticsState.log.length) {
    logEl.innerHTML = '<div class="diagnostics-log-item is-muted">Ainda sem leituras.</div>';
    return;
  }

  logEl.innerHTML = tonerDiagnosticsState.log.map(item => `
    <div class="diagnostics-log-item">
      <span class="diag-time">${item.time}</span>
      <strong>${item.ip}</strong> · ${item.message}
    </div>
  `).join("");
}

function pushTonerDiagnosticLog(ip, message) {
  tonerDiagnosticsState.log.unshift({
    ip: ip || "Sistema",
    message,
    time: formatDiagTime(new Date())
  });
  tonerDiagnosticsState.log = tonerDiagnosticsState.log.slice(0, 10);
  renderTonerDiagnostics();
}

function updateTonerDiagnosticStatus(status, partial = {}) {
  tonerDiagnosticsState.status = status;
  Object.assign(tonerDiagnosticsState, partial);
  renderTonerDiagnostics();
}

function summarizeTonerInfo(info) {
  if (!info) return "sem leitura";
  if (Array.isArray(info.colors) && info.colors.length) {
    return info.colors.map(c => `${c.label || c.key}: ${typeof c.percent === "number" ? Math.round(c.percent) : "N/D"}%`).join(" · ");
  }
  if (typeof info.percent === "number") return `Preto: ${Math.round(info.percent)}%`;
  return "sem percentagem";
}

async function testarSistemaToner() {
  updateTonerDiagnosticStatus("running", {
    running: true,
    source: resolveDiagSource(),
    totalCount: impressorasData.length || 0,
    successCount: 0
  });
  pushTonerDiagnosticLog("Sistema", `Teste iniciado por ${resolveDiagSource()}`);

  let success = 0;
  for (const item of impressorasData) {
    const info = await obterTonerInfo(item.ip);
    tonerInfoState[item.ip] = info || null;
    const alvoId = `toner-${item.ip.replace(/\./g, "-")}`;
    if (el(alvoId)) el(alvoId).innerHTML = gerarHTMLToners(info);
    if (info) {
      success += 1;
      pushTonerDiagnosticLog(item.ip, summarizeTonerInfo(info));
      maybeNotifyCriticalSupply(item.ip, info);
    } else {
      pushTonerDiagnosticLog(item.ip, "sem resposta");
    }
  }

  updateTonerDiagnosticStatus(success === impressorasData.length ? "ok" : (success > 0 ? "warn" : "error"), {
    running: false,
    lastRunAt: new Date(),
    successCount: success,
    totalCount: impressorasData.length || 0,
    source: resolveDiagSource()
  });

  renderDashboardCards();
  renderImpressoras();
}

window.testarSistemaToner = testarSistemaToner;

/* =========================
   VERSÃO / ONLINE-OFFLINE
========================= */
const APP_BRAGA_VERSION = `v${APP_VERSION} Premium`;

function atualizarEstadoLigacaoAppBraga() {
  const online = navigator.onLine;
  document.querySelectorAll(".status-pill").forEach(node => {
    node.textContent = online ? "Sistema Online" : "Sistema Offline";
    node.classList.toggle("offline", !online);
  });
  document.querySelectorAll(".version-pill").forEach(node => {
    node.textContent = APP_BRAGA_VERSION;
  });
}

window.addEventListener("online", atualizarEstadoLigacaoAppBraga);
window.addEventListener("offline", atualizarEstadoLigacaoAppBraga);
document.addEventListener("DOMContentLoaded", atualizarEstadoLigacaoAppBraga);

/* =========================
   ADD TONER - ESTÁVEL
========================= */
const tonerMapStable = {
  "TK-3190": { equipamento: "P3155DN", cor: "Preto" },
  "TK-8365Y": { equipamento: "TASKalfa_255ci", cor: "Amarelo" },
  "TK-8365C": { equipamento: "TASKalfa_255ci", cor: "Azul" },
  "TK-8365M": { equipamento: "TASKalfa_255ci", cor: "Vermelho" },
  "TK-8365K": { equipamento: "TASKalfa_255ci", cor: "Preto" },
  "TK-3430": { equipamento: "PA5500x", cor: "Preto" }
};

let scannerInstanceStable = null;
let scannerAtivoStable = false;

function mostrarOCRStatusStable(texto) {
  const box = el("ocrStatus");
  if (!box) return;
  box.style.display = "block";
  box.innerText = texto;
}

function normalizarTextoOCRStable(texto) {
  return String(texto || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/—/g, "-")
    .replace(/_/g, "-")
    .trim()
    .toUpperCase();
}

function preencherDataAtualSeVaziaStable() {
  const dataEl = el("data");
  if (!dataEl) return;
  if (!dataEl.value) {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");
    dataEl.value = `${yyyy}-${mm}-${dd}`;
  }
}

function montarTextoLocalizacaoStable(item) {
  return `${item.serie} - ${item.armazem} - ${item.localizacao}`;
}

function procurarImpressoraPorUltimos3DigitosStable(final3) {
  const alvo = String(final3 || "").trim().toUpperCase();
  if (alvo.length !== 3) return null;
  return impressorasData.find(item => String(item.serie || "").toUpperCase().slice(-3) === alvo) || null;
}

function abrirSerie3DigitosStable() {
  const box = el("serial3Box");
  if (box) box.style.display = "block";
  const input = el("serial3Input");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 120);
  }
}

function fecharSerie3DigitosStable() {
  const box = el("serial3Box");
  if (box) box.style.display = "none";
  const input = el("serial3Input");
  if (input) input.value = "";
}

function aplicarDadosTonerStable(toner) {
  if (el("equipamento")) el("equipamento").value = toner.equipamento || "";
  if (el("cor")) el("cor").value = toner.cor || "";
  preencherDataAtualSeVaziaStable();
}

function extrairDadosEtiquetaOCRStable(texto) {
  const t = normalizarTextoOCRStable(texto);

  let tonerCode = "";
  const tkMatch = t.match(/TK[\s-]?(\d{4}[A-Z]?)/);
  if (tkMatch) tonerCode = `TK-${tkMatch[1]}`;

  let dataFolha = "";
  const dataISO = t.match(/\d{4}-\d{2}-\d{2}/);
  const dataPTSlash = t.match(/\d{2}\/\d{2}\/\d{4}/);
  const dataPTHyphen = t.match(/\d{2}-\d{2}-\d{4}/);

  if (dataISO) {
    dataFolha = dataISO[0];
  } else if (dataPTSlash) {
    const [dd, mm, yyyy] = dataPTSlash[0].split("/");
    dataFolha = `${yyyy}-${mm}-${dd}`;
  } else if (dataPTHyphen) {
    const [dd, mm, yyyy] = dataPTHyphen[0].split("-");
    dataFolha = `${yyyy}-${mm}-${dd}`;
  }

  let serieEncontrada = "";
  for (const item of impressorasData) {
    const s = String(item.serie || "").toUpperCase();
    if (s && t.includes(s)) {
      serieEncontrada = item.serie;
      break;
    }
  }

  let equipamento = "";
  let cor = "";

  if (tonerCode && tonerMapStable[tonerCode]) {
    equipamento = tonerMapStable[tonerCode].equipamento || "";
    cor = tonerMapStable[tonerCode].cor || "";
  }

  if (!equipamento) {
    if (t.includes("P3155DN")) equipamento = "P3155DN";
    else if (t.includes("PA5500X")) equipamento = "PA5500x";
    else if (t.includes("2554CI")) equipamento = "TASKalfa_255ci";
  }

  if (!cor && tonerCode) {
    if (tonerCode.endsWith("Y")) cor = "Amarelo";
    else if (tonerCode.endsWith("C")) cor = "Azul";
    else if (tonerCode.endsWith("M")) cor = "Vermelho";
    else cor = "Preto";
  }

  const lote = extractLoteFromText(t);
  const sdsRef = extractSdsRefFromText(texto);

  return {
    lote,
    sdsRef,
    tonerCode,
    equipamento,
    cor,
    dataFolha,
    serie: serieEncontrada
  };
}

function aplicarDadosOCRNoFormularioStable(dados) {
  if (!dados) return false;

  if (dados.equipamento && el("equipamento")) el("equipamento").value = dados.equipamento;
  if (dados.cor && el("cor")) el("cor").value = dados.cor;

  if (el("dataFolha")) {
    el("dataFolha").value = dados.dataFolha || "";
  }
  if (el("lote")) {
    el("lote").value = dados.lote || "";
  }
  if (el("sdsRef")) {
    const sdsValido = String(dados.sdsRef || "").trim().toUpperCase();
    el("sdsRef").value = /^S\d{7,12}$/.test(sdsValido) ? sdsValido : "";
  }

  preencherDataAtualSeVaziaStable();

  if (dados.serie && el("localizacao")) {
    const printer = impressorasData.find(p => p.serie === dados.serie);
    if (printer) {
      el("localizacao").value = montarTextoLocalizacaoStable(printer);
    }
  } else if (dados.equipamento || dados.cor) {
    abrirSerie3DigitosStable();
  }

  return !!(dados.tonerCode || dados.equipamento || dados.cor || dados.dataFolha || dados.serie || dados.sdsRef);
}

async function processarTextoLidoStable(textoLido) {
  const bruto = String(textoLido || "");
  const codigoEtiqueta = extrairCodigoEtiquetaTonerAppBraga(bruto);
  if (codigoEtiqueta) {
    await usarPorCodigoEtiquetaToner(codigoEtiqueta);
    return true;
  }

  const normal = normalizarTextoOCRStable(bruto);

  const tkMatch = normal.match(/TK[\s-]?(\d{4}[A-Z]?)/);
  if (tkMatch) {
    const tk = `TK-${tkMatch[1]}`;
    const toner = tonerMapStable[tk] || null;
    if (toner) {
      aplicarDadosTonerStable(toner);
      mostrarMensagem(`Toner identificado: ${tk}`);
      abrirSerie3DigitosStable();
      return true;
    }
  }

  mostrarMensagem("Código não reconhecido para preenchimento automático.", "erro");
  return false;
}

async function startScannerStable() {
  const reader = el("reader");

  if (!reader) {
    mostrarMensagem("Zona do scanner não encontrada.", "erro");
    return;
  }

  if (typeof Html5Qrcode === "undefined") {
    mostrarMensagem("Biblioteca da câmara não carregada.", "erro");
    return;
  }

  if (scannerAtivoStable) {
    mostrarMensagem("A câmara já está aberta.", "erro");
    return;
  }

  reader.innerHTML = "";
  garantirPreviewStockQrVisivel();
  scannerInstanceStable = new Html5Qrcode("reader");

  try {
    await scannerInstanceStable.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 280, height: 180 } },
      async (decodedText) => {
        enhanceScannerStatus("Código lido. A processar automaticamente...");

        // 1º tenta usar o QR como etiqueta de toner existente em Stock.
        // Se encontrar, passa automaticamente de Stock para Histórico.
        const passouStockHistorico = await usarPorCodigoEtiquetaToner(decodedText);
        if (!passouStockHistorico) {
          // Se não for QR de stock, mantém o comportamento antigo do scanner.
          await processarTextoLidoStable(decodedText);
        }

        stopScannerStable();
      },
      () => {}
    );
    scannerAtivoStable = true;
    enhanceScannerStatus("Câmara iniciada. À espera de leitura inteligente.");
    mostrarMensagem("Câmara iniciada.");
  } catch (e) {
    console.error("Erro ao iniciar scanner:", e);
    mostrarMensagem("Não foi possível abrir a câmara.", "erro");
  }
}

async function stopScannerStable() {
  const reader = el("reader");
  if (!scannerInstanceStable || !scannerAtivoStable) {
    if (reader) reader.innerHTML = "";
    scannerAtivoStable = false;
    return;
  }

  try {
    await scannerInstanceStable.stop();
    await scannerInstanceStable.clear();
  } catch (e) {
    console.error("Erro ao fechar scanner:", e);
  } finally {
    scannerInstanceStable = null;
    scannerAtivoStable = false;
    if (reader) reader.innerHTML = "";
  }
}

function abrirOCRStable() {
  const input = el("ocrInput");
  if (!input) {
    mostrarMensagem("Input OCR não encontrado.", "erro");
    return;
  }
  input.value = "";
  input.click();
}

async function processarOCRInputStable(event) {
  const file = event && event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;

  if (typeof Tesseract === "undefined") {
    mostrarMensagem("Biblioteca OCR não carregada.", "erro");
    return;
  }

  try {
    mostrarOCRStatusStable("A ler a folha... pode demorar alguns segundos.");
    mostrarMensagem("A ler a folha...");

    const result = await Tesseract.recognize(file, "eng", { logger: () => {} });
    const texto = result && result.data ? result.data.text : "";
    const dados = extrairDadosEtiquetaOCRStable(texto);
    const ok = aplicarDadosOCRNoFormularioStable(dados);

    const resumo = [
      dados.tonerCode ? `Toner: ${dados.tonerCode}` : "",
      dados.lote ? `Lote: ${dados.lote}` : "",
      dados.sdsRef ? `SDS Ref: ${dados.sdsRef}` : "",
      dados.equipamento ? `Equipamento: ${dados.equipamento}` : "",
      dados.cor ? `Cor: ${dados.cor}` : "",
      dados.dataFolha ? `Data folha: ${dados.dataFolha}` : "",
      el("data") && el("data").value ? `Data scan: ${el("data").value}` : "",
      dados.serie ? `Série: ${dados.serie}` : ""
    ].filter(Boolean).join(" | ");

    mostrarOCRStatusStable(resumo || "A folha foi lida, mas não encontrei dados suficientes.");
    mostrarMensagem(ok ? "Folha lida com sucesso." : "Não encontrei dados suficientes na folha.", ok ? "sucesso" : "erro");
    if (ok && dados.serie && dados.equipamento) {
      await gerarWordEtiquetaFromForm(true);
    }
  } catch (e) {
    console.error("Erro OCR:", e);
    mostrarOCRStatusStable("Erro ao ler a folha.");
    mostrarMensagem("Erro ao ler a folha.", "erro");
  }
}

function confirmarSerie3DigitosStable() {
  const valor = ((el("serial3Input") && el("serial3Input").value) || "").trim().toUpperCase();

  if (valor.length !== 3) {
    mostrarMensagem("Introduza exatamente 3 dígitos.", "erro");
    return;
  }

  const printer = procurarImpressoraPorUltimos3DigitosStable(valor);
  if (!printer) {
    mostrarMensagem("Nenhuma impressora encontrada com esses 3 dígitos.", "erro");
    return;
  }

  if (el("localizacao")) {
    el("localizacao").value = montarTextoLocalizacaoStable(printer);
  }

  fecharSerie3DigitosStable();
  mostrarMensagem("Localização selecionada com sucesso.");
}

window.startScanner = startScannerStable;
window.stopScanner = stopScannerStable;
window.abrirOCR = abrirOCRStable;
window.processarOCRInput = processarOCRInputStable;
window.confirmarSerie3Digitos = confirmarSerie3DigitosStable;
window.fecharSerie3Digitos = fecharSerie3DigitosStable;


/* =========================
   ETIQUETA WORD AUTOMÁTICA
========================= */
function formatDatePTAppBraga(valor) {
  const raw = String(valor || "").trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  return raw;
}

function extrairDadosEtiquetaWord() {
  const loc = (el("localizacao") && el("localizacao").value) || "";
  const dataFolha = (el("dataFolha") && el("dataFolha").value) || "";
  const dataScan = (el("data") && el("data").value) || "";
  const rawSdsRef = (el("sdsRef") && el("sdsRef").value) || "";
  const sdsRef = /^S\d{7,12}$/i.test(String(rawSdsRef).trim()) ? String(rawSdsRef).trim().toUpperCase() : "";
  const codigoEtiqueta = getCodigoEtiquetaAtualAppBraga();

  let serie = "";
  let localCurto = "";
  let armazem = "";

  const parts = loc.split(" - ").map(v => v.trim()).filter(Boolean);
  if (parts.length >= 3) {
    serie = parts[0] || "";
    armazem = parts[1] || "";
    localCurto = parts.slice(2).join(" - ");
  } else {
    localCurto = loc || "Sem Localização";
  }

  const dataEtiqueta = formatDatePTAppBraga(dataFolha || dataScan);

  return {
    serie: serie || "SEM SÉRIE",
    localCurto: localCurto || "Sem Localização",
    armazem: armazem || "",
    dataEtiqueta: dataEtiqueta || formatDatePTAppBraga(dataScan) || "Sem Data",
    sdsRef: sdsRef.trim(),
    codigoEtiqueta,
    codigoScan: buildPayloadQrTonerAppBraga(codigoEtiqueta)
  };
}

async function gerarWordEtiquetaFromForm(auto = false) {
  try {
    if (typeof docx === "undefined") {
      mostrarMensagem("Biblioteca Word não carregada.", "erro");
      return;
    }

    const dados = extrairDadosEtiquetaWord();

    if (!dados.localCurto || !dados.serie) {
      mostrarMensagem("Faltam dados para gerar a etiqueta Word.", "erro");
      return;
    }

    const {
      Document,
      Packer,
      Paragraph,
      AlignmentType,
      TextRun,
      ImageRun,
      HeadingLevel
    } = docx;
    const qrDataUrl = await gerarQrDataUrlAppBraga(dados.codigoScan, 220);
    const qrRun = qrDataUrl && ImageRun ? new ImageRun({
      data: dataUrlToUint8ArrayAppBraga(qrDataUrl),
      transformation: { width: 120, height: 120 }
    }) : null;

    const doc = new Document({
      creator: "App Braga",
      title: "Etiqueta Toner",
      description: "Etiqueta gerada automaticamente pelo scan OCR",
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 3200, after: 500 },
              children: [
                new TextRun({
                  text: dados.localCurto,
                  bold: true,
                  size: 42
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 2800 },
              children: [
                new TextRun({
                  text: dados.serie,
                  bold: true,
                  size: 64
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 200 },
              children: [
                new TextRun({
                  text: dados.dataEtiqueta,
                  bold: true,
                  size: 56
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 160, after: 160 },
              children: qrRun ? [qrRun] : [
                new TextRun({
                  text: dados.codigoEtiqueta,
                  bold: true,
                  size: 24
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [
                new TextRun({
                  text: dados.codigoEtiqueta,
                  bold: true,
                  size: 22
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 0 },
              children: [
                new TextRun({
                  text: dados.sdsRef ? `SDS Ref: ${dados.sdsRef}` : "",
                  bold: true,
                  size: 18
                })
              ]
            })
          ]
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `Etiqueta_${dados.localCurto.replace(/\s+/g, "_")}_${dados.serie}.docx`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1200);

    await guardarEtiquetaPartilhada({ origem: auto ? "scan" : "manual", codigoEtiqueta: dados.codigoEtiqueta, codigoScan: dados.codigoScan, sdsRef: dados.sdsRef });

    if (!auto) {
      mostrarMensagem("Etiqueta Word gerada com sucesso.");
    }
  } catch (error) {
    console.error("Erro ao gerar Word:", error);
    mostrarMensagem("Erro ao gerar a etiqueta Word.", "erro");
  }
}

window.gerarWordEtiquetaFromForm = gerarWordEtiquetaFromForm;



/* =========================
   PORTAS FIREBASE FALLBACK + MIGRAÇÃO
========================= */
async function migrarPortasParaFirebase() {
  if (!window.db) {
    mostrarMensagem("Firebase não está disponível.", "erro");
    return;
  }

  try {
    const snap = await db.collection("portas").get();
    if (!snap.empty) {
      mostrarMensagem("A coleção portas já tem dados. Migração não necessária.");
      return;
    }

    for (const p of window.portasData) {
      const payload = {
        porta: p.porta || "",
        local: p.local || "",
        user: p.user || "",
        equipamento: p.equipamento || "",
        ip: p.ip || "",
        created: new Date()
      };
      await db.collection("portas").add(payload);
    }

    mostrarMensagem("Migração das portas concluída com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao migrar portas para Firebase.", "erro");
  }
}

async function carregarPortasComFallback() {
  if (!window.db) {
    carregarPortasLocal();
    renderPortas(window.portasData);
    return;
  }

  try {
    db.collection("portas").onSnapshot(snap => {
      if (snap.empty) {
        carregarPortasLocal();
        renderPortas(window.portasData);
        const countEl = document.getElementById("countPortas");
        if (countEl) countEl.innerText = String(window.portasData.length);
        return;
      }

      window.portasData = snap.docs.map(doc => ({ idDoc: doc.id, ...({ firebaseId: doc.id, ...doc.data() }) }));

      window.portasData.sort((a,b)=>{

        const aTxt =
          String(a.porta || a.nome || "")
            .toLowerCase()
            .trim();

        const bTxt =
          String(b.porta || b.nome || "")
            .toLowerCase()
            .trim();

        return aTxt.localeCompare(
          bTxt,
          'pt',
          {
            numeric:true,
            sensitivity:'base'
          }
        );

      });

      prepararRefsPortas();
      guardarPortasLocal();
      renderPortas(window.portasData);
    }, error => {
      console.error(error);
      renderPortas(window.portasData);
    });
  } catch (e) {
    console.error(e);
    renderPortas(window.portasData);
  }
}

window.migrarPortasParaFirebase = migrarPortasParaFirebase;

window.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("listaPortas");
  if (host) {
    setTimeout(() => {
      try { carregarPortasComFallback(); } catch (e) { console.error(e); }
    }, 400);
  }
});


/* ===== AUTO UPDATE PRO FINAL ===== */
const APP_REMOTE_BASE = "https://picafern-commits.github.io/App-Tablet/";
const APP_VERSION_URL = APP_REMOTE_BASE + "version.json?t=" + Date.now();

async function registarServiceWorkerAppBraga() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const swUrl = location.pathname.includes("/html/") ? "../sw.js" : "sw.js";
    await navigator.serviceWorker.register(swUrl);
  } catch (e) {
    console.error("Erro a registar service worker", e);
  }
}

async function verificarAtualizacao() {
  try {
    atualizarVersaoUI(APP_VERSION);
    const isGithubPages = location.hostname === "picafern-commits.github.io";
    if (!isGithubPages) return;

    await registarServiceWorkerAppBraga();

    const res = await fetch(APP_VERSION_URL, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
      }
    });

    const data = await res.json();

    if (data && data.version && data.version !== APP_VERSION) {
      mostrarAvisoAtualizacaoDisponivel(data.version);
    }
  } catch (e) {
    console.error("Erro a verificar updates", e);
    atualizarVersaoUI(APP_VERSION);
  }
}

function atualizarVersaoUI(versionValue = APP_VERSION) {
  const nodes = document.querySelectorAll("#appVersion, .version-pill");
  nodes.forEach((node) => {
    if (!node) return;
    node.innerText = "v" + versionValue + " Premium";
    node.title = "Versão atual da app";
  });
}

function mostrarAvisoAtualizacaoDisponivel(novaVersao) {
  if (getCookieAppBraga("appUpdateDismissedVersion") === String(novaVersao)) return;
  let box = document.getElementById("updateBoxAppBraga");

  if (!box) {
    box = document.createElement("div");
    box.id = "updateBoxAppBraga";
    box.className = "update-box-appbraga";
    document.body.appendChild(box);
  }
  box.dataset.version = novaVersao;

  box.innerHTML = `
    <div class="update-title">Atualização disponível</div>
    <div class="update-subtitle">
      Existe uma versão nova. Podes atualizar agora ou continuar a trabalhar.<br><br>
      Atual: v${APP_VERSION} Premium<br>
      Nova: v${novaVersao} Premium
    </div>
    <div class="update-actions">
      <button class="ghost-btn" onclick="fecharAvisoAtualizacao()">Continuar</button>
      <button class="primary-btn" onclick="atualizarAppObrigatorio()">Atualizar agora</button>
    </div>
  `;
}

function fecharAvisoAtualizacao() {
  const overlay = document.getElementById("updateOverlayAppBraga");
  const box = document.getElementById("updateBoxAppBraga");
  if (box?.dataset.version) setCookieAppBraga("appUpdateDismissedVersion", box.dataset.version, 86400);
  if (overlay) overlay.remove();
  if (box) box.remove();
  document.body.style.overflow = "";
}

async function limparCacheAtualizacaoAppBraga() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => {
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        return reg.unregister();
      }));
    }
  } catch (error) {
    console.error("Erro a limpar service worker:", error);
  }

  try {
    if (window.caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.error("Erro a limpar cache:", error);
  }
}

async function atualizarAppObrigatorio() {
  const box = document.getElementById("updateBoxAppBraga");
  if (box) {
    box.innerHTML = `
      <div class="update-title">A atualizar...</div>
      <div class="update-subtitle">A limpar cache e a carregar a versao mais recente da app.</div>
    `;
  }

  deleteCookieAppBraga("appUpdateDismissedVersion");
  const targetUrl = new URL(window.location.href);
  targetUrl.searchParams.set("v", APP_VERSION);
  targetUrl.searchParams.set("update", String(Date.now()));
  const target = targetUrl.toString();
  const currentBefore = window.location.href;

  try {
    await limparCacheAtualizacaoAppBraga();
  } finally {
    try {
      window.location.replace(target);
    } catch (e) {
      console.error("replace falhou", e);
    }

    setTimeout(() => {
      if (window.location.href === currentBefore) {
        try {
          window.location.href = target;
        } catch (e) {
          console.error("href falhou", e);
        }
      }
    }, 1200);

    setTimeout(() => {
      if (window.location.href === currentBefore) {
        try {
          const a = document.createElement("a");
          a.href = target;
          a.target = "_self";
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (e) {
          console.error("link fallback falhou", e);
        }
      }
    }, 2200);
  }
}

window.addEventListener("load", verificarAtualizacao);
window.addEventListener("load", () => atualizarVersaoUI(APP_VERSION));
window.fecharAvisoAtualizacao = fecharAvisoAtualizacao;
window.atualizarAppObrigatorio = atualizarAppObrigatorio;



/* ===== CRUD EXTRA: Portas, Users, Pistolas ===== */
function itemPorRef(lista, ref) {
 if (typeof ref === "string") {
   return lista.find(i =>
     i.idDoc === ref ||
     i._ref === ref ||
     i.firebaseId === ref
   ) || null;
 }
 const idx = Number(ref);
 return Number.isNaN(idx)
   ? null
   : (lista[idx] || null);
}

function idxPorRef(lista, ref) {
  if (typeof ref === "string") {
    return lista.findIndex(i => i.idDoc === ref || i._ref === ref || i.firebaseId === ref);
  }
  const idx = Number(ref);
  return Number.isNaN(idx) ? -1 : idx;
}

/* Portas */
let portaEditRef = null;

function abrirAdicionarPorta() {
  portaEditRef = "__new__";
  [["editPorta",""],["editLocal",""],["editUser",""],["editEquipamento",""],["editIP",""]].forEach(([id,v]) => { const node = el(id); if (node) node.value = v; });
  const h3 = document.querySelector('#modalEditarPorta h3'); if (h3) h3.textContent = 'Adicionar Porta';
  const sub = document.querySelector('#modalEditarPorta .section-subtitle'); if (sub) sub.textContent = 'Criar uma nova porta de rede';
  if (el("modalEditarPorta")) el("modalEditarPorta").style.display = "flex";
}

function editarPorta(ref) {
  const item = itemPorRef(window.portasData, ref);
  if (!item) return mostrarMensagem("Porta não encontrada.", "erro");
  portaEditRef = ref;
  if (el("editPorta")) el("editPorta").value = item.porta || "";
  if (el("editLocal")) el("editLocal").value = item.local || "";
  if (el("editUser")) el("editUser").value = item.user || "";
  if (el("editEquipamento")) el("editEquipamento").value = item.equipamento || "";
  if (el("editIP")) el("editIP").value = item.ip || "";
  if (el("modalEditarPorta")) el("modalEditarPorta").style.display = "flex";
}

function fecharEditarPorta() {
  portaEditRef = null;
  const h3 = document.querySelector('#modalEditarPorta h3'); if (h3) h3.textContent = 'Editar Porta';
  const sub = document.querySelector('#modalEditarPorta .section-subtitle'); if (sub) sub.textContent = 'Editar a porta selecionada';
  if (el("modalEditarPorta")) el("modalEditarPorta").style.display = "none";
}

async function guardarEdicaoPorta() {
  if (portaEditRef === null || typeof portaEditRef === "undefined") return mostrarMensagem("Nenhuma porta selecionada.", "erro");
  const isNovaPorta = portaEditRef === "__new__";
  const payload = {
    porta: el("editPorta") ? el("editPorta").value : "",
    local: el("editLocal") ? el("editLocal").value : "",
    user: el("editUser") ? el("editUser").value : "",
    equipamento: el("editEquipamento") ? el("editEquipamento").value : "",
    ip: el("editIP") ? el("editIP").value : ""
  };

  try {
    if (isNovaPorta) {
      if (window.db) {
        const docRef = await db.collection("portas").add(payload);
        window.portasData.unshift({ idDoc: docRef.id, ...payload });
      } else {
        window.portasData.unshift({ _ref: `local-porta-${Date.now()}`, ...payload });
      }
    } else if (typeof portaEditRef === "string" && window.db) {
      await db.collection("portas").doc(portaEditRef).update(payload);
      const idx = idxPorRef(window.portasData, portaEditRef);
      if (idx >= 0) window.portasData[idx] = { ...window.portasData[idx], ...payload };
    } else {
      const idx = idxPorRef(window.portasData, portaEditRef);
      if (idx >= 0) window.portasData[idx] = { ...window.portasData[idx], ...payload };
    }
    guardarPortasLocal();
    fecharEditarPorta();
    filtrarPortasComEstado();
    mostrarMensagem(isNovaPorta ? "Porta adicionada com sucesso." : "Porta atualizada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar a porta.", "erro");
  }
}

async function apagarPorta(ref) {
  if (!confirm("Queres apagar esta porta?")) return;
  try {
    if (typeof ref === "string" && window.db) {
      await db.collection("portas").doc(ref).delete();
    }
    const idx = idxPorRef(window.portasData, ref);
    if (idx >= 0) window.portasData.splice(idx, 1);
    guardarPortasLocal();
    filtrarPortasComEstado();
    mostrarMensagem("Porta apagada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar a porta.", "erro");
  }
}

/* Users */
let userEditRef = null;

function abrirAdicionarUser() {
  userEditRef = "__new__";
  const fields = ["nome","zona","user_pc_eye","pass_remote","pass_eye_peak","op_pistola","pass_pistola","nome_pc","teamviewer","user_mo365","pw_mo365","email_bragalis","pass_bragalis"];
  fields.forEach(f => { const node = el("editUser_" + f); if (node) node.value = ""; });
  const h3 = document.querySelector('#modalEditarUser h3'); if (h3) h3.textContent = 'Adicionar User';
  const sub = document.querySelector('#modalEditarUser .section-subtitle'); if (sub) sub.textContent = 'Criar um novo utilizador';
  if (el("modalEditarUser")) el("modalEditarUser").style.display = "flex";
}

function editarUser(ref) {
  const item = itemPorRef(window.usersData, ref);
  if (!item) return mostrarMensagem("User não encontrado.", "erro");
  userEditRef = ref;
  const fields = ["nome","zona","user_pc_eye","pass_remote","pass_eye_peak","op_pistola","pass_pistola","nome_pc","teamviewer","user_mo365","pw_mo365","email_bragalis","pass_bragalis"];
  fields.forEach(f => { const node = el("editUser_" + f); if (node) node.value = item[f] || ""; });
  if (el("modalEditarUser")) el("modalEditarUser").style.display = "flex";
}

function fecharEditarUser() {
  userEditRef = null;
  const h3 = document.querySelector('#modalEditarUser h3'); if (h3) h3.textContent = 'Editar User';
  const sub = document.querySelector('#modalEditarUser .section-subtitle'); if (sub) sub.textContent = 'Editar o utilizador selecionado';
  if (el("modalEditarUser")) el("modalEditarUser").style.display = "none";
}


async function guardarEdicaoUser() {

  if (userEditRef === null || typeof userEditRef === "undefined") {
    return mostrarMensagem("Nenhum user selecionado.", "erro");
  }

  const isNovoUser = userEditRef === "__new__";

  const payload = {};

  [
    "nome",
    "zona",
    "user_pc_eye",
    "pass_remote",
    "pass_eye_peak",
    "op_pistola",
    "pass_pistola",
    "nome_pc",
    "teamviewer",
    "user_mo365",
    "pw_mo365",
    "email_bragalis",
    "pass_bragalis"
  ].forEach(f => {

    payload[f] =
      el("editUser_" + f)
        ? el("editUser_" + f).value
        : "";

  });

  try {

    const userAtual =
      itemPorRef(window.usersData, userEditRef);

    const temFirebaseId =
      userAtual &&
      userAtual.idDoc &&
      !String(userAtual.idDoc).startsWith("local-user-");

    if (isNovoUser) {

      if (window.db) {

        const docRef =
          await db.collection("users").add(payload);

        window.usersData.unshift({
          idDoc: docRef.id,
          ...payload
        });

      } else {

        window.usersData.unshift({
          _ref: `local-user-${Date.now()}`,
          ...payload
        });

      }

    } else if (temFirebaseId && window.db) {

      await db
        .collection("users")
        .doc(userAtual.idDoc)
        .update(payload);

      const idx =
        idxPorRef(window.usersData, userEditRef);

      if (idx >= 0) {

        window.usersData[idx] = {
          ...window.usersData[idx],
          ...payload
        };

      }

    } else {

      if (window.db) {

        const docRef =
          await db.collection("users").add(payload);

        const idx =
          idxPorRef(window.usersData, userEditRef);

        if (idx >= 0) {

          window.usersData[idx] = {
            idDoc: docRef.id,
            ...payload
          };

        }

      } else {

        const idx =
          idxPorRef(window.usersData, userEditRef);

        if (idx >= 0) {

          window.usersData[idx] = {
            ...window.usersData[idx],
            ...payload
          };

        }

      }

    }

    guardarUsersLocal();

    fecharEditarUser();

    filtrarUsersComFiltros();

    mostrarMensagem(
      isNovoUser
        ? "User adicionado com sucesso."
        : "User atualizado com sucesso."
    );

  } catch (e) {

    console.error(e);

    mostrarMensagem(
      "Erro ao atualizar o user.",
      "erro"
    );

  }

}


async function apagarUser(ref) {
  if (!confirm("Queres apagar este user?")) return;
  try {
    if (typeof ref === "string" && window.db) {
      await db.collection("users").doc(ref).delete();
    }
    const idx = idxPorRef(window.usersData, ref);
    if (idx >= 0) window.usersData.splice(idx, 1);
    guardarUsersLocal();
    filtrarUsersComFiltros();
    mostrarMensagem("User apagado com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar o user.", "erro");
  }
}


function formatUserFieldLabel(chave) {
  const labels = {
    nome: "Nome",
    zona: "Zona",
    user_pc_eye: "User PC/EYE",
    pass_remote: "Pass Remote",
    pass_eye_peak: "Pass Eye Peak",
    op_pistola: "Op. Pistola",
    pass_pistola: "Pass Pistola",
    nome_pc: "Nome PC",
    teamviewer: "TeamViewer",
    user_mo365: "User MO365",
    pw_mo365: "Pw MO365",
    email_bragalis: "Email Bragalis",
    pass_bragalis: "Pass Bragalis"
  };
  return labels[chave] || chave;
}

function escapeHtmlAppBraga(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function imprimirUser(user) {

  // =========================
  // VALIDAR
  // =========================

  if (!user) {

    return mostrarMensagem(
      "User não encontrado.",
      "erro"
    );

  }

  // =========================
  // CAMPOS
  // =========================

  const campos = [

    "nome",
    "zona",
    "user_pc_eye",
    "pass_remote",
    "pass_eye_peak",
    "op_pistola",
    "pass_pistola",
    "nome_pc",
    "teamviewer",
    "user_mo365",
    "pw_mo365",
    "email_bragalis",
    "pass_bragalis"

  ];

  // =========================
  // LINHAS
  // =========================

  const linhas = campos

    .filter((campo) => {

      return (
        (user[campo] || "").trim() !== ""
      );

    })

    .map((campo) => `

      <div class="print-row">

        <div class="print-label">

          ${campo
            .replaceAll("_", " ")
            .toUpperCase()}

        </div>

        <div class="print-value">

          ${user[campo] || "-"}

        </div>

      </div>

    `)

    .join("");

  // =========================
  // TÍTULO
  // =========================

  const titulo =
    user.nome || "User";

  // =========================
  // HTML
  // =========================

  const htmlImpressao = `

<!DOCTYPE html>

<html lang="pt">

<head>

<meta charset="UTF-8">

<title>
  Imprimir Dados - ${titulo}
</title>

<style>

@page {

  size: 100mm 150mm;
  margin: 4mm;

}

html,
body {

  width: 100mm;
  height: 150mm;

  margin: 0;
  padding: 0;

  background: #ffffff;
  color: #000827;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

}

body {

  box-sizing: border-box;

}

.label-sheet {

  width: 100mm;
  min-height: 150mm;

  box-sizing: border-box;

  padding: 6mm;

  display: flex;
  flex-direction: column;

  gap: 3mm;

}

.title {

  font-size: 20px;
  font-weight: 700;

  margin: 0 0 2mm 0;

  border-bottom:
    1px solid #d1d5db;

  padding-bottom: 2mm;

}

.subtitle {

  font-size: 11px;
  color: #4b5563;

  margin: 0 0 1mm 0;

}

.content {

  display: flex;
  flex-direction: column;

  gap: 2.2mm;

  margin-top: 2mm;

}

.print-row {

  border:
    1px solid #e5e7eb;

  border-radius: 2mm;

  padding:
    2.2mm 2.5mm;

}

.print-label {

  font-size: 10px;
  font-weight: 700;

  color: #374151;

  margin-bottom: 1mm;

}

.print-value {

  font-size: 12px;

  line-height: 1.3;

  word-break: break-word;

  white-space: pre-wrap;

}

</style>

</head>

<body>

<div class="label-sheet">

<div class="subtitle">
  Etiqueta User - App Braga
</div>

<h1 class="title">
  ${titulo}
</h1>

<div class="content">

  ${linhas || `

    <div class="print-row">

      <div class="print-label">
        Sem dados
      </div>

      <div class="print-value">
        Este user não tem campos preenchidos.
      </div>

    </div>

  `}

</div>

</div>

</body>

</html>

`;

  // =========================
  // IFRAME
  // =========================

  const iframe =
    document.createElement(
      "iframe"
    );

  iframe.style.position =
    "fixed";

  iframe.style.right = "0";

  iframe.style.bottom = "0";

  iframe.style.width = "0";

  iframe.style.height = "0";

  iframe.style.border = "0";

  document.body.appendChild(
    iframe
  );

  const frameWindow =
    iframe.contentWindow;

  if (!frameWindow) {

    iframe.remove();

    return mostrarMensagem(
      "Erro ao abrir impressão",
      "erro"
    );

  }

  iframe.onload = () => {

    setTimeout(() => {

      try {

        frameWindow.focus();

        frameWindow.print();

      } catch (err) {

        console.error(err);

      }

      setTimeout(() => {

        iframe.remove();

      }, 1500);

    }, 300);

  };

  frameWindow.document.open();

  frameWindow.document.write(
    htmlImpressao
  );

  frameWindow.document.close();

}

/* Pistolas */
let pistolaEditRef = null;

function abrirAdicionarPistola() {
  pistolaEditRef = "__new__";
  ["num","nome","password","cn","sn","mac","operador","armazem","prontas"].forEach(f => { const node = el("editP_" + f); if (node) node.value = ""; });
  const h3 = document.querySelector('#modalEditarPistola h3'); if (h3) h3.textContent = 'Adicionar Pistola CK65';
  const sub = document.querySelector('#modalEditarPistola .section-subtitle'); if (sub) sub.textContent = 'Criar uma nova pistola';
  if (el("modalEditarPistola")) el("modalEditarPistola").style.display = "flex";
}

function editarPistola(ref) {
  const item = itemPorRef(window.pistolasData, ref);
  if (!item) return mostrarMensagem("Pistola não encontrada.", "erro");
  pistolaEditRef = ref;
  ["num","nome","password","cn","sn","mac","operador","armazem","prontas"].forEach(f => {
    const node = el("editP_" + f);
    if (node) node.value = item[f] || "";
  });
  if (el("modalEditarPistola")) el("modalEditarPistola").style.display = "flex";
}

function fecharEditarPistola() {
  pistolaEditRef = null;
  const h3 = document.querySelector('#modalEditarPistola h3'); if (h3) h3.textContent = 'Editar Pistola CK65';
  const sub = document.querySelector('#modalEditarPistola .section-subtitle'); if (sub) sub.textContent = 'Editar a pistola selecionada';
  if (el("modalEditarPistola")) el("modalEditarPistola").style.display = "none";
}

async function guardarEdicaoPistola() {
  if (pistolaEditRef === null || typeof pistolaEditRef === "undefined") return mostrarMensagem("Nenhuma pistola selecionada.", "erro");
  const isNovaPistola = pistolaEditRef === "__new__";
  const payload = {};
  ["num","nome","password","cn","sn","mac","operador","armazem","prontas"].forEach(f => {
    payload[f] = el("editP_" + f) ? el("editP_" + f).value : "";
  });

  try {
    if (isNovaPistola) {
      if (window.db) {
        const docRef = await db.collection("pistolas").add(payload);
        window.pistolasData.unshift({ idDoc: docRef.id, ...payload });
      } else {
        window.pistolasData.unshift({ _ref: `local-pistola-${Date.now()}`, ...payload });
      }
    } else if (typeof pistolaEditRef === "string" && window.db) {
      await db.collection("pistolas").doc(pistolaEditRef).update(payload);
      const idx = idxPorRef(window.pistolasData, pistolaEditRef);
      if (idx >= 0) window.pistolasData[idx] = { ...window.pistolasData[idx], ...payload };
    } else {
      const idx = idxPorRef(window.pistolasData, pistolaEditRef);
      if (idx >= 0) window.pistolasData[idx] = { ...window.pistolasData[idx], ...payload };
    }
    guardarPistolasLocal();
    fecharEditarPistola();
    filtrarPistolasComFiltros();
    mostrarMensagem(isNovaPistola ? "Pistola adicionada com sucesso." : "Pistola atualizada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar a pistola.", "erro");
  }
}

async function apagarPistola(ref) {
  if (!confirm("Queres apagar esta pistola?")) return;
  try {
    if (typeof ref === "string" && window.db) {
      await db.collection("pistolas").doc(ref).delete();
    }
    const idx = idxPorRef(window.pistolasData, ref);
    if (idx >= 0) window.pistolasData.splice(idx, 1);
    guardarPistolasLocal();
    filtrarPistolasComFiltros();
    mostrarMensagem("Pistola apagada com sucesso.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar a pistola.", "erro");
  }
}


function abrirAdicionarImpressora() {
  [["addImp_modelo",""],["addImp_serie",""],["addImp_armazem",""],["addImp_localizacao",""],["addImp_ip",""]].forEach(([id,v]) => { const node = el(id); if (node) node.value = v; });
  if (el("modalAdicionarImpressora")) el("modalAdicionarImpressora").style.display = "flex";
}

function fecharAdicionarImpressora() {
  if (el("modalAdicionarImpressora")) el("modalAdicionarImpressora").style.display = "none";
}

async function guardarNovaImpressora() {
  const payload = {
    modelo: el("addImp_modelo")?.value || "",
    serie: el("addImp_serie")?.value || "",
    armazem: el("addImp_armazem")?.value || "",
    localizacao: el("addImp_localizacao")?.value || "",
    ip: el("addImp_ip")?.value || ""
  };
  if (!normalizarTexto(payload.modelo) || !normalizarTexto(payload.serie) || !normalizarTexto(payload.ip)) {
    return mostrarMensagem("Preenche pelo menos Modelo, Série e IP.", "erro");
  }
  impressorasData.unshift({ _ref: `local-impressora-${Date.now()}`, ...payload });
  guardarImpressorasLocal();
  fecharAdicionarImpressora();
  filtrarImpressoras();
  mostrarMensagem("Impressora adicionada com sucesso.");
}

window.editarPorta = editarPorta;
window.fecharEditarPorta = fecharEditarPorta;
window.guardarEdicaoPorta = guardarEdicaoPorta;
window.apagarPorta = apagarPorta;
window.abrirAdicionarPorta = abrirAdicionarPorta;
window.abrirAdicionarImpressora = abrirAdicionarImpressora;
window.fecharAdicionarImpressora = fecharAdicionarImpressora;
window.guardarNovaImpressora = guardarNovaImpressora;

window.editarUser = editarUser;
window.fecharEditarUser = fecharEditarUser;
window.guardarEdicaoUser = guardarEdicaoUser;
window.apagarUser = apagarUser;

window.editarPistola = editarPistola;
window.fecharEditarPistola = fecharEditarPistola;
window.guardarEdicaoPistola = guardarEdicaoPistola;
window.apagarPistola = apagarPistola;
window.abrirAdicionarPistola = abrirAdicionarPistola;


/* ===== MODO VISUAL ===== */
function modoVisualInit() {
  if (window.matchMedia?.("(pointer: coarse)")?.matches || document.body.classList.contains("device-tablet") || document.body.classList.contains("device-phone")) return;
  document.body.classList.add("modo-visual-on");
  document.querySelectorAll(".panel, .pc-card, .dashboard-card, .stock-card, .history-card").forEach((node, index) => {
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    setTimeout(() => {
      node.style.transition = "opacity 0.24s ease, transform 0.24s ease";
      node.style.opacity = "1";
      node.style.transform = "translateY(0)";
    }, 25 * Math.min(index, 10));
  });
}

window.addEventListener("load", modoVisualInit);


/* ===== MODO GESTOR EXTREMO ===== */
function getTopConsumoEquipamentos(limit = 4) {
  const map = new Map();
  historicoGlobal.forEach(item => {
    const key = `${item.equipamento || "-"} · ${item.localizacao || "-"}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a,b) => b[1]-a[1]).slice(0, limit);
}

function getTopProblemasDoDia(limit = 3) {
  const buckets = getCriticalityBucketsAppBraga();
  const topLocs = getTopLocalizacoesHistorico(2);
  const ultimos = getUltimosMovimentos(1);
  const problems = [];

  if (buckets.critical > 0) {
    problems.push(`Existem ${buckets.critical} impressoras em estado crítico.`);
  }
  if (buckets.warning > 0) {
    problems.push(`Existem ${buckets.warning} impressoras em zona de atenção.`);
  }
  if (topLocs.length) {
    problems.push(`Maior pressão recente em ${topLocs[0][0]} com ${topLocs[0][1]} movimentos.`);
  }
  if (ultimos.length) {
    const u = ultimos[0];
    problems.push(`Último movimento: ${u.equipamento || "-"} · ${u.cor || "-"} · ${u.localizacao || "-"}.`);
  }

  return problems.slice(0, limit);
}

function getPrioridadeMaximaGestor(limit = 4) {
  const rows = [];
  impressorasData.forEach(item => {
    const info = tonerInfoState[item.ip] || null;
    const colors = Array.isArray(info?.colors) ? info.colors : [];
    const crit = colors.filter(c => isTonerEmpty(c.percent));
    if (crit.length) {
      rows.push({
        label: `${item.modelo} · ${item.localizacao}`,
        detail: crit.map(c => `${c.label}: ${c.percent}%`).join(" | ")
      });
    }
  });
  return rows.slice(0, limit);
}

function renderModoGestorExtremo() {
  const board = el("gestorExtremeBoard");
  const prioridade = el("gestorPrioridadeMaxima");
  const consumo = el("gestorTopConsumo");
  const problemas = el("gestorTopProblemas");
  if (!board && !prioridade && !consumo && !problemas) return;

  const buckets = getCriticalityBucketsAppBraga();
  const topLocs = getTopLocalizacoesHistorico(4);
  const topEquip = getTopConsumoEquipamentos(4);
  const topProb = getTopProblemasDoDia(3);
  const maxRows = getPrioridadeMaximaGestor(4);

  if (board) {
    board.innerHTML = `
      <div class="gestor-grid-hero">
        <div class="gestor-hero-card">
          <div class="gestor-hero-title">Estado executivo</div>
          <div class="gestor-hero-value">${buckets.critical > 0 ? "Pressão" : "Estável"}</div>
          <div class="gestor-hero-note">Visão imediata da operação para decidir onde agir primeiro.</div>
          <div class="gestor-chip-row">
            <span class="gestor-chip red">Críticos: ${buckets.critical}</span>
            <span class="gestor-chip yellow">Atenção: ${buckets.warning}</span>
            <span class="gestor-chip green">Stock: ${stockGlobal.length}</span>
          </div>
        </div>
        <div class="gestor-card">
          <h4>Movimento recente</h4>
          <div class="gestor-mini-value">${historicoGlobal.length}</div>
          <div class="meta-line">Total de registos usados no histórico.</div>
        </div>
        <div class="gestor-card">
          <h4>Capacidade atual</h4>
          <div class="gestor-mini-value">${stockGlobal.length}</div>
          <div class="meta-line">Itens disponíveis agora em stock.</div>
        </div>
        <div class="gestor-card">
          <h4>Base instalada</h4>
          <div class="gestor-mini-value">${pcsGlobal.length}</div>
          <div class="meta-line">PCs registados no sistema.</div>
        </div>
      </div>
    `;
  }

  if (prioridade) {
    prioridade.innerHTML = maxRows.length
      ? maxRows.map(item => `<div class="gestor-priority-card"><h4>${item.label}</h4><div class="meta-line">${item.detail}</div></div>`).join("")
      : `<div class="gestor-priority-card"><h4>Sem prioridade máxima</h4><div class="meta-line">Não existem impressoras com toner a 0% neste momento.</div></div>`;
  }

  if (consumo) {
    consumo.innerHTML = `
      <div class="gestor-card">
        <h4>Top Localizações</h4>
        <ul class="gestor-list">
          ${topLocs.length ? topLocs.map(([k,v]) => `<li>${k} — ${v} movimentos</li>`).join("") : "<li>Sem dados suficientes</li>"}
        </ul>
      </div>
      <div class="gestor-card">
        <h4>Top Equipamentos</h4>
        <ul class="gestor-list">
          ${topEquip.length ? topEquip.map(([k,v]) => `<li>${k} — ${v}</li>`).join("") : "<li>Sem dados suficientes</li>"}
        </ul>
      </div>
    `;
  }

  if (problemas) {
    problemas.innerHTML = topProb.length
      ? topProb.map(txt => `<div class="gestor-alert-card"><h4>Ponto de gestão</h4><div class="meta-line">${txt}</div></div>`).join("")
      : `<div class="gestor-alert-card"><h4>Sem alertas do dia</h4><div class="meta-line">Ainda não há dados suficientes para destacar problemas.</div></div>`;
  }
}



/* ===== MELHORIAS 1 2 3 4 5 7 8 10 ===== */
const STOCK_MIN_DEFAULTS = {
  "Braga - Ilha 01": 1,
  "Braga - Ilha 02": 1,
  "Braga - Ilha 03": 1,
  "Braga - Ilha 04": 1,
  "Braga - Ilha 05": 1,
  "Braga - Balcão 01": 2,
  "Braga - Balcão 02": 2,
  "Braga - Dep. Logistica": 2,
  "Braga - G/Encomendas": 1,
  "Braga - Devoluções": 1,
  "Braga - Escritorio": 1,
  "Vila Real - Ilha 01": 1,
  "Vila Real - Ilha 02": 1,
  "Vila Real - Ilha 03": 1,
  "Sem Localização": 1
};

let stockEditModalId = null;
let historicoEditModalId = null;

function debounceAppBraga(fn, wait = 180) {
  let t = null;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function tryRenderAppBraga(fn) {
  try { fn(); } catch (e) { console.error(e); }
}

function loadStockMinConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("stockMinConfig") || "{}");
    return { ...STOCK_MIN_DEFAULTS, ...saved };
  } catch (e) {
    console.error(e);
    return { ...STOCK_MIN_DEFAULTS };
  }
}

function saveStockMinConfig(cfg) {
  localStorage.setItem("stockMinConfig", JSON.stringify(cfg || {}));
}

function normalizeLocMin(loc) {
  const raw = String(loc || "Sem Localização");
  if (raw.includes(" - ")) {
    const parts = raw.split(" - ");
    if (parts.length >= 3) return `${parts[1]} - ${parts[2]}`;
  }
  return raw;
}

function getStockByLocationCounts() {
  const map = {};
  stockGlobal.forEach(item => {
    const key = normalizeLocMin(item.localizacao);
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function renderStockMinimoPainel() {
  const host = el("stockMinimoPainel");
  if (!host) return;
  const config = loadStockMinConfig();
  const counts = getStockByLocationCounts();
  host.innerHTML = Object.keys(config).map(loc => {
    const atual = counts[loc] || 0;
    const minimo = Number(config[loc] || 0);
    const cls = atual < minimo ? "item-danger" : atual === minimo ? "item-warning" : "item-ok";
    const estado = atual < minimo ? "Abaixo do mínimo" : atual === minimo ? "No mínimo" : "Acima do mínimo";
    return `<div class="stock-min-card"><strong>${loc}</strong><div class="meta-line">Atual: <span class="meta-value ${cls}">${atual}</span></div><div class="meta-line">Mínimo: <span class="meta-value">${minimo}</span></div><div class="meta-line">${estado}</div></div>`;
  }).join("");
}

function renderStockMinimoConfig() {
  const host = el("stockMinimoConfigList");
  if (!host) return;
  const cfg = loadStockMinConfig();
  host.innerHTML = `<div class="minimo-grid">${
    Object.keys(cfg).map(loc => `
      <div class="minimo-item">
        <label>${loc}</label>
        <input type="number" min="0" value="${cfg[loc]}" data-stock-min-loc="${loc}">
      </div>
    `).join("")
  }</div>`;
}

function guardarStockMinimoConfig() {
  const inputs = document.querySelectorAll("[data-stock-min-loc]");
  const cfg = {};
  inputs.forEach(inp => { cfg[inp.getAttribute("data-stock-min-loc")] = Math.max(0, parseInt(inp.value || "0", 10) || 0); });
  saveStockMinConfig(cfg);
  mostrarMensagem("Stock mínimo guardado com sucesso.");
  tryRenderAppBraga(renderStockMinimoPainel);
  tryRenderAppBraga(renderAlertasInteligentes);
}

function resetStockMinimoConfig() {
  saveStockMinConfig(STOCK_MIN_DEFAULTS);
  renderStockMinimoConfig();
  renderStockMinimoPainel();
  renderAlertasInteligentes();
  mostrarMensagem("Stock mínimo reposto.");
}

function ensureLoteFieldOnEdit() {
  const item = localStorage.getItem("editarToner");
  prepararCodigoEtiquetaTonerAppBraga(false);
  if (!item || !el("lote")) return;
  try {
    const toner = JSON.parse(item);
    el("lote").value = toner.lote || "";
    if (el("sdsRef")) el("sdsRef").value = toner.sdsRef || "";
    if (el("dataFolha")) el("dataFolha").value = toner.dataFolha || "";
    if (el("codigoEtiqueta")) el("codigoEtiqueta").value = toner.codigoEtiqueta || toner.codigoToner || getCodigoEtiquetaAtualAppBraga();
  } catch (e) { console.error(e); }
}

function extractLoteFromText(text) {
  const t = String(text || "").toUpperCase();
  const m = t.match(/(?:LOTE|LOT|BATCH)\s*[:#-]?\s*([A-Z0-9-]{4})/);
  return m ? m[1] : "";
}

function extractSdsRefFromText(text) {
  const original = String(text || "");

  function cleanSdsCandidate(value, allowOcrFive = false) {
    let v = String(value || "")
      .replace(/\s+/g, "")
      .replace(/[;,.)]+$/g, "")
      .toUpperCase();

    if (allowOcrFive && /^5\d{7,12}$/.test(v)) v = `S${v.slice(1)}`;
    if (/^S[-:]?\d{7,12}$/.test(v)) return `S${v.replace(/^S[-:]?/i, "")}`;
    return "";
  }

  const lines = original
    .split(/\r?\n/)
    .map(line => line.replace(/[|]/g, "I").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    if (!/\bSDS\b/i.test(lines[i])) continue;

    const joined = [lines[i], lines[i + 1] || "", lines[i + 2] || ""].join(" ");
    const afterLabel = joined.replace(/^.*?\bSDS\b\s*(?:REF|REFERENCE|REFERENCIA|REFER.NCIA)?\.?\s*[:#\-]?\s*/i, "");
    const candidates = [
      afterLabel.match(/\b([S5]\s*[-:]?\s*\d(?:[\s.-]*\d){7,12})\b/i),
      joined.match(/\b([S5]\s*[-:]?\s*\d(?:[\s.-]*\d){7,12})\b/i),
      afterLabel.match(/\b(\d{8,12})\b/)
    ];

    for (const candidate of candidates) {
      if (!candidate || !candidate[1]) continue;
      const raw = String(candidate[1]);
      const fixed = cleanSdsCandidate(/^[s5]/i.test(raw) ? raw : `S${raw}`, true);
      if (fixed) return fixed;
    }
  }

  const normalized = original
    .replace(/[\r\n]+/g, " ")
    .replace(/[|]/g, "I")
    .replace(/\s+/g, " ")
    .trim();

  const kyocera = normalized.match(/\bSDS\s*REF\.?\s*[:#\-]?\s*([S5]\s*[-:]?\s*\d(?:[\s.-]*\d){7,12})\b/i);
  if (kyocera && kyocera[1]) {
    const fixed = cleanSdsCandidate(kyocera[1], true);
    if (fixed) return fixed;
  }

  const nearSds = normalized.match(/\bSDS\b.{0,80}?\b([S5]\s*[-:]?\s*\d(?:[\s.-]*\d){7,12})\b/i);
  if (nearSds && nearSds[1]) {
    const fixed = cleanSdsCandidate(nearSds[1], true);
    if (fixed) return fixed;
  }

  const fallback = normalized.match(/\b(S\d{7,12})\b/i);
  if (fallback && fallback[1]) {
    const fixed = cleanSdsCandidate(fallback[1]);
    if (fixed) return fixed;
  }

  return "";
}
function enhanceScannerStatus(extra = "") {
  const box = el("scannerSmartStatus");
  if (!box) return;
  box.innerText = extra || "Leitura pronta.";
}

function exportCsvFile(filename, headers, rows) {
  const content = [headers.join(";"), ...rows.map(r => headers.map(h => String(r[h] ?? "").replace(/\n/g, " ")).join(";"))].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportarExcelStock() {
  if (!stockGlobal.length) return mostrarMensagem("Não há stock para exportar.", "erro");
  exportCsvFile("stock_app_braga.csv", ["idInterno","codigoEtiqueta","sdsRef","equipamento","localizacao","cor","lote","data","dataFolha"], stockGlobal);
}

function exportarExcelHistorico() {
  if (!historicoGlobal.length) return mostrarMensagem("Não há histórico para exportar.", "erro");
  exportCsvFile("historico_app_braga.csv", ["idInterno","codigoEtiqueta","sdsRef","equipamento","localizacao","cor","lote","data","dataFolha"], historicoGlobal);
}

function exportarExcelTudo() {
  const rows = [...stockGlobal.map(x => ({...x, origem:"stock"})), ...historicoGlobal.map(x => ({...x, origem:"historico"}))];
  if (!rows.length) return mostrarMensagem("Não há dados para exportar.", "erro");
  exportCsvFile("dados_completos_app_braga.csv", ["origem","idInterno","codigoEtiqueta","sdsRef","equipamento","localizacao","cor","lote","data","dataFolha"], rows);
}

function filtrarHistoricoAvancado() {
  const texto = normalizarTexto(el("searchHistorico")?.value || "");
  const dFrom = el("filterHistoricoFrom")?.value || "";
  const dTo = el("filterHistoricoTo")?.value || "";
  const fLoc = normalizarTexto(el("filterHistoricoLocal")?.value || "");
  const fEq = normalizarTexto(el("filterHistoricoEquipamento")?.value || "");
  const fCor = normalizarTexto(el("filterHistoricoCor")?.value || "");

  const items = historicoGlobal.filter(t => {
    const data = String(t.data || "");
    const okText = !texto || [t.idInterno,t.codigoEtiqueta,t.sdsRef,t.equipamento,t.localizacao,t.cor,t.lote].some(v => normalizarTexto(v).includes(texto));
    const okFrom = !dFrom || data >= dFrom;
    const okTo = !dTo || data <= dTo;
    const okLoc = !fLoc || normalizarTexto(t.localizacao).includes(fLoc);
    const okEq = !fEq || normalizarTexto(t.equipamento).includes(fEq);
    const okCor = !fCor || normalizarTexto(t.cor).includes(fCor);
    return okText && okFrom && okTo && okLoc && okEq && okCor;
  });
  renderHistoricoCards(items);
}

function abrirEditarStockModal(id) {
  const item = stockGlobal.find(x => x.idDoc === id);
  if (!item) return mostrarMensagem("Item de stock não encontrado.", "erro");
  stockEditModalId = id;
  if (el("editStockEquipamento")) el("editStockEquipamento").value = item.equipamento || "";
  if (el("editStockCor")) el("editStockCor").value = item.cor || "";
  if (el("editStockLocalizacao")) el("editStockLocalizacao").value = item.localizacao || "";
  if (el("editStockLote")) el("editStockLote").value = item.lote || "";
  if (el("editStockSdsRef")) el("editStockSdsRef").value = item.sdsRef || "";
  if (el("editStockCodigoEtiqueta")) el("editStockCodigoEtiqueta").value = item.codigoEtiqueta || "";
  if (el("editStockData")) el("editStockData").value = item.data || "";
  if (el("editStockDataFolha")) el("editStockDataFolha").value = item.dataFolha || "";
  if (el("modalEditarStock")) el("modalEditarStock").style.display = "flex";
}

function fecharEdicaoStockModal() {
  stockEditModalId = null;
  if (el("modalEditarStock")) el("modalEditarStock").style.display = "none";
}

async function guardarEdicaoStockModal() {
  if (!stockEditModalId) return;
  const payload = {
    equipamento: el("editStockEquipamento")?.value || "",
    cor: el("editStockCor")?.value || "",
    localizacao: el("editStockLocalizacao")?.value || "",
    lote: el("editStockLote")?.value || "",
    sdsRef: el("editStockSdsRef")?.value || "",
    codigoEtiqueta: el("editStockCodigoEtiqueta")?.value || "",
    data: el("editStockData")?.value || "",
    dataFolha: el("editStockDataFolha")?.value || ""
  };
  try {
    await db.collection("stock").doc(stockEditModalId).update(payload);
    fecharEdicaoStockModal();
    mostrarMensagem("Stock atualizado.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar stock.", "erro");
  }
}

async function apagarStockItem(id) {
  if (!confirm("Queres apagar este item do stock?")) return;
  try {
    await db.collection("stock").doc(id).delete();
    mostrarMensagem("Item de stock apagado.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar stock.", "erro");
  }
}

function abrirEditarHistoricoModal(id) {
  const item = historicoGlobal.find(x => x.idDoc === id);
  if (!item) return mostrarMensagem("Histórico não encontrado.", "erro");
  historicoEditModalId = id;
  if (el("editHistoricoEquipamento")) el("editHistoricoEquipamento").value = item.equipamento || "";
  if (el("editHistoricoCor")) el("editHistoricoCor").value = item.cor || "";
  if (el("editHistoricoLocalizacao")) el("editHistoricoLocalizacao").value = item.localizacao || "";
  if (el("editHistoricoLote")) el("editHistoricoLote").value = item.lote || "";
  if (el("editHistoricoSdsRef")) el("editHistoricoSdsRef").value = item.sdsRef || "";
  if (el("editHistoricoData")) el("editHistoricoData").value = item.data || "";
  if (el("editHistoricoDataFolha")) el("editHistoricoDataFolha").value = item.dataFolha || "";
  if (el("modalEditarHistorico")) el("modalEditarHistorico").style.display = "flex";
}

function fecharEdicaoHistoricoModal() {
  historicoEditModalId = null;
  if (el("modalEditarHistorico")) el("modalEditarHistorico").style.display = "none";
}

async function guardarEdicaoHistoricoModal() {
  if (!historicoEditModalId) return;
  const payload = {
    equipamento: el("editHistoricoEquipamento")?.value || "",
    cor: el("editHistoricoCor")?.value || "",
    localizacao: el("editHistoricoLocalizacao")?.value || "",
    lote: el("editHistoricoLote")?.value || "",
    sdsRef: el("editHistoricoSdsRef")?.value || "",
    data: el("editHistoricoData")?.value || "",
    dataFolha: el("editHistoricoDataFolha")?.value || ""
  };
  try {
    await db.collection("historico").doc(historicoEditModalId).update(payload);
    fecharEdicaoHistoricoModal();
    mostrarMensagem("Histórico atualizado.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao atualizar histórico.", "erro");
  }
}

function buildAlertasInteligentes() {
  const cfg = loadStockMinConfig();
  const counts = getStockByLocationCounts();
  const rows = [];
  Object.keys(cfg).forEach(loc => {
    const atual = counts[loc] || 0;
    const minimo = Number(cfg[loc] || 0);
    if (atual < minimo) rows.push({ tipo: "stock", titulo: loc, detalhe: `Stock abaixo do mínimo: ${atual}/${minimo}` });
  });

  if (typeof impressorasData !== "undefined" && typeof tonerInfoState !== "undefined") {
    impressorasData.forEach(item => {
      const info = tonerInfoState[item.ip] || null;
      const colors = Array.isArray(info?.colors) ? info.colors : [];
      const crit = colors.filter(c => isTonerEmpty(c.percent));
      if (crit.length) rows.push({ tipo: "printer", titulo: `${item.modelo} · ${item.localizacao}`, detalhe: crit.map(c => `${c.label}: ${c.percent}%`).join(" | ") });
    });
  }
  return rows.slice(0, 8);
}

function renderAlertasInteligentes() {
  const rows = buildAlertasInteligentes();
  ["alertasInteligentesDashboard","alertasInteligentesImpressoras"].forEach(id => {
    const host = el(id);
    if (!host) return;
    host.innerHTML = rows.length ? rows.map(r => `<div class="alert-inteligente-card"><strong>${r.titulo}</strong><div class="meta-line">${r.detalhe}</div></div>`).join("") : `<div class="alert-inteligente-card"><strong>Sem alertas</strong><div class="meta-line">Não existem alertas inteligentes ativos.</div></div>`;
  });
}

const filtrarStockDebounced = debounceAppBraga(function() {
  const input = el("search");
  if (!input) return;
  const txt = input.value.toLowerCase();
  const filtrados = stockGlobal.filter(t =>
    normalizarTexto(t.idInterno).includes(txt) ||
    normalizarTexto(t.equipamento).includes(txt) ||
    normalizarTexto(t.cor).includes(txt) ||
    normalizarTexto(t.localizacao).includes(txt) ||
    normalizarTexto(t.lote).includes(txt) ||
    normalizarTexto(t.sdsRef).includes(txt) ||
    normalizarTexto(t.codigoEtiqueta).includes(txt)
  );
  renderStockCards(filtrados);
}, 120);

const filtrarDashDebounced = debounceAppBraga(function() {
  renderDashboardCards();
}, 120);

window.exportarExcelStock = exportarExcelStock;
window.exportarExcelHistorico = exportarExcelHistorico;
window.exportarExcelTudo = exportarExcelTudo;
window.guardarStockMinimoConfig = guardarStockMinimoConfig;
window.resetStockMinimoConfig = resetStockMinimoConfig;
window.filtrarHistoricoAvancado = filtrarHistoricoAvancado;
window.abrirEditarStockModal = abrirEditarStockModal;
window.fecharEdicaoStockModal = fecharEdicaoStockModal;
window.guardarEdicaoStockModal = guardarEdicaoStockModal;
window.apagarStockItem = apagarStockItem;
window.abrirEditarHistoricoModal = abrirEditarHistoricoModal;
window.fecharEdicaoHistoricoModal = fecharEdicaoHistoricoModal;
window.guardarEdicaoHistoricoModal = guardarEdicaoHistoricoModal;




/* =========================
   ETIQUETAS WORD PARTILHADAS
========================= */
try { BACKUP_KEYS_APP_BRAGA.etiquetas = "appBraga_backup_etiquetas"; } catch (e) {}
let etiquetasWordGlobal = [];

function formatDatePTShared(valor) {
  const raw = String(valor || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  return raw;
}

function parseLocalizacaoEtiquetaShared(loc) {
  const raw = String(loc || "").trim();
  let serie = "";
  let localCurto = raw || "Sem Localização";
  let armazem = "";
  const parts = raw.split(" - ").map(v => v.trim()).filter(Boolean);
  if (parts.length >= 3) {
    serie = parts[0] || "";
    armazem = parts[1] || "";
    localCurto = parts.slice(2).join(" - ") || localCurto;
  } else {
    const printer = (typeof impressorasData !== "undefined" && Array.isArray(impressorasData)) ? impressorasData.find(p => normalizarTexto(raw).includes(normalizarTexto(p.localizacao)) || normalizarTexto(raw).includes(normalizarTexto(p.serie))) : null;
    if (printer) {
      serie = printer.serie || "";
      armazem = printer.armazem || "";
      localCurto = printer.localizacao || localCurto;
    }
  }
  return { serie, localCurto, armazem, localizacaoRaw: raw };
}

function montarPayloadEtiquetaPartilhada(extra = {}) {
  const loc = extra.localizacao || ((el("localizacao") && el("localizacao").value) || "");
  const info = parseLocalizacaoEtiquetaShared(loc);
  const dataFolha = extra.dataFolha || ((el("dataFolha") && el("dataFolha").value) || "");
  const dataScan = extra.data || ((el("data") && el("data").value) || "");
  const equipamento = extra.equipamento || ((el("equipamento") && el("equipamento").value) || "");
  const cor = extra.cor || ((el("cor") && el("cor").value) || "");
  const lote = extra.lote || ((el("lote") && el("lote").value) || "");
  const sdsRef = extra.sdsRef || ((el("sdsRef") && el("sdsRef").value) || "");
  const origem = extra.origem || "scan";
  const codigoEtiqueta = extra.codigoEtiqueta || getCodigoEtiquetaAtualAppBraga();
  return {
    serie: info.serie || extra.serie || "SEM SÉRIE",
    localCurto: info.localCurto || "Sem Localização",
    armazem: info.armazem || extra.armazem || "",
    localizacao: info.localizacaoRaw || loc || "Sem Localização",
    dataEtiqueta: formatDatePTShared(dataScan || dataFolha) || "Sem Data",
    dataScan: dataScan || "",
    data: dataScan || "",
    dataFolha: dataFolha || "",
    equipamento: equipamento || "",
    cor: cor || "",
    lote: lote || "",
    sdsRef: sdsRef || "",
    codigoEtiqueta,
    codigoScan: extra.codigoScan || buildPayloadQrTonerAppBraga(codigoEtiqueta),
    origem,
    created: Date.now()
  };
}

async function guardarEtiquetaPartilhada(extra = {}) {
  if (!db || !db.collection) return null;
  try {
    const payload = montarPayloadEtiquetaPartilhada(extra);
    const ref = await db.collection("etiquetasWord").add(payload);
    return { idDoc: ref.id, ...payload };
  } catch (e) {
    console.error("Erro ao guardar etiqueta partilhada:", e);
    return null;
  }
}

async function gerarWordEtiquetaPartilhada(dados, opts = {}) {
  try {
    if (typeof docx === "undefined") {
      mostrarMensagem("Biblioteca Word não carregada.", "erro");
      return false;
    }
    const payload = montarPayloadEtiquetaPartilhada(dados || {});
    const { Document, Packer, Paragraph, AlignmentType, TextRun } = docx;
    const doc = new Document({
      creator: "App Braga",
      title: "Etiqueta Toner",
      sections: [{ children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 3200, after: 500 }, children: [ new TextRun({ text: payload.localCurto, bold: true, size: 42 }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 2800 }, children: [ new TextRun({ text: payload.serie, bold: true, size: 64 }) ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [ new TextRun({ text: payload.dataEtiqueta, bold: true, size: 56 }) ] })
      ] }]
    });
    const blob = await Packer.toBlob(doc);
    const fileName = `Etiqueta_${String(payload.localCurto || "Etiqueta").replace(/\s+/g, "_")}_${payload.serie || "SEM_SERIE"}.docx`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 1200);
    if (opts.saveRecord !== false) await guardarEtiquetaPartilhada(payload);
    if (!opts.silent) mostrarMensagem("Etiqueta guardada e pronta para download.");
    return true;
  } catch (e) {
    console.error("Erro ao gerar etiqueta partilhada:", e);
    mostrarMensagem("Erro ao gerar a etiqueta Word.", "erro");
    return false;
  }
}

window.gerarWordEtiquetaPartilhada = gerarWordEtiquetaPartilhada;

function getEtiquetaDateValue(item = {}) {
  const candidates = [item.data, item.dataScan, item.dataFolha, item.dataEtiqueta, item.createdAt, item.created];
  for (const value of candidates) {
    if (!value) continue;
    if (typeof value === "number") return value;
    if (value.seconds) return value.seconds * 1000;
    const text = String(value);
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`).getTime();
    const pt = text.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})/);
    if (pt) return new Date(`${pt[3]}-${pt[2]}-${pt[1]}T12:00:00`).getTime();
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function renderEtiquetasWordCards() {
  const host = el("listaEtiquetasWord");
  if (!host) return;
  const texto = normalizarTexto(el("searchEtiquetasWord")?.value || "");
  const origem = normalizarTexto(el("filterEtiquetasOrigem")?.value || "");
  let items = Array.isArray(etiquetasWordGlobal) ? [...etiquetasWordGlobal] : [];
  if (origem) items = items.filter(x => normalizarTexto(x.origem).includes(origem));
  if (texto) {
    items = items.filter(x => [x.serie,x.localCurto,x.localizacao,x.equipamento,x.cor,x.lote,x.sdsRef,x.codigoEtiqueta,x.dataEtiqueta].some(v => normalizarTexto(v).includes(texto)));
  }
  items.sort((a, b) => getEtiquetaDateValue(b) - getEtiquetaDateValue(a));
  setText("countEtiquetasTotal", items.length);
  const hoje = new Date();
  const ymd = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  setText("countEtiquetasStock", items.filter(x => String(x.data || x.dataFolha || "").startsWith(ymd) || String(x.dataEtiqueta || "").includes(`${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`)).length);
  setText("countEtiquetasHistorico", new Set(items.map(x => x.serie || x.localCurto || x.localizacao)).size);
  if (!items.length) {
    host.innerHTML = `<div class="panel empty-state"><h3>Sem etiquetas</h3><p>Faz scan no iPhone e a etiqueta aparece aqui para download no PC.</p></div>`;
    return;
  }
  host.innerHTML = items.map(t => `
    <div class="stock-card">
      <div class="stock-id">${t.localCurto || t.localizacao || 'Etiqueta'}</div>
      <div class="meta-line">Série: <span class="meta-value">${t.serie || '-'}</span></div>
      <div class="meta-line">Armazém: <span class="meta-value">${t.armazem || '-'}</span></div>
      <div class="meta-line">Localização: <span class="meta-value">${t.localizacao || '-'}</span></div>
      <div class="meta-line">Equipamento: <span class="meta-value">${t.equipamento || '-'}</span></div>
      <div class="meta-line">Cor: <span class="meta-value">${t.cor || '-'}</span></div>
      <div class="meta-line">Lote: <span class="meta-value">${t.lote || '-'}</span></div>
      <div class="meta-line">SDS Ref: <span class="meta-value">${t.sdsRef || '-'}</span></div>
      <div class="meta-line">Código: <span class="meta-value">${t.codigoEtiqueta || '-'}</span></div>
      <div class="meta-line">Data: <span class="meta-value">${t.dataEtiqueta || '-'}</span></div>
      <div class="meta-line">Origem: <span class="meta-value">${t.origem || 'scan'}</span></div>
      <div class="card-actions">
        <button class="small-btn btn-use" onclick="regerarEtiquetaWordPartilhada('${t.idDoc}')">Imprimir</button>
        <button class="small-btn btn-delete" onclick="apagarEtiquetaWordPartilhada('${t.idDoc}')">Apagar</button>
      </div>
    </div>`).join("");
}


function montarHtmlEtiquetaImpressao(item) {
  const linhas = [
    ["Local", item.localCurto || item.localizacao],
    ["Série", item.serie],
    ["Armazém", item.armazem],
    ["Equipamento", item.equipamento],
    ["Cor", item.cor],
    ["Lote", item.lote],
    ["SDS Ref", item.sdsRef],
    ["Data", item.dataScan || item.dataEtiqueta || item.data || item.dataFolha],
    ["Origem", item.origem]
  ].filter(([,v]) => String(v || '').trim());

  const codigoScan = item.codigoScan || (item.codigoEtiqueta ? buildPayloadQrTonerAppBraga(item.codigoEtiqueta) : "");
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c] || c));
  const rows = linhas.map(([k,v]) => `<div class="etq-row"><div class="etq-key">${escapeHtml(k)}</div><div class="etq-val">${escapeHtml(v)}</div></div>`).join('');
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Etiqueta</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  html, body { margin:0; padding:0; width:100mm; height:150mm; font-family: Arial, sans-serif; }
  body { box-sizing:border-box; padding:8mm; color:#000; }
  .etq-wrap { width:100%; height:100%; display:flex; flex-direction:column; justify-content:flex-start; }
  .etq-title { font-size:22px; font-weight:1000; margin:0 32mm 6mm 0; }
  .etq-row { display:flex; flex-direction:column; margin:0 0 3.5mm; }
  .etq-key { font-size:11px; font-weight:1000; text-transform:uppercase; letter-spacing:.4px; }
  .etq-val { font-size:16px; line-height:1.25; word-break:break-word; }
  .etq-qr { position:absolute; top:8mm; right:8mm; width:22mm; height:22mm; }
  .etq-code { font-size:9px; font-weight:900; margin-top:2mm; word-break:break-all; }
</style>
</head>
<body>
  <div class="etq-wrap">
    <div class="etq-title">${escapeHtml(item.localCurto || item.localizacao || 'Etiqueta')}</div>
    ${rows}
    ${codigoScan ? `<div class="etq-qr" data-etq-qr="${escapeHtml(codigoScan)}"></div>` : ""}
  </div>
</body>
</html>`;
}

async function regerarEtiquetaWordPartilhada(id) {
  const item = etiquetasWordGlobal.find(x => x.idDoc === id);
  if (!item) return mostrarMensagem("Etiqueta não encontrada.", "erro");
  try {
    const existente = document.getElementById('printAreaEtiquetaAppBraga');
    if (existente) existente.remove();
    const overlay = document.createElement('div');
    overlay.id = 'printAreaEtiquetaAppBraga';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = '#fff';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = montarHtmlEtiquetaOverlay(item);
    document.body.appendChild(overlay);
    renderQrCodesAppBraga(overlay);

    const oldTitle = document.title;
    document.title = `Etiqueta-${(item.localCurto || item.localizacao || 'Etiqueta')}`;

    setTimeout(() => {
      try {
        try{ if(window.reforcarEtiquetaTonerPrint) window.reforcarEtiquetaTonerPrint(); }catch(e){} window.print();
        mostrarMensagem('Etiqueta pronta a imprimir.');
      } catch (e) {
        console.error(e);
        mostrarMensagem('Erro ao abrir a impressão.', 'erro');
      } finally {
        setTimeout(() => {
          try { overlay.remove(); } catch (e) {}
          document.title = oldTitle;
        }, 600);
      }
    }, 150);
  } catch (e) {
    console.error(e);
    mostrarMensagem('Erro ao preparar impressão.', 'erro');
  }
}

function montarHtmlEtiquetaOverlay(item) {
  const linhas = [
    ["Local", item.localCurto || item.localizacao],
    ["Série", item.serie],
    ["Armazém", item.armazem],
    ["Equipamento", item.equipamento],
    ["Cor", item.cor],
    ["Lote", item.lote],
    ["SDS Ref", item.sdsRef],
    ["Data", item.dataScan || item.dataEtiqueta || item.data || item.dataFolha],
    ["Origem", item.origem]
  ].filter(([,v]) => String(v || '').trim());

  const codigoScan = item.codigoScan || (item.codigoEtiqueta ? buildPayloadQrTonerAppBraga(item.codigoEtiqueta) : "");
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c));
  const rows = linhas.map(([k,v]) => `<div class="etq-row"><div class="etq-key">${escapeHtml(k)}</div><div class="etq-val">${escapeHtml(v)}</div></div>`).join('');
  return `
    <style>
      @media print {
        @page { size: 100mm 150mm; margin: 0; }
        html, body { width: 100mm !important; height: 150mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #fff !important; }
        body * { visibility: hidden !important; }
        #printAreaEtiquetaAppBraga, #printAreaEtiquetaAppBraga * { visibility: visible !important; }
        #printAreaEtiquetaAppBraga { position: fixed !important; inset: 0 !important; width: 100mm !important; height: 150mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #fff !important; }
      }
      #printAreaEtiquetaAppBraga .etq-sheet { position:relative; width:100mm; height:150mm; max-width:100mm; max-height:150mm; overflow:hidden; box-sizing:border-box; padding:8mm; color:#000; font-family:'Arial Black', Arial, Helvetica, sans-serif; font-weight:950; background:#fff; display:flex; flex-direction:column; justify-content:flex-start; break-inside: avoid; page-break-inside: avoid; break-after: avoid-page; page-break-after: avoid; }
      #printAreaEtiquetaAppBraga .etq-title { font-size:22px; font-weight:1000; margin:0 32mm 6mm 0; }
      #printAreaEtiquetaAppBraga .etq-row { display:flex; flex-direction:column; margin:0 0 3.5mm; }
      #printAreaEtiquetaAppBraga .etq-key { font-size:11px; font-weight:1000; text-transform:uppercase; letter-spacing:.4px; }
      #printAreaEtiquetaAppBraga .etq-val { font-size:16px; line-height:1.25; word-break:break-word; }
      #printAreaEtiquetaAppBraga .etq-qr { position:absolute; top:8mm; right:8mm; width:22mm; height:22mm; }
      #printAreaEtiquetaAppBraga .etq-qr img,
      #printAreaEtiquetaAppBraga .etq-qr canvas { width:22mm !important; height:22mm !important; }
      #printAreaEtiquetaAppBraga .etq-code { font-size:9px; font-weight:900; margin-top:2mm; word-break:break-all; }
    </style>
    <div class="etq-sheet">
      <div class="etq-title">${escapeHtml(item.localCurto || item.localizacao || 'Etiqueta')}</div>
      ${rows}
      ${codigoScan ? `<div class="etq-qr" data-etq-qr="${escapeHtml(codigoScan)}"></div>` : ""}
    </div>`;
}


async function apagarEtiquetaWordPartilhada(id) {
  if (!confirm("Queres apagar esta etiqueta?")) return;
  try {
    await db.collection("etiquetasWord").doc(id).delete();
    mostrarMensagem("Etiqueta apagada.");
  } catch (e) {
    console.error(e);
    mostrarMensagem("Erro ao apagar etiqueta.", "erro");
  }
}
window.regerarEtiquetaWordPartilhada = regerarEtiquetaWordPartilhada;
window.apagarEtiquetaWordPartilhada = apagarEtiquetaWordPartilhada;

function bindEtiquetasWordRealtime() {
  if (!db || !db.collection) return;
  db.collection("etiquetasWord").onSnapshot((snap) => {
    etiquetasWordGlobal = [];
    snap.forEach((doc) => {
      const t = ({ firebaseId: doc.id, ...doc.data() }) || {};
      t.idDoc = doc.id;
      etiquetasWordGlobal.push(t);
    });
    sortFirestoreCreatedDesc(etiquetasWordGlobal);
    try { saveBackupAppBraga(BACKUP_KEYS_APP_BRAGA.etiquetas, etiquetasWordGlobal); } catch (e) {}
    renderEtiquetasWordCards();
  }, (error) => {
    console.error(error);
    try { etiquetasWordGlobal = loadBackupAppBraga(BACKUP_KEYS_APP_BRAGA.etiquetas); } catch (e) { etiquetasWordGlobal = []; }
    renderEtiquetasWordCards();
  });
}

window.addEventListener("DOMContentLoaded", () => {
  if (el("searchEtiquetasWord")) el("searchEtiquetasWord").addEventListener("input", renderEtiquetasWordCards);
  if (el("filterEtiquetasOrigem")) el("filterEtiquetasOrigem").addEventListener("change", renderEtiquetasWordCards);
  if (el("listaEtiquetasWord")) renderEtiquetasWordCards();
  bindEtiquetasWordRealtime();
});



/* =========================================================
   APP BRAGA — SIDEBAR BRINKA + DASHBOARD CLEAN
   ========================================================= */
(function(){
  function closestPanel(el){while(el&&el!==document.body){if(el.classList&&el.classList.contains('panel'))return el;el=el.parentElement;}return null;}
  function initBrinkaSidebar(){var sidebar=document.querySelector('.sidebar');if(!sidebar)return;if(!document.querySelector('.app-menu-toggle')){var btn=document.createElement('button');btn.className='app-menu-toggle';btn.type='button';btn.setAttribute('aria-label','Abrir menu');btn.textContent='☰';document.body.appendChild(btn);}if(!document.querySelector('.app-sidebar-overlay')){var ov=document.createElement('div');ov.className='app-sidebar-overlay';document.body.appendChild(ov);}var btn=document.querySelector('.app-menu-toggle');var overlay=document.querySelector('.app-sidebar-overlay');function open(){sidebar.classList.add('app-open');overlay.classList.add('show');btn.textContent='×';}function close(){sidebar.classList.remove('app-open');overlay.classList.remove('show');btn.textContent='☰';}btn.onclick=function(e){e.preventDefault();e.stopPropagation();sidebar.classList.contains('app-open')?close():open();};overlay.onclick=close;sidebar.querySelectorAll('a').forEach(function(a){a.addEventListener('click',close);});}
  function cleanDashboard(){var path=(location.pathname||'').toLowerCase();var isDashboard=path.endsWith('/')||path.endsWith('/index.html')||path.indexOf('index.html')!==-1;if(!isDashboard)return;document.body.classList.add('dashboard-clean');var removeTitles=['Centro Operacional Inteligente','Prioridade Máxima','Top Consumo','Alertas do Dia','Alertas Inteligentes'];document.querySelectorAll('h3').forEach(function(h){var t=(h.textContent||'').trim();if(removeTitles.indexOf(t)>=0){var p=closestPanel(h);if(p)p.classList.add('is-dashboard-removed');}});}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){initBrinkaSidebar();cleanDashboard();});}else{initBrinkaSidebar();cleanDashboard();}
})();


/* =========================
   IMPORT EXCEL FIREBASE
========================= */

async function importarExcelFirebase(){

  const input =
    document.getElementById(
      "excelImportFirebase"
    );

  if(!input){

    alert(
      "Input Excel não encontrado."
    );

    return;
  }

  input.click();

}

window.importarExcelFirebase =
  importarExcelFirebase;

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const excelInput =
      document.getElementById(
        "excelImportFirebase"
      );

    if(!excelInput){
      console.log(
        "Input Excel não encontrado"
      );
      return;
    }

    excelInput.addEventListener(
      "change",
      async (event) => {

        try{

          const file =
            event.target.files?.[0];

          if(!file) return;

          const data =
            await file.arrayBuffer();

          const workbook =
            XLSX.read(data);

          const usersSheet =
            workbook.Sheets["Users"];

          const pistolasSheet =
            workbook.Sheets["Pistolas"];

          const portasSheet =
            workbook.Sheets["Portas"];

          if(usersSheet){

            const users =
              XLSX.utils.sheet_to_json(
                usersSheet
              );

            for(const user of users){

              await window.db
                .collection("users")
                .add(user);

            }

          }

          if(pistolasSheet){

            const pistolas =
              XLSX.utils.sheet_to_json(
                pistolasSheet
              );

            for(const item of pistolas){

              await window.db
                .collection("pistolas")
                .add(item);

            }

          }

          if(portasSheet){

            const portas =
              XLSX.utils.sheet_to_json(
                portasSheet
              );

            for(const item of portas){

              await window.db
                .collection("portas")
                .add(item);

            }

          }

          alert(
            "Excel importado para Firebase."
          );

        }catch(error){

          console.error(error);

          alert(
            "Erro: " + error.message
          );

        }

      }
    );

  }
);



/* =========================
   EXPORT JSON SYSTEM
========================= */

function descarregarJSON(nome, dados){

  try{

    const blob = new Blob(
      [
        JSON.stringify(
          dados || [],
          null,
          2
        )
      ],
      {
        type:"application/json"
      }
    );

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =
      nome + "_" +
      Date.now() +
      ".json";

    document.body.appendChild(a);

    a.click();

    setTimeout(()=>{

      URL.revokeObjectURL(a.href);

      a.remove();

    },1000);

  }catch(error){

    console.error(error);

    alert(
      "Erro ao exportar JSON."
    );

  }

}

/* USERS */

function exportUsersJSON(){

  descarregarJSON(
    "users_backup",
    typeof window.usersData !== "undefined"
      ? window.usersData
      : []
  );

}

/* PISTOLAS */

function exportPistolasJSON(){

  descarregarJSON(
    "pistolas_backup",
    typeof window.pistolasData !== "undefined"
      ? window.pistolasData
      : []
  );

}

/* PORTAS */

function exportPortasJSON(){

  descarregarJSON(
    "portas_backup",
    typeof window.portasData !== "undefined"
      ? window.portasData
      : []
  );

}

window.exportUsersJSON =
  exportUsersJSON;

window.exportPistolasJSON =
  exportPistolasJSON;

window.exportPortasJSON =
  exportPortasJSON;




/* =========================
   IMPORT JSON FIREBASE
========================= */

async function importarUsersJSONFirebase(){

  try{

    if(!window.db){

      alert(
        "Firebase não iniciada."
      );

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const users =
          JSON.parse(text);

        if(!Array.isArray(users)){

          alert(
            "JSON inválido."
          );

          return;

        }

        let total = 0;

        for(const user of users){

          await window.db
            .collection("users")
            .add(user);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " users."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro ao importar JSON."
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

window.importarUsersJSONFirebase =
  importarUsersJSONFirebase;




/* =========================
   EXPORT + IMPORT JSON
========================= */

function descarregarJSON(nome, dados){

  try{

    const blob = new Blob(
      [
        JSON.stringify(
          dados || [],
          null,
          2
        )
      ],
      {
        type:"application/json"
      }
    );

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =
      nome + "_" +
      Date.now() +
      ".json";

    document.body.appendChild(a);

    a.click();

    setTimeout(()=>{

      URL.revokeObjectURL(a.href);

      a.remove();

    },1000);

  }catch(error){

    console.error(error);

    alert("Erro export JSON");

  }

}

/* EXPORTS */

function exportUsersJSON(){

  descarregarJSON(
    "users_backup",
    typeof window.usersData !== "undefined"
      ? window.usersData
      : []
  );

}

function exportPistolasJSON(){

  descarregarJSON(
    "pistolas_backup",
    typeof window.pistolasData !== "undefined"
      ? window.pistolasData
      : []
  );

}

function exportPortasJSON(){

  descarregarJSON(
    "portas_backup",
    typeof window.portasData !== "undefined"
      ? window.portasData
      : []
  );

}

/* IMPORT USERS */

async function importarUsersJSONFirebase(){

  try{

    if(!window.db){

      alert("Firebase não iniciada.");

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const users =
          JSON.parse(text);

        if(!Array.isArray(users)){

          alert("JSON inválido");

          return;

        }

        let total = 0;

        for(const user of users){

          await window.db
            .collection("users")
            .add(user);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " users."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro import users: "
          + error.message
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

/* IMPORT PISTOLAS */

async function importarPistolasJSONFirebase(){

  try{

    if(!window.db){

      alert("Firebase não iniciada.");

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const dados =
          JSON.parse(text);

        let total = 0;

        for(const item of dados){

          await window.db
            .collection("pistolas")
            .add(item);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " pistolas."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro import pistolas: "
          + error.message
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

/* IMPORT PORTAS */

async function importarPortasJSONFirebase(){

  try{

    if(!window.db){

      alert("Firebase não iniciada.");

      return;

    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (event)=>{

      try{

        const file =
          event.target.files?.[0];

        if(!file) return;

        const text =
          await file.text();

        const dados =
          JSON.parse(text);

        let total = 0;

        for(const item of dados){

          await window.db
            .collection("portas")
            .add(item);

          total++;

        }

        alert(
          "Importação concluída: "
          + total +
          " portas."
        );

      }catch(error){

        console.error(error);

        alert(
          "Erro import portas: "
          + error.message
        );

      }

    };

    input.click();

  }catch(error){

    console.error(error);

  }

}

window.exportUsersJSON = exportUsersJSON;
window.exportPistolasJSON = exportPistolasJSON;
window.exportPortasJSON = exportPortasJSON;

window.importarUsersJSONFirebase =
  importarUsersJSONFirebase;

window.importarPistolasJSONFirebase =
  importarPistolasJSONFirebase;

window.importarPortasJSONFirebase =
  importarPortasJSONFirebase;



window.db = firebase.firestore();






// removed old helper
/*
 const el = document.getElementById("InputUser");
 if(el && user){
   el.value = user. || "";
 }
};

*/
/* removed old helper */
function _unused(){
 const el = document.getElementById("InputUser");
 return el ? el.value.trim() : "";
};




/* ORDENAÇÃO ALFANUMÉRICA USERS */
setInterval(() => {
  try{
    if(Array.isArray(window.usersData)){
      window.usersData.sort((a,b)=>{
        const na = String(a?.nome || '').toLowerCase();
        const nb = String(b?.nome || '').toLowerCase();
        return na.localeCompare(nb,'pt',{numeric:true});
      });
    }
  }catch(e){
    console.error(e);
  }
},1000);



/* ===== ORGANIZAÇÃO ALFANUMÉRICA ===== */

function ordenarColecaoAlfaNumerica(lista,campo="nome"){

  try{

    if(!Array.isArray(lista)) return lista;

    return lista.sort((a,b)=>{

      const aTxt =
        String(a?.[campo] || "")
        .toLowerCase();

      const bTxt =
        String(b?.[campo] || "")
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

  }catch(e){

    console.error(e);

    return lista;

  }

}

setInterval(()=>{

  try{

    if(window.usersData){
      ordenarColecaoAlfaNumerica(
        window.usersData,
        "nome"
      );
    }

    if(window.pistolasData){
      ordenarColecaoAlfaNumerica(
        window.pistolasData,
        "nome"
      );
    }

    if(window.portasData){
      ordenarColecaoAlfaNumerica(
        window.portasData,
        "nome"
      );
    }

  }catch(e){

    console.error(e);

  }

},1500);



/* ===== ORDENAÇÃO ALFANUMÉRICA SEGURA ===== */

window.safeOrdenacaoAlfa = function(lista,campo="nome"){

  try{

    if(!Array.isArray(lista)) return lista;

    return lista.sort((a,b)=>{

      const aTxt =
        String(a?.[campo] || "")
          .toLowerCase();

      const bTxt =
        String(b?.[campo] || "")
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

  }catch(e){

    console.error(e);

    return lista;

  }

};



window.addEventListener('error',function(e){
  console.error('GLOBAL APP ERROR:',e.error||e.message);
});





/* ===== PISTOLAS STABLE REALTIME PATCH ===== */

window.getListaPistolas = function(){

  if(Array.isArray(window.pistolas)){
    return window.pistolas;
  }

  if(Array.isArray(window.listaPistolas)){
    return window.listaPistolas;
  }

  if(Array.isArray(window.pistolasData)){
    return window.pistolasData;
  }

  return [];

};

window.renderPistolas = function(lista){

  const container =
    document.querySelector("#listaPistolas");

  if(!container) return;

  lista = Array.isArray(lista)
    ? lista
    : getListaPistolas();

  const total = lista.length;

  const braga = lista.filter(
    p => String(p.armazem || "")
      .toLowerCase()
      .includes("braga")
  ).length;

  const reserva = lista.filter(
    p => String(p.operador || "")
      .toLowerCase()
      .includes("reserva")
  ).length;

  const totalEl =
    document.querySelector("#countPistolas");

  const bragaEl =
    document.querySelector("#countPistolasBraga");

  const reservaEl =
    document.querySelector("#countPistolasReserva");

  if(totalEl) totalEl.textContent = total;
  if(bragaEl) bragaEl.textContent = braga;
  if(reservaEl) reservaEl.textContent = reserva;

  container.innerHTML = lista.map((p,index)=>{

    const id =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return `

      <div class="pc-card">

        <div class="pc-name">
          ${p.nome || "-"}
        </div>

        <div class="meta-line">
          Nº: ${p.num || "-"}
        </div>

        <div class="meta-line">
          Operador:
          ${p.operador || "-"}
        </div>

        <button
          class="secondary-btn"
          onclick="editarPistola('${id}')">

          Editar

        </button>

      </div>

    `;

  }).join("");

};

window.editarPistola = function(id){

  const lista = getListaPistolas();

  const pistola = lista.find((p,index)=>{

    const pid =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return String(pid) === String(id);

  });

  if(!pistola){
    console.error("Pistola não encontrada", id);
    return;
  }

  window.pistolaAtual = pistola;

  const map = {
    num: "#editP_num",
    nome: "#editP_nome",
    password: "#editP_password",
    cn: "#editP_cn",
    sn: "#editP_sn",
    mac: "#editP_mac",
    operador: "#editP_operador",
    armazem: "#editP_armazem",
    prontas: "#editP_prontas"
  };

  Object.entries(map).forEach(([key,selector])=>{

    const el = document.querySelector(selector);

    if(el){
      el.value = pistola[key] || "";
    }

  });

  const modal =
    document.querySelector("#modalEditarPistola");

  if(modal){
    modal.style.display = "flex";
  }

};

console.log("PISTOLAS REALTIME FIX OK");



/* ===== PISTOLAS SAVE + SORT FIX ===== */

window.sortPistolasNaturally = function(lista){

  return [...lista].sort((a,b)=>{

    const aa = String(a.nome || a.num || "");
    const bb = String(b.nome || b.num || "");

    return aa.localeCompare(
      bb,
      "pt",
      {
        numeric:true,
        sensitivity:"base"
      }
    );

  });

};

const oldRender = window.renderPistolas;

window.renderPistolas = function(lista){

  lista = Array.isArray(lista)
    ? sortPistolasNaturally(lista)
    : sortPistolasNaturally(getListaPistolas());

  return oldRender(lista);

};

window.guardarEdicaoPistola = async function(){

  try{

    const pistola = window.pistolaAtual;

    if(!pistola){

      alert("Nenhuma Pistola foi selecionada");
      return;

    }

    const id =
      pistola.idDoc ||
      pistola.id ||
      pistola.docId;

    if(!id){

      alert("ID da pistola inválido");
      return;

    }

    const dados = {

      nome:
        document.querySelector("#editP_nome")?.value || "",

      num:
        document.querySelector("#editP_num")?.value || "",

      password:
        document.querySelector("#editP_password")?.value || "",

      cn:
        document.querySelector("#editP_cn")?.value || "",

      sn:
        document.querySelector("#editP_sn")?.value || "",

      mac:
        document.querySelector("#editP_mac")?.value || "",

      operador:
        document.querySelector("#editP_operador")?.value || "",

      armazem:
        document.querySelector("#editP_armazem")?.value || "",

      prontas:
        document.querySelector("#editP_prontas")?.value || ""

    };

    await window.db
      .collection("pistolas")
      .doc(id)
      .update(dados);

    Object.assign(
      pistola,
      dados
    );

    renderPistolas();

    const modal =
      document.querySelector("#modalEditarPistola");

    if(modal){
      modal.style.display = "none";
    }

    console.log("PISTOLA GUARDADA");

  }catch(err){

    console.error(err);
    alert("Erro ao guardar pistola");

  }

};

document.addEventListener("click", e => {

  const btn = e.target.closest("button");

  if(!btn) return;

  if(
    btn.textContent
      .toLowerCase()
      .includes("guardar")
  ){

    const modal =
      document.querySelector("#modalEditarPistola");

    if(modal &&
      modal.style.display !== "none"){

      e.preventDefault();

      guardarEdicaoPistola();

    }

  }

});

console.log("PISTOLAS SAVE FIX OK");



/* ===== PISTOLAS VIEW + DELETE + SEARCH FIX ===== */

window.verMaisPistola = function(id){

  const lista = getListaPistolas();

  const pistola = lista.find((p,index)=>{

    const pid =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return String(pid) === String(id);

  });

  if(!pistola){
    alert("Pistola não encontrada");
    return;
  }

  alert(
`Nome: ${pistola.nome || "-"}

Nº: ${pistola.num || "-"}

Password: ${pistola.password || "-"}

CN: ${pistola.cn || "-"}

SN: ${pistola.sn || "-"}

MAC: ${pistola.mac || "-"}

Operador: ${pistola.operador || "-"}

Armazém: ${pistola.armazem || "-"}

Prontas: ${pistola.prontas || "-"}`
  );

};

window.apagarPistola = async function(id){

  const confirmar = confirm(
    "Deseja apagar esta pistola?"
  );

  if(!confirmar) return;

  try{

    await window.db
      .collection("pistolas")
      .doc(id)
      .delete();

    console.log("PISTOLA APAGADA");

  }catch(err){

    console.error(err);
    alert("Erro ao apagar pistola");

  }

};

const oldRenderPistolas2 = window.renderPistolas;

window.renderPistolas = function(lista){

  lista = Array.isArray(lista)
    ? lista
    : getListaPistolas();

  lista = sortPistolasNaturally(lista);

  const container =
    document.querySelector("#listaPistolas");

  if(!container){
    return oldRenderPistolas2(lista);
  }

  const total = lista.length;

  const totalEl =
    document.querySelector("#countPistolas");

  if(totalEl){
    totalEl.textContent = total;
  }

  container.innerHTML = lista.map((p,index)=>{

    const id =
      p.idDoc ||
      p.id ||
      p.docId ||
      index;

    return `

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
            onclick="editarPistola('${id}')">
            Editar
          </button>

          <button
            class="secondary-btn"
            onclick="verMaisPistola('${id}')">
            Ver Mais
          </button>

          <button
            class="secondary-btn"
            onclick="apagarPistola('${id}')">
            Apagar
          </button>

        </div>

      </div>

    `;

  }).join("");

};

window.filtrarPistolas = function(txt=""){

  const termo =
    String(txt || "")
      .toLowerCase()
      .trim();

  const lista = getListaPistolas();

  const filtradas = lista.filter(p => {

    return [
      p.nome,
      p.num,
      p.password,
      p.cn,
      p.sn,
      p.mac,
      p.operador,
      p.armazem,
      p.prontas
    ].some(v =>

      String(v || "")
        .toLowerCase()
        .includes(termo)

    );

  });

  renderPistolas(filtradas);

};

window.filtrarPistolasComFiltros = function(){

  const input =
    document.querySelector("#searchPistolas");

  const txt = input
    ? input.value
    : "";

  filtrarPistolas(txt);

};

document.addEventListener("input", e => {

  if(
    e.target &&
    e.target.id === "searchPistolas"
  ){

    filtrarPistolas(e.target.value);

  }

});

console.log("PISTOLAS VIEW/DELETE/SEARCH FIX OK");


// ===== APP_BRAGA_THEME_SYSTEM =====

window.loadTheme = function(){

  try{
    document.documentElement.classList.add("dark", "app-dark");
    document.body.classList.add("dark", "app-dark");
    if (window.AppThemePro) {
      window.AppThemePro.apply(window.AppThemePro.getCachedTheme(), { persist: false });
    }

  }catch(e){
    console.log(e);
  }

};

window.saveTheme = function(theme){

  try{
    document.documentElement.classList.add("dark", "app-dark");
    document.body.classList.add("dark", "app-dark");
  }catch(e){
    console.log(e);
  }

};

window.toggleTheme = function(){
  window.loadTheme();

};

document.addEventListener(
  "DOMContentLoaded",
  window.loadTheme
);

window.addEventListener(
  "pageshow",
  window.loadTheme
);

/* ===== APP BRAGA FINAL PISTOLAS CRUD FIX ===== */
function getPistolaId(pistola, index = 0) {
  return pistola?.idDoc || pistola?.firebaseId || pistola?.id || pistola?.docId || pistola?._ref || `local-pistola-${index}`;
}

function pistolaPayloadFromForm() {
  return {
    num: document.querySelector("#editP_num")?.value.trim() || "",
    nome: document.querySelector("#editP_nome")?.value.trim() || "",
    password: document.querySelector("#editP_password")?.value.trim() || "",
    cn: document.querySelector("#editP_cn")?.value.trim() || "",
    sn: document.querySelector("#editP_sn")?.value.trim() || "",
    mac: document.querySelector("#editP_mac")?.value.trim() || "",
    operador: document.querySelector("#editP_operador")?.value.trim() || "",
    armazem: document.querySelector("#editP_armazem")?.value.trim() || "",
    prontas: document.querySelector("#editP_prontas")?.value.trim() || "",
    updatedAt: Date.now()
  };
}

function fillPistolaForm(pistola = {}) {
  const map = {
    editP_num: pistola.num,
    editP_nome: pistola.nome,
    editP_password: pistola.password,
    editP_cn: pistola.cn,
    editP_sn: pistola.sn,
    editP_mac: pistola.mac,
    editP_operador: pistola.operador,
    editP_armazem: pistola.armazem,
    editP_prontas: pistola.prontas
  };
  Object.entries(map).forEach(([id, value]) => {
    const field = document.getElementById(id);
    if (field) field.value = value || "";
  });
}

function openPistolaModal(title) {
  const titleEl = document.querySelector("#modalEditarPistola h3");
  if (titleEl) titleEl.textContent = title;
  const modal = document.querySelector("#modalEditarPistola");
  if (modal) modal.style.display = "flex";
}

window.abrirAdicionarPistola = function() {
  window.pistolaAtual = null;
  window.pistolaEditRef = "__new__";
  fillPistolaForm({});
  openPistolaModal("Adicionar Pistola CK65");
};

window.editarPistola = function(id) {
  const lista = getListaPistolas();
  const pistola = lista.find((item, index) => String(getPistolaId(item, index)) === String(id));
  if (!pistola) {
    mostrarMensagem("Pistola não encontrada.", "erro");
    return;
  }
  window.pistolaAtual = pistola;
  window.pistolaEditRef = getPistolaId(pistola);
  fillPistolaForm(pistola);
  openPistolaModal("Editar Pistola CK65");
};

window.guardarEdicaoPistola = async function() {
  const dados = pistolaPayloadFromForm();
  if (!dados.nome && !dados.num) {
    mostrarMensagem("Preenche pelo menos o número ou o nome da pistola.", "erro");
    return;
  }

  try {
    if (window.pistolaEditRef === "__new__") {
      const payload = { ...dados, createdAt: Date.now() };
      if (window.db?.collection) {
        const docRef = await window.db.collection("pistolas").add(payload);
        window.pistolasData.unshift({ idDoc: docRef.id, firebaseId: docRef.id, ...payload });
      } else {
        window.pistolasData.unshift({ id: Date.now().toString(), ...payload });
      }
      mostrarMensagem("Pistola criada.");
    } else {
      const id = window.pistolaEditRef;
      if (window.db?.collection && id && !String(id).startsWith("local-pistola-")) {
        await window.db.collection("pistolas").doc(String(id)).set(dados, { merge: true });
      }
      const index = window.pistolasData.findIndex((item, itemIndex) => String(getPistolaId(item, itemIndex)) === String(id));
      if (index >= 0) window.pistolasData[index] = { ...window.pistolasData[index], ...dados };
      mostrarMensagem("Pistola atualizada.");
    }
    const modal = document.querySelector("#modalEditarPistola");
    if (modal) modal.style.display = "none";
    window.pistolaAtual = null;
    window.pistolaEditRef = null;
    window.renderPistolas();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar pistola.", "erro");
  }
};

window.apagarPistola = async function(id) {
  if (!confirm("Deseja apagar esta pistola?")) return;
  try {
    if (window.db?.collection && id && !String(id).startsWith("local-pistola-")) {
      await window.db.collection("pistolas").doc(String(id)).delete();
    }
    window.pistolasData = getListaPistolas().filter((item, index) => String(getPistolaId(item, index)) !== String(id));
    window.renderPistolas();
    mostrarMensagem("Pistola apagada.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao apagar pistola.", "erro");
  }
};

window.renderPistolas = function(lista) {
  const container = document.querySelector("#listaPistolas");
  if (!container) return;
  let items = (Array.isArray(lista) ? lista : getListaPistolas()).slice();
  if (typeof sortPistolasNaturally === "function") items = sortPistolasNaturally(items);

  const totalEl = document.querySelector("#countPistolas");
  if (totalEl) totalEl.textContent = String(items.length);

  container.innerHTML = items.length ? items.map((pistola, index) => {
    const id = getPistolaId(pistola, index);
    return `
      <div class="pc-card pistol-card">
        <div class="pc-name">${safeRefHtml(pistola.nome || "Pistola CK65")}</div>
        <div class="meta-line">Nº: <span class="meta-value">${safeRefHtml(pistola.num || "-")}</span></div>
        <div class="meta-line">Operador: <span class="meta-value">${safeRefHtml(pistola.operador || "-")}</span></div>
        <div class="meta-line">Armazém: <span class="meta-value">${safeRefHtml(pistola.armazem || "-")}</span></div>
        <div class="meta-line">CN: <span class="meta-value">${safeRefHtml(pistola.cn || "-")}</span></div>
        <div class="meta-line">SN: <span class="meta-value">${safeRefHtml(pistola.sn || "-")}</span></div>
        <div class="item-actions">
          <button class="secondary-btn" type="button" onclick="editarPistola('${safeRefHtml(id)}')">
            Editar
          </button>
          <button class="secondary-btn" type="button" onclick="verMaisPistola('${safeRefHtml(id)}')">
            Ver Mais
          </button>
          <button class="secondary-btn" type="button" onclick="apagarPistola('${safeRefHtml(id)}')">
            Apagar
          </button>
        </div>
      </div>
    `;
  }).join("") : `<div class="reference-empty">Sem pistolas registadas.</div>`;
};


/* ===== BUTTON TEXT CONTRAST SETTINGS ===== */
function getButtonTextMode() {
  return getCookieAppBraga("appButtonTextMode") || "auto";
}

async function guardarModoTextoBotoes(mode) {
  const allowed = ["auto", "dark", "light"];
  const finalMode = allowed.includes(mode) ? mode : "auto";
  setCookieAppBraga("appButtonTextMode", finalMode, 31536000);
  aplicarModoTextoBotoes(finalMode);
  if (!window.db || !window.db.collection) return;
  try {
    await window.db.collection("config").doc("layout").set({
      buttonTextMode: finalMode,
      updatedAt: Date.now()
    }, { merge: true });
    mostrarMensagem("Cor do texto dos botões atualizada.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao guardar a cor do texto.", "erro");
  }
}

function aplicarModoTextoBotoes(modeValue = getButtonTextMode()) {
  const allowed = ["auto", "dark", "light"];
  const mode = allowed.includes(modeValue) ? modeValue : "auto";
  const root = document.documentElement;

  root.setAttribute("data-button-text-mode", mode);

  if (mode === "dark") {
    root.style.setProperty("--app-button-text", "#000827");
    root.style.setProperty("--app-button-icon", "#000827");
  } else if (mode === "light") {
    root.style.setProperty("--app-button-text", "#ffffff");
    root.style.setProperty("--app-button-icon", "#ffffff");
  } else {
    const accent = getComputedStyle(root).getPropertyValue("--app-accent").trim() || APP_DEFAULT_ACCENT;
    const clean = accent.replace("#", "");
    let r = 37, g = 99, b = 235;

    if (/^[0-9a-fA-F]{6}$/.test(clean)) {
      r = parseInt(clean.slice(0, 2), 16);
      g = parseInt(clean.slice(2, 4), 16);
      b = parseInt(clean.slice(4, 6), 16);
    }

    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const text = brightness > 170 ? "#000827" : "#ffffff";

    root.style.setProperty("--app-button-text", text);
    root.style.setProperty("--app-button-icon", text);
  }

  const select = document.getElementById("appButtonTextMode");
  if (select) select.value = mode;
}

document.addEventListener("DOMContentLoaded", aplicarModoTextoBotoes);
setTimeout(() => { if (typeof aplicarModoTextoBotoes === "function") aplicarModoTextoBotoes(); }, 300);
/* ===== END BUTTON TEXT CONTRAST SETTINGS ===== */


/* ===== BUTTON TEXT AFTER COLOR CHANGE PATCH ===== */
document.addEventListener("change", function(e) {
  if (e.target && e.target.id === "appAccentColor") {
    setTimeout(() => {
      if (typeof aplicarModoTextoBotoes === "function") aplicarModoTextoBotoes();
    }, 100);
  }
});
/* ===== END BUTTON TEXT AFTER COLOR CHANGE PATCH ===== */


/* ===== IPHONE SIDEBAR TEXT PATCH ===== */
(function(){
  function fixSidebarText(){
    document.body.classList.toggle("is-iphone-layout", window.innerWidth <= 768);

    var sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    sidebar.querySelectorAll("a").forEach(function(a){
      var hasElement = Array.from(a.childNodes).some(function(n){ return n.nodeType === 1 && n.tagName !== "BR"; });
      var text = (a.textContent || "").trim();

      if (!a.querySelector(".sidebar-link-text") && text) {
        a.innerHTML = '<span class="sidebar-link-text">' + text + '</span>';
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fixSidebarText);
  } else {
    fixSidebarText();
  }

  window.addEventListener("resize", fixSidebarText);
})();
/* ===== END IPHONE SIDEBAR TEXT PATCH ===== */


/* ===== ANDROID TABLET SCALE JS ===== */
function aplicarEscalaTabletAndroidAppBraga() {
  const isAndroidTablet = document.body.classList.contains("is-android-tablet");
  if (!isAndroidTablet) return;

  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const height = window.innerHeight || document.documentElement.clientHeight || 0;
  const minSide = Math.min(width, height);

  let scale = 1.10;

  if (minSide >= 800) scale = 1.16;
  if (minSide >= 900) scale = 1.22;

  document.documentElement.style.setProperty("--android-tablet-scale", String(scale));
  document.body.classList.add("android-tablet-scale-ready");
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(aplicarEscalaTabletAndroidAppBraga, 100);
  setTimeout(aplicarEscalaTabletAndroidAppBraga, 600);
});

window.addEventListener("resize", () => {
  setTimeout(aplicarEscalaTabletAndroidAppBraga, 100);
}, { passive: true });

window.addEventListener("orientationchange", () => {
  setTimeout(aplicarEscalaTabletAndroidAppBraga, 300);
}, { passive: true });
/* ===== END ANDROID TABLET SCALE JS ===== */


/* ===== FULL PAGE SCROLL PROXY ===== */
(function(){
  /*
    Disabled on purpose: mobile/tablet browsers need native body scrolling.
    Proxying wheel/touch events caused sticky scrolling on Android tablets and iPhone.
  */
})();
/* ===== END FULL PAGE SCROLL PROXY ===== */




/* Sistema antigo de cores removido para evitar conflito com Theme Studio. */



/* ===== OLD APPEARANCE ACCENT DISABLED ===== */
(function(){
  const oldKeys = [
    "appAccentColor",
    "appBragaAccent",
    "appBragaPrimaryColor",
    "selectedAccentColor",
    "themeAccent",
    "corPrincipalApp",
    "appPrimaryColor"
  ];
  try { oldKeys.forEach(k => localStorage.removeItem(k)); } catch(e) {}

  window.setAppAccentColor = function(){ 
    console.warn("Cor principal da App foi removida. Usa o Centro de Cores.");
  };
  window.changeAppAccentColor = window.setAppAccentColor;
  window.aplicarCorPrincipalApp = window.setAppAccentColor;
  window.guardarCorPrincipalApp = window.setAppAccentColor;
})();
/* ===== END OLD APPEARANCE ACCENT DISABLED ===== */


/* ===== OLD COLOR SYSTEM HARD DISABLED ===== */
(function(){
  const oldKeys=["appAccentColor","appBragaAccent","appBragaPrimaryColor","selectedAccentColor","themeAccent","corPrincipalApp","appPrimaryColor","appBragaThemeStudioSimpleV3","appBragaThemePresetsEnabled","appBragaAdvancedColorsV1","appBragaAdvancedColorsEnabled"];
  try{oldKeys.forEach(k=>localStorage.removeItem(k));}catch(e){}
  window.setAppAccentColor=function(){console.warn("Sistema antigo removido. Usa Centro de Cores.");};
  window.changeAppAccentColor=window.setAppAccentColor;
  window.aplicarCorPrincipalApp=window.setAppAccentColor;
  window.guardarCorPrincipalApp=window.setAppAccentColor;
  window.themeFirebasePushNow=function(){};
  window.themeFirebaseReloadNow=function(){};
})();
/* ===== END OLD COLOR SYSTEM HARD DISABLED ===== */


/* ===== ETIQUETA TONER HARD PRINT CSS ===== */
(function(){
  window.reforcarEtiquetaTonerPrint = function(){
    const styleId = "etiqueta-toner-hard-print-css";
    let style = document.getElementById(styleId);
    if(!style){
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      @page { size: 100mm 150mm; margin: 0; }
      #printAreaEtiquetaAppBraga,
      #printAreaEtiquetaAppBraga * {
        color: #000 !important;
        opacity: 1 !important;
        text-shadow: none !important;
        filter: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-family: "Arial Black", Arial, Helvetica, sans-serif !important;
        font-weight: 950 !important;
        -webkit-font-smoothing: none !important;
        text-rendering: geometricPrecision !important;
      }
      #printAreaEtiquetaAppBraga .etq-sheet {
        background: #fff !important;
        color: #000 !important;
        border: 2.6px solid #000 !important;
        padding: 7mm !important;
      }
      #printAreaEtiquetaAppBraga .etq-title {
        color: #000 !important;
        font-size: 23px !important;
        font-weight: 1000 !important;
        line-height: 1.05 !important;
        letter-spacing: .01em !important;
      }
      #printAreaEtiquetaAppBraga .etq-row,
      #printAreaEtiquetaAppBraga .etq-line,
      #printAreaEtiquetaAppBraga td,
      #printAreaEtiquetaAppBraga th {
        color: #000 !important;
        border-color: #000 !important;
        border-width: 2px !important;
        font-size: 15px !important;
        font-weight: 950 !important;
      }
      #printAreaEtiquetaAppBraga small,
      #printAreaEtiquetaAppBraga .muted {
        color: #000 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
      }
    `;
  };
  document.addEventListener("DOMContentLoaded", window.reforcarEtiquetaTonerPrint);
})();

window.usarPorCodigoEtiquetaToner = usarPorCodigoEtiquetaToner;



/* ===== STOCK QR SCANNER BUTTON ===== */

function tocarBipStockQr() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);

    setTimeout(() => {
      try { ctx.close(); } catch(e) {}
    }, 260);
  } catch (e) {
    // Sem som se o browser bloquear áudio.
  }
}

function extrairABTDoQrStock(raw) {
  const texto = String(raw || "").trim();
  const match = texto.match(/ABT-[A-Z0-9\-]+/i);
  return match ? match[0].toUpperCase() : texto.toUpperCase();
}

let stockQrScannerInstance = null;
let stockQrScannerActive = false;
let stockQrLastCode = "";
let stockQrLastAt = 0;

function setStockQrStatus(text, type = "") {
  const node = document.getElementById("stockQrStatus");
  if (!node) return;
  node.textContent = text || "";
  node.className = "stock-qr-status" + (type ? " " + type : "");
}


function garantirHtml5QrcodeStock() {
  return new Promise((resolve, reject) => {
    if (typeof Html5Qrcode !== "undefined") {
      resolve(true);
      return;
    }

    const existing = document.querySelector('script[data-stock-qr-lib="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar biblioteca QR.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode";
    script.async = true;
    script.dataset.stockQrLib = "1";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Falha ao carregar biblioteca QR."));
    document.head.appendChild(script);
  });
}

function isIphoneSafariStockQr() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "") || 
         (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}


async function escolherCameraTraseiraStockQr() {
  try {
    await garantirHtml5QrcodeStock();

    if (!Html5Qrcode.getCameras) {
      return { facingMode: { ideal: "environment" } };
    }

    const cameras = await Html5Qrcode.getCameras();
    if (!Array.isArray(cameras) || !cameras.length) {
      throw new Error("Nenhuma câmera encontrada pelo navegador.");
    }

    const rear = cameras.find((cam) => {
      const label = String(cam.label || "").toLowerCase();
      return (
        label.includes("back") ||
        label.includes("rear") ||
        label.includes("traseira") ||
        label.includes("environment") ||
        label.includes("wide")
      );
    });

    const chosen = rear || cameras[cameras.length - 1] || cameras[0];
    return chosen && chosen.id ? chosen.id : { facingMode: { ideal: "environment" } };
  } catch (error) {
    console.error("Erro ao escolher câmera:", error);
    throw error;
  }
}

function mensagemErroCameraStockQr(error) {
  const name = String(error && (error.name || error.code) || "");
  const message = String(error && error.message || error || "");

  if (/NotAllowed|Permission|denied/i.test(name + " " + message)) {
    return "Câmera bloqueada. Vai às definições do Safari e permite a câmera para este site.";
  }

  if (/NotFound|DevicesNotFound/i.test(name + " " + message)) {
    return "Não encontrei câmera disponível no iPhone.";
  }

  if (/NotReadable|TrackStart/i.test(name + " " + message)) {
    return "A câmera está ocupada por outra app. Fecha a câmera/WhatsApp e tenta outra vez.";
  }

  if (/Overconstrained|Constraint/i.test(name + " " + message)) {
    return "O iPhone recusou a câmera traseira. Vou tentar outra câmera.";
  }

  return "Erro ao abrir câmera: " + (message || name || "erro desconhecido");
}


function garantirPreviewStockQrVisivel() {
  let panel = document.getElementById("stockQrScannerPanel");
  let status = document.getElementById("stockQrStatus");
  let frame = document.getElementById("stockQrPreviewFrame");
  let reader = document.getElementById("stockQrReader");

  if (!frame) {
    frame = document.createElement("div");
    frame.id = "stockQrPreviewFrame";
    frame.className = "stock-qr-preview-frame";
    frame.innerHTML = '<div id="stockQrReader" class="stock-qr-reader"></div><div class="stock-qr-aim"><span></span><span></span><span></span><span></span></div>';

    if (status && status.parentNode) status.parentNode.insertBefore(frame, status);
    else if (panel) panel.appendChild(frame);
    else document.body.appendChild(frame);

    reader = document.getElementById("stockQrReader");
  }

  if (!reader) {
    reader = document.createElement("div");
    reader.id = "stockQrReader";
    reader.className = "stock-qr-reader";
    frame.prepend(reader);
  }

  frame.classList.add("active", "loading");
  frame.style.setProperty("display", "block", "important");
  frame.style.setProperty("visibility", "visible", "important");
  frame.style.setProperty("opacity", "1", "important");
  frame.style.setProperty("height", "360px", "important");
  frame.style.setProperty("min-height", "360px", "important");

  reader.style.setProperty("display", "block", "important");
  reader.style.setProperty("visibility", "visible", "important");
  reader.style.setProperty("opacity", "1", "important");
  reader.style.setProperty("width", "100%", "important");
  reader.style.setProperty("height", "100%", "important");
  reader.style.setProperty("min-height", "360px", "important");

  setTimeout(() => {
    try { frame.scrollIntoView({ behavior: "smooth", block: "center" }); } catch(e) {}
  }, 80);

  return reader;
}

function forcarVideoStockQrVisivel() {
  const frame = document.getElementById("stockQrPreviewFrame");
  const reader = garantirPreviewStockQrVisivel();
  if (frame) {
    frame.classList.add("active");
    frame.classList.remove("loading");
    frame.style.setProperty("display", "block", "important");
  }
  if (reader) {
    reader.style.setProperty("display", "block", "important");
    reader.style.setProperty("height", "360px", "important");
    reader.style.setProperty("min-height", "360px", "important");
  }
  document.querySelectorAll("#stockQrReader video, #stockQrReader canvas").forEach((el) => {
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.muted = true;
    el.style.setProperty("display", "block", "important");
    el.style.setProperty("visibility", "visible", "important");
    el.style.setProperty("opacity", "1", "important");
    el.style.setProperty("width", "100%", "important");
    el.style.setProperty("height", "360px", "important");
    el.style.setProperty("object-fit", "cover", "important");
  });
}

async function startStockQrScanner() {
  const reader = document.getElementById("stockQrReader");

  if (!reader) {
    mostrarMensagem("Área do scanner QR não encontrada.", "erro");
    return;
  }

  try {
    await garantirHtml5QrcodeStock();
  } catch (error) {
    console.error(error);
    mostrarMensagem("Biblioteca do scanner QR não carregada.", "erro");
    setStockQrStatus("Biblioteca QR não carregada. Verifica internet/HTTPS.", "erro");
    return;
  }

  if (stockQrScannerActive) {
    mostrarMensagem("Scanner QR já está ligado.", "erro");
    return;
  }

  reader.innerHTML = "";
  stockQrScannerInstance = new Html5Qrcode("stockQrReader");

  try {
    const cameraConfig = await escolherCameraTraseiraStockQr();

    await stockQrScannerInstance.start(
      cameraConfig,
      { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
      async (decodedText) => {
        const code = extrairABTDoQrStock(decodedText);
        const now = Date.now();

        if (!code) return;
        if (code === stockQrLastCode && now - stockQrLastAt < 2500) return;

        stockQrLastCode = code;
        stockQrLastAt = now;

        setStockQrStatus("QR lido. A procurar toner em Stock...");
        mostrarMensagem("QR lido. A procurar toner em Stock...");

        const handled = await usarPorCodigoEtiquetaToner(code);

        if (handled) {
          tocarBipStockQr();
          setStockQrStatus("Toner marcado como usado e movido para Histórico.", "ok");
          await stopStockQrScanner();
        } else {
          setStockQrStatus("QR lido, mas não é uma etiqueta de toner válida.", "erro");
          mostrarMensagem("QR não reconhecido como etiqueta de toner.", "erro");
        }
      },
      () => {}
    );

    stockQrScannerActive = true;
    forcarVideoStockQrVisivel();
    setTimeout(forcarVideoStockQrVisivel, 250);
    setTimeout(forcarVideoStockQrVisivel, 800);
    const previewFrameOk = document.getElementById("stockQrPreviewFrame");
    if (previewFrameOk) previewFrameOk.classList.remove("loading");
    setStockQrStatus("Câmera ligada. Aponta para o QR da etiqueta.");
    mostrarMensagem("Câmera QR ligada.");
  } catch (error) {
    console.error("Erro scanner QR Stock:", error);
    const previewFrameError = document.getElementById("stockQrPreviewFrame");
    if (previewFrameError) previewFrameError.classList.remove("loading");
    const msg = mensagemErroCameraStockQr(error);
    setStockQrStatus(msg, "erro");
    mostrarMensagem(msg, "erro");
  }
}

async function stopStockQrScanner() {
  const reader = document.getElementById("stockQrReader");

  try {
    if (stockQrScannerInstance && stockQrScannerActive) {
      await stockQrScannerInstance.stop();
      await stockQrScannerInstance.clear();
    }
  } catch (error) {
    console.error("Erro ao fechar scanner QR Stock:", error);
  } finally {
    stockQrScannerInstance = null;
    stockQrScannerActive = false;
    if (reader) reader.innerHTML = "";
    const previewFrame = document.getElementById("stockQrPreviewFrame");
    if (previewFrame) previewFrame.classList.remove("active", "loading");
    setStockQrStatus("Scanner desligado.");
  }
}

window.startStockQrScanner = startStockQrScanner;
window.stopStockQrScanner = stopStockQrScanner;
/* ===== END STOCK QR SCANNER BUTTON ===== */


window.testarCamerasStockQr = async function(){
  try{
    await garantirHtml5QrcodeStock();
    const cams = await Html5Qrcode.getCameras();
    console.log("Câmeras disponíveis:", cams);
    setStockQrStatus("Câmeras encontradas: " + (cams || []).map(c => c.label || c.id).join(" | "));
    return cams;
  }catch(e){
    console.error(e);
    setStockQrStatus(mensagemErroCameraStockQr(e), "erro");
    return [];
  }
};
