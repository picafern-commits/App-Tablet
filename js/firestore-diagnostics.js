(function(){
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function fmtTime(ms){ try { return new Date(ms).toLocaleTimeString('pt-PT'); } catch(e){ return '-'; } }

  window.renderFirestoreGuardDiagnosticoAppBraga = function(){
    const summaryHost = document.getElementById('firestoreGuardSummary');
    const listHost = document.getElementById('firestoreGuardList');
    if (!summaryHost || !listHost) return;
    const guard = window.AppBragaFirestoreGuard;
    if (!guard || !guard.getSummary) {
      summaryHost.innerHTML = '<div class="empty-state mini">Firestore Guard ainda não carregou.</div>';
      listHost.innerHTML = '';
      return;
    }
    const s = guard.getSummary();
    const status = s.activeTotal <= 6 ? 'ok' : (s.activeTotal <= 15 ? 'warn' : 'bad');
    summaryHost.innerHTML = `
      <div class="guard-kpi ${status}"><span>Listeners ativos nesta página</span><strong>${s.activeTotal}</strong></div>
      <div class="guard-kpi ok"><span>Realtime bloqueados</span><strong>${s.blockedRealtime}</strong></div>
      <div class="guard-kpi ok"><span>Leituras únicas feitas</span><strong>${s.oneTimeReads}</strong></div>
      <div class="guard-kpi"><span>Página</span><strong>${esc(s.page)}</strong></div>
    `;
    if (!s.active.length) {
      listHost.innerHTML = '<div class="empty-state mini">Sem listeners ativos registados nesta página.</div>';
    } else {
      listHost.innerHTML = `
        <table class="guard-table">
          <thead><tr><th>Caminho / coleção</th><th>Listeners</th></tr></thead>
          <tbody>${s.active.map(i => `<tr><td>${esc(i.key)}</td><td>${i.count}</td></tr>`).join('')}</tbody>
        </table>
      `;
    }
    const log = document.getElementById('diagnosticLogs');
    if (log && s.history?.length) {
      const existing = log.innerHTML || '';
      const guardRows = s.history.slice(0,8).map(h => `
        <div class="diagnostic-log-item info">
          <strong>${esc(h.type)} · ${esc(h.collection || '')}</strong>
          <span>${esc(h.key || '')}</span>
          <small>${fmtTime(h.time)} · ${esc(h.page || '')}</small>
        </div>`).join('');
      if (!existing.includes('Firestore Guard')) {
        log.innerHTML = `<div class="diagnostic-log-group-title">Firestore Guard</div>${guardRows}${existing}`;
      }
    }
  };

  window.addEventListener('appbraga:firestore-guard', () => {
    if (document.getElementById('firestoreGuardSummary')) {
      clearTimeout(window.__appBragaGuardRenderTimer);
      window.__appBragaGuardRenderTimer = setTimeout(window.renderFirestoreGuardDiagnosticoAppBraga, 250);
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('firestoreGuardSummary')) {
      setTimeout(window.renderFirestoreGuardDiagnosticoAppBraga, 800);
    }
  });
})();
