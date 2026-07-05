
(() => {
  'use strict';
  const VERSION = '1.58.108';
  const COLLECTION = 'informacoes';
  const CATEGORIES_COLLECTION = 'informacoesCategorias';
  const LOCAL_KEY = 'appbraga_informacoes_fallback_v158106';
  const LOCAL_CAT_KEY = 'appbraga_informacoes_categorias_v158106';

  const state = {
    items: [], categories: [], page: 1, pageSize: 10, editingId: null,
    unsubItems: null, unsubCats: null
  };
  const $ = (id) => document.getElementById(id);
  const text = (v) => String(v ?? '').trim();
  const lower = (v) => text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const uid = () => `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  function esc(v){return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function db(){ return window.db && typeof window.db.collection === 'function' ? window.db : null; }
  function loadLocal(key, fallback=[]){ try{return JSON.parse(localStorage.getItem(key)||'null') || fallback;}catch(_){return fallback;} }
  function saveLocal(key, val){ try{localStorage.setItem(key, JSON.stringify(val));}catch(_){} }
  function toast(msg,type='ok'){
    if(typeof window.mostrarMensagem==='function'){try{window.mostrarMensagem(msg,type==='error'?'erro':'sucesso');return;}catch(_){}}
    let n=document.querySelector('.info-toast'); if(!n){n=document.createElement('div'); n.className='info-toast'; document.body.appendChild(n);}
    n.textContent=msg; n.className=`info-toast ${type}`; requestAnimationFrame(()=>n.classList.add('show')); clearTimeout(n._t); n._t=setTimeout(()=>n.classList.remove('show'),2600);
  }
  function nowDate(){ return new Date().toISOString().slice(0,10); }
  function nowTime(){ return new Date().toTimeString().slice(0,5); }
  function formatDate(d){
    if(!d) return '—';
    try{ const dt = d && typeof d.toDate==='function' ? d.toDate() : new Date(d); if(!isNaN(dt)) return dt.toLocaleDateString('pt-PT'); }catch(_){}
    return text(d);
  }
  function formatTime(d){
    if(!d) return '';
    try{ const dt = d && typeof d.toDate==='function' ? d.toDate() : new Date(d); if(!isNaN(dt)) return dt.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}); }catch(_){}
    return '';
  }
  function toMs(d){
    if(!d) return 0; if(typeof d==='number') return d; if(d && typeof d.toDate==='function') return d.toDate().getTime();
    const t = new Date(d).getTime(); return Number.isFinite(t) ? t : 0;
  }
  function normalizePriority(v){ const r=lower(v); if(r.includes('alt')) return 'Alta'; if(r.includes('baix')) return 'Baixa'; if(r.includes('sem')) return 'Sem prioridade'; return 'Média'; }
  function normalizeStatus(v,item={}){
    if(item.arquivada || item.archived) return 'Arquivada';
    if(item.fixada || item.pinned) return 'Fixada';
    if(item.importante || item.important) return 'Importante';
    const r=lower(v||item.estado||item.status);
    if(r.includes('arquiv')) return 'Arquivada'; if(r.includes('fix')) return 'Fixada'; if(r.includes('import')) return 'Importante'; if(r.includes('agend')) return 'Agendada';
    return 'Publicada';
  }
  function normalize(item,id){
    const data = item.data || item.date || item.createdAt || item.created || Date.now();
    const title = text(item.titulo || item.assunto || item.title || item.nome || 'Sem assunto');
    const desc = text(item.descricao || item.texto || item.obs || item.observacoes || item.body || '');
    const prioridade = normalizePriority(item.prioridade || item.priority || (item.importante || item.important ? 'Alta' : 'Média'));
    const estado = normalizeStatus(item.estado || item.status, item);
    return {
      id,
      titulo: title,
      descricao: desc,
      categoria: text(item.categoria || item.category || 'Geral'),
      prioridade,
      autor: text(item.autor || item.author || item.user || item.responsavel || 'Sem autor'),
      data,
      estado,
      lida: item.lida ?? item.read ?? false,
      fixada: !!(item.fixada || item.pinned || estado==='Fixada'),
      importante: !!(item.importante || item.important || estado==='Importante' || prioridade==='Alta'),
      arquivada: !!(item.arquivada || item.archived || estado==='Arquivada'),
      createdAt: item.createdAt || item.created || data || Date.now(),
      updatedAt: item.updatedAt || item.updated || item.modifiedAt || item.createdAt || data || Date.now(),
      raw: item
    };
  }
  function sampleItems(){
    const arr = [
      ['Atualização de horários','RH','Média','Ricardo','Publicada','Novos horários de atendimento para a equipa a partir desta semana.',false,true,false],
      ['Manutenção da rede','TI','Alta','César-PT','Importante','Manutenção de rede programada para hoje às 18:00.',false,false,true],
      ['Inventário do armazém','Operações','Média','Machado-PT','Publicada','Reforço de organização e validação de inventário no armazém.',true,false,false],
      ['Formação interna','Formação','Baixa','Elisabete-PT','Agendada','Formação interna agendada para amanhã.',false,false,false],
      ['Aviso de segurança','Segurança','Alta','Rafael Silva','Fixada','Relembrar procedimentos de segurança e acessos internos.',false,true,true],
      ['Encerramento mensal','Administração','Média','Nelson','Arquivada','Informação de encerramento mensal arquivada.',true,false,false]
    ];
    return arr.map((a,i)=>normalize({titulo:a[0],categoria:a[1],prioridade:a[2],autor:a[3],estado:a[4],descricao:a[5],lida:a[6],fixada:a[7],importante:a[8],data:new Date(Date.now()-i*86400000).toISOString(),createdAt:Date.now()-i*86400000,updatedAt:Date.now()-i*3600000},`sample-${i}`));
  }
  function defaultCategories(){ return ['RH','TI','Operações','Segurança','Administração','Formação','Geral']; }
  function getFiltered(){
    const q=lower($('infoSearch')?.value||''); const cat=text($('infoFilterCategoria')?.value||''); const st=text($('infoFilterEstado')?.value||'');
    let rows=state.items.slice();
    if(q) rows=rows.filter(x=>lower([x.titulo,x.descricao,x.autor,x.categoria,x.estado,x.prioridade].join(' ')).includes(q));
    if(cat) rows=rows.filter(x=>lower(x.categoria)===lower(cat));
    if(st){
      rows=rows.filter(x=>{
        if(st==='nao-lida') return !x.lida && !x.arquivada;
        if(st==='importante') return x.importante || x.estado==='Importante';
        if(st==='fixada') return x.fixada || x.estado==='Fixada';
        if(st==='arquivada') return x.arquivada || x.estado==='Arquivada';
        return lower(x.estado)===lower(st);
      });
    } else rows=rows.filter(x=>!x.arquivada);
    rows.sort((a,b)=> Number(b.fixada)-Number(a.fixada) || Number(b.importante)-Number(a.importante) || toMs(b.updatedAt)-toMs(a.updatedAt) || toMs(b.data)-toMs(a.data));
    return rows;
  }
  function prioClass(v){ const r=lower(v); if(r.includes('alt')) return 'info-prio-alta'; if(r.includes('baix')) return 'info-prio-baixa'; if(r.includes('sem')) return 'info-prio-sem'; return 'info-prio-media'; }
  function statusClass(v){ const r=lower(v); if(r.includes('arquiv')) return 'info-status-arquivada'; if(r.includes('fix')) return 'info-status-fixada'; if(r.includes('import')) return 'info-status-importante'; if(r.includes('agend')) return 'info-status-agendada'; return 'info-status-publicada'; }
  function catClass(v){ const r=lower(v); if(r==='rh') return 'rh'; if(r==='ti') return 'ti'; if(r.includes('oper')) return 'operacoes'; if(r.includes('seg')) return 'seguranca'; if(r.includes('admin')) return 'administracao'; return ''; }
  function rowDot(x){ if(x.fixada) return 'purple'; if(x.importante) return 'red'; if(x.arquivada) return 'gray'; if(x.lida) return 'green'; return ''; }
  function renderTable(){
    const rows=getFiltered(); const total=rows.length; const size=Number($('infoPageSize')?.value||10); state.pageSize=size; const pages=Math.max(1,Math.ceil(total/size)); if(state.page>pages) state.page=pages;
    const start=(state.page-1)*size; const pageRows=rows.slice(start,start+size); const body=$('infoTableBody');
    if(body) body.innerHTML=pageRows.length?pageRows.map(x=>`
      <tr class="${!x.lida?'info-unread':''}">
        <td><div class="info-title-cell"><span class="info-dot ${rowDot(x)}"></span><div class="info-title-main"><strong>${esc(x.titulo)}</strong><small>${esc(x.descricao||'Sem descrição')}</small></div></div></td>
        <td><span class="info-badge info-cat ${catClass(x.categoria)}">${esc(x.categoria)}</span></td>
        <td><span class="info-badge ${prioClass(x.prioridade)}">${x.prioridade==='Alta'?'↑':x.prioridade==='Baixa'?'↓':x.prioridade==='Sem prioridade'?'•':'•'} ${esc(x.prioridade)}</span></td>
        <td>${esc(x.autor)}</td>
        <td><div class="info-date"><strong>${formatDate(x.data)}</strong><small>${formatTime(x.data)}</small></div></td>
        <td><span class="info-badge ${statusClass(x.estado)}">${x.estado==='Publicada'?'✓':x.estado==='Importante'?'!':x.estado==='Fixada'?'📌':x.estado==='Arquivada'?'▣':'◷'} ${esc(x.estado)}</span></td>
        <td><div class="info-actions"><button class="ck-icon-btn" title="Ver" data-info-view="${esc(x.id)}">👁</button><button class="ck-icon-btn" title="Editar" data-info-edit="${esc(x.id)}">✎</button><button class="ck-icon-btn" title="Mais" data-info-more="${esc(x.id)}">⋮</button></div></td>
      </tr>`).join(''):`<tr><td colspan="7"><div class="ck-empty">Sem informações para mostrar.</div></td></tr>`;
    const from=total?start+1:0, to=Math.min(start+size,total); if($('infoTableSummary')) $('infoTableSummary').textContent=`${from}-${to} de ${total}`; if($('infoListCount')) $('infoListCount').textContent=total;
    const pag=$('infoPagination'); if(pag){ let html=`<button ${state.page<=1?'disabled':''} data-info-page="${state.page-1}">«</button>`; for(let p=1;p<=pages;p++){ if(pages<=5 || p===1 || p===pages || Math.abs(p-state.page)<=1) html+=`<button class="${p===state.page?'active':''}" data-info-page="${p}">${p}</button>`; } html+=`<button ${state.page>=pages?'disabled':''} data-info-page="${state.page+1}">»</button>`; pag.innerHTML=html; }
    renderKpis(); renderSide(); bindDynamic();
  }
  function renderKpis(){
    const all=state.items; const active=all.filter(x=>!x.arquivada); const today=new Date().toISOString().slice(0,10);
    setText('infoKpiTotal',active.length); setText('infoKpiNaoLidas',active.filter(x=>!x.lida).length); setText('infoKpiImportantes',active.filter(x=>x.importante||x.estado==='Importante').length); setText('infoKpiFixadas',active.filter(x=>x.fixada||x.estado==='Fixada').length); setText('infoKpiHoje',active.filter(x=>new Date(toMs(x.data)).toISOString().slice(0,10)===today).length); setText('infoKpiArquivadas',all.filter(x=>x.arquivada).length);
  }
  function setText(id,v){ const el=$(id); if(el) el.textContent=v; }
  function renderSide(){
    const active=state.items.filter(x=>!x.arquivada); const alerts=active.filter(x=>x.importante||x.estado==='Importante'||!x.lida).slice(0,4);
    const alertsEl=$('infoAlertsList'); if(alertsEl) alertsEl.innerHTML=alerts.length?alerts.map(x=>`<div class="ck-alert-row"><span class="ck-mini-dot ${x.importante?'bad':'warn'}"></span><div><strong>${esc(x.titulo)}</strong><small>${esc(x.descricao||x.categoria)}</small></div><em>${formatDate(x.data)}</em></div>`).join(''):`<div class="ck-empty">Sem alertas críticos neste momento.</div>`;
    const counts={}; active.forEach(x=>counts[x.categoria]=(counts[x.categoria]||0)+1); const total=Math.max(active.length,1); const bars=$('infoCategoryBars');
    if(bars) bars.innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>`<div class="ck-bar"><span>${esc(name)}</span><div class="ck-bar-line"><span class="ck-bar-fill" style="width:${Math.round(count/total*100)}%"></span></div><strong>${count}</strong><small>${(count/total*100).toFixed(1)}%</small></div>`).join('') || `<div class="ck-empty">Sem categorias.</div>`;
    const rec=active.slice().sort((a,b)=>toMs(b.updatedAt)-toMs(a.updatedAt)).slice(0,5); const recent=$('infoRecentList');
    if(recent) recent.innerHTML=rec.length?rec.map(x=>`<div class="ck-mini-row"><span class="ck-mini-dot ${rowDot(x)}"></span><div><div class="ck-mini-title">${esc(x.titulo)}</div><div class="ck-mini-sub">${esc(x.categoria)} · ${formatDate(x.updatedAt||x.data)}</div></div></div>`).join(''):`<div class="ck-empty">Sem atualizações registadas.</div>`;
    renderFilters();
  }
  function renderFilters(){
    const cats=Array.from(new Set([...defaultCategories(), ...state.categories, ...state.items.map(x=>x.categoria).filter(Boolean)])).sort((a,b)=>a.localeCompare(b,'pt'));
    const cur=$('infoFilterCategoria')?.value || ''; const sel=$('infoFilterCategoria'); if(sel){ sel.innerHTML='<option value="">Todas as categorias</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join(''); sel.value=cur; }
    const dat=$('infoCategoriasDatalist'); if(dat) dat.innerHTML=cats.map(c=>`<option value="${esc(c)}"></option>`).join('');
    const list=$('infoCategoriasList'); if(list) list.innerHTML=cats.map(c=>`<div class="info-category-row"><strong>${esc(c)}</strong><button class="ck-btn small" data-info-cat-filter="${esc(c)}">Ver</button></div>`).join('');
  }
  function bindDynamic(){
    document.querySelectorAll('[data-info-page]').forEach(b=>b.onclick=()=>{const p=Number(b.dataset.infoPage); if(p>=1){state.page=p; renderTable();}});
    document.querySelectorAll('[data-info-view]').forEach(b=>b.onclick=()=>viewItem(b.dataset.infoView));
    document.querySelectorAll('[data-info-edit]').forEach(b=>b.onclick=()=>openForm(b.dataset.infoEdit));
    document.querySelectorAll('[data-info-more]').forEach(b=>b.onclick=()=>quickMore(b.dataset.infoMore));
    document.querySelectorAll('[data-info-cat-filter]').forEach(b=>b.onclick=()=>{ closeModal('categorias'); $('infoFilterCategoria').value=b.dataset.infoCatFilter; state.page=1; renderTable(); });
  }
  function get(id){ return state.items.find(x=>x.id===id); }
  function openForm(id=''){
    state.editingId=id||null; const x=id?get(id):null; if($('infoModalTitle')) $('infoModalTitle').textContent=x?'Editar informação':'Nova informação';
    $('infoFormTitulo').value=x?.titulo||''; $('infoFormCategoria').value=x?.categoria||''; $('infoFormPrioridade').value=x?.prioridade||'Média'; $('infoFormEstado').value=x?.estado||'Publicada'; $('infoFormAutor').value=x?.autor||'';
    const dt=x?new Date(toMs(x.data)):new Date(); $('infoFormData').value=!isNaN(dt)?dt.toISOString().slice(0,10):nowDate(); $('infoFormHora').value=!isNaN(dt)?dt.toTimeString().slice(0,5):nowTime();
    $('infoFormDescricao').value=x?.descricao||''; $('infoFormFixada').checked=!!x?.fixada; $('infoFormImportante').checked=!!x?.importante; $('infoFormLida').checked=!!x?.lida;
    showModal('form'); setTimeout(()=>$('infoFormTitulo')?.focus(),50);
  }
  function showModal(name){ const id={form:'infoModalForm',detail:'infoModalDetalhe',categorias:'infoModalCategorias'}[name]; if($(id)) $(id).style.display='flex'; }
  function closeModal(name){ const id={form:'infoModalForm',detail:'infoModalDetalhe',categorias:'infoModalCategorias'}[name]; if($(id)) $(id).style.display='none'; }
  async function saveItem(){
    const titulo=text($('infoFormTitulo').value); if(!titulo){toast('Indica o assunto da informação.','warn'); return;}
    const cat=text($('infoFormCategoria').value)||'Geral'; const date=text($('infoFormData').value)||nowDate(); const hour=text($('infoFormHora').value)||nowTime();
    const dataIso=new Date(`${date}T${hour}:00`).toISOString();
    const payload={titulo,assunto:titulo,categoria:cat,prioridade:$('infoFormPrioridade').value,estado:$('infoFormEstado').value,autor:text($('infoFormAutor').value)||'Sem autor',descricao:text($('infoFormDescricao').value),texto:text($('infoFormDescricao').value),data:dataIso,lida:!!$('infoFormLida').checked,fixada:!!$('infoFormFixada').checked,importante:!!$('infoFormImportante').checked,arquivada:$('infoFormEstado').value==='Arquivada',updatedAt:Date.now()};
    if(payload.fixada) payload.estado='Fixada'; if(payload.importante && payload.estado==='Publicada') payload.estado='Importante';
    try{
      const database=db();
      if(database){ if(state.editingId && !state.editingId.startsWith('sample-')) await database.collection(COLLECTION).doc(state.editingId).set(payload,{merge:true}); else await database.collection(COLLECTION).add({...payload,createdAt:Date.now()}); }
      else saveLocalItem(payload);
      await ensureCategory(cat); toast('Informação guardada.'); closeModal('form');
    }catch(e){ console.error(e); saveLocalItem(payload); toast('Firebase indisponível: guardado localmente.','warn'); closeModal('form'); }
  }
  function saveLocalItem(payload){ let arr=loadLocal(LOCAL_KEY,[]); if(state.editingId){ const i=arr.findIndex(x=>x.id===state.editingId); if(i>=0) arr[i]={...arr[i],...payload}; else arr.unshift({...payload,id:uid(),createdAt:Date.now()}); } else arr.unshift({...payload,id:uid(),createdAt:Date.now()}); saveLocal(LOCAL_KEY,arr); state.items=arr.map(x=>normalize(x,x.id)); renderTable(); }
  async function ensureCategory(cat){ if(!cat) return; const cats=loadLocal(LOCAL_CAT_KEY,defaultCategories()); if(!cats.map(lower).includes(lower(cat))){cats.push(cat); saveLocal(LOCAL_CAT_KEY,cats);} try{ const database=db(); if(database) await database.collection(CATEGORIES_COLLECTION).doc(cat).set({nome:cat,updatedAt:Date.now()},{merge:true}); }catch(_){} }
  function viewItem(id){ const x=get(id); if(!x) return; $('infoDetailTitle').textContent=x.titulo; $('infoDetailSub').textContent=`${x.categoria} · ${x.autor} · ${formatDate(x.data)}`; $('infoDetailBody').innerHTML=`<div class="info-detail-meta"><span class="info-badge info-cat ${catClass(x.categoria)}">${esc(x.categoria)}</span><span class="info-badge ${prioClass(x.prioridade)}">${esc(x.prioridade)}</span><span class="info-badge ${statusClass(x.estado)}">${esc(x.estado)}</span></div><div class="info-detail-text">${esc(x.descricao||'Sem descrição.')}</div><div class="ck-modal-actions"><button class="ck-btn" data-info-edit="${esc(x.id)}">Editar</button><button class="ck-btn" id="infoDetailRead">${x.lida?'Marcar não lida':'Marcar lida'}</button><button class="ck-btn" id="infoDetailPin">${x.fixada?'Desafixar':'Fixar'}</button></div>`; showModal('detail'); $('infoDetailRead').onclick=()=>toggleField(id,'lida',!x.lida); $('infoDetailPin').onclick=()=>toggleField(id,'fixada',!x.fixada); bindDynamic(); if(!x.lida) toggleField(id,'lida',true,true); }
  async function updateItem(id, patch, silent=false){ const x=get(id); if(!x) return; const payload={...patch,updatedAt:Date.now()}; try{ const database=db(); if(database && !id.startsWith('sample-')) await database.collection(COLLECTION).doc(id).set(payload,{merge:true}); else throw new Error('local'); if(!silent) toast('Informação atualizada.'); }catch(_){ let arr=loadLocal(LOCAL_KEY,state.items.map(i=>({...i.raw,id:i.id}))); const idx=arr.findIndex(i=>(i.id||'')===id); if(idx>=0) arr[idx]={...arr[idx],...payload}; saveLocal(LOCAL_KEY,arr); state.items=state.items.map(i=>i.id===id?normalize({...i.raw,...payload},id):i); renderTable(); if(!silent) toast('Atualizado localmente.','warn'); } }
  function toggleField(id,field,value,silent=false){ const patch={[field]:value}; if(field==='fixada') patch.estado=value?'Fixada':'Publicada'; if(field==='importante') patch.estado=value?'Importante':'Publicada'; updateItem(id,patch,silent); if(!silent) closeModal('detail'); }
  function quickMore(id){ const x=get(id); if(!x) return; const choice=prompt(`Ações para "${x.titulo}":\n1 - Fixar/Desafixar\n2 - Importante/Normal\n3 - Arquivar/Desarquivar\n4 - Marcar lida/não lida\n5 - Apagar`, '1'); if(!choice) return; if(choice==='1') toggleField(id,'fixada',!x.fixada); else if(choice==='2') toggleField(id,'importante',!x.importante); else if(choice==='3') toggleField(id,'arquivada',!x.arquivada); else if(choice==='4') toggleField(id,'lida',!x.lida); else if(choice==='5') deleteItem(id); }
  async function deleteItem(id){ const x=get(id); if(!x || !confirm(`Apagar "${x.titulo}"?`)) return; try{ const database=db(); if(database && !id.startsWith('sample-')) await database.collection(COLLECTION).doc(id).delete(); else throw new Error('local'); toast('Informação apagada.'); }catch(_){ let arr=loadLocal(LOCAL_KEY,state.items.map(i=>({...i.raw,id:i.id}))).filter(i=>(i.id||'')!==id); saveLocal(LOCAL_KEY,arr); state.items=state.items.filter(i=>i.id!==id); renderTable(); toast('Informação apagada localmente.','warn'); } }
  function exportCsv(){ const rows=getFiltered(); const header=['Assunto','Categoria','Prioridade','Autor','Data','Estado','Lida','Descrição']; const csv=[header,...rows.map(x=>[x.titulo,x.categoria,x.prioridade,x.autor,formatDate(x.data),x.estado,x.lida?'Sim':'Não',x.descricao])].map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n'); const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`informacoes-appbraga-${nowDate()}.csv`; a.click(); URL.revokeObjectURL(a.href); }
  function load(){
    const local=loadLocal(LOCAL_KEY,[]); state.items=local.length?local.map(x=>normalize(x,x.id)):sampleItems(); state.categories=loadLocal(LOCAL_CAT_KEY,defaultCategories()); renderTable();
    const database=db(); if(database){
      try{ state.unsubItems=database.collection(COLLECTION).onSnapshot(snap=>{ state.items=snap.docs.map(d=>normalize(d.data(),d.id)); if(!state.items.length && local.length) state.items=local.map(x=>normalize(x,x.id)); renderTable(); }, err=>{console.warn('informacoes snapshot',err);}); }catch(e){console.warn(e)}
      try{ state.unsubCats=database.collection(CATEGORIES_COLLECTION).onSnapshot(snap=>{ state.categories=snap.docs.map(d=>text(d.data().nome||d.id)).filter(Boolean); renderFilters(); },()=>{}); }catch(_){ }
    }
  }
  function init(){
    document.querySelectorAll('[data-info-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.infoClose)));
    ['infoSearch','infoFilterCategoria','infoFilterEstado','infoPageSize'].forEach(id=>$(id)?.addEventListener(id==='infoSearch'?'input':'change',()=>{state.page=1; renderTable();}));
    $('infoBtnLimpar')?.addEventListener('click',()=>{ $('infoSearch').value=''; $('infoFilterCategoria').value=''; $('infoFilterEstado').value=''; state.page=1; renderTable(); });
    $('infoBtnNova')?.addEventListener('click',()=>openForm()); $('infoBtnGuardar')?.addEventListener('click',saveItem);
    $('infoBtnComunicados')?.addEventListener('click',()=>{ $('infoFilterCategoria').value=''; $('infoFilterEstado').value='publicada'; state.page=1; renderTable(); });
    $('infoBtnFixadas')?.addEventListener('click',()=>{ $('infoFilterEstado').value='fixada'; state.page=1; renderTable(); });
    $('infoBtnArquivo')?.addEventListener('click',()=>{ $('infoFilterEstado').value='arquivada'; state.page=1; renderTable(); });
    $('infoBtnCategorias')?.addEventListener('click',()=>showModal('categorias'));
    $('infoBtnAddCategoria')?.addEventListener('click',async()=>{ const c=text($('infoNovaCategoria').value); if(!c)return; await ensureCategory(c); $('infoNovaCategoria').value=''; state.categories=Array.from(new Set([...state.categories,c])); renderFilters(); toast('Categoria adicionada.'); });
    $('infoBtnVerAlertas')?.addEventListener('click',()=>{ $('infoFilterEstado').value='importante'; state.page=1; renderTable(); });
    $('infoBtnVerRecentes')?.addEventListener('click',()=>{ $('infoSearch').value=''; $('infoFilterEstado').value=''; state.page=1; renderTable(); });
    window.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeModal('form'); closeModal('detail'); closeModal('categorias'); } });
    load();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
