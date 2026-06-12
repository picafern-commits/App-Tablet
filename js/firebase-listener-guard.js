/* App Braga - Firestore Listener Guard v1.35.0
   Reduz leituras do Firestore: em páginas que não precisam de tempo real,
   transforma onSnapshot em leitura única. Também expõe diagnóstico local. */
(function(){
  const VERSION = '1.35.0';
  const state = window.__APP_BRAGA_FIRESTORE_GUARD__ = window.__APP_BRAGA_FIRESTORE_GUARD__ || {
    version: VERSION,
    active: {},
    history: [],
    patched: false,
    blockedRealtime: 0,
    oneTimeReads: 0,
    realtimeAllowed: 0
  };
  state.version = VERSION;

  function pageName(){
    const p = (location.pathname || '').split('/').pop() || 'index.html';
    return p.toLowerCase();
  }

  const REALTIME_BY_PAGE = {
    'index.html': new Set(['stock','historico','printers','manutencoes','tarefas','personalTasks','activityLog']),
    'stock.html': new Set(['stock']),
    'add-toner.html': new Set(['stock','historico']),
    'historico.html': new Set(['historico','stock']),
    'impressoras.html': new Set(['printers','manutencoes']),
    'manutencao-impressoras.html': new Set(['manutencoes','printers']),
    'computadores.html': new Set(['pcs']),
    'pistolas.html': new Set(['pistolas','users']),
    'radios.html': new Set(['radios','users','radioWeeklyRecords']),
    'portas.html': new Set(['portas']),
    'users.html': new Set(['users']),
    'diretorio.html': new Set(['diretorioTelefonico']),
    'informacoes.html': new Set(['informacoes']),
    'etiquetas-word.html': new Set(['etiquetasWord']),
    'tarefas.html': new Set(['tarefas','personalTasks']),
    'notificacoes.html': new Set(['notificationTokens','notificationRequests','config']),
    'diagnostico.html': new Set(['notificationTokens','config']),
    'config.html': new Set(['config']),
    'scanner-ia.html': new Set([]),
    'equipamento.html': new Set(['printers','pcs','pistolas','radios','users'])
  };

  function getCollectionFromRef(ref){
    try {
      if (ref && ref.path) {
        const parts = String(ref.path).split('/').filter(Boolean);
        return parts[0] || 'unknown';
      }
      const qp = ref && (ref._query || ref._delegate?._query);
      const segs = qp && (qp.path?.segments || qp._path?.segments || qp.path?.canonicalString?.().split('/'));
      if (Array.isArray(segs) && segs.length) return segs[0];
      const pp = ref && (ref._path?.segments || ref._key?.path?.segments);
      if (Array.isArray(pp) && pp.length) return pp[0];
    } catch(e){}
    return 'unknown';
  }

  function keyFor(ref){
    const col = getCollectionFromRef(ref);
    let path = col;
    try { path = ref.path || ref._query?.path?.canonicalString?.() || ref._path?.canonicalString?.() || col; } catch(e) {}
    return String(path || col);
  }

  function shouldRealtime(col){
    if (!col || col === 'unknown') return true;
    const page = pageName();
    const allowed = REALTIME_BY_PAGE[page];
    if (!allowed) return true;
    return allowed.has(col);
  }

  function normalizeArgs(args){
    let next = null, error = null, complete = null;
    if (typeof args[0] === 'function') {
      next = args[0]; error = args[1]; complete = args[2];
    } else if (args[0] && typeof args[0] === 'object') {
      next = args[0].next ? args[0].next.bind(args[0]) : null;
      error = args[0].error ? args[0].error.bind(args[0]) : null;
      complete = args[0].complete ? args[0].complete.bind(args[0]) : null;
    }
    return { next, error, complete };
  }

  function record(event){
    const item = { time: Date.now(), page: pageName(), ...event };
    state.history.unshift(item);
    state.history = state.history.slice(0, 80);
    try { localStorage.setItem('appBragaFirestoreGuardHistory', JSON.stringify(state.history.slice(0,40))); } catch(e) {}
    window.dispatchEvent(new CustomEvent('appbraga:firestore-guard', { detail: item }));
  }

  function patchProto(proto, label){
    if (!proto || proto.__appBragaGuardPatched || typeof proto.onSnapshot !== 'function') return;
    const original = proto.onSnapshot;
    Object.defineProperty(proto, '__appBragaGuardPatched', { value: true });
    proto.onSnapshot = function(...args){
      const col = getCollectionFromRef(this);
      const key = keyFor(this);
      const realtime = shouldRealtime(col);
      const normalized = normalizeArgs(args);
      if (!realtime && typeof this.get === 'function' && normalized.next) {
        state.blockedRealtime += 1;
        state.oneTimeReads += 1;
        record({ type: 'one-time', collection: col, key, source: label });
        let cancelled = false;
        Promise.resolve()
          .then(() => this.get())
          .then((snap) => { if (!cancelled) normalized.next(snap); if (!cancelled && normalized.complete) normalized.complete(); })
          .catch((err) => { if (!cancelled && normalized.error) normalized.error(err); else console.warn('[App Braga] Firestore one-time read failed:', col, err); });
        return function unsubscribeOneTime(){ cancelled = true; };
      }
      state.realtimeAllowed += 1;
      state.active[key] = (state.active[key] || 0) + 1;
      record({ type: 'realtime', collection: col, key, source: label, active: state.active[key] });
      const unsub = original.apply(this, args);
      return function guardedUnsubscribe(){
        try { if (typeof unsub === 'function') unsub(); } finally {
          state.active[key] = Math.max(0, (state.active[key] || 1) - 1);
          if (!state.active[key]) delete state.active[key];
          record({ type: 'unsubscribe', collection: col, key, source: label });
        }
      };
    };
  }

  function patch(){
    if (state.patched) return true;
    const fs = window.firebase && window.firebase.firestore;
    if (!fs) return false;
    try {
      patchProto(fs.Query && fs.Query.prototype, 'Query');
      patchProto(fs.CollectionReference && fs.CollectionReference.prototype, 'CollectionReference');
      patchProto(fs.DocumentReference && fs.DocumentReference.prototype, 'DocumentReference');
      state.patched = true;
      record({ type: 'patch-ok', collection: 'system', key: 'firestore-guard' });
      return true;
    } catch (error) {
      console.warn('[App Braga] Não foi possível ativar Firestore Guard:', error);
      return false;
    }
  }

  window.AppBragaFirestoreGuard = {
    version: VERSION,
    state,
    pageName,
    getSummary(){
      const active = Object.entries(state.active).map(([key,count]) => ({ key, count }));
      return { page: pageName(), active, activeTotal: active.reduce((s,i)=>s+i.count,0), blockedRealtime: state.blockedRealtime, oneTimeReads: state.oneTimeReads, realtimeAllowed: state.realtimeAllowed, history: state.history.slice(0,20) };
    },
    shouldRealtime,
    patch
  };

  if (!patch()) {
    let tries = 0;
    const timer = setInterval(() => { tries += 1; if (patch() || tries > 50) clearInterval(timer); }, 100);
  }
})();
