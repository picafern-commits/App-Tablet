(() => {
  'use strict';
  const VERSION = '1.58.172';
  const COLLECTIONS = ['notificacoes','notifications'];
  const HISTORY_COLLECTIONS = ['notificationHistory','notificacoesHistorico'];
  const DEVICES_COLLECTION = 'notificationDevices';
  const LOCAL_KEY = 'appbraga_notificacoes_fallback_v158129';
  const LOCAL_HISTORY_KEY = 'appbraga_notificacoes_history_fallback_v158129';
  const LOCAL_DEVICES_KEY = 'appbraga_notification_devices_fallback_v158129';
  const state = { items: [], history: [], devices: [], page: 1, pageSize: 10, unsubs: [] };
  const $ = (id) => document.getElementById(id);
  const text = (v) => String(v ?? '').trim();
  const lower = (v) => text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const db = () => window.db && typeof window.db.collection === 'function' ? window.db : null;
  const isoNow = () => new Date().toISOString();
  const loadLocal = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } };
  const saveLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const toMs = (value) => { if(!value) return 0; if(typeof value === 'number') return value; if(typeof value === 'object' && typeof value.toDate === 'function') return value.toDate().getTime(); const ms = new Date(value).getTime(); return Number.isFinite(ms) ? ms : 0; };
  const formatDate = (value, mode='short') => { const ms = toMs(value); if(!ms) return 'â€”'; const d = new Date(ms); return d.toLocaleString('pt-PT', mode === 'date' ? {day:'2-digit',month:'2-digit',year:'numeric'} : {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
  const todayKey = () => new Date().toISOString().slice(0,10);
  const pct = (a,b) => b ? Math.round((a/b)*1000)/10 : 0;

  function toast(message, type='ok'){
    let n = document.querySelector('.not-toast');
    if(!n){ n = document.createElement('div'); n.className = 'not-toast'; document.body.appendChild(n); }
    n.textContent = message; n.className = `not-toast ${type}`; requestAnimationFrame(()=>n.classList.add('show'));
    clearTimeout(n._timer); n._timer = setTimeout(()=>n.classList.remove('show'), 2600);
  }

  function estadoKey(value){
    const v = lower(value);
    if(v.includes('falha') || v.includes('erro') || v.includes('failed')) return 'falha';
    if(v.includes('agend')) return 'agendada';
    if(v.includes('pend') || v.includes('queue')) return 'pendente';
    return 'enviada';
  }
  function priorityKey(value){
    const v = lower(value);
    if(v.includes('alta') || v.includes('high') || v.includes('crit')) return 'Alta';
    if(v.includes('baixa') || v.includes('low')) return 'Baixa';
    return 'MÃ©dia';
  }
  function normalize(doc){
    const data = doc && typeof doc.data === 'function' ? doc.data() : (doc || {});
    const id = doc && typeof doc.data === 'function' ? doc.id : (data.id || data.firebaseId || data.notificationId || uid());
    const agendada = data.agendar || data.scheduledAt || data.agendadoPara || '';
    let estado = data.estado || data.status || data.deliveryStatus || '';
    if(!estado) estado = agendada && toMs(agendada) > Date.now() ? 'Agendada' : 'Enviada';
    return {
      ...data,
      id, firebaseId: id,
      codigo: data.codigo || data.ref || `#N-${String(Math.abs(hash(id)) % 9999).padStart(3,'0')}`,
      titulo: data.titulo || data.title || data.assunto || 'Sem tÃ­tulo',
      mensagem: data.mensagem || data.message || data.body || data.texto || '',
      tipo: data.tipo || data.type || data.categoria || 'Sistema',
      destinatarios: data.destinatarios || data.recipients || data.alvo || data.target || 'Todos',
      prioridade: priorityKey(data.prioridade || data.priority),
      estado,
      agendar: agendada,
      enviadoEm: data.enviadoEm || data.sentAt || data.criadoEm || data.createdAt || data.data || isoNow(),
      criadoEm: data.criadoEm || data.createdAt || data.data || data.enviadoEm || data.sentAt || isoNow(),
      autor: data.autor || data.user || data.createdBy || 'Sistema',
      falha: data.falha || data.error || '',
      lida: !!data.lida
    };
  }
  function normalizeDevice(doc){
    const data = doc && typeof doc.data === 'function' ? doc.data() : (doc || {});
    const id = doc && typeof doc.data === 'function' ? doc.id : (data.id || data.deviceId || uid());
    return {...data, id, active: data.active !== false && data.ativo !== false, nome:data.nome||data.name||data.deviceName||'Dispositivo', tipo:data.tipo||data.role||data.type||'device'};
  }
  function hash(str){ let h=0; String(str).split('').forEach(ch=>{h=((h<<5)-h)+ch.charCodeAt(0); h|=0;}); return h; }

  async function loadData(){
    const database = db();
    state.unsubs.forEach(u=>{ try{u()}catch{} }); state.unsubs = [];
    if(database){
      try{
        COLLECTIONS.forEach(col => {
          const unsub = database.collection(col).onSnapshot(snap => {
            const docs = snap.docs.map(normalize);
            const others = state.items.filter(x => x._col && x._col !== col);
            state.items = dedupe([...others, ...docs.map(x=>({...x,_col:col}))]).sort((a,b)=>toMs(b.criadoEm)-toMs(a.criadoEm));
            saveLocal(LOCAL_KEY, state.items); render();
          }, err => console.warn('notificaÃ§Ãµes snapshot', col, err));
          state.unsubs.push(unsub);
        });
        HISTORY_COLLECTIONS.forEach(col => {
          const unsub = database.collection(col).onSnapshot(snap => {
            const docs = snap.docs.map(normalize);
            const others = state.history.filter(x => x._col && x._col !== col);
            state.history = dedupe([...others, ...docs.map(x=>({...x,_col:col}))]).sort((a,b)=>toMs(b.criadoEm)-toMs(a.criadoEm));
            saveLocal(LOCAL_HISTORY_KEY, state.history); render();
          }, err => console.warn('notificaÃ§Ãµes historico snapshot', col, err));
          state.unsubs.push(unsub);
        });
        const unsubDevices = database.collection(DEVICES_COLLECTION).onSnapshot(snap => {
          state.devices = snap.docs.map(normalizeDevice);
          saveLocal(LOCAL_DEVICES_KEY, state.devices); render();
        }, err => console.warn('notificationDevices snapshot', err));
        state.unsubs.push(unsubDevices);
        return;
      }catch(e){ console.warn('Firebase notificaÃ§Ãµes indisponÃ­vel', e); }
    }
    state.items = loadLocal(LOCAL_KEY, []).map(normalize).sort((a,b)=>toMs(b.criadoEm)-toMs(a.criadoEm));
    state.history = loadLocal(LOCAL_HISTORY_KEY, []).map(normalize);
    state.devices = loadLocal(LOCAL_DEVICES_KEY, []).map(normalizeDevice);
    render();
  }
  function dedupe(arr){
    const map = new Map();
    arr.forEach(item => { const k = item.firebaseId || item.id || `${item.titulo}-${item.criadoEm}`; if(!map.has(k)) map.set(k,item); });
    return [...map.values()];
  }

  async function saveItem(item){
    const payload = normalize({...item, atualizadoEm: isoNow()});
    const database = db();
    if(database){
      try{
        const col = payload._col || COLLECTIONS[0];
        const ref = payload.firebaseId && !String(payload.firebaseId).startsWith('local_') ? database.collection(col).doc(payload.firebaseId) : database.collection(col).doc();
        payload.firebaseId = ref.id; payload.id = ref.id; payload._col = col;
        await ref.set(payload, {merge:true});
        await database.collection(HISTORY_COLLECTIONS[0]).add({notificacaoId:ref.id,titulo:payload.titulo,tipo:payload.tipo,acao:'NotificaÃ§Ã£o guardada',estado:payload.estado,criadoEm:isoNow(),autor:payload.autor});
        return payload;
      }catch(e){ console.warn('fallback save notificacao', e); }
    }
    const arr = loadLocal(LOCAL_KEY, []).map(normalize);
    const idx = arr.findIndex(x=>x.id===payload.id || x.firebaseId===payload.firebaseId);
    if(idx >= 0) arr[idx] = payload; else arr.unshift({...payload, id:payload.id || uid(), firebaseId:payload.firebaseId || uid()});
    saveLocal(LOCAL_KEY, arr); state.items = arr.map(normalize).sort((a,b)=>toMs(b.criadoEm)-toMs(a.criadoEm)); render(); return payload;
  }
  async function deleteItem(id){
    const item = state.items.find(x=>x.id===id || x.firebaseId===id); if(!item) return;
    if(!confirm(`Apagar a notificaÃ§Ã£o "${item.titulo}"?`)) return;
    const database = db();
    if(database && item.firebaseId && !String(item.firebaseId).startsWith('local_')){
      try{ await database.collection(item._col || COLLECTIONS[0]).doc(item.firebaseId).delete(); toast('NotificaÃ§Ã£o apagada.'); return; }catch(e){ console.warn(e); }
    }
    const arr = loadLocal(LOCAL_KEY, []).filter(x => x.id !== id && x.firebaseId !== id);
    saveLocal(LOCAL_KEY, arr); state.items = arr.map(normalize); render(); toast('NotificaÃ§Ã£o apagada.');
  }

  function filtered(){
    const q = lower($('notSearch')?.value || ''); const estado = lower($('notFilterEstado')?.value || '');
    return state.items.filter(item => {
      const hay = lower([item.codigo,item.titulo,item.mensagem,item.tipo,item.destinatarios,item.prioridade,item.estado].join(' '));
      return (!q || hay.includes(q)) && (!estado || estadoKey(item.estado) === estado);
    });
  }
  function counts(){
    const total = state.items.length;
    const enviada = state.items.filter(x=>estadoKey(x.estado)==='enviada').length;
    const pendente = state.items.filter(x=>['pendente','agendada'].includes(estadoKey(x.estado))).length;
    const falha = state.items.filter(x=>estadoKey(x.estado)==='falha').length;
    const activeDevices = state.devices.filter(x=>x.active).length;
    return {total,enviada,pendente,falha,activeDevices};
  }
  function render(){
    renderKpis(); renderTable(); renderSummary(); renderTypes(); renderCritical();
  }
  function renderKpis(){
    const c = counts();
    setText('notKpiTotal', c.total); setText('notKpiEnviadas', c.enviada); setText('notPctEnviadas', `${pct(c.enviada,c.total)}%`);
    setText('notKpiPendentes', c.pendente); setText('notKpiFalhas', c.falha); setText('notKpiAlvos', c.activeDevices || 'â€”');
    const last = state.items.slice().sort((a,b)=>toMs(b.enviadoEm)-toMs(a.enviadoEm))[0];
    setText('notKpiUltima', last ? formatLast(last.enviadoEm) : 'â€”'); setText('notKpiUltimaSub', last ? ago(last.enviadoEm) : 'Sem registos');
  }
  function formatLast(value){ const ms=toMs(value); if(!ms) return 'â€”'; const d=new Date(ms); return d.toDateString()===new Date().toDateString() ? `Hoje, ${d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}` : formatDate(value,'date'); }
  function ago(value){ const diff = Date.now()-toMs(value); if(!toMs(value)) return 'Sem registos'; if(diff<60000) return 'Agora'; if(diff<3600000) return `${Math.round(diff/60000)} min atrÃ¡s`; if(diff<86400000) return `${Math.round(diff/3600000)} h atrÃ¡s`; return `${Math.round(diff/86400000)} dias atrÃ¡s`; }
  function setText(id, value){ const el=$(id); if(el) el.textContent = value; }

  function renderTable(){
    const rows = filtered(); const total = rows.length; const size = Number($('notPageSize')?.value || state.pageSize || 10); state.pageSize = size;
    const pages = Math.max(1, Math.ceil(total / size)); if(state.page > pages) state.page = pages;
    const start = (state.page-1)*size; const slice = rows.slice(start,start+size);
    setText('notListCount', total);
    const body = $('notTableBody'); if(body){
      body.innerHTML = slice.length ? slice.map(rowHtml).join('') : `<tr><td colspan="8" style="text-align:center;color:#9ab3d8;padding:26px">Sem notificaÃ§Ãµes para mostrar.</td></tr>`;
    }
    setText('notTableSummary', total ? `${start+1}-${Math.min(start+size,total)} de ${total} registos` : '0-0 de 0 registos');
    renderPagination(pages);
  }
  function rowHtml(item){
    const ek = estadoKey(item.estado), pk = priorityKey(item.prioridade);
    const estClass = ek==='falha'?'red':(ek==='pendente'||ek==='agendada'?'orange':'green');
    const priClass = pk==='Alta'?'red':(pk==='Baixa'?'blue':'orange');
    return `<tr><td><strong>${esc(item.codigo)}</strong></td><td class="not-title-cell"><strong>${esc(item.titulo)}</strong><small>${esc(item.mensagem || 'â€”')}</small></td><td><span class="ck-badge blue">${esc(item.tipo)}</span></td><td>${esc(item.destinatarios)}</td><td><span class="ck-badge ${priClass}">${esc(pk)}</span></td><td><span class="ck-badge ${estClass}">${esc(item.estado)}</span></td><td>${esc(formatDate(item.enviadoEm || item.criadoEm))}</td><td><div class="not-actions"><button class="ck-icon-btn" type="button" data-view="${esc(item.id)}" title="Ver">ðŸ‘</button><button class="ck-icon-btn" type="button" data-resend="${esc(item.id)}" title="Reenviar">ðŸ“¤</button><button class="ck-icon-btn red" type="button" data-delete="${esc(item.id)}" title="Apagar">ðŸ—‘</button></div></td></tr>`;
  }
  function renderPagination(pages){
    const el = $('notPagination'); if(!el) return; let html='';
    html += `<button type="button" ${state.page<=1?'disabled':''} data-page="${state.page-1}">Â«</button>`;
    const max = Math.min(pages, 5); for(let i=1;i<=max;i++) html += `<button type="button" class="${i===state.page?'active':''}" data-page="${i}">${i}</button>`;
    if(pages>5) html += `<button type="button" disabled>...</button><button type="button" class="${pages===state.page?'active':''}" data-page="${pages}">${pages}</button>`;
    html += `<button type="button" ${state.page>=pages?'disabled':''} data-page="${state.page+1}">Â»</button>`;
    el.innerHTML = html;
  }
  function renderSummary(){
    const c = counts(), total = c.total;
    const a = total ? c.enviada/total*360 : 0, b = total ? c.pendente/total*360 : 0;
    const donut = $('notStatusDonut'); if(donut){ donut.style.background = `conic-gradient(var(--not-green) 0 ${a}deg, var(--not-orange) ${a}deg ${a+b}deg, var(--not-red) ${a+b}deg 360deg)`; donut.querySelector('strong').textContent = total; }
    const rows = [{n:'Enviadas com Sucesso',v:c.enviada,col:'var(--not-green)'},{n:'Pendentes',v:c.pendente,col:'var(--not-orange)'},{n:'Falhas',v:c.falha,col:'var(--not-red)'}];
    const legend = $('notStatusLegend'); if(legend) legend.innerHTML = rows.map(r=>`<div class="not-legend-row" style="color:${r.col}"><span class="not-dot"></span><strong>${esc(r.n)}</strong><span>${r.v} (${pct(r.v,total)}%)</span></div>`).join('');
  }
  function renderTypes(){
    const map = new Map(); state.items.forEach(x=>map.set(x.tipo,(map.get(x.tipo)||0)+1));
    const total = state.items.length || 1; const colors = ['#ff3f57','#268fff','#42d66f','#ff9f1a','#8e55ff','#17d0e8'];
    const arr = [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
    const el = $('notTypeBars'); if(!el) return;
    el.innerHTML = arr.length ? arr.map(([name,val],i)=>`<div class="not-bar-row" style="color:${colors[i%colors.length]}"><div class="not-bar-name"><span class="not-dot"></span>${esc(name)}</div><div class="not-bar-track"><div class="not-bar-fill" style="width:${pct(val,total)}%"></div></div><span>${val} (${pct(val,total)}%)</span></div>`).join('') : '<p style="color:#9ab3d8;margin:0">Sem notificaÃ§Ãµes registadas.</p>';
  }
  function renderCritical(){
    const critical = state.items.filter(x => priorityKey(x.prioridade)==='Alta' || estadoKey(x.estado)==='falha').slice(0,4);
    const el = $('notCriticalList'); if(!el) return;
    el.innerHTML = critical.length ? critical.map(x=>`<div class="not-feed-item"><span class="not-feed-icon">${estadoKey(x.estado)==='falha'?'Ã—':'!'}</span><div><strong>${esc(x.titulo)}</strong><small>${esc(x.mensagem || x.tipo)}</small></div><time>${esc(formatLast(x.enviadoEm || x.criadoEm))}</time></div>`).join('') : '<p style="color:#9ab3d8;margin:10px 0">Sem alertas crÃ­ticos.</p>';
  }

  function getFormPayload(){
    const titulo = text($('notTitulo')?.value); const mensagem = text($('notMensagem')?.value);
    if(!titulo) throw new Error('Escreve um tÃ­tulo para a notificaÃ§Ã£o.');
    if(!mensagem) throw new Error('Escreve uma mensagem para a notificaÃ§Ã£o.');
    const agendar = $('notAgendar')?.value || '';
    const estado = agendar && toMs(agendar) > Date.now() ? 'Agendada' : 'Enviada';
    return {titulo,mensagem,tipo:$('notTipo')?.value || 'Sistema',destinatarios:$('notDestinatarios')?.value || 'Todos',prioridade:$('notPrioridade')?.value || 'MÃ©dia',estado,agendar,enviadoEm: estado==='Enviada'?isoNow():agendar,criadoEm:isoNow(),autor:'AppBraga'};
  }
  async function submitNotification(){
    try{ const payload = getFormPayload(); await saveItem(payload); clearForm(); toast(payload.estado === 'Agendada' ? 'NotificaÃ§Ã£o agendada.' : 'NotificaÃ§Ã£o guardada/enviada.'); }
    catch(e){ toast(e.message || 'Erro ao guardar notificaÃ§Ã£o.', 'error'); }
  }
  function clearForm(){ ['notTitulo','notMensagem','notAgendar'].forEach(id=>{ const el=$(id); if(el) el.value=''; }); const file=$('notImagem'); if(file) file.value=''; updateCount(); }
  function preview(){
    try{ const p = getFormPayload(); openModal('PrÃ©-visualizaÃ§Ã£o', 'Como a notificaÃ§Ã£o vai aparecer.', detailHtml(p)); }
    catch(e){ toast(e.message, 'error'); }
  }
  function openDetail(id){ const item = state.items.find(x=>x.id===id || x.firebaseId===id); if(item) openModal(item.titulo, 'Detalhes da notificaÃ§Ã£o.', detailHtml(item)); }
  function detailHtml(item){ return `<div class="not-detail-grid"><div class="not-detail-item"><span>Tipo</span><strong>${esc(item.tipo)}</strong></div><div class="not-detail-item"><span>DestinatÃ¡rios</span><strong>${esc(item.destinatarios)}</strong></div><div class="not-detail-item"><span>Prioridade</span><strong>${esc(item.prioridade)}</strong></div><div class="not-detail-item"><span>Estado</span><strong>${esc(item.estado)}</strong></div><div class="not-detail-item"><span>Data/Hora</span><strong>${esc(formatDate(item.enviadoEm || item.criadoEm))}</strong></div><div class="not-detail-item"><span>Autor</span><strong>${esc(item.autor)}</strong></div><div class="not-detail-item full"><span>Mensagem</span><strong>${esc(item.mensagem)}</strong></div></div>`; }
  function openModal(title, sub, body){ setText('notModalTitle', title); setText('notModalSub', sub); const el=$('notModalBody'); if(el) el.innerHTML=body; const m=$('notModal'); if(m) m.hidden=false; }
  function closeModal(id){ const m=$(id); if(m) m.hidden=true; }
  function exportCsv(){
    const rows = [['ID','TÃ­tulo','Mensagem','Tipo','DestinatÃ¡rios','Prioridade','Estado','Data/Hora']].concat(filtered().map(x=>[x.codigo,x.titulo,x.mensagem,x.tipo,x.destinatarios,x.prioridade,x.estado,formatDate(x.enviadoEm || x.criadoEm)]));
    const csv = rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`notificacoes_appbraga_${todayKey()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  async function clearAll(){
    if(!state.items.length){ toast('NÃ£o existem notificaÃ§Ãµes para limpar.'); return; }
    const phrase = prompt(`Para limpar todas as ${state.items.length} notificaÃ§Ãµes escreve: LIMPAR NOTIFICACOES`);
    if(phrase !== 'LIMPAR NOTIFICACOES'){ toast('OperaÃ§Ã£o cancelada.'); return; }
    const database = db();
    if(database){
      try{
        const batch = database.batch();
        state.items.forEach(item=>{ if(item.firebaseId && !String(item.firebaseId).startsWith('local_')) batch.delete(database.collection(item._col || COLLECTIONS[0]).doc(item.firebaseId)); });
        await batch.commit(); toast('NotificaÃ§Ãµes limpas.'); return;
      }catch(e){ console.warn(e); }
    }
    saveLocal(LOCAL_KEY, []); state.items=[]; render(); toast('NotificaÃ§Ãµes limpas.');
  }
  async function resend(id){ const item = state.items.find(x=>x.id===id || x.firebaseId===id); if(!item) return; await saveItem({...item, estado:'Enviada', enviadoEm:isoNow(), criadoEm:item.criadoEm || isoNow()}); toast('NotificaÃ§Ã£o reenviada/guardada.'); }
  function updateCount(){ const el=$('notMensagem'), out=$('notMsgCount'); if(out) out.textContent = (el?.value || '').length; }

  function bind(){
    $('notBtnEnviar')?.addEventListener('click', submitNotification); $('notBtnLimpar')?.addEventListener('click', clearForm); $('notBtnPreview')?.addEventListener('click', preview); $('notQuickNova')?.addEventListener('click', ()=>$('notTitulo')?.focus());
    $('notBtnExportar')?.addEventListener('click', exportCsv); $('notBtnLimparTodas')?.addEventListener('click', clearAll); $('notBtnHistorico')?.addEventListener('click', () => openModal('HistÃ³rico completo', 'Ãšltimas aÃ§Ãµes registadas.', historyHtml()));
    $('notBtnAgendar')?.addEventListener('click', ()=>$('notAgendar')?.focus()); $('notBtnDestinatarios')?.addEventListener('click', () => openModal('DestinatÃ¡rios', 'Dispositivos registados para notificaÃ§Ãµes.', devicesHtml()));
    $('notBtnConfig')?.addEventListener('click', () => openModal('ConfiguraÃ§Ãµes', 'Estado atual do sistema de notificaÃ§Ãµes.', `<p>Firebase: ${db()?'ativo':'fallback local'}<br>ColeÃ§Ãµes: ${COLLECTIONS.join(', ')}<br>VersÃ£o: ${VERSION}</p>`));
    $('notBtnAlertas')?.addEventListener('click', () => openModal('Alertas crÃ­ticos', 'NotificaÃ§Ãµes de alta prioridade ou falhas.', $('notCriticalList')?.innerHTML || 'Sem alertas.'));
    $('notSearch')?.addEventListener('input', ()=>{state.page=1;renderTable();}); $('notFilterEstado')?.addEventListener('change', ()=>{state.page=1;renderTable();}); $('notPageSize')?.addEventListener('change', ()=>{state.page=1;renderTable();}); $('notMensagem')?.addEventListener('input', updateCount);
    document.addEventListener('click', (e)=>{ const close=e.target.closest('[data-close]'); if(close) closeModal(close.dataset.close); const p=e.target.closest('[data-page]'); if(p){ state.page=Number(p.dataset.page); renderTable(); } const view=e.target.closest('[data-view]'); if(view) openDetail(view.dataset.view); const del=e.target.closest('[data-delete]'); if(del) deleteItem(del.dataset.delete); const re=e.target.closest('[data-resend]'); if(re) resend(re.dataset.resend); });
  }
  function historyHtml(){ const items = state.history.slice(0,30); return items.length ? `<div class="not-feed">${items.map(x=>`<div class="not-feed-item"><span class="not-feed-icon">â–£</span><div><strong>${esc(x.titulo || x.acao || 'Registo')}</strong><small>${esc(x.tipo || x.estado || 'HistÃ³rico')}</small></div><time>${esc(formatDate(x.criadoEm || x.enviadoEm))}</time></div>`).join('')}</div>` : '<p>Sem histÃ³rico registado.</p>'; }
  function devicesHtml(){ const items = state.devices; return items.length ? `<div class="not-detail-grid">${items.map(d=>`<div class="not-detail-item"><span>${esc(d.tipo)}</span><strong>${esc(d.nome)}</strong><br><small>${d.active?'Ativo':'Inativo'}</small></div>`).join('')}</div>` : '<p>Sem dispositivos registados.</p>'; }
  document.addEventListener('DOMContentLoaded', () => { bind(); loadData(); updateCount(); });
})();

