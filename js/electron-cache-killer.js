/* AppBraga v1.58.168 — limpeza forte GitHub Pages + Electron.
   Mantém Firebase/sistemas. Só elimina cache/rotas/visual antigo. */
(function(){
  'use strict';
  var VERSION = '1.58.168';
  var CLEAN_KEY = 'appbraga-hard-clean-' + VERSION;
  var ROUTES = {
    'index': 'index.html',
    'dashboard': 'dashboard.html',
    'impressoras': 'impressoras.html',
    'add-toner': 'add-toner.html',
    'stock': 'stock.html',
    'historico': 'historico.html',
    'etiquetas': 'etiquetas-word.html',
    'etiquetas-word': 'etiquetas-word.html',
    'manutencao-impressoras': 'manutencao-impressoras.html',
    'pistolas': 'pistolas.html',
    'radios': 'radios.html',
    'computadores': 'computadores.html',
    'tarefas': 'tarefas.html',
    'informacoes': 'informacoes.html',
    'portas': 'portas.html',
    'users': 'users.html',
    'diretorio': 'diretorio.html',
    'equipas-semanais': 'equipas-semanais.html',
    'scanner-ia': 'scanner-ia.html',
    'diagnostico': 'diagnostico.html',
    'notificacoes': 'notificacoes.html',
    'config': 'config.html',
    'configuracoes': 'config.html',
    'assistente': 'index.html',
    'equipamento': 'portal-equipamentos.html',
    'zonas': 'index.html'
  };

  function isFileProtocol(){ return location.protocol === 'file:'; }
  function pathParts(){ return location.pathname.split('/').filter(Boolean); }
  function currentFile(){
    var parts = pathParts();
    var last = parts.length ? parts[parts.length - 1] : 'index.html';
    return last || 'index.html';
  }
  function currentSlug(){ return currentFile().replace(/\.html?$/i, '').toLowerCase(); }
  function projectBase(){
    var parts = pathParts();
    var htmlIndex = parts.indexOf('html');
    if (htmlIndex >= 0) return '/' + parts.slice(0, htmlIndex).join('/') + (htmlIndex ? '/' : '');
    if (!parts.length) return '/';
    var last = parts[parts.length - 1];
    if (/\.html?$/i.test(last) || !last) return '/' + parts.slice(0, -1).join('/') + (parts.length > 1 ? '/' : '/');
    return '/' + parts.join('/') + '/';
  }
  function htmlUrl(file, extra){
    if (isFileProtocol()) return 'html/' + file + '?v=' + VERSION + (extra || '');
    var base = projectBase();
    if (base === '//') base = '/';
    return location.origin + base + 'html/' + file + '?v=' + VERSION + (extra || '');
  }
  function redirectLegacyPath(){
    if (isFileProtocol()) return;
    var parts = pathParts();
    var inHtml = parts.indexOf('html') >= 0;
    if (inHtml) return;
    var slug = currentSlug();
    var target = ROUTES[slug];
    if (target) location.replace(htmlUrl(target, '&clean=legacy-route'));
  }
  function deleteCaches(){
    if (!window.caches) return Promise.resolve();
    return caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if (/appbraga|app-braga|bragalis|braga|v1\.58|workbox|static|runtime|old|cache/i.test(key)) return caches.delete(key);
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
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      keys.forEach(function(k){
        if (/mockup|visual-old|old-visual|enterprise-ui|dashboard-layout|app-theme-pro|iphone-sidebar/i.test(k)) localStorage.removeItem(k);
      });
      sessionStorage.setItem(CLEAN_KEY, '1');
      localStorage.setItem('appbraga-active-version', VERSION);
      localStorage.setItem('appbraga-force-new-visual', '1');
    } catch(e) {}
  }
  function detectOldVisualAndRedirect(){
    try {
      var bodyText = (document.body && document.body.innerText || '').slice(0, 2500);
      var hasOldMarkers = /APP BRAGA PRO|Dashboard personaliz[aá]vel|Equipamentos em Destaque|Centro operacional|Favoritos/i.test(bodyText)
        || document.querySelector('.enterprise-metrics, .personal-dashboard, .app-sidebar, [data-enterprise-displays]');
      if (hasOldMarkers) {
        var slug = currentSlug();
        var page = ROUTES[slug] || 'index.html';
        location.replace(htmlUrl(page, '&from=old-visual-detector'));
      }
    } catch(e) {}
  }

  redirectLegacyPath();
  cleanLocalFlags();
  if (!sessionStorage.getItem(CLEAN_KEY + '-done')) {
    sessionStorage.setItem(CLEAN_KEY + '-done', '1');
    Promise.all([deleteCaches(), unregisterWorkers()]).then(function(){
      if (!/[?&]clean=1/.test(location.search) && !/[?&]clean=legacy-route/.test(location.search) && !isFileProtocol()) {
        var glue = location.search ? '&' : '?';
        location.replace(location.href + glue + 'clean=1&v=' + VERSION);
      }
    }).catch(function(){});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', detectOldVisualAndRedirect);
  else detectOldVisualAndRedirect();
})();
