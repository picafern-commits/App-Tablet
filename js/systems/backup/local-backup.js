/* AppBraga v1.58.168 — compatibilidade segura do backup local.
   Mantém as páginas antigas sem erro quando referenciam o módulo de backup.
   A lógica principal de backup continua nos sistemas existentes da app. */
(function(){
  'use strict';
  window.AppBragaLocalBackup = window.AppBragaLocalBackup || {
    version: '1.58.168',
    ready: true,
    exportJSON: function(data, filename){
      try {
        const blob = new Blob([JSON.stringify(data || {}, null, 2)], { type:'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || ('appbraga-backup-' + new Date().toISOString().slice(0,10) + '.json');
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        return true;
      } catch(e){ console.warn('[AppBragaLocalBackup] exportJSON falhou', e); return false; }
    },
    importJSON: async function(file){
      if(!file) return null;
      const text = await file.text();
      return JSON.parse(text || '{}');
    }
  };
  window.appBragaLocalBackupReady = true;
})();
