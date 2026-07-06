(function(){
  'use strict';
  function $(id){return document.getElementById(id)}
  function text(id,v){const el=$(id); if(el) el.textContent = v}
  function num(v){const n=Number(v||0); return Number.isFinite(n)?n:0}
  function readInt(id){const el=$(id); return el?num(String(el.textContent).replace(/[^0-9.-]/g,'')):0}

  function navigateTo(href){
    if (!href) return;
    window.location.href = href;
  }
  function bindNavigation(){
    document.querySelectorAll('[data-href]').forEach((node) => {
      if (node.dataset.dashNavBound === '1') return;
      node.dataset.dashNavBound = '1';
      node.addEventListener('click', (event) => {
        if (event.target.closest('a,button,input,select,textarea')) return;
        navigateTo(node.dataset.href);
      });
      node.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        navigateTo(node.dataset.href);
      });
    });
    document.querySelectorAll('.dash-panel-footer a').forEach((link)=>{
      if (link.dataset.dashStopBound === '1') return;
      link.dataset.dashStopBound = '1';
      link.addEventListener('click', (event)=>event.stopPropagation());
    });
  }
  function cleanupInjectedDashboardChrome(){
    const selectors = [
      '.app-pro-commandbar', '.app-mobile-action-dock', '.pro-commandbar', '.mockup-topbar',
      '.page-shell-header', '.dashboard-header', '.sidebar', 'aside.sidebar-pro-groups',
      '#personalToolsDashboard', '#personalDashboardOverview', '#personalInternalAlerts',
      '.personal-dashboard:not(.dash-allow-personal)', '.personal-alert-strip', '.personal-task-metrics',
      '.personal-task-layout', '.personal-dashboard-actions', '.personal-priority-panel', '.dashboard-task-panel',
      '#dashboardWidgetGrid', '.dashboard-widget-grid', '.dashboard-widget', '.enterprise-metrics',
      '.enterprise-header', '.dashboard-personalize-card', '.app-pro-header', '.app-pro-dashboard-tabs'
    ];
    document.querySelectorAll(selectors.join(',')).forEach((node)=>{
      if (node.closest('.dashboard-futurista')) return;
      node.remove();
    });
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100%';
  }

  function updateDerived(){
    /*
      v1.58.153
      O dashboard passou a ter contadores reais ligados por listeners Firebase.
      Esta função antiga lia métricas escondidas/temporárias e voltava a escrever
      zeros ou traços por cima dos números certos a cada intervalo, causando o
      efeito de os contadores aparecerem e desaparecerem.
      Quando o modo real está ativo, esta função só mantém a disponibilidade.
    */
    const sistema = $('dashSistemaDisponibilidade');
    if(sistema){ sistema.textContent = navigator.onLine ? '99.7%' : 'Offline'; }
    if (window.__dashboardRealDataMode === true) return;

    const totalEq = readInt('dashTotalEquipamentos');
    const stock = readInt('dashStockTotal');
    const manut = readInt('dashTicketsAbertos');
    const impOk = readInt('dashImpressorasOk');
    text('dashKpiEquipamentos', totalEq || '—');
    text('dashKpiStock', stock || '—');
    text('dashKpiTarefas', manut || '0');
    text('dashKpiImpressorasOk', impOk || '—');
    const impTotal = readInt('dashKpiImpressoras');
    if(impTotal && impOk){ text('dashKpiImpressorasSub', 'Online: ' + impOk); }
  }
  function copyActivity(){
    const old = $('dashboardActivityLog');
    const target = $('dashActivityClone');
    if(!old || !target) return;
    if(old.innerHTML.trim()) target.innerHTML = old.innerHTML;
  }
  function enhanceCriticalCards(){
    document.querySelectorAll('#listaDashboardStock .dashboard-critical-card').forEach((card,idx)=>{
      card.classList.add('dash-critical-mini');
      if(idx>2) card.style.display='none';
    });
  }
  function tick(){
    updateDerived();
    copyActivity();
    enhanceCriticalCards();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const hidden = document.createElement('div');
    hidden.className = 'dash-hidden-metrics';
    hidden.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;';
    hidden.innerHTML = '<span id="dashTotalEquipamentos">0</span><span id="dashStockTotal">0</span><span id="dashTicketsAbertos">0</span><span id="dashImpressorasOk">0</span><div id="dashboardActivityLog"></div>';
    document.body.appendChild(hidden);
    cleanupInjectedDashboardChrome();
    bindNavigation();
    setTimeout(()=>{ cleanupInjectedDashboardChrome(); bindNavigation(); tick(); },300);
    setTimeout(()=>{ cleanupInjectedDashboardChrome(); bindNavigation(); tick(); },1200);
    setTimeout(tick,600);
    setInterval(()=>{ cleanupInjectedDashboardChrome(); bindNavigation(); tick(); },1800);
  });
})();


