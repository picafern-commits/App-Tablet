/* v1.58.166 — Impressoras: render estável, stock/etiquetas/histórico/manutenção reais */
(function(){
  'use strict';

  const PAGE_SIZE = 25;
  const state = {
    stock: [],
    historico: [],
    manutencoes: [],
    etiquetas: [],
    modalType: 'hist',
    modalPage: 1,
    started: false,
    unsub: [],
    lastStockCounts: null,
    lastStockSignature: '',
    navBound: false
  };

  const byId = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(String(v).replace(',', '.').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? n : null;
  };
  function globalValue(name){
    try {
      if (Object.prototype.hasOwnProperty.call(window, name)) return window[name];
      return Function('try{return typeof '+name+'!=="undefined"?'+name+':undefined}catch(e){return undefined}')();
    } catch(e) { return undefined; }
  }
  function getDb(){
    try { if (typeof window.getDbAppBraga === 'function') return window.getDbAppBraga(); } catch(e){}
    try { if (typeof getDbAppBraga === 'function') return getDbAppBraga(); } catch(e){}
    return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null);
  }
  function readCache(keys){
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch(e){}
    }
    return [];
  }
  function toArray(value){ return Array.isArray(value) ? value : []; }
  function dateMs(v){
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (v && typeof v.toMillis === 'function') return v.toMillis();
    if (v && typeof v.toDate === 'function') { try { return v.toDate().getTime(); } catch(e){} }
    if (v && v.seconds) return v.seconds * 1000;
    const raw = String(v || '').trim();
    if (!raw) return 0;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return new Date(raw).getTime() || 0;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
      const [d,m,y] = raw.split(/[\/\s]/);
      return new Date(`${y}-${m}-${d}`).getTime() || 0;
    }
    return new Date(raw).getTime() || 0;
  }
  function fmtDate(v, withTime=false){
    const ms = dateMs(v);
    if (!ms) return '—';
    const d = new Date(ms);
    const date = d.toLocaleDateString('pt-PT');
    const time = d.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'});
    return withTime ? `${date}, ${time}` : date;
  }
  function sortRecent(items){ return toArray(items).slice().sort((a,b)=>dateMs(b.__date || b.createdAt || b.created || b.usadoAt || b.data || b.updatedAt) - dateMs(a.__date || a.createdAt || a.created || a.usadoAt || a.data || a.updatedAt)); }
  function uniqueBy(items, fn){
    const seen = new Set();
    return toArray(items).filter((item, idx) => {
      const key = fn(item, idx);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function collectionArray(names, cacheKeys){
    for (const name of names) {
      const v = globalValue(name);
      if (Array.isArray(v) && v.length) return v;
    }
    return readCache(cacheKeys || []);
  }

  function getPrinters(){
    return collectionArray(['impressorasData'], ['appBraga_backup_impressoras']);
  }
  function getStock(){
    return state.stock.length ? state.stock : collectionArray(['stockGlobal','stockTonersData','stockData','tonersStock','stockToners','tonersData','stock'], ['appBraga_backup_stock','stockToners','tonersStock','stock']);
  }
  function getHistorico(){
    return state.historico.length ? state.historico : collectionArray(['historicoGlobal','__historicoFuturistaHistorico'], ['appBraga_backup_historico']);
  }
  function getManutencoes(){
    return state.manutencoes.length ? state.manutencoes : collectionArray(['manutencoesGlobal','__manutencaoFuturista','manutencaoGlobal'], ['appBraga_backup_manutencoes','appBragaManutencaoFuturista']);
  }
  function getEtiquetas(){
    return state.etiquetas.length ? state.etiquetas : collectionArray(['etiquetasWordGlobal','__historicoFuturistaEtiquetas'], ['appBraga_backup_etiquetas']);
  }

  function deepSearchPercent(obj){
    const wanted = ['toner','tonerPreto','percentagem','percentagemToner','nivel','nivelToner','black','preto','percent','percentage','tonerPercent','tonerLevel','pretoPercent','pretoNivel','pretoLevel','blackPercent','blackLevel','value'];
    const seen = new Set();
    function walk(x, depth){
      if (!x || depth > 5) return null;
      if (typeof x === 'number' || typeof x === 'string') {
        const n = num(x);
        return (n !== null && n >= 0 && n <= 100) ? n : null;
      }
      if (typeof x !== 'object' || seen.has(x)) return null;
      seen.add(x);
      for (const key of wanted) {
        if (Object.prototype.hasOwnProperty.call(x, key)) {
          const n = num(x[key]);
          if (n !== null && n >= 0 && n <= 100) return n;
        }
      }
      for (const [k,v] of Object.entries(x)) {
        const nk = norm(k);
        if ((nk.includes('preto') || nk === 'black' || nk === 'k') && typeof v === 'object') {
          const n = walk(v, depth + 1);
          if (n !== null) return n;
        }
      }
      for (const v of Object.values(x)) {
        const n = walk(v, depth + 1);
        if (n !== null) return n;
      }
      return null;
    }
    return walk(obj, 0);
  }
  function tonerPercent(item, idx){
    const directKeys = ['toner','tonerPreto','percentagem','percentagemToner','nivel','nivelToner','black','preto','percent','percentage','tonerPercent','tonerLevel','pretoPercent','pretoNivel','pretoLevel','blackPercent','blackLevel'];
    for (const k of directKeys) {
      const n = num(item && item[k]);
      if (n !== null && n >= 0 && n <= 100) return Math.round(n);
    }
    for (const stateName of ['tonerInfoState','printerTonerState','printerFirebaseState','tonerState','leiturasToner','tonerReadings']) {
      const stateObj = globalValue(stateName);
      if (!stateObj) continue;
      const keys = [item?.ip, item?.serie, item?.serial, item?.id, item?.idDoc, item?._ref, String(item?.ip || '').replaceAll('.', '_'), String(item?.serie || '').toUpperCase(), String(item?.serie || '').slice(-3)].filter(Boolean).map(String);
      for (const key of keys) {
        const candidates = [stateObj[key], stateObj[key.toLowerCase()], stateObj[key.toUpperCase()]].filter(Boolean);
        for (const candidate of candidates) {
          const n = deepSearchPercent(candidate);
          if (n !== null) return Math.round(n);
        }
      }
      if (Array.isArray(stateObj)) {
        const found = stateObj.find(r => {
          const blob = norm([r.ip,r.serie,r.serial,r.id,r.idDoc,r.ref,r.nome,r.modelo].join(' '));
          return (item?.ip && blob.includes(norm(item.ip))) || (item?.serie && blob.includes(norm(item.serie)));
        });
        const n = deepSearchPercent(found);
        if (n !== null) return Math.round(n);
      }
    }
    return null;
  }
  function estadoView(item, idx){
    const toner = tonerPercent(item, idx);
    let estado = 'OK';
    try {
      const fn = globalValue('obterEstadoImpressora');
      if (typeof fn === 'function') estado = fn(item.ip);
    } catch(e){}
    const n = norm(estado);
    if (toner !== null && toner <= 10) return {label:'Crítico', cls:'critical'};
    if (toner !== null && toner <= 25) return {label:'Baixo', cls:'low'};
    if (n.includes('crit') || n.includes('offline')) return {label:'Crítico', cls:'critical'};
    if (n.includes('baixo') || n.includes('pend') || n.includes('repar')) return {label:'Baixo', cls:'low'};
    return {label:'Online', cls:'online'};
  }
  function printerImage(item){
    const m = norm(item?.modelo || item?.nome);
    if (m.includes('taskalfa')) return '../img/taskalfa2554ci.png';
    if (m.includes('pa5500')) return '../img/pa5500x.png';
    return '../img/kyocerap3155dn.png';
  }
  function colorOfStock(item){
    const blob = norm([item?.cor,item?.color,item?.nome,item?.modelo,item?.codigo,item?.ref,item?.referencia,item?.sdsRef,item?.equipamento].join(' '));
    if (blob.includes('ciano') || blob.includes('cyan') || /(^|[^a-z])c($|[^a-z])/.test(blob)) return 'Ciano';
    if (blob.includes('magenta') || /(^|[^a-z])m($|[^a-z])/.test(blob)) return 'Magenta';
    if (blob.includes('amarelo') || blob.includes('yellow') || /(^|[^a-z])y($|[^a-z])/.test(blob)) return 'Amarelo';
    return 'Preto';
  }
  function qtyOfStock(item){
    for (const f of ['quantidade','qtd','stock','total','disponivel','disponiveis','count','unidades']) {
      const n = num(item && item[f]);
      if (n !== null) return Math.max(0, Math.round(n));
    }
    return 1;
  }
  function equipOf(item){ return item?.equipamento || item?.modelo || item?.printer || item?.nome || item?.impressora || 'Impressora'; }
  function localOf(item){ return item?.localizacao || item?.local || item?.armazem || item?.setor || '—'; }
  function serieOf(item){ return item?.serie || item?.serial || item?.numeroSerie || ''; }
  function corOf(item){ return item?.cor || item?.color || item?.toner || 'Preto'; }
  function statusOfMaint(item){ return item?.estado || item?.status || 'Aberta'; }
  function maintTitle(item){ return item?.pedido || item?.tipo || item?.intervencao || item?.motivo || item?.descricao || 'Intervenção técnica'; }
  function maintDate(item){ return item?.dataAgendada || item?.data || item?.createdAt || item?.created || item?.updatedAt || item?.vencimento || ''; }

  function renderKPIs(data){
    const printers = toArray(data);
    let online = 0, offline = 0, low = 0, critical = 0;
    printers.forEach((item, idx)=>{
      const t = tonerPercent(item, idx);
      const st = estadoView(item, idx);
      if (st.cls === 'online') online++; else offline++;
      if (t !== null && t <= 25) low++;
      if (t !== null && t <= 10) critical++;
    });
    const set=(id,v)=>{ const el=byId(id); if(el) el.textContent=v; };
    set('impKpiTotal', printers.length || 0);
    set('impKpiOnline', online || 0);
    set('impKpiOffline', offline || 0);
    set('impKpiAlerts', critical || low || 0);
    set('impKpiLow', low || 0);
    set('impKpiReadings', printers.length || 0);
    set('impListCount', printers.length || 0);
  }
  function renderRows(data){
    const tbody = byId('impressorasTableBody');
    if (!tbody) return;
    const printers = toArray(data);
    if (!printers.length){
      tbody.innerHTML = '<tr><td colspan="8" class="imp-empty-row">Sem impressoras registadas.</td></tr>';
      return;
    }
    tbody.innerHTML = printers.map((item, idx)=>{
      const modelo = item.modelo || item.nome || 'Impressora';
      const serie = item.serie || item.serial || `S${idx+1}`;
      const local = item.localizacao || item.local || item.armazem || 'Braga';
      const ip = item.ip || '-';
      const toner = tonerPercent(item, idx);
      const st = estadoView(item, idx);
      const actionData = JSON.stringify(item).replace(/</g,'\\u003c').replace(/'/g,'&#39;');
      const tonerLabel = toner === null ? 'Sem leitura' : `${toner}%`;
      const fillWidth = toner === null ? 0 : toner;
      const fillClass = toner === null ? 'unknown' : (toner <= 10 ? 'critical' : (toner <= 25 ? 'low' : 'ok'));
      const ipHtml = ip && ip !== '-' ? `<a class="imp-ip-link" href="http://${esc(ip)}" target="_blank" rel="noopener">${esc(ip)}</a>` : '—';
      return `<tr>
        <td><div class="imp-printer-cell"><img class="imp-printer-thumb" src="${printerImage(item)}" alt=""><span><a class="imp-printer-name" href="${ip && ip !== '-' ? 'http://'+esc(ip) : '#'}" target="_blank" rel="noopener">${esc(modelo)}</a></span></div></td>
        <td>${esc(serie)}</td>
        <td>${esc(local)}</td>
        <td>${ipHtml}</td>
        <td><div class="imp-toner-cell"><div class="imp-toner-meta"><span>Preto</span><strong>${tonerLabel}</strong></div><div class="imp-toner-track" title="Toner preto ${tonerLabel}"><div class="imp-toner-fill ${fillClass}" style="width:${fillWidth}%"></div></div></div></td>
        <td><span class="imp-status-badge ${st.cls}">${esc(st.label)}</span></td>
        <td>${esc(item.ultimaLeitura || item.lastRead || 'Hoje, 09:12')}</td>
        <td><div class="imp-actions"><button class="imp-action-icon" onclick="abrirIP('${esc(ip)}')" title="Abrir IP">👁</button><button class="imp-action-icon" onclick='abrirHistoricoImpressora(${actionData})' title="Histórico">📊</button><button class="imp-action-icon" onclick='abrirManutencaoDireta(${actionData})' title="Mais">⋮</button></div></td>
      </tr>`;
    }).join('');
  }
  function renderAlerts(data){
    const el = byId('impAlertsList'); if (!el) return;
    const rows = toArray(data).map((item, idx)=>({item, idx, toner: tonerPercent(item,idx)})).filter(x=>x.toner !== null && x.toner <= 25).slice(0,4);
    el.innerHTML = rows.length ? rows.map(({item, toner})=>{
      const crit = toner <= 10;
      return `<div class="imp-alert ${crit?'crit':''}"><span class="imp-alert-dot"></span><span>${esc(item.modelo || item.nome)} — Preto ${toner}% — ${esc(localOf(item))}</span><small>${crit?'Crítico':'Baixo'}</small></div>`;
    }).join('') : '<div class="imp-alert"><span class="imp-alert-dot"></span><span>Sem alertas críticos neste momento</span><small>OK</small></div>';
  }
  function readLastStockCounts(){
    try {
      const raw = localStorage.getItem('appBraga_impressores_stock_cor_ultimo');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch(e){}
    return null;
  }
  function saveLastStockCounts(counts){
    try { localStorage.setItem('appBraga_impressores_stock_cor_ultimo', JSON.stringify(counts)); } catch(e){}
  }
  function totalCounts(counts){
    return ['Preto','Ciano','Magenta','Amarelo'].reduce((sum, color) => sum + (Number(counts?.[color]) || 0), 0);
  }
  function renderStockByColor(){
    const host = document.querySelector('.imp-bars');
    if (!host) return;

    let counts = {Preto:0, Ciano:0, Magenta:0, Amarelo:0};
    getStock().forEach(item => { counts[colorOfStock(item)] += qtyOfStock(item); });

    const total = totalCounts(counts);
    const previous = state.lastStockCounts || readLastStockCounts();

    // Evita o piscar: se um listener antigo/Firebase devolver vazio por instantes,
    // não limpa o resumo que já estava correto no ecrã.
    if (!total && previous && totalCounts(previous) > 0) {
      counts = {...counts, ...previous};
    } else if (total > 0) {
      state.lastStockCounts = {...counts};
      saveLastStockCounts(state.lastStockCounts);
    }

    const signature = ['Preto','Ciano','Magenta','Amarelo'].map(color => `${color}:${counts[color] || 0}`).join('|');
    if (signature === state.lastStockSignature && host.dataset.stockStable === '1') return;
    state.lastStockSignature = signature;
    host.dataset.stockStable = '1';

    const stableTotal = totalCounts(counts);
    const max = Math.max(1, ...Object.values(counts));
    host.innerHTML = ['Preto','Ciano','Magenta','Amarelo'].map(color=>{
      const val = counts[color] || 0;
      const w = stableTotal ? Math.max(4, Math.round((val/max)*100)) : 0;
      const cls = color === 'Preto' ? 'black' : color === 'Ciano' ? 'cyan' : color === 'Magenta' ? 'magenta' : 'yellow';
      return `<div class="imp-bar"><span>${color}</span><span class="imp-bar-line"><span class="imp-bar-fill ${cls}" style="width:${w}%"></span></span><strong>${val}</strong><small>un.</small></div>`;
    }).join('');
  }
  function labelTitle(item){
    if (item?.titulo || item?.nome || item?.fileName) return item.titulo || item.nome || item.fileName;
    const loc = item?.localCurto || item?.localizacao || item?.armazem || 'Etiqueta';
    const ref = item?.serie || item?.codigoEtiqueta || item?.sdsRef || '';
    return `Etiqueta ${String(loc).trim()}${ref ? ' — '+ref : ''}.docx`;
  }
  function renderWordList(){
    const host = byId('impWordList'); if (!host) return;
    const rows = sortRecent(getEtiquetas()).slice(0,3);
    host.classList.add('imp-fixed-list');
    if (!rows.length) {
      host.innerHTML = '<div class="imp-empty-panel">Sem etiquetas Word recentes.</div>';
      return;
    }
    host.innerHTML = rows.map(item => `<div class="imp-dashboard-row compact"><span>${esc(fmtDate(item.createdAt || item.created || item.data || item.dataEtiqueta))}</span><strong>${esc(labelTitle(item))}</strong><span class="tag">Word</span></div>`).join('');
  }
  function isTonerHistoryItem(item){
    const blob = norm([item?.tipo,item?.titulo,item?.descricao,item?.estado,item?.acao,item?.action,item?.equipamento,item?.cor,item?.categoria].join(' '));
    return blob.includes('toner') || blob.includes('tinteiro') || blob.includes('substitu') || blob.includes('usado') || blob.includes('stock');
  }
  function buildTonerHistory(){
    const used = getHistorico().filter(isTonerHistoryItem).map(item => ({
      __date: item.usadoAt || item.createdAt || item.created || item.data || item.updatedAt,
      kind: 'troca',
      title: `Toner trocado${corOf(item) ? ' ('+corOf(item)+')' : ''}`,
      main: equipOf(item),
      sub: [localOf(item), serieOf(item)].filter(Boolean).join(' · '),
      status: 'Sucesso'
    }));
    const low = getPrinters().map((item, idx)=>({item, idx, toner:tonerPercent(item,idx)})).filter(x=>x.toner !== null && x.toner <= 25).map(({item, toner}) => ({
      __date: item.ultimaLeitura || item.lastReadAt || item.updatedAt || Date.now(),
      kind: 'falta',
      title: `Falta de toner — Preto ${toner}%`,
      main: item.modelo || item.nome || 'Impressora',
      sub: [localOf(item), item.ip].filter(Boolean).join(' · '),
      status: toner <= 10 ? 'Crítico' : 'Baixo'
    }));
    const alertas = toArray(globalValue('__appbragaAlertasToner')).map(a => ({
      __date: a.createdAt || a.created || a.data || Date.now(),
      kind: 'falta',
      title: a.titulo || a.title || 'Falta de toner',
      main: a.equipamento || a.printer || a.modelo || 'Impressora',
      sub: a.descricao || a.message || a.localizacao || '',
      status: norm(a.prioridade || a.level || '').includes('crit') ? 'Crítico' : 'Baixo'
    }));
    return uniqueBy(sortRecent([...used, ...low, ...alertas]), i => norm([i.kind,i.title,i.main,i.sub].join('|')));
  }
  function buildMaintenance(){
    return sortRecent(getManutencoes()).map(item => ({
      __date: maintDate(item),
      title: maintTitle(item),
      main: equipOf(item),
      sub: [localOf(item), item.tecnico || item.responsavel || item.user || ''].filter(Boolean).join(' · '),
      status: statusOfMaint(item) || 'Aberta'
    }));
  }
  function rowStatusClass(status){
    const n = norm(status);
    if (n.includes('crit') || n.includes('alta') || n.includes('atras')) return 'bad';
    if (n.includes('baixo') || n.includes('pend') || n.includes('agend') || n.includes('abert') || n.includes('hoje')) return 'warn';
    return '';
  }
  function renderFixedRows(host, rows, emptyText){
    host.classList.add('imp-fixed-list');
    const visible = rows.slice(0,5);
    if (!visible.length) {
      host.innerHTML = `<div class="imp-empty-panel">${esc(emptyText)}</div>` + Array.from({length:4}).map(()=>'<div class="imp-placeholder-row"></div>').join('');
      return;
    }
    const html = visible.map(item => `<div class="imp-dashboard-row"><span>${esc(fmtDate(item.__date, true))}</span><strong>${esc(item.title)}<small>${esc(item.main)}${item.sub ? ' · '+esc(item.sub) : ''}</small></strong><span class="tag ${rowStatusClass(item.status)}">${esc(item.status)}</span></div>`).join('');
    const fillers = Array.from({length:Math.max(0,5-visible.length)}).map(()=>'<div class="imp-placeholder-row"></div>').join('');
    host.innerHTML = html + fillers;
  }
  function renderHistoryAndMaint(){
    const hist = byId('impHistoryList');
    if (hist) renderFixedRows(hist, buildTonerHistory(), 'Sem histórico de toner para mostrar.');
    const man = byId('impMaintenanceList');
    if (man) renderFixedRows(man, buildMaintenance(), 'Sem manutenções registadas.');
    const diag = byId('impDiagnosticList');
    if (diag) {
      diag.classList.add('imp-fixed-list');
      diag.innerHTML = '<div class="imp-empty-panel">Diagnóstico sem dados para já.</div>' + Array.from({length:4}).map(()=>'<div class="imp-placeholder-row"></div>').join('');
    }
  }
  function renderAll(data){
    const printers = data || getPrinters();
    renderKPIs(printers);
    renderRows(printers);
    renderAlerts(printers);
    renderStockByColor();
    renderWordList();
    renderHistoryAndMaint();
    document.body.classList.remove('imp-loading');
    document.body.classList.add('imp-ready');
  }
  function applyFilter(){
    const data = getPrinters();
    const q = norm(byId('searchImpressoras')?.value || '');
    const place = byId('filterArmazem')?.value || '';
    const stateFilter = byId('filterEstadoImpressora')?.value || '';
    renderAll(data.filter((item, idx)=>{
      const blob = norm([item.modelo,item.nome,item.serie,item.serial,item.ip,item.localizacao,item.local,item.armazem].join(' '));
      const st = norm(estadoView(item, idx).label);
      return (!q || blob.includes(q)) && (!place || item.armazem === place || item.localizacao === place || item.local === place) && (!stateFilter || st.includes(norm(stateFilter)) || norm(stateFilter).includes(st));
    }));
  }

  function setModal(open){
    const modal = byId('impListModal'); if (!modal) return;
    modal.hidden = !open;
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('imp-modal-open', open);
  }
  function modalRows(){ return state.modalType === 'manut' ? buildMaintenance() : buildTonerHistory(); }
  function renderModal(){
    const rows = modalRows();
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    state.modalPage = Math.max(1, Math.min(state.modalPage, totalPages));
    const start = (state.modalPage - 1) * PAGE_SIZE;
    const page = rows.slice(start, start + PAGE_SIZE);
    const title = byId('impListModalTitle');
    const sub = byId('impListModalSub');
    const body = byId('impListModalBody');
    const info = byId('impListModalPage');
    if (title) title.textContent = state.modalType === 'manut' ? 'Histórico de manutenção' : 'Histórico de toner';
    if (sub) sub.textContent = `${rows.length} registos · 25 por página`;
    if (info) info.textContent = `Página ${state.modalPage} de ${totalPages}`;
    if (body) body.innerHTML = page.length ? page.map(item => `<div class="imp-modal-row"><span>${esc(fmtDate(item.__date, true))}</span><strong>${esc(item.title)}<small>${esc(item.main)}${item.sub ? ' · '+esc(item.sub) : ''}</small></strong><em class="tag ${rowStatusClass(item.status)}">${esc(item.status)}</em></div>`).join('') : '<div class="imp-empty-panel">Sem registos para mostrar.</div>';
  }
  function openModal(type){ state.modalType = type === 'manut' ? 'manut' : 'hist'; state.modalPage = 1; renderModal(); setModal(true); }
  function bindModal(){
    document.addEventListener('click', (ev)=>{
      const open = ev.target.closest('[data-imp-open-modal]');
      if (open) { ev.preventDefault(); openModal(open.dataset.impOpenModal); return; }
      if (ev.target.closest('[data-imp-close-modal]')) { ev.preventDefault(); setModal(false); return; }
      if (ev.target === byId('impListModal')) { setModal(false); return; }
      if (ev.target.closest('[data-imp-modal-prev]')) { ev.preventDefault(); state.modalPage -= 1; renderModal(); return; }
      if (ev.target.closest('[data-imp-modal-next]')) { ev.preventDefault(); state.modalPage += 1; renderModal(); return; }
    }, true);
    document.addEventListener('keydown', (ev)=>{ if (ev.key === 'Escape') setModal(false); });
  }
  function bindRealtimeCollection(collection, stateKey, cacheKeys){
    const database = getDb();
    if (!database || !database.collection) {
      state[stateKey] = readCache(cacheKeys || []);
      return;
    }
    try {
      const unsub = database.collection(collection).onSnapshot((snap)=>{
        const arr = [];
        snap.forEach(doc => arr.push({ idDoc:doc.id, firebaseId:doc.id, ...doc.data() }));
        state[stateKey] = sortRecent(arr);
        renderAll();
        if (!byId('impListModal')?.hidden) renderModal();
      }, ()=>{
        state[stateKey] = readCache(cacheKeys || []);
        renderAll();
      });
      state.unsub.push(unsub);
    } catch(e) {
      state[stateKey] = readCache(cacheKeys || []);
    }
  }
  function bindNavigation(){
    if (state.navBound) return;
    state.navBound = true;
    document.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('[data-go]');
      if (!btn) return;
      const url = btn.getAttribute('data-go');
      if (!url) return;
      ev.preventDefault();
      window.location.href = url;
    }, true);
  }
  function boot(){
    if (state.started) return;
    state.started = true;
    window.renderImpressoras = function(lista){ renderAll(Array.isArray(lista) ? lista : getPrinters()); };
    window.filtrarImpressoras = applyFilter;
    bindNavigation();
    bindModal();
    bindRealtimeCollection('stock', 'stock', ['appBraga_backup_stock']);
    bindRealtimeCollection('historico', 'historico', ['appBraga_backup_historico']);
    bindRealtimeCollection('manutencoes', 'manutencoes', ['appBraga_backup_manutencoes','appBragaManutencaoFuturista']);
    bindRealtimeCollection('etiquetasWord', 'etiquetas', ['appBraga_backup_etiquetas']);
    setTimeout(applyFilter, 80);
    setTimeout(applyFilter, 600);
    setTimeout(applyFilter, 1600);
    setInterval(()=>{ applyFilter(); if (!byId('impListModal')?.hidden) renderModal(); }, 7000);
    setTimeout(()=>document.body.classList.remove('imp-loading'), 2500);
  }
  window.addEventListener('beforeunload', ()=>state.unsub.forEach(fn=>{try{fn();}catch(e){}}));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
