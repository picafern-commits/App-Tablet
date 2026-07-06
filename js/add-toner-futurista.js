/* AppBraga v1.58.165 — Adicionar Toner: KPIs e painéis ligados aos dados reais */
(function(){
  const VERSION = '1.58.165';
  const byId = (id) => document.getElementById(id);
  const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const state = {
    stock: [],
    etiquetas: [],
    lastStockOk: [],
    lastEtiquetasOk: [],
    booted: false
  };

  function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function globalValue(name, fallback) {
    try {
      const val = Function(`return (typeof ${name} !== "undefined") ? ${name} : undefined`)();
      return val === undefined ? fallback : val;
    } catch(e) {
      try { return window[name] === undefined ? fallback : window[name]; } catch(_) { return fallback; }
    }
  }

  function asArray(value) { return Array.isArray(value) ? value : []; }

  function getStock() {
    const direct = state.stock.length ? state.stock : state.lastStockOk;
    if (direct.length) return direct;
    return asArray(globalValue('stockGlobal', [])).concat(asArray(window.stockTonersData || []), asArray(window.stockData || []));
  }

  function getEtiquetas() {
    const direct = state.etiquetas.length ? state.etiquetas : state.lastEtiquetasOk;
    if (direct.length) return direct;
    return asArray(globalValue('etiquetasWordGlobal', [])).concat(asArray(window.__etiquetasFuturista || []));
  }

  function getImpressoras() {
    return asArray(globalValue('impressorasData', window.impressorasData || []));
  }

  function getTonerInfo() {
    return globalValue('tonerInfoState', window.tonerInfoState || {}) || {};
  }

  function createdMs(item) {
    const value = item?.createdAtMs || item?.createdMs || item?.created || item?.createdAt || item?.updatedAt || item?.dataCriacao || item?.data;
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (value && typeof value.toMillis === 'function') return value.toMillis();
    if (value && typeof value.seconds === 'number') return value.seconds * 1000;
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(raw + 'T12:00:00').getTime();
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : 0;
  }

  function formatDate(item) {
    const raw = item?.data || item?.dataScan || item?.dataEtiqueta || item?.createdAt || item?.created || item?.createdAtMs || item?.createdMs;
    if (!raw) return 'Sem data';
    if (typeof raw === 'number') return new Date(raw).toLocaleString('pt-PT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
    if (raw && typeof raw.toDate === 'function') return raw.toDate().toLocaleString('pt-PT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
    if (raw && typeof raw.seconds === 'number') return new Date(raw.seconds * 1000).toLocaleString('pt-PT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y,m,d] = s.split('-');
      return `${d}/${m}/${y}`;
    }
    return s;
  }

  function isToday(item) {
    const ms = createdMs(item);
    if (!ms) {
      const data = String(item?.data || '').slice(0,10);
      return data && data === new Date().toISOString().slice(0,10);
    }
    const d = new Date(ms);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  function isUsed(item) {
    const blob = norm([item?.estado,item?.status,item?.usado,item?.used,item?.origem,item?.tipo,item?.acao].join(' '));
    return item?.usado === true || item?.used === true || blob.includes('usado') || blob.includes('utilizado') || blob.includes('saida') || blob.includes('retirado');
  }

  function notUsedStock(items) {
    return asArray(items).filter(item => !isUsed(item));
  }

  function getColorClass(value) {
    const n = norm(value);
    if (n.includes('amarelo') || n.includes('yellow')) return 'amarelo';
    if (n.includes('azul') || n.includes('ciano') || n.includes('cyan')) return 'ciano';
    if (n.includes('vermelho') || n.includes('magenta')) return 'magenta';
    return 'preto';
  }

  function colorLabel(value) {
    const cls = getColorClass(value);
    if (cls === 'ciano') return 'Ciano';
    if (cls === 'magenta') return 'Magenta';
    if (cls === 'amarelo') return 'Amarelo';
    return 'Preto';
  }

  function printerFromStock(item) {
    const eq = item?.equipamento || item?.modelo || item?.printer || item?.nome || 'Toner';
    const loc = item?.localCurto || item?.localizacao || item?.local || item?.serie || item?.serial || 'Sem localização';
    return { eq:String(eq), loc:String(loc) };
  }

  function updatePreview() {
    const equipamento = byId('equipamento')?.value || '-';
    const localizacao = byId('localizacao')?.value || '-';
    const cor = byId('cor')?.value || '-';
    const data = byId('data')?.value || '-';
    const qtd = byId('quantidade')?.value || '1';
    const unidade = byId('unidade')?.value || 'Unidade';
    const obs = byId('observacoes')?.value || '-';

    setText('previewEquipamento', equipamento || '-');
    setText('previewLocalizacao', localizacao || '-');
    setText('previewCor', cor || '-');
    setText('previewData', data || '-');
    setText('previewQtd', `${qtd} ${qtd === '1' ? unidade.replace(/s$/, '') : unidade}`);
    setText('previewObs', obs || '-');

    const dot = byId('previewColorDot');
    if (dot) dot.className = 'color-dot ' + getColorClass(cor);
    setText('obsCounter', String((byId('observacoes')?.value || '').length));
  }

  function hydrateDate() {
    const data = byId('data');
    if (data && !data.value) data.value = new Date().toISOString().slice(0, 10);
  }

  function hydrateKpis() {
    const stock = getStock();
    const etiquetas = getEtiquetas();
    const impressoras = getImpressoras();
    setText('kpiRegistosHoje', stock.filter(isToday).length);
    setText('kpiPorValidar', notUsedStock(stock).length);
    setText('kpiEquipamentos', impressoras.length);
    setText('kpiEtiquetas', etiquetas.length);
  }

  function renderRecent() {
    const list = byId('recentTonerList');
    if (!list) return;
    const items = getStock().slice().sort((a,b)=>createdMs(b)-createdMs(a)).slice(0,5);
    if (!items.length) {
      list.innerHTML = '<div class="muted-line">Sem registos de toner.</div>';
      return;
    }
    list.innerHTML = items.map(item => {
      const { eq, loc } = printerFromStock(item);
      const cor = item.cor || item.color || 'Preto';
      const used = isUsed(item);
      return `<div class="row toner-recent-row">
        <span class="recent-main"><span class="dot ${getColorClass(cor)}"></span><strong>${esc(eq)}</strong><small>${esc(loc)}</small></span>
        <small>${esc(colorLabel(cor))} • ${esc(item.quantidade || item.qtd || 1)} un.</small>
        <small>${esc(formatDate(item))}</small>
        <b class="usage-pill ${used ? 'used' : 'available'}">${used ? 'Usado' : 'Não usado'}</b>
      </div>`;
    }).join('');
  }

  function tonerItemsFromInfo(info) {
    if (!info) return [];
    if (Array.isArray(info.colors) && info.colors.length) return info.colors;
    if (typeof info.percent === 'number') return [{ key:'black', label:'Preto', percent:info.percent }];
    return [];
  }

  function renderLowTonerWarnings() {
    const host = byId('tonerWarnings');
    if (!host) return;
    const impressoras = getImpressoras();
    const tonerState = getTonerInfo();
    const alerts = [];
    impressoras.forEach(printer => {
      const info = tonerState[printer.ip] || tonerState[printer.serie] || null;
      tonerItemsFromInfo(info).forEach(t => {
        const percent = Number(t.percent);
        if (Number.isFinite(percent) && percent <= 25) {
          alerts.push({
            printer,
            label: t.label || colorLabel(t.key || t.cor || 'Preto'),
            percent: Math.max(0, Math.min(100, Math.round(percent)))
          });
        }
      });
    });
    alerts.sort((a,b)=>a.percent-b.percent);
    if (!alerts.length) {
      host.innerHTML = '<div class="muted-line">Sem toners abaixo de 25%.</div>';
      return;
    }
    host.innerHTML = alerts.slice(0,8).map(a => {
      const critical = a.percent <= 10;
      const name = a.printer.modelo || a.printer.equipamento || 'Impressora';
      const loc = a.printer.localizacao || a.printer.local || a.printer.serie || '';
      return `<div class="warning-low-row">
        <span class="warn-dot ${critical ? 'red' : 'orange'}"></span>
        <div class="warning-low-main"><strong>${esc(name)} — ${esc(a.label)}</strong><small>${esc(loc)}</small></div>
        <b class="warning-percent ${critical ? 'critical' : 'low'}">${a.percent}%</b>
      </div>`;
    }).join('');
  }

  function renderAll() {
    hydrateKpis();
    renderRecent();
    renderLowTonerWarnings();
  }

  function bindRealtime() {
    const db = (() => { try { return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null); } catch(e) { return null; } })();
    if (!db || !db.collection || window.__addTonerV140Bound) return;
    window.__addTonerV140Bound = true;
    try {
      db.collection('stock').onSnapshot(snap => {
        const arr = [];
        snap.forEach(doc => arr.push({ idDoc:doc.id, firebaseId:doc.id, ...doc.data() }));
        arr.sort((a,b)=>createdMs(b)-createdMs(a));
        state.stock = arr;
        if (arr.length) state.lastStockOk = arr;
        renderAll();
      }, () => { state.stock = asArray(globalValue('stockGlobal', [])); renderAll(); });
    } catch(e) { console.warn('Adicionar Toner: stock realtime indisponível', e); }
    try {
      db.collection('etiquetasWord').onSnapshot(snap => {
        const arr = [];
        snap.forEach(doc => arr.push({ idDoc:doc.id, firebaseId:doc.id, ...doc.data() }));
        arr.sort((a,b)=>createdMs(b)-createdMs(a));
        state.etiquetas = arr;
        if (arr.length) state.lastEtiquetasOk = arr;
        renderAll();
      }, () => { state.etiquetas = asArray(globalValue('etiquetasWordGlobal', [])); renderAll(); });
    } catch(e) { console.warn('Adicionar Toner: etiquetas realtime indisponível', e); }
  }

  function attach() {
    ['equipamento','localizacao','cor','data','quantidade','unidade','observacoes'].forEach(id => {
      const el = byId(id);
      if (el) {
        el.addEventListener('input', updatePreview);
        el.addEventListener('change', updatePreview);
      }
    });
  }

  function init() {
    if (state.booted) return;
    state.booted = true;
    hydrateDate();
    attach();
    updatePreview();
    renderAll();
    bindRealtime();
    [500, 1200, 2500, 5000].forEach(ms => setTimeout(renderAll, ms));
    setInterval(renderLowTonerWarnings, 8000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// Integração com AppBragaSystems para movimentos de toner.
(function(){
  function collectTonerPayload(){
    return {
      equipamento: document.querySelector('#equipamento,#tonerEquipamento,#addTonerEquipamento')?.value || '',
      localizacao: document.querySelector('#localizacao,#tonerLocalizacao,#addTonerLocalizacao')?.value || '',
      cor: document.querySelector('#cor,#tonerCor,#addTonerCor')?.value || '',
      quantidade: document.querySelector('#quantidade,#tonerQuantidade,#addTonerQuantidade')?.value || 1,
      referencia: document.querySelector('#codigoEtiqueta,#sdsRef,#sdsReferencia')?.value || '',
      area: 'Adicionar Toner'
    };
  }
  document.addEventListener('click', function(ev){
    const btn = ev.target.closest('button');
    if (!btn) return;
    const text = (btn.textContent || '').toLowerCase();
    if (text.includes('guardar') && text.includes('registo')) {
      setTimeout(function(){
        try { if (window.registarTonerAdicionadoAppBraga) window.registarTonerAdicionadoAppBraga(collectTonerPayload()); } catch(e) {}
      }, 800);
    }
  }, true);
})();