// v1.58.153 — estado global para dashboard
window.addEventListener("appbraga:systems:update", function(ev){
  try { window.__appbragaSystemsDashboard = ev.detail || {}; } catch(e) {}
});


/* v1.58.153 — Dashboard: dados reais estáveis sem flicker nos contadores */
(function(){
  'use strict';

  const state = {
    stock: [],
    tasks: [],
    users: [],
    collections: { pistolas: [], radios: [], computadores: [], pcs: [] },
    unsubscribers: []
  };

  const $ = (id) => document.getElementById(id);
  const set = (id, value) => { const el = $(id); if (el) el.textContent = String(value ?? '—'); };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const toArr = (value) => Array.isArray(value) ? value : [];
  const db = () => (window.db && typeof window.db.collection === 'function') ? window.db : null;

  function loadLocalJson(keys){
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (Array.isArray(data)) return data;
      } catch (_) {}
    }
    return [];
  }

  function docMillis(value){
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (value.seconds) return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function dateOnly(value){
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0,10);
    const t = docMillis(value);
    return t ? new Date(t).toISOString().slice(0,10) : '';
  }

  function fmtDate(value, empty='—'){
    const date = dateOnly(value);
    if (!date) return empty;
    const [y,m,d] = date.split('-');
    return `${d}/${m}/${y}`;
  }

  function todayKey(){ return new Date().toISOString().slice(0,10); }

  function statusOfTask(task){
    const raw = norm(task.estado || task.status || (task.done || task.concluida ? 'concluida' : 'pendente'));
    if (task.done || task.concluida || raw.includes('conclu')) return 'concluida';
    const due = task.dueDate || task.prazo || task.dataPrazo || task.deadline || '';
    if (due && dateOnly(due) && dateOnly(due) < todayKey()) return 'vencida';
    if (raw.includes('progress') || raw.includes('curso') || raw.includes('progresso') || raw.includes('andamento')) return 'progresso';
    return 'pendente';
  }

  function statusLabel(status){
    return ({ pendente:'Pendente', progresso:'Em progresso', concluida:'Concluída', vencida:'Vencida' })[status] || 'Pendente';
  }

  function badgeClass(status){
    return status === 'concluida' ? '' : (status === 'vencida' ? 'warn' : 'info');
  }

  function normalizeTask(doc){
    const t = doc || {};
    return {
      id: t.id || t.docId || t.uid || '',
      title: t.title || t.titulo || t.nome || t.tarefa || 'Tarefa sem título',
      owner: t.owner || t.responsavel || t.user || t.utilizador || '',
      status: statusOfTask(t),
      createdAt: t.createdAt || t.criadoEm || t.dataCriacao || t.created || t.createdAtMs || '',
      dueDate: t.dueDate || t.prazo || t.dataPrazo || t.deadline || '',
      raw: t
    };
  }

  function colorKey(item){
    const raw = norm(item.cor || item.color || item.tonerColor || item.label || '');
    if (raw.includes('preto') || raw.includes('black') || raw === 'bk' || raw === 'k') return 'preto';
    if (raw.includes('ciano') || raw.includes('cyan') || raw === 'c') return 'ciano';
    if (raw.includes('magenta') || raw === 'm') return 'magenta';
    if (raw.includes('amarelo') || raw.includes('yellow') || raw === 'y') return 'amarelo';
    return 'outros';
  }

  function uniqueCount(items, fields){
    const seen = new Set();
    toArr(items).forEach((item, idx) => {
      const key = fields.map(f => norm(item?.[f])).find(Boolean) || norm(item?.id || item?.idDoc || item?.firebaseId || item?.codigo || idx);
      seen.add(key || `idx-${idx}`);
    });
    return seen.size;
  }

  function getPrintersTotal(){
    try {
      if (typeof impressorasData !== 'undefined' && Array.isArray(impressorasData)) return impressorasData.length;
    } catch (_) {}
    return 14;
  }

  function getPrintersOnline(){
    try {
      if (typeof impressorasData !== 'undefined' && Array.isArray(impressorasData) && typeof obterEstadoImpressora === 'function') {
        return impressorasData.filter(item => obterEstadoImpressora(item.ip) === 'OK').length;
      }
    } catch (_) {}
    return getPrintersTotal();
  }

  function updateCounters(){
    const printersTotal = getPrintersTotal();
    const printersOnline = getPrintersOnline();
    set('dashKpiImpressoras', printersTotal);
    set('dashKpiImpressorasSub', `Online: ${printersOnline}`);

    const equipmentKeys = new Set();
    ['pistolas','radios','computadores','pcs'].forEach((name) => {
      toArr(state.collections[name]).forEach((item, idx) => {
        const key = norm(item.serie || item.serial || item.numeroSerie || item.sn || item.codigo || item.nome || item.name || item.id || item.idDoc || `${name}-${idx}`);
        equipmentKeys.add(`${name}:${key}`);
      });
    });
    // Se as coleções novas ainda não carregaram, aproveita os arrays antigos/globais já existentes.
    try { if (typeof pcsGlobal !== 'undefined') toArr(pcsGlobal).forEach((i, idx)=>equipmentKeys.add(`pcs:${norm(i.nome||i.name||i.idDoc||idx)}`)); } catch(_){ }
    try { if (typeof radiosData !== 'undefined') toArr(radiosData).forEach((i, idx)=>equipmentKeys.add(`radios:${norm(i.serial||i.serie||i.nome||i.id||idx)}`)); } catch(_){ }
    try { toArr(window.pistolasData).forEach((i, idx)=>equipmentKeys.add(`pistolas:${norm(i.serie||i.serial||i.codigo||i.id||idx)}`)); } catch(_){ }
    try { toArr(window.portasData).forEach((i, idx)=>{}); } catch(_){ }
    set('dashKpiEquipamentos', equipmentKeys.size || '—');
    set('dashKpiEquipamentosSub', equipmentKeys.size ? 'Pistolas, rádios e PCs' : 'Registados');

    const usersTotal = state.users.length || toArr(window.usersData).length;
    set('dashKpiUsers', usersTotal || '—');
    set('dashKpiUsersSub', usersTotal ? 'Registados' : 'Ativos');

    const stockTotal = state.stock.length || (typeof stockGlobal !== 'undefined' ? toArr(stockGlobal).length : 0);
    set('dashKpiStock', stockTotal || '—');
    set('dashKpiStockSub', stockTotal ? 'Toners em stock' : 'Em stock');

    const openTasks = state.tasks.filter(t => !['concluida'].includes(t.status)).length;
    set('dashKpiTarefas', openTasks || 0);
  }

  function updateStockByColor(){
    const source = state.stock.length ? state.stock : (typeof stockGlobal !== 'undefined' ? toArr(stockGlobal) : []);
    const counts = { preto:0, ciano:0, magenta:0, amarelo:0 };
    source.forEach((item) => {
      const key = colorKey(item);
      if (counts[key] !== undefined) counts[key] += 1;
    });
    const max = Math.max(1, ...Object.values(counts));
    const map = { preto:'Preto', ciano:'Ciano', magenta:'Magenta', amarelo:'Amarelo' };
    Object.entries(map).forEach(([key, label]) => {
      set(`dashStockCount${label}`, counts[key]);
      const bar = $(`dashStockBar${label}`);
      if (bar) bar.style.width = `${Math.round((counts[key] / max) * 100)}%`;
    });
  }

  function renderTasks(){
    const host = $('dashTaskList');
    if (!host) return;
    const items = state.tasks
      .filter(t => t.status !== 'concluida')
      .sort((a,b) => {
        const aw = a.status === 'vencida' ? -1 : (a.status === 'progresso' ? 0 : 1);
        const bw = b.status === 'vencida' ? -1 : (b.status === 'progresso' ? 0 : 1);
        return aw - bw || String(dateOnly(a.dueDate) || '9999-12-31').localeCompare(String(dateOnly(b.dueDate) || '9999-12-31')) || docMillis(b.createdAt) - docMillis(a.createdAt);
      })
      .slice(0, 5);
    if (!items.length) {
      host.innerHTML = '<div class="dash-empty-inline">Sem tarefas em andamento.</div>';
      return;
    }
    host.innerHTML = items.map(t => {
      const status = t.status;
      const due = dateOnly(t.dueDate);
      const danger = status === 'vencida' || (due && due < todayKey());
      return `<div class="dash-task-real-row" title="${esc(t.title)}">
        <div><strong>${esc(t.title)}</strong><small>${esc(t.owner || 'Sem responsável')}</small></div>
        <span class="dash-badge ${badgeClass(status)}">${esc(statusLabel(status))}</span>
        <div class="dash-task-date"><em>Criada</em><span>${esc(fmtDate(t.createdAt, '—'))}</span></div>
        <div class="dash-task-date ${danger ? 'danger' : ''}"><em>Prazo</em><span>${esc(fmtDate(t.dueDate, 'Sem prazo'))}</span></div>
      </div>`;
    }).join('');
  }

  function refreshAll(){
    window.__dashboardRealDataMode = true;
    updateCounters();
    updateStockByColor();
    renderTasks();
  }

  function listenCollection(name, callback, localKeys=[]){
    const database = db();
    if (!database) {
      callback(loadLocalJson(localKeys));
      refreshAll();
      return;
    }
    try {
      const unsub = database.collection(name).onSnapshot((snap) => {
        callback(snap.docs.map(doc => ({ id: doc.id, idDoc: doc.id, ...doc.data() })));
        refreshAll();
      }, () => {
        callback(loadLocalJson(localKeys));
        refreshAll();
      });
      state.unsubscribers.push(unsub);
    } catch (_) {
      callback(loadLocalJson(localKeys));
      refreshAll();
    }
  }

  function boot(){
    window.__dashboardRealDataMode = true;
    set('dashKpiImpressoras', getPrintersTotal());
    set('dashKpiImpressorasSub', `Online: ${getPrintersOnline()}`);

    listenCollection('stock', (items) => { state.stock = toArr(items); }, ['appBraga_backup_stock']);
    listenCollection('users', (items) => { state.users = toArr(items); }, ['appbraga_users_custom_v1']);
    listenCollection('personalTasks', (items) => { state.tasks = toArr(items).map(normalizeTask); }, ['appbraga_tarefas_fallback_v1']);
    listenCollection('pistolas', (items) => { state.collections.pistolas = toArr(items); }, ['appbraga_pistolas_fallback_v15882']);
    listenCollection('radios', (items) => { state.collections.radios = toArr(items); }, ['appbraga_radios_fallback_v15888']);
    listenCollection('computadores', (items) => { state.collections.computadores = toArr(items); }, ['appbraga_computadores_fallback_v15890']);
    listenCollection('pcs', (items) => { state.collections.pcs = toArr(items); }, ['appBraga_backup_pcs']);

    setTimeout(refreshAll, 350);
    setTimeout(refreshAll, 1200);
    setInterval(refreshAll, 4000);
  }

  window.addEventListener('beforeunload', () => state.unsubscribers.forEach(fn => { try { fn(); } catch(_) {} }));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
