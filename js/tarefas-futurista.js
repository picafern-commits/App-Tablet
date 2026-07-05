
(() => {
  'use strict';
  const VERSION = '1.58.108';
  const COLLECTION = 'personalTasks';
  const LOCAL_KEY = 'appbraga_tarefas_fallback_v1';
  const PAGE = { items: [], filtered: [], page: 1, pageSize: 10, unsubscribe: null, dbReady: false, minhasOnly: false };
  const $ = (id) => document.getElementById(id);
  const now = () => Date.now();
  const todayKey = () => new Date().toISOString().slice(0,10);
  const pad = (n) => String(n).padStart(2,'0');
  const escapeHtml = (value='') => String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const norm = (v='') => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function toast(title, body){
    if (window.AppBragaToast) return window.AppBragaToast(title, body);
    console.log(`[${title}] ${body}`);
  }
  function getDb(){ try { return window.firebase?.firestore ? window.firebase.firestore() : null; } catch { return null; } }
  function currentUserName(){
    const user = window.firebase?.auth?.().currentUser;
    return user?.displayName || user?.email?.split('@')[0] || localStorage.getItem('appbragaUserName') || localStorage.getItem('userName') || '';
  }
  function toMillis(v){
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (v.seconds) return v.seconds * 1000;
    const d = new Date(v); return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  function formatDateTime(v){
    const t = toMillis(v); if (!t) return '—';
    const d = new Date(t);
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function formatDue(date){
    if (!date) return {main:'—', sub:'Sem prazo', kind:''};
    const today = todayKey();
    if (date === today) return {main:date.split('-').reverse().join('/'), sub:'Hoje', kind:'danger'};
    const days = Math.ceil((new Date(date+'T00:00:00') - new Date(today+'T00:00:00')) / 86400000);
    if (days < 0) return {main:date.split('-').reverse().join('/'), sub:`${Math.abs(days)} dias em atraso`, kind:'danger'};
    if (days === 0) return {main:date.split('-').reverse().join('/'), sub:'Hoje', kind:'danger'};
    if (days === 1) return {main:date.split('-').reverse().join('/'), sub:'Amanhã', kind:''};
    return {main:date.split('-').reverse().join('/'), sub:`${days} dias`, kind:''};
  }
  function statusOf(task){
    const raw = norm(task.estado || task.status || (task.done ? 'concluida' : 'pendente'));
    if (task.done || raw.includes('conclu')) return 'concluida';
    if (task.dueDate && task.dueDate < todayKey()) return 'vencida';
    if (raw.includes('progress') || raw.includes('curso') || raw.includes('progresso')) return 'progresso';
    return 'pendente';
  }
  function priorityOf(task){
    const raw = norm(task.prioridade || task.priority || 'sem');
    if (raw.includes('urgent') || raw.includes('alta') || raw.includes('crit')) return 'alta';
    if (raw.includes('media') || raw.includes('média') || raw.includes('normal')) return 'media';
    if (raw.includes('baixa') || raw.includes('low')) return 'baixa';
    return 'sem';
  }
  function priorityLabel(p){ return ({alta:'Alta',media:'Média',baixa:'Baixa',sem:'Sem prioridade'})[p] || 'Sem prioridade'; }
  function statusLabel(s){ return ({pendente:'Pendente',progresso:'Em progresso',concluida:'Concluída',vencida:'Vencida'})[s] || 'Pendente'; }
  function priorityWeight(p){ return ({alta:0,media:1,baixa:2,sem:3})[p] ?? 3; }
  function normalizeTask(doc){
    const d = doc || {};
    const id = d.id || d.docId || d.uid || `local_${Math.random().toString(36).slice(2)}`;
    const title = d.title || d.titulo || d.nome || d.tarefa || 'Tarefa sem título';
    return {
      ...d,
      id,
      title,
      description: d.description || d.descricao || d.obs || d.observacoes || '',
      owner: d.owner || d.responsavel || d.user || d.utilizador || '',
      category: d.category || d.categoria || d.tipo || '',
      priority: priorityOf(d),
      status: statusOf(d),
      dueDate: d.dueDate || d.prazo || d.dataPrazo || d.deadline || '',
      createdAt: d.createdAt || d.criadoEm || d.dataCriacao || d.created || 0,
      updatedAt: d.updatedAt || d.atualizadoEm || d.updated || 0,
      done: !!(d.done || d.concluida || d.estado === 'concluida' || d.status === 'done')
    };
  }
  function loadLocal(){
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]').map(normalizeTask); } catch { return []; }
  }
  function saveLocal(items){ localStorage.setItem(LOCAL_KEY, JSON.stringify(items)); }
  function seedIfEmpty(){
    const seeded = localStorage.getItem('appbraga_tarefas_seeded_v158102');
    if (seeded) return;
    const existing = loadLocal();
    if (existing.length) return localStorage.setItem('appbraga_tarefas_seeded_v158102','1');
    const base = [
      {id:'seed-1',title:'Instalação Kyocera Ilha 02',description:'Instalar impressora Kyocera na Ilha 02 - escritório',owner:'Cesar-PT',category:'Instalação',priority:'alta',status:'progresso',dueDate:todayKey(),createdAt:now()-3600000},
      {id:'seed-2',title:'Reunião de Equipa',description:'Reunião semanal para alinhamento de processos',owner:'Elisabete-PT',category:'Reunião',priority:'media',status:'pendente',dueDate:addDays(2),createdAt:now()-86400000},
      {id:'seed-3',title:'Manutenção P3155dn',description:'Verificar manutenção da P3155dn - Balcão 01',owner:'Machado-PT',category:'Manutenção',priority:'alta',status:'pendente',dueDate:addDays(3),createdAt:now()-1800000}
    ];
    saveLocal(base);
    localStorage.setItem('appbraga_tarefas_seeded_v158102','1');
  }
  function addDays(days){ const d = new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
  function setupFirebase(){
    const db = getDb();
    if (!db) { seedIfEmpty(); PAGE.items = loadLocal(); render(); return; }
    PAGE.dbReady = true;
    try{
      PAGE.unsubscribe = db.collection(COLLECTION).onSnapshot((snap) => {
        const remote = snap.docs.map(doc => normalizeTask({ id: doc.id, ...doc.data() }));
        const local = loadLocal().filter(x => String(x.id).startsWith('local_'));
        PAGE.items = [...remote, ...local];
        render();
      }, () => { seedIfEmpty(); PAGE.items = loadLocal(); render(); });
    } catch {
      seedIfEmpty(); PAGE.items = loadLocal(); render();
    }
  }
  async function upsertTask(payload, id=''){
    const db = getDb();
    const final = {...payload, updatedAt: now()};
    if (!id) final.createdAt = now();
    if (db) {
      if (id && !String(id).startsWith('local_')) await db.collection(COLLECTION).doc(id).set(final, {merge:true});
      else await db.collection(COLLECTION).add(final);
      return;
    }
    const items = loadLocal();
    if (id) {
      const idx = items.findIndex(x => x.id === id);
      if (idx >= 0) items[idx] = {...items[idx], ...final};
    } else items.unshift({id:`local_${now()}`, ...final});
    saveLocal(items); PAGE.items = items.map(normalizeTask); render();
  }
  async function deleteTask(id){
    if (!confirm('Apagar esta tarefa?')) return;
    const db = getDb();
    if (db && id && !String(id).startsWith('local_')) await db.collection(COLLECTION).doc(id).delete();
    else { const items = loadLocal().filter(x => x.id !== id); saveLocal(items); PAGE.items = items.map(normalizeTask); render(); }
  }
  async function setTaskStatus(id, status){
    const task = PAGE.items.find(x => x.id === id); if (!task) return;
    await upsertTask({ status, estado: status, done: status === 'concluida' }, id);
  }
  function openModal(task=null){
    $('taskModalTitle').textContent = task ? 'Editar tarefa' : 'Nova tarefa';
    $('taskId').value = task?.id || '';
    $('taskTitulo').value = task?.title || '';
    $('taskResponsavel').value = task?.owner || '';
    $('taskDescricao').value = task?.description || '';
    $('taskCategoria').value = task?.category || '';
    $('taskPrioridade').value = task?.priority || 'sem';
    $('taskEstado').value = task?.status === 'vencida' ? 'pendente' : (task?.status || 'pendente');
    $('taskPrazo').value = task?.dueDate || '';
    $('taskModal').classList.add('is-open');
    $('taskModal').setAttribute('aria-hidden','false');
    setTimeout(() => $('taskTitulo')?.focus(), 50);
  }
  function closeModal(){ $('taskModal').classList.remove('is-open'); $('taskModal').setAttribute('aria-hidden','true'); $('taskForm').reset(); $('taskId').value=''; }
  function collectFilters(){ return { q:norm($('taskSearch')?.value), status:$('taskFilterStatus')?.value || '', priority:$('taskFilterPriority')?.value || '' }; }
  function filteredItems(){
    const f = collectFilters();
    const me = norm(currentUserName());
    return PAGE.items.map(normalizeTask).filter(t => {
      if (PAGE.minhasOnly && me && !norm(t.owner).includes(me)) return false;
      if (f.status) {
        if (f.status === 'vencida' && statusOf(t) !== 'vencida') return false;
        if (f.status !== 'vencida' && statusOf(t) !== f.status) return false;
      }
      if (f.priority && priorityOf(t) !== f.priority) return false;
      if (f.q && !norm(`${t.title} ${t.description} ${t.owner} ${t.category}`).includes(f.q)) return false;
      return true;
    }).sort((a,b) => {
      const sa = statusOf(a), sb = statusOf(b);
      const aw = sa === 'vencida' ? -1 : (sa === 'concluida' ? 5 : priorityWeight(priorityOf(a)));
      const bw = sb === 'vencida' ? -1 : (sb === 'concluida' ? 5 : priorityWeight(priorityOf(b)));
      return aw - bw || String(a.dueDate || '9999-12-31').localeCompare(String(b.dueDate || '9999-12-31')) || toMillis(b.createdAt) - toMillis(a.createdAt);
    });
  }
  function renderKpis(items){
    const total = items.length;
    const done = items.filter(t => statusOf(t)==='concluida').length;
    const progress = items.filter(t => statusOf(t)==='progresso').length;
    const pending = items.filter(t => statusOf(t)==='pendente').length;
    const overdue = items.filter(t => statusOf(t)==='vencida').length;
    const today = items.filter(t => t.dueDate === todayKey() && statusOf(t)!=='concluida').length;
    const pct = n => total ? `${((n/total)*100).toFixed(1)}% do total` : '0% do total';
    $('taskKpiTotal').textContent = total; $('taskKpiDone').textContent = done; $('taskKpiProgress').textContent = progress; $('taskKpiPending').textContent = pending; $('taskKpiOverdue').textContent = overdue; $('taskKpiToday').textContent = today;
    $('taskDonePct').textContent = pct(done); $('taskProgressPct').textContent = pct(progress); $('taskPendingPct').textContent = pct(pending);
  }
  function taskRow(t){
    const s = statusOf(t), p = priorityOf(t), due = formatDue(t.dueDate);
    return `<tr>
      <td><div class="tasks-title-cell"><button class="tasks-check ${s==='concluida'?'is-done':''}" type="button" title="Marcar concluída" data-toggle-done="${escapeHtml(t.id)}"></button><div class="tasks-name"><strong>${escapeHtml(t.title)}</strong>${t.category?`<small>${escapeHtml(t.category)}</small>`:''}</div></div></td>
      <td><div class="tasks-description">${escapeHtml(t.description || '—')}</div></td>
      <td><span class="tasks-owner">${escapeHtml(t.owner || 'Sem responsável')}</span></td>
      <td><span class="tasks-tag tasks-prio-${p}">${priorityLabel(p)}</span></td>
      <td><span class="tasks-tag tasks-state-${s}">${statusLabel(s)}</span></td>
      <td><span class="tasks-date"><strong>${escapeHtml(due.main)}</strong><small class="${due.kind}">${escapeHtml(due.sub)}</small></span></td>
      <td><span class="tasks-date"><strong>${escapeHtml(formatDateTime(t.createdAt).split(' ')[0])}</strong><small>${escapeHtml(formatDateTime(t.createdAt).split(' ')[1] || '')}</small></span></td>
      <td><div class="tasks-actions"><button class="tasks-icon-btn" type="button" data-edit-task="${escapeHtml(t.id)}" title="Editar">✎</button><button class="tasks-icon-btn" type="button" data-cycle-task="${escapeHtml(t.id)}" title="Avançar estado">⋮</button><button class="tasks-icon-btn delete" type="button" data-delete-task="${escapeHtml(t.id)}" title="Apagar">🗑</button></div></td>
    </tr>`;
  }
  function taskMobileCard(t){
    const s = statusOf(t), p = priorityOf(t), due = formatDue(t.dueDate);
    return `<article class="tasks-mobile-card"><div class="tasks-mobile-card-head"><div><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.description || '—')}</p></div><button class="tasks-check ${s==='concluida'?'is-done':''}" type="button" data-toggle-done="${escapeHtml(t.id)}"></button></div><div class="tasks-mobile-meta"><span class="tasks-tag tasks-prio-${p}">${priorityLabel(p)}</span><span class="tasks-tag tasks-state-${s}">${statusLabel(s)}</span><span class="tasks-tag">${escapeHtml(t.owner || 'Sem responsável')}</span><span class="tasks-tag">${escapeHtml(due.sub)}</span></div><div class="tasks-actions"><button class="tasks-icon-btn" type="button" data-edit-task="${escapeHtml(t.id)}">✎</button><button class="tasks-icon-btn" type="button" data-cycle-task="${escapeHtml(t.id)}">⋮</button><button class="tasks-icon-btn delete" type="button" data-delete-task="${escapeHtml(t.id)}">🗑</button></div></article>`;
  }
  function renderTable(items){
    const total = items.length; PAGE.pageSize = Number($('taskPageSize')?.value || 10); const pages = Math.max(1, Math.ceil(total/PAGE.pageSize)); if (PAGE.page > pages) PAGE.page = pages;
    const start = (PAGE.page - 1) * PAGE.pageSize; const pageItems = items.slice(start, start + PAGE.pageSize);
    $('tasksTableBody').innerHTML = pageItems.length ? pageItems.map(taskRow).join('') : `<tr><td colspan="8"><div class="tasks-empty">Sem tarefas para estes filtros.</div></td></tr>`;
    $('tasksMobileList').innerHTML = pageItems.length ? pageItems.map(taskMobileCard).join('') : `<div class="tasks-empty">Sem tarefas para estes filtros.</div>`;
    $('taskListCount').textContent = total;
    $('taskTableSummary').textContent = total ? `${start+1}-${Math.min(start+PAGE.pageSize,total)} de ${total} registos` : '0-0 de 0';
    const pag = $('taskPagination'); pag.innerHTML = '';
    const makeBtn = (txt, disabled, click, active=false) => { const b=document.createElement('button'); b.type='button'; b.textContent=txt; b.className=active?'active':''; b.disabled=disabled; b.addEventListener('click', click); return b; };
    pag.appendChild(makeBtn('«', PAGE.page<=1, () => { PAGE.page--; render(); }));
    for(let i=1;i<=pages;i++){ if(i>5 && i<pages) continue; pag.appendChild(makeBtn(String(i), false, () => { PAGE.page=i; render(); }, i===PAGE.page)); }
    pag.appendChild(makeBtn('»', PAGE.page>=pages, () => { PAGE.page++; render(); }));
    bindRowActions();
  }
  function renderSide(items){
    const total = items.length || 1;
    const counts = { alta:0, media:0, baixa:0, sem:0 };
    items.forEach(t => counts[priorityOf(t)]++);
    const degAlta = counts.alta/total*360, degMedia = counts.media/total*360, degBaixa = counts.baixa/total*360;
    $('taskDonut').style.background = `conic-gradient(#ef4444 0 ${degAlta}deg,#fbbf24 ${degAlta}deg ${degAlta+degMedia}deg,#22c55e ${degAlta+degMedia}deg ${degAlta+degMedia+degBaixa}deg,#94a3b8 ${degAlta+degMedia+degBaixa}deg 360deg)`;
    $('taskPriorityLegend').innerHTML = ['alta','media','baixa','sem'].map(k => `<div class="tasks-legend-row"><span class="tasks-dot ${k}"></span><span>${priorityLabel(k)}</span><strong>${counts[k]} (${items.length ? ((counts[k]/items.length)*100).toFixed(1) : '0.0'}%)</strong></div>`).join('');
    const overdue = items.filter(t => statusOf(t)==='vencida').slice(0,4);
    $('taskOverdueList').innerHTML = overdue.length ? overdue.map(t => `<div class="tasks-side-row"><div><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(t.description || t.owner || 'Sem descrição')}</small></div><div class="tasks-side-date">${escapeHtml(formatDue(t.dueDate).main)}<br><small>${escapeHtml(formatDue(t.dueDate).sub)}</small></div></div>`).join('') : '<div class="tasks-empty">Sem tarefas vencidas.</div>';
    const today = items.filter(t => t.dueDate === todayKey() && statusOf(t)!=='concluida').slice(0,4);
    $('taskTodayList').innerHTML = today.length ? today.map(t => `<div class="tasks-side-row"><div><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(t.owner || 'Sem responsável')}</small></div><div class="tasks-side-date ok">Hoje</div></div>`).join('') : '<div class="tasks-empty">Sem tarefas para hoje.</div>';
  }
  function render(){
    const all = PAGE.items.map(normalizeTask);
    const filtered = filteredItems(); PAGE.filtered = filtered;
    renderKpis(all); renderTable(filtered); renderSide(all);
  }
  function bindRowActions(){
    document.querySelectorAll('[data-edit-task]').forEach(btn => btn.onclick = () => openModal(PAGE.items.find(t => t.id === btn.dataset.editTask)));
    document.querySelectorAll('[data-delete-task]').forEach(btn => btn.onclick = () => deleteTask(btn.dataset.deleteTask));
    document.querySelectorAll('[data-toggle-done]').forEach(btn => btn.onclick = () => { const t=PAGE.items.find(x=>x.id===btn.dataset.toggleDone); setTaskStatus(t?.id, statusOf(t)==='concluida' ? 'pendente' : 'concluida'); });
    document.querySelectorAll('[data-cycle-task]').forEach(btn => btn.onclick = () => { const t=PAGE.items.find(x=>x.id===btn.dataset.cycleTask); const s=statusOf(t); const next = s==='pendente'?'progresso':(s==='progresso'?'concluida':'pendente'); setTaskStatus(t.id,next); });
  }
  function exportCsv(items=PAGE.filtered){
    const rows = [['Tarefa','Descrição','Responsável','Categoria','Prioridade','Estado','Prazo','Criada em'], ...items.map(t => [t.title,t.description,t.owner,t.category,priorityLabel(priorityOf(t)),statusLabel(statusOf(t)),t.dueDate,formatDateTime(t.createdAt)])];
    const csv = rows.map(r => r.map(v => '"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`tarefas-appbraga-${todayKey()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  function bind(){
    $('taskBtnNovo').onclick = () => openModal();
    $('taskModalClose').onclick = closeModal; $('taskFormCancel').onclick = closeModal;
    $('taskModal').addEventListener('click', e => { if (e.target.id === 'taskModal') closeModal(); });
    $('taskForm').addEventListener('submit', async e => { e.preventDefault(); const id=$('taskId').value; const payload={ title:$('taskTitulo').value.trim(), titulo:$('taskTitulo').value.trim(), description:$('taskDescricao').value.trim(), descricao:$('taskDescricao').value.trim(), owner:$('taskResponsavel').value.trim(), responsavel:$('taskResponsavel').value.trim(), category:$('taskCategoria').value.trim(), categoria:$('taskCategoria').value.trim(), priority:$('taskPrioridade').value, prioridade:$('taskPrioridade').value, status:$('taskEstado').value, estado:$('taskEstado').value, dueDate:$('taskPrazo').value, prazo:$('taskPrazo').value, done:$('taskEstado').value==='concluida' }; if(!payload.title) return; await upsertTask(payload,id); closeModal(); toast('Tarefas','Tarefa guardada.'); });
    ['taskSearch','taskFilterStatus','taskFilterPriority','taskPageSize'].forEach(id => $(id)?.addEventListener(id==='taskSearch'?'input':'change', () => { PAGE.page=1; render(); }));
    $('taskBtnLimpar').onclick = () => { $('taskSearch').value=''; $('taskFilterStatus').value=''; $('taskFilterPriority').value=''; PAGE.minhasOnly=false; PAGE.page=1; render(); };
    $('taskBtnMinhas').onclick = () => { PAGE.minhasOnly=!PAGE.minhasOnly; $('taskBtnMinhas').classList.toggle('primary', PAGE.minhasOnly); PAGE.page=1; render(); };
    $('taskBtnRelatorio').onclick = () => exportCsv();
    $('taskBtnCalendario').onclick = () => { $('taskFilterStatus').value=''; $('taskFilterPriority').value=''; $('taskSearch').value=''; PAGE.page=1; render(); toast('Calendário','A lista ficou ordenada por prioridade e prazo.'); };
    $('taskBtnConfig').onclick = () => toast('Configurações','Configurações rápidas de tarefas ficam nesta área.');
    $('taskBtnVerVencidas').onclick = () => { $('taskFilterStatus').value='vencida'; PAGE.page=1; render(); window.scrollTo({top:0,behavior:'smooth'}); };
    document.querySelectorAll('[data-task-filter-kpi]').forEach(btn => btn.addEventListener('click', () => { const f=btn.dataset.taskFilterKpi; $('taskFilterStatus').value = f==='all' ? '' : (f==='hoje' ? '' : f); $('taskSearch').value=''; PAGE.page=1; render(); if(f==='hoje'){ const today=PAGE.items.filter(t=>t.dueDate===todayKey()).map(t=>t.title).join(' '); $('taskSearch').value=''; PAGE.filtered = PAGE.items.filter(t=>t.dueDate===todayKey()); renderTable(PAGE.filtered); } }));
  }
  document.addEventListener('DOMContentLoaded', () => { bind(); setupFirebase(); });
})();
