(() => {
  'use strict';
  const VERSION = '1.58.163';
  const COLLECTION = 'diagnosticos';
  const HISTORY_COLLECTION = 'diagnosticosHistorico';
  const LOCAL_KEY = 'appbraga_diagnosticos_fallback_v158128';
  const LOCAL_HISTORY_KEY = 'appbraga_diagnosticos_history_fallback_v158128';
  const state = { items: [], history: [], page: 1, pageSize: 10, unsubItems: null, unsubHistory: null };
  const $ = (id) => document.getElementById(id);
  const text = (v) => String(v ?? '').trim();
  const lower = (v) => text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const uid = () => `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const db = () => window.db && typeof window.db.collection === 'function' ? window.db : null;
  const loadLocal = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } };
  const saveLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const isoNow = () => new Date().toISOString();
  const todayKey = () => new Date().toISOString().slice(0,10);
  const toMs = (value) => { if(!value) return 0; if(typeof value === 'number') return value; if(typeof value === 'object' && typeof value.toDate === 'function') return value.toDate().getTime(); const ms = new Date(value).getTime(); return Number.isFinite(ms) ? ms : 0; };
  const formatDate = (value, mode='short') => { const ms = toMs(value); if(!ms) return '—'; const d = new Date(ms); return d.toLocaleString('pt-PT', mode === 'time' ? {hour:'2-digit', minute:'2-digit'} : {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
  const estadoKey = (value) => { const v = lower(value); if(v.includes('andamento') || v.includes('process') || v.includes('analise')) return 'andamento'; if(v.includes('problema') || v.includes('erro') || v.includes('falha')) return 'problema'; if(v.includes('cancel')) return 'cancelado'; return 'concluido'; };
  const resultKey = (value) => { const v = lower(value); if(v.includes('problema') || v.includes('erro') || v.includes('falha')) return 'problema'; if(v.includes('aten') || v.includes('aviso')) return 'atencao'; return 'sem-problemas'; };
  const pct = (a,b) => b ? Math.round((a/b)*100) : 0;

  function toast(message, type='ok'){
    let n = document.querySelector('.diag-toast');
    if(!n){ n = document.createElement('div'); n.className = 'diag-toast'; document.body.appendChild(n); }
    n.textContent = message; n.className = `diag-toast ${type}`; requestAnimationFrame(()=>n.classList.add('show'));
    clearTimeout(n._timer); n._timer = setTimeout(()=>n.classList.remove('show'), 2600);
  }

  function normalize(doc){
    const data = doc && typeof doc.data === 'function' ? doc.data() : (doc || {});
    const id = doc && typeof doc.data === 'function' ? doc.id : (data.id || data.firebaseId || uid());
    const estado = data.estado || data.status || 'Concluído';
    const resultado = data.resultado || data.result || (estadoKey(estado)==='problema' ? 'Problemas encontrados' : 'Sem problemas');
    return {
      ...data,
      id, firebaseId:id,
      codigo: data.codigo || data.numero || `#D-${String(Math.abs(hash(id)) % 9999).padStart(3,'0')}`,
      equipamento: data.equipamento || data.nome || data.maquina || 'Sistema AppBraga',
      tipo: data.tipo || data.tipoEquipamento || data.categoria || 'Sistema',
      localizacao: data.localizacao || data.local || data.zona || 'Sem local',
      estado,
      resultado,
      problemas: Array.isArray(data.problemas) ? data.problemas : (data.problema ? [data.problema] : []),
      criadoEm: data.criadoEm || data.createdAt || data.data || data.created || isoNow(),
      atualizadoEm: data.atualizadoEm || data.updatedAt || data.criadoEm || data.createdAt || data.data || isoNow(),
      tecnico: data.tecnico || data.responsavel || data.user || 'Sistema',
      observacoes: data.observacoes || data.notas || data.obs || ''
    };
  }
  function hash(str){ let h=0; String(str).split('').forEach(ch=>{h=((h<<5)-h)+ch.charCodeAt(0); h|=0;}); return h; }

  function seedData(){
    const existing = loadLocal(LOCAL_KEY, []); if(existing.length) return existing;
    const now = new Date();
    const samples = [
      ['TASKalfa 255ci','Multifunções','Ilha 2','Concluído','Sem problemas',[]],
      ['P3155DN','Impressora','Escritório','Concluído','Atenção',['Toner baixo']],
      ['PA5500x','Impressora','Armazém','Problema','Problemas encontrados',['Papel Jam (Atolamento)']],
      ['WorkCentre 6515','Multifunções','Ilha 1','Concluído','Sem problemas',[]],
      ['Kyocera ECOSYS M5526cdw','Multifunções','Receção','Em andamento','Em análise',[]]
    ].map((r,i)=>normalize({id:`demo_${i+1}`,codigo:`#D-${152-i}`,equipamento:r[0],tipo:r[1],localizacao:r[2],estado:r[3],resultado:r[4],problemas:r[5],criadoEm:new Date(now.getTime()-i*3600000).toISOString(),tecnico:'Sistema'}));
    saveLocal(LOCAL_KEY, samples); return samples;
  }

  async function loadData(){
    const database = db();
    if(database){
      try{
        state.unsubItems && state.unsubItems();
        state.unsubHistory && state.unsubHistory();
        state.unsubItems = database.collection(COLLECTION).onSnapshot(snap=>{
          state.items = snap.docs.map(normalize).sort((a,b)=>toMs(b.criadoEm)-toMs(a.criadoEm));
          saveLocal(LOCAL_KEY, state.items); render();
        }, err => { console.warn(err); state.items = loadLocal(LOCAL_KEY, seedData()).map(normalize); render(); });
        state.unsubHistory = database.collection(HISTORY_COLLECTION).onSnapshot(snap=>{
          state.history = snap.docs.map(normalize).sort((a,b)=>toMs(b.criadoEm)-toMs(a.criadoEm));
          saveLocal(LOCAL_HISTORY_KEY, state.history); render();
        }, () => { state.history = loadLocal(LOCAL_HISTORY_KEY, []); render(); });
        return;
      } catch(e) { console.warn('Firebase diagnóstico indisponível', e); }
    }
    state.items = loadLocal(LOCAL_KEY, seedData()).map(normalize).sort((a,b)=>toMs(b.criadoEm)-toMs(a.criadoEm));
    state.history = loadLocal(LOCAL_HISTORY_KEY, []);
    render();
  }

  async function saveItem(item){
    const payload = normalize({...item, atualizadoEm: isoNow()});
    const database = db();
    if(database){
      try{
        const ref = payload.firebaseId && !payload.firebaseId.startsWith('local_') ? database.collection(COLLECTION).doc(payload.firebaseId) : database.collection(COLLECTION).doc();
        payload.firebaseId = ref.id; payload.id = ref.id;
        await ref.set(payload, {merge:true});
        await database.collection(HISTORY_COLLECTION).add({tipo:'diagnostico', diagnosticoId:ref.id, acao:'Guardado diagnóstico', equipamento:payload.equipamento, criadoEm:isoNow(), tecnico:payload.tecnico || 'Sistema'});
        return payload;
      }catch(e){ console.warn('fallback save diagnóstico', e); }
    }
    const arr = loadLocal(LOCAL_KEY, []).map(normalize);
    const idx = arr.findIndex(x=>x.id===payload.id || x.firebaseId===payload.firebaseId);
    if(idx >= 0) arr[idx] = payload; else arr.unshift({...payload, id: payload.id || uid(), firebaseId: payload.firebaseId || payload.id || uid()});
    saveLocal(LOCAL_KEY, arr);
    state.items = arr.map(normalize).sort((a,b)=>toMs(b.criadoEm)-toMs(a.criadoEm));
    render(); return payload;
  }
  async function deleteItem(id){
    const item = state.items.find(x=>x.id===id || x.firebaseId===id);
    if(!item) return;
    if(!confirm(`Apagar o diagnóstico ${item.codigo}?`)) return;
    const database = db();
    if(database && item.firebaseId && !String(item.firebaseId).startsWith('local_')){ try{ await database.collection(COLLECTION).doc(item.firebaseId).delete(); toast('Diagnóstico apagado.'); return; } catch(e){ console.warn(e); } }
    const arr = loadLocal(LOCAL_KEY, []).filter(x => x.id !== id && x.firebaseId !== id);
    saveLocal(LOCAL_KEY, arr); state.items = arr.map(normalize); render(); toast('Diagnóstico apagado.');
  }

  function filtered(){
    const q = lower($('diagSearch')?.value || ''); const estado = lower($('diagFilterEstado')?.value || '');
    return state.items.filter(x => {
      const hay = lower([x.codigo,x.equipamento,x.tipo,x.localizacao,x.estado,x.resultado,x.tecnico,x.observacoes,(x.problemas||[]).join(' ')].join(' '));
      if(q && !hay.includes(q)) return false;
      if(estado && estadoKey(x.estado) !== estado) return false;
      return true;
    });
  }
  function counts(){
    const total = state.items.length;
    const concluidos = state.items.filter(x=>estadoKey(x.estado)==='concluido').length;
    const andamento = state.items.filter(x=>estadoKey(x.estado)==='andamento').length;
    const problemas = state.items.filter(x=>estadoKey(x.estado)==='problema' || resultKey(x.resultado)==='problema').length;
    const hoje = state.items.filter(x=>String(x.criadoEm).slice(0,10)===todayKey()).length;
    const ultimo = state.items.slice().sort((a,b)=>toMs(b.criadoEm)-toMs(a.criadoEm))[0];
    return {total, concluidos, andamento, problemas, hoje, ultimo};
  }

  function render(){ renderKpis(); renderTable(); renderSide(); }
  function set(id, v){ const n=$(id); if(n) n.textContent = v; }
  function renderKpis(){
    const c = counts(); set('diagKpiTotal', c.total); set('diagKpiConcluidos', c.concluidos); set('diagPctConcluidos', `${pct(c.concluidos,c.total)}%`); set('diagKpiAndamento', c.andamento); set('diagKpiProblemas', c.problemas); set('diagKpiHoje', c.hoje);
    set('diagKpiUltimo', c.ultimo ? formatDate(c.ultimo.criadoEm,'time') : '—'); set('diagKpiUltimoSub', c.ultimo ? 'Último registo' : 'Sem registos'); set('diagListCount', filtered().length);
  }
  function renderTable(){
    const list = filtered(); const total = list.length; const size = state.pageSize; const pages = Math.max(1, Math.ceil(total/size)); if(state.page > pages) state.page = pages;
    const start = (state.page-1)*size; const page = list.slice(start, start+size); const body = $('diagTableBody');
    if(body) body.innerHTML = page.length ? page.map(rowHtml).join('') : `<tr><td colspan="8" style="text-align:center;padding:30px;color:#9ab3d8;font-weight:900">Sem diagnósticos para mostrar.</td></tr>`;
    set('diagTableSummary', total ? `${start+1}-${Math.min(start+size,total)} de ${total} registos` : '0-0 de 0 registos'); renderPagination(total, pages);
  }
  function rowHtml(x){
    const ek = estadoKey(x.estado); const rk = resultKey(x.resultado);
    return `<tr><td><span class="diag-id">${esc(x.codigo)}</span><span class="diag-sub">ID: ${esc(String(x.id).slice(0,8))}</span></td><td><strong>${esc(x.equipamento)}</strong></td><td><span class="diag-type">${esc(x.tipo)}</span></td><td>${esc(x.localizacao)}</td><td><span class="diag-status ${ek==='concluido'?'ok':ek==='andamento'?'run':ek==='problema'?'bad':'off'}">${ek==='concluido'?'✓':ek==='andamento'?'◷':ek==='problema'?'⚠':'•'} ${esc(x.estado)}</span></td><td><span class="diag-result ${rk==='sem-problemas'?'ok':rk==='atencao'?'warn':'bad'}">${rk==='sem-problemas'?'✓':rk==='atencao'?'⚠':'△'} ${esc(x.resultado)}</span></td><td>${esc(formatDate(x.criadoEm))}</td><td><div class="diag-actions"><button class="diag-action-btn" data-view="${esc(x.id)}">👁</button><button class="diag-action-btn" data-run="${esc(x.id)}">▣</button><button class="diag-action-btn danger" data-del="${esc(x.id)}">…</button></div></td></tr>`;
  }
  function renderPagination(total, pages){ const host=$('diagPagination'); if(!host) return; const btn=(p,label=p,disabled=false)=>`<button type="button" ${disabled?'disabled':''} class="${p===state.page?'active':''}" data-page="${p}">${label}</button>`; let html=btn(Math.max(1,state.page-1),'‹',state.page===1); for(let p=1;p<=Math.min(pages,4);p++) html+=btn(p); if(pages>4) html+=`<button disabled>…</button>${btn(pages)}`; html+=btn(Math.min(pages,state.page+1),'›',state.page===pages); host.innerHTML=html; }
  function renderSide(){ renderEstadoDonut(); renderProblems(); renderHealth(); renderTypes(); renderAlerts(); }
  function renderEstadoDonut(){ const total=state.items.length||1; const ok=state.items.filter(x=>estadoKey(x.estado)==='concluido').length, run=state.items.filter(x=>estadoKey(x.estado)==='andamento').length, bad=state.items.filter(x=>estadoKey(x.estado)==='problema').length, off=state.items.filter(x=>estadoKey(x.estado)==='cancelado').length; const p1=pct(ok,total), p2=pct(run,total), p3=pct(bad,total); const d=$('diagEstadoDonut'); if(d) d.style.background=`conic-gradient(var(--ck-green) 0 ${p1}%, var(--ck-orange) ${p1}% ${p1+p2}%, var(--ck-red) ${p1+p2}% ${p1+p2+p3}%, #77849b ${p1+p2+p3}% 100%)`; const l=$('diagEstadoLegend'); if(l) l.innerHTML=legendRows([['green','Concluídos',ok,pct(ok,total)],['orange','Em Andamento',run,pct(run,total)],['red','Problemas',bad,pct(bad,total)],['gray','Cancelados',off,pct(off,total)]]); }
  function legendRows(rows){ return rows.map(r=>`<div class="diag-legend-row"><span class="diag-dot ${r[0]}"></span><strong>${esc(r[1])}</strong><b>${r[2]}</b><span>${r[3]}%</span></div>`).join(''); }
  function renderProblems(){ const map={}; state.items.forEach(x=>(x.problemas&&x.problemas.length?x.problemas:['Outros']).forEach(p=>{map[p]=(map[p]||0)+1;})); const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5); const max=Math.max(1,...rows.map(r=>r[1])); const host=$('diagProblemsBars'); if(host) host.innerHTML = rows.length ? rows.map(([k,v],i)=>bar(k,v,pct(v,max),['#ff7a25','#ff5567','#9aa8bd','#2a8cff','#9056ff'][i]||'#33d4ff')).join('') : '<p style="color:#9ab3d8;font-weight:900">Sem problemas registados.</p>'; }
  function renderHealth(){ const c=counts(); const total = Math.max(1, c.total); const healthy = Math.max(0, c.concluidos - c.problemas); const p=pct(healthy,total); const h=$('diagHealthRing'); if(h){ h.style.background=`conic-gradient(var(--ck-green) 0 ${p}%, var(--ck-orange) ${p}% ${Math.min(100,p+12)}%, var(--ck-red) ${Math.min(100,p+12)}% 100%)`; h.innerHTML=`<strong>${p}%</strong><span>${p>=70?'Saudável':p>=40?'Atenção':'Crítico'}</span>`; } const l=$('diagHealthLegend'); if(l) l.innerHTML=legendRows([['green','Equipamentos Saudáveis',healthy,p],['orange','Atenção',c.andamento,pct(c.andamento,total)],['red','Problemas',c.problemas,pct(c.problemas,total)],['gray','Offline',0,0]]); }
  function renderTypes(){ const map={}; state.items.forEach(x=>{ map[x.tipo]=(map[x.tipo]||0)+1; }); const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5); const total=Math.max(1,state.items.length); const host=$('diagTypeBars'); if(host) host.innerHTML=rows.length?rows.map(([k,v],i)=>bar(k,v,pct(v,total),['#2a8cff','#c44dff','#55df72','#ff9f2f','#33d4ff'][i]||'#33d4ff')).join(''):'<p style="color:#9ab3d8;font-weight:900">Sem equipamentos registados.</p>'; }
  function bar(label,value,percent,color){ return `<div class="diag-bar-row"><strong>${esc(label)}</strong><div class="diag-bar"><span style="width:${percent}%;background:${color}"></span></div><b>${value}</b><span>${percent}%</span></div>`; }
  function renderAlerts(){ const alerts = state.items.filter(x=>estadoKey(x.estado)==='problema'||resultKey(x.resultado)!=='sem-problemas').slice(0,4); const host=$('diagAlertsList'); if(host) host.innerHTML = alerts.length ? alerts.map(x=>`<div class="diag-feed-item"><span class="bullet"></span><div><strong>${esc(x.resultado)} em ${esc(x.equipamento)}</strong><small>${esc(x.localizacao)} · ${esc((x.problemas||[]).join(', ') || 'Verifique o equipamento')}</small></div><time>${esc(formatDate(x.criadoEm,'time'))}</time></div>`).join('') : '<p style="color:#9ab3d8;font-weight:900">Sem alertas recentes.</p>'; }
  function showDetail(id){ const x=state.items.find(i=>i.id===id||i.firebaseId===id); if(!x) return; $('diagModalTitle').textContent = `${x.codigo} · ${x.equipamento}`; $('diagModalSub').textContent = 'Detalhes do diagnóstico.'; $('diagModalBody').innerHTML = `<div class="diag-detail-grid"><div class="diag-detail-item"><span>Equipamento</span><strong>${esc(x.equipamento)}</strong></div><div class="diag-detail-item"><span>Tipo</span><strong>${esc(x.tipo)}</strong></div><div class="diag-detail-item"><span>Localização</span><strong>${esc(x.localizacao)}</strong></div><div class="diag-detail-item"><span>Estado</span><strong>${esc(x.estado)}</strong></div><div class="diag-detail-item"><span>Resultado</span><strong>${esc(x.resultado)}</strong></div><div class="diag-detail-item"><span>Data</span><strong>${esc(formatDate(x.criadoEm))}</strong></div><div class="diag-detail-item"><span>Problemas</span><strong>${esc((x.problemas||[]).join(', ') || 'Sem problemas')}</strong></div><div class="diag-detail-item"><span>Técnico</span><strong>${esc(x.tecnico)}</strong></div><div class="diag-detail-item" style="grid-column:1/-1"><span>Observações</span><strong>${esc(x.observacoes || '—')}</strong></div></div><div class="diag-modal-actions"><button class="ck-btn" data-close="diagModal">Fechar</button><button class="ck-btn primary" data-rerun="${esc(x.id)}">Executar novamente</button></div>`; $('diagModal').hidden=false; }
  function runDiagnostic(existingId){
    const existing = existingId ? state.items.find(x=>x.id===existingId||x.firebaseId===existingId) : null;
    const tipo = existing?.tipo || text($('diagTipo')?.value) || 'Sistema'; const equipamento = existing?.equipamento || text($('diagEquipamento')?.value) || 'Sistema AppBraga'; const localizacao = existing?.localizacao || text($('diagLocal')?.value) || 'AppBraga';
    const probs=[]; let estado='Concluído', resultado='Sem problemas';
    if(!navigator.onLine){ probs.push('Sem ligação à rede'); resultado='Problemas encontrados'; estado='Problema'; }
    if(!window.firebase){ probs.push('Firebase não carregado'); resultado='Atenção'; }
    if(tipo.toLowerCase().includes('impressora') && Math.random() < .20){ probs.push('Toner baixo'); resultado='Atenção'; }
    if(probs.some(p=>/firebase|rede|ligação/i.test(p))) estado='Problema';
    const item = normalize({id: existing?.id || uid(), firebaseId: existing?.firebaseId, codigo: existing?.codigo || `#D-${Date.now().toString().slice(-4)}`, tipo,equipamento,localizacao,estado,resultado,problemas:probs,criadoEm: existing?.criadoEm || isoNow(), atualizadoEm: isoNow(), tecnico: 'Sistema', observacoes: probs.length ? 'Diagnóstico automático encontrou situações a verificar.' : 'Diagnóstico automático concluído sem problemas.'});
    saveItem(item).then(()=>toast('Diagnóstico concluído.'));
  }
  function exportCsv(){ const rows=[['ID','Equipamento','Tipo','Localização','Estado','Resultado','Problemas','Data/Hora']].concat(filtered().map(x=>[x.codigo,x.equipamento,x.tipo,x.localizacao,x.estado,x.resultado,(x.problemas||[]).join('; '),formatDate(x.criadoEm)])); const csv=rows.map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(';')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`diagnostico-appbraga-${todayKey()}.csv`; a.click(); URL.revokeObjectURL(a.href); toast('Relatório exportado.'); }
  function clearCache(){ try{ Object.keys(localStorage).filter(k=>/diagnostico|diagnostic/i.test(k)).forEach(k=>localStorage.removeItem(k)); toast('Cache de diagnóstico limpa.'); }catch{ toast('Não foi possível limpar cache.','error'); } }

  function bind(){
    ['diagSearch','diagFilterEstado'].forEach(id=>$(id)?.addEventListener('input',()=>{state.page=1;renderTable();}));
    $('diagPageSize')?.addEventListener('change',e=>{state.pageSize=Number(e.target.value)||10;state.page=1;renderTable();});
    $('diagPagination')?.addEventListener('click',e=>{const b=e.target.closest('button[data-page]'); if(!b||b.disabled) return; state.page=Number(b.dataset.page)||1; renderTable();});
    $('diagTableBody')?.addEventListener('click',e=>{const view=e.target.closest('[data-view]'), del=e.target.closest('[data-del]'), run=e.target.closest('[data-run]'); if(view) showDetail(view.dataset.view); if(del) deleteItem(del.dataset.del); if(run) runDiagnostic(run.dataset.run);});
    document.addEventListener('click',e=>{const c=e.target.closest('[data-close]'); if(c) $(c.dataset.close).hidden=true; const r=e.target.closest('[data-rerun]'); if(r){$('diagModal').hidden=true; runDiagnostic(r.dataset.rerun);} });
    $('diagBtnIniciar')?.addEventListener('click',()=>runDiagnostic()); $('diagBtnNovo')?.addEventListener('click',()=>{$('diagTipo').focus(); window.scrollTo({top:0,behavior:'smooth'});});
    $('diagBtnExportar')?.addEventListener('click',exportCsv); $('diagBtnCache')?.addEventListener('click',clearCache); $('diagBtnHistorico')?.addEventListener('click',()=>toast('Histórico completo mostrado na lista.'));
    $('diagBtnModelos')?.addEventListener('click',()=>toast('Modelos: Impressora, PC, Scanner, Rádio e Rede.'));
    $('diagBtnAgendar')?.addEventListener('click',()=>toast('Agendamento registado localmente.'));
    $('diagBtnConfig')?.addEventListener('click',()=>toast('Configurações de diagnóstico prontas.'));
    $('diagBtnAlertas')?.addEventListener('click',()=>{ $('diagFilterEstado').value='problema'; state.page=1; renderTable(); });
  }
  document.addEventListener('DOMContentLoaded',()=>{ bind(); loadData(); });
})();
