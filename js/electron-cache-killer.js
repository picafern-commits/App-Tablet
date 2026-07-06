/* AppBraga v1.58.166 — limpeza forte de cache/visual antigo para Electron/PWA.
   Não apaga dados Firebase nem sistemas: apenas mata cache, service workers antigos e rotas legacy. */
(function(){
  'use strict';
  var VERSION = '1.58.166';
  var CLEAN_KEY = 'appbraga-hard-clean-' + VERSION;
  var LEGACY_ROUTES = {
    '/dashboard': '/html/dashboard.html',
    '/dashboard.html': '/html/dashboard.html',
    '/impressoras': '/html/impressoras.html',
    '/impressoras.html': '/html/impressoras.html',
    '/add-toner': '/html/add-toner.html',
    '/add-toner.html': '/html/add-toner.html',
    '/stock': '/html/stock.html',
    '/stock.html': '/html/stock.html',
    '/historico': '/html/historico.html',
    '/historico.html': '/html/historico.html',
    '/etiquetas': '/html/etiquetas-word.html',
    '/etiquetas.html': '/html/etiquetas-word.html',
    '/etiquetas-word': '/html/etiquetas-word.html',
    '/etiquetas-word.html': '/html/etiquetas-word.html',
    '/manutencao-impressoras': '/html/manutencao-impressoras.html',
    '/manutencao-impressoras.html': '/html/manutencao-impressoras.html',
    '/pistolas': '/html/pistolas.html',
    '/pistolas.html': '/html/pistolas.html',
    '/radios': '/html/radios.html',
    '/radios.html': '/html/radios.html',
    '/computadores': '/html/computadores.html',
    '/computadores.html': '/html/computadores.html',
    '/tarefas': '/html/tarefas.html',
    '/tarefas.html': '/html/tarefas.html',
    '/informacoes': '/html/informacoes.html',
    '/informacoes.html': '/html/informacoes.html',
    '/portas': '/html/portas.html',
    '/portas.html': '/html/portas.html',
    '/users': '/html/users.html',
    '/users.html': '/html/users.html',
    '/diretorio': '/html/diretorio.html',
    '/diretorio.html': '/html/diretorio.html',
    '/equipas-semanais': '/html/equipas-semanais.html',
    '/equipas-semanais.html': '/html/equipas-semanais.html',
    '/scanner-ia': '/html/scanner-ia.html',
    '/scanner-ia.html': '/html/scanner-ia.html',
    '/diagnostico': '/html/diagnostico.html',
    '/diagnostico.html': '/html/diagnostico.html',
    '/notificacoes': '/html/notificacoes.html',
    '/notificacoes.html': '/html/notificacoes.html',
    '/config': '/html/config.html',
    '/config.html': '/html/config.html'
  };

  function isFileProtocol(){ return location.protocol === 'file:'; }
  function safeBase(){
    if (isFileProtocol()) return '';
    return location.origin || '';
  }
  function redirectLegacyPath(){
    if (isFileProtocol()) return;
    var path = location.pathname.replace(/\/+/g, '/');
    var target = LEGACY_ROUTES[path];
    if (target && path.indexOf('/html/') !== 0) {
      location.replace(safeBase() + target + '?v=' + VERSION + '&clean=1');
    }
  }
  function deleteCaches(){
    if (!window.caches) return Promise.resolve();
    return caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if (/appbraga|app-braga|braga|v1\.58|workbox|static|runtime|old|cache/i.test(key)) return caches.delete(key);
        return Promise.resolve(false);
      }));
    }).catch(function(){});
  }
  function unregisterWorkers(){
    if (!('serviceWorker' in navigator)) return Promise.resolve();
    return navigator.serviceWorker.getRegistrations().then(function(regs){
      return Promise.all(regs.map(function(reg){
        try { if (reg.active) reg.active.postMessage({ type: 'CLEAR_OLD_VISUAL_CACHE', version: VERSION }); } catch(e) {}
        return reg.unregister().catch(function(){});
      }));
    }).catch(function(){});
  }
  function cleanLocalFlags(){
    try {
      var keep = [];
      for (var i = 0; i < localStorage.length; i++) keep.push(localStorage.key(i));
      keep.forEach(function(k){
        if (/sidebar|mockup|visual-old|old-visual|enterprise-ui|dashboard-layout|app-theme-pro|iphone-sidebar/i.test(k)) localStorage.removeItem(k);
      });
      sessionStorage.setItem(CLEAN_KEY, '1');
      localStorage.setItem('appbraga-active-version', VERSION);
      localStorage.setItem('appbraga-force-new-visual', '1');
    } catch(e) {}
  }
  function detectOldVisualAndRedirect(){
    try {
      var bodyText = (document.body && document.body.innerText || '').slice(0, 2000);
      var hasOldMarkers = /APP BRAGA PRO|Dashboard personalizável|Equipamentos em Destaque|Centro operacional|Favoritos/i.test(bodyText)
        || document.querySelector('.sidebar, .sidebar-pro-groups, .enterprise-metrics, .personal-dashboard, .app-sidebar, [data-enterprise-displays]');
      if (hasOldMarkers) {
        var map = {
          'dashboard': 'dashboard.html',
          'etiquetas': 'etiquetas-word.html',
          'stock': 'stock.html',
          'toner': 'add-toner.html'
        };
        var lower = location.href.toLowerCase();
        var page = 'index.html';
        Object.keys(map).some(function(key){ if (lower.indexOf(key) >= 0) { page = map[key]; return true; } return false; });
        location.replace((isFileProtocol() ? 'html/' : safeBase() + '/html/') + page + '?v=' + VERSION + '&from=old-visual');
      }
    } catch(e) {}
  }

  redirectLegacyPath();
  cleanLocalFlags();
  if (!sessionStorage.getItem(CLEAN_KEY + '-done')) {
    sessionStorage.setItem(CLEAN_KEY + '-done', '1');
    Promise.all([deleteCaches(), unregisterWorkers()]).then(function(){
      if (!/[?&]clean=1/.test(location.search) && !isFileProtocol()) {
        var glue = location.search ? '&' : '?';
        location.replace(location.href + glue + 'clean=1&v=' + VERSION);
      }
    }).catch(function(){});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', detectOldVisualAndRedirect);
  else detectOldVisualAndRedirect();
})();
