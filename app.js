const firebaseConfig = {
  apiKey: "AIzaSyCSgw4rhBLW5mq4QClulubf6e0hf5lDJbo",
  authDomain: "toner-manager-756c4.firebaseapp.com",
  projectId: "toner-manager-756c4"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

var pages = ["dashboard", "registo", "stock", "historico", "computadores", "config"];
var subtitles = {
  dashboard: "Resumo geral",
  registo: "Adicionar toner",
  stock: "Toners disponíveis",
  historico: "Toners usados",
  computadores: "Checklist de instalação",
  config: "Preferências"
};
var passos = [
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
var stockGlobal = [];

function el(id){ return document.getElementById(id); }

window.irParaPagina = function(page, btn){
  for (var i=0;i<pages.length;i++) {
    var node = el(pages[i]);
    if (node) node.classList.add('hidden');
  }
  var current = el(page);
  if (current) current.classList.remove('hidden');

  var buttons = document.querySelectorAll('.side-nav button');
  for (var j=0;j<buttons.length;j++) buttons[j].classList.remove('active');
  if (btn) btn.classList.add('active');

  if (el('pageTitle')) el('pageTitle').innerText = page.charAt(0).toUpperCase() + page.slice(1);
  if (el('pageSub')) el('pageSub').innerText = subtitles[page] || '';

  if (page === 'computadores') carregarChecklist();
};

window.preencherHoje = function(){
  var hoje = new Date().toISOString().split('T')[0];
  if (el('data')) el('data').value = hoje;
  if (el('dataPC')) el('dataPC').value = hoje;
};

async function gerarID(){
  var ref = db.collection('config').doc('contadorToner');
  return db.runTransaction(async function(tx){
    var snap = await tx.get(ref);
    var valor = 1;
    if (snap.exists) valor = (snap.data().valor || 0) + 1;
    tx.set(ref, { valor: valor });
    return 'TON-' + String(valor).padStart(4, '0');
  });
}

window.disponivel = async function(){
  var equipamento = el('equipamento').value || '';
  var localizacao = el('localizacao').value || 'Sem Localização';
  var cor = el('cor').value || '';
  var data = el('data').value || 'Não tem Data';

  if (!equipamento || !cor) {
    alert('Preenche equipamento e cor.');
    return;
  }

  var idInterno = await gerarID();
  await db.collection('stock').add({
    idInterno: idInterno,
    equipamento: equipamento,
    localizacao: localizacao,
    cor: cor,
    data: data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  el('equipamento').value = '';
  el('localizacao').value = '';
  el('cor').value = '';
  el('data').value = '';
};

function renderStock(lista){
  var target = el('listaStock');
  var dash = el('dashboardStock');
  if (target) target.innerHTML = '';
  if (dash) dash.innerHTML = '';

  for (var i=0;i<lista.length;i++) {
    var item = lista[i];
    var html = '' +
      '<div class="card">' +
        '<div class="card-top">' +
          '<div>' +
            '<strong>' + (item.idInterno || '') + '</strong>' +
            '<div>' + (item.equipamento || '') + ' - ' + (item.cor || '') + '</div>' +
            '<small>📍 ' + (item.localizacao || 'Sem Localização') + '</small>' +
            '<small>📅 ' + (item.data || 'Não tem Data') + '</small>' +
          '</div>' +
          '<input class="inline-check" type="checkbox" onchange="usar(\'' + item.idDoc + '\')">' +
        '</div>' +
      '</div>';
    if (target) target.insertAdjacentHTML('beforeend', html);
    if (dash) dash.insertAdjacentHTML('beforeend', html.replace('onchange="usar(\'' + item.idDoc + '\')"', 'disabled'));
  }
}

window.filtrarStock = function(){
  var txt = (el('searchStock').value || '').toLowerCase();
  var filtrado = stockGlobal.filter(function(t){ return (t.localizacao || '').toLowerCase().includes(txt); });
  renderStock(filtrado);
};

window.filtrarDashboard = function(){
  var txt = (el('dashboardSearch').value || '').toLowerCase();
  var filtrado = stockGlobal.filter(function(t){ return (t.localizacao || '').toLowerCase().includes(txt); });
  renderStock(filtrado);
};

window.usar = async function(id){
  if (!window.confirm('Marcar este toner como usado?')) return;
  var ref = db.collection('stock').doc(id);
  var snap = await ref.get();
  if (!snap.exists) return;
  await db.collection('historico').add(Object.assign({}, snap.data(), {
    usadoEm: firebase.firestore.FieldValue.serverTimestamp()
  }));
  await ref.delete();
};

window.apagarHistorico = async function(id){
  if (!window.confirm('Apagar este registo do histórico?')) return;
  await db.collection('historico').doc(id).delete();
};

function carregarChecklist(){
  var target = el('checklist');
  if (!target) return;
  var html = '';
  for (var i=0;i<passos.length;i++) {
    html += '<label class="check-item">' +
      '<input type="checkbox" id="p' + i + '">' +
      '<span>' + passos[i] + '</span>' +
    '</label>';
  }
  target.innerHTML = html;
}

window.guardarPC = async function(){
  var nome = (el('nomePC').value || '').trim();
  var data = el('dataPC').value || 'Sem Data';
  if (!nome) {
    alert('Nome do computador obrigatório.');
    return;
  }
  var dados = [];
  for (var i=0;i<passos.length;i++) {
    dados.push({ passo: passos[i], feito: !!el('p'+i).checked });
  }
  await db.collection('pcs').add({
    nome: nome,
    data: data,
    passos: dados,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  el('nomePC').value = '';
  el('dataPC').value = '';
  carregarChecklist();
};

window.apagarPC = async function(id){
  if (!window.confirm('Apagar este registo do computador?')) return;
  await db.collection('pcs').doc(id).delete();
};

function aplicarDark(ativo){
  document.body.classList.toggle('dark', !!ativo);
  if (el('darkSwitch')) el('darkSwitch').checked = !!ativo;
  localStorage.setItem('modo', ativo ? 'dark' : 'light');
}

function bindRealtime(){
  db.collection('stock').orderBy('createdAt', 'desc').onSnapshot(function(snap){
    stockGlobal = [];
    snap.forEach(function(doc){ stockGlobal.push(Object.assign({ idDoc: doc.id }, doc.data())); });
    if (el('countStock')) el('countStock').innerText = String(snap.size);
    renderStock(stockGlobal);
  }, function(){ if (el('countStock')) el('countStock').innerText = '0'; });

  db.collection('historico').orderBy('usadoEm', 'desc').onSnapshot(function(snap){
    if (el('countUsados')) el('countUsados').innerText = String(snap.size);
    var target = el('listaHistorico');
    if (!target) return;
    target.innerHTML = '';
    snap.forEach(function(doc){
      var item = doc.data();
      target.insertAdjacentHTML('beforeend', '' +
        '<div class="card">' +
          '<strong>' + (item.idInterno || '') + '</strong>' +
          '<div>' + (item.equipamento || '') + ' - ' + (item.cor || '') + '</div>' +
          '<small>📍 ' + (item.localizacao || 'Sem Localização') + '</small>' +
          '<small>📅 ' + (item.data || 'Não tem Data') + '</small>' +
          '<button class="delete-btn" onclick="apagarHistorico(\'' + doc.id + '\')">❌ Apagar</button>' +
        '</div>');
    });
  });

  db.collection('pcs').orderBy('createdAt', 'desc').onSnapshot(function(snap){
    if (el('countPCs')) el('countPCs').innerText = String(snap.size);
    var target = el('listaPC');
    if (!target) return;
    target.innerHTML = '';
    snap.forEach(function(doc){
      var item = doc.data();
      var passosHtml = '';
      var list = item.passos || [];
      for (var i=0;i<list.length;i++) {
        passosHtml += '<div>' + (list[i].feito ? '✔' : '❌') + ' ' + list[i].passo + '</div>';
      }
      target.insertAdjacentHTML('beforeend', '' +
        '<div class="card">' +
          '<strong>' + (item.nome || '') + '</strong>' +
          '<small>📅 ' + (item.data || 'Sem Data') + '</small>' +
          passosHtml +
          '<button class="delete-btn" onclick="apagarPC(\'' + doc.id + '\')">❌ Apagar</button>' +
        '</div>');
    });
  });
}

window.onload = function(){
  var dark = localStorage.getItem('modo') === 'dark';
  aplicarDark(dark);
  if (el('darkSwitch')) {
    el('darkSwitch').addEventListener('change', function(e){ aplicarDark(e.target.checked); });
  }
  carregarChecklist();
  bindRealtime();
  var firstBtn = document.querySelector('.side-nav button');
  window.irParaPagina('dashboard', firstBtn);
};
