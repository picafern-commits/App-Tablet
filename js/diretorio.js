(function(){
  'use strict';
  const VERSION='1.58.165';
  const COLLECTION='diretorioTelefonico';
  const LOCAL_KEY='appbraga_diretorio_v2';
  let contactos=[];
  let unsubscribe=null;
  let currentPage=1;
  let pageSize=10;
  let editId=null;
  let detailId=null;
  const collapsedSections = new Set();
  const collapsedArmazens = new Set();
  let naturalCollapseInitialized = false;

  const $=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const norm=(v)=>String(v??'').trim();
  const lower=(v)=>norm(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const uid=()=>`dir_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const nowIso=()=>new Date().toISOString();
  const formatDate=(v)=>{
    if(!v) return '—';
    const d = v?.toDate ? v.toDate() : new Date(v);
    if(Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-PT')+', '+d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
  };
  const initials=(name)=>{
    const parts=norm(name).split(/\s+/).filter(Boolean);
    if(!parts.length) return '??';
    return ((parts[0][0]||'')+(parts.length>1?(parts[parts.length-1][0]||''):(parts[0][1]||''))).toUpperCase();
  };
  const telHref=(v)=>norm(v).replace(/[^\d+]/g,'');
  const stateClass=(estado)=> lower(estado||'ativo').includes('ausente') ? 'ausente' : lower(estado||'ativo').includes('inat') ? 'inativo' : 'ativo';

  const extractEmail=(v)=>{
    const raw=norm(v);
    if(!raw) return '';
    const match=raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0].trim() : '';
  };
  const slugName=(name)=>lower(name).replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'');
  const looksGeneratedEmail=(email,nome)=>{
    const e=lower(email);
    if(!e) return false;
    const [local='',domain='']=e.split('@');
    const fakeDomains=new Set(['appbraga.pt','bragapbga.pt','bragalis.pt','bragalis.local']);
    if(!fakeDomains.has(domain)) return false;
    const slug=slugName(nome);
    const compact=slug.replace(/\./g,'');
    const localCompact=local.replace(/[^a-z0-9]/g,'');
    return !slug || local===slug || localCompact===compact || /^(teste|user|utilizador|contacto|semnome|demo|exemplo|filipe|luis|marta|ana|pedro|joao|ricardo|nuno|teresa|mariana|tiago|bruno)/.test(local);
  };
  const cleanEmail=(value,nome)=>{
    const email=extractEmail(value);
    if(!email) return '';
    return looksGeneratedEmail(email,nome) ? '' : email;
  };

  function normalizeContact(raw={}){
    const armazem = norm(raw.armazem || raw.warehouse || raw.localEmpresa || raw.empresa || raw.local || raw.store || raw.loja || 'Sem armazém');
    const seccao = norm(raw.seccao || raw.secao || raw.section || raw.departamento || raw.area || 'Sem secção');
    const nome = norm(raw.nome || raw.name || raw.utilizador || raw.contacto || raw.pessoa || raw.displayName || 'Sem nome');
    const estado = norm(raw.estado || raw.status || raw.state || 'Ativo');
    const email = cleanEmail(raw.email || raw.mail || raw.eMail, nome);
    const telefone = norm(raw.telefone || raw.phone || raw.fixo || raw.tel);
    const telemovel = norm(raw.telemovel || raw.mobile || raw.movimento || raw.movel || raw.telemóvel);
    const extensao = norm(raw.extensao || raw.extensão || raw.extension || raw.ext);
    return {
      ...raw,
      id: String(raw.id || raw.firebaseId || raw._id || uid()),
      firebaseId: raw.firebaseId || raw.id || null,
      nome,
      funcao: norm(raw.funcao || raw.função || raw.role || raw.cargo || raw.descricao || raw.descrição),
      armazem,
      seccao,
      telefone,
      telemovel,
      email,
      extensao,
      estado,
      observacoes: norm(raw.observacoes || raw.observações || raw.notas || raw.notes),
      createdAt: raw.createdAt || raw.createdAtMs || raw.dataCriacao || raw.data || nowIso(),
      updatedAt: raw.updatedAt || raw.updatedAtMs || raw.dataAtualizacao || raw.data || nowIso()
    };
  }

  const dbReady=()=>window.db && typeof window.db.collection==='function';
  function saveLocal(){ localStorage.setItem(LOCAL_KEY, JSON.stringify(contactos)); }
  function loadLocal(){
    try{ return JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]').map(normalizeContact); }catch{ return []; }
  }
  function seedIfEmpty(){
    // Não criar contactos de demonstração em produção.
    // A versão antiga gerava nomes/emails fictícios quando o Diretório estava vazio; agora fica vazio até importar/criar contactos reais.
    return;
  }

  function getFiltered(){
    const q=lower($('dirSearch')?.value||'');
    const arm=lower($('dirFilterArmazem')?.value||'');
    const sec=lower($('dirFilterSeccao')?.value||'');
    return contactos.filter(c=>{
      const blob=lower([c.nome,c.funcao,c.armazem,c.seccao,c.telefone,c.telemovel,c.email,c.extensao,c.estado,c.observacoes].join(' '));
      if(q && !blob.includes(q)) return false;
      if(arm && lower(c.armazem)!==arm) return false;
      if(sec && lower(c.seccao)!==sec) return false;
      return true;
    }).sort((a,b)=>String(a.armazem||'').localeCompare(String(b.armazem||''),'pt',{numeric:true}) || String(a.seccao||'').localeCompare(String(b.seccao||''),'pt',{numeric:true}) || String(a.nome||'').localeCompare(String(b.nome||''),'pt',{numeric:true}));
  }


  function armazemKey(armazem){ return lower(armazem||'Sem armazém'); }
  function groupKey(armazem,seccao){ return `${armazemKey(armazem)}::${lower(seccao||'Sem secção')}`; }
  function countBy(list, fn){ const map=new Map(); list.forEach(item=>{ const key=fn(item); map.set(key,(map.get(key)||0)+1); }); return map; }


  function applyNaturalCollapse(){
    // Diretório deve abrir naturalmente colapsado por Armazém.
    // Depois do primeiro carregamento, respeita as aberturas/fechos feitos pelo utilizador.
    if(naturalCollapseInitialized) return;
    collapsedSections.clear();
    collapsedArmazens.clear();
    contactos.forEach(c=>collapsedArmazens.add(armazemKey(c.armazem)));
    naturalCollapseInitialized = true;
  }

  function updateFilters(){
    const armSel=$('dirFilterArmazem'), secSel=$('dirFilterSeccao');
    const armVal=armSel?.value||'', secVal=secSel?.value||'';
    const arms=[...new Set(contactos.map(c=>c.armazem||'Sem armazém'))].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
    const secs=[...new Set(contactos.map(c=>c.seccao||'Sem secção'))].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
    if(armSel){ armSel.innerHTML='<option value="">Todos os armazéns</option>'+arms.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join(''); armSel.value=armVal; }
    if(secSel){ secSel.innerHTML='<option value="">Todas as secções</option>'+secs.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join(''); secSel.value=secVal; }
    const dlA=$('dirArmazensLista'), dlS=$('dirSeccoesLista');
    if(dlA) dlA.innerHTML=arms.map(v=>`<option value="${esc(v)}"></option>`).join('');
    if(dlS) dlS.innerHTML=secs.map(v=>`<option value="${esc(v)}"></option>`).join('');
  }

  function updateKpis(list){
    const total=contactos.length;
    const arms=new Set(contactos.map(c=>c.armazem)).size;
    const secs=new Set(contactos.map(c=>`${c.armazem}|${c.seccao}`)).size;
    const ativos=contactos.filter(c=>stateClass(c.estado)==='ativo').length;
    const phone=contactos.filter(c=>c.telefone||c.telemovel||c.email).length;
    const since=Date.now()-7*24*60*60*1000;
    const updates=contactos.filter(c=>new Date(c.updatedAt||c.createdAt||0).getTime()>=since).length;
    const set=(id,val)=>{const el=$(id); if(el) el.textContent=val;};
    set('dirKpiTotal',total); set('dirKpiArmazens',arms); set('dirKpiSeccoes',secs); set('dirKpiAtivos',ativos); set('dirKpiTelefone',phone); set('dirKpiAtualizacoes',updates); set('dirListCount',list.length);
  }

  function renderTable(list){
    const tbody=$('dirTableBody'); if(!tbody) return;
    const total=list.length;
    const page=list; // Sem paginação: mostrar todos os contactos filtrados.
    if(!page.length){
      tbody.innerHTML='<tr><td colspan="8" class="dir-empty">Sem contactos para mostrar.</td></tr>';
    }else{
      const sectionTotals=countBy(list,c=>groupKey(c.armazem,c.seccao));
      const armazemTotals=countBy(list,c=>c.armazem||'Sem armazém');
      let lastArm='';
      let lastSec='';
      const rows=[];
      page.forEach(c=>{
        const arm=c.armazem||'Sem armazém';
        const sec=c.seccao||'Sem secção';
        const secKey=groupKey(arm,sec);
        const armKey=armazemKey(arm);
        const armClosed=collapsedArmazens.has(armKey);
        if(arm!==lastArm){
          const armTotal=armazemTotals.get(arm)||0;
          rows.push(`<tr class="dir-group-row dir-group-armazem ${armClosed?'is-collapsed':''}" data-dir-armazem="${esc(armKey)}"><td colspan="8"><button type="button" class="dir-armazem-toggle" data-dir-armazem="${esc(armKey)}"><span>${armClosed?'▸':'▾'}</span><i>🏬</i><strong>${esc(arm)}</strong><em>${armTotal} contacto${armTotal===1?'':'s'}</em></button></td></tr>`);
          lastArm=arm; lastSec='';
        }
        if(armClosed) return;
        if(sec!==lastSec){
          const secTotal=sectionTotals.get(secKey)||0;
          const closed=collapsedSections.has(secKey);
          rows.push(`<tr class="dir-group-row dir-group-seccao ${closed?'is-collapsed':''}" data-dir-section="${esc(secKey)}"><td colspan="8"><button type="button" class="dir-section-toggle" data-dir-section="${esc(secKey)}"><span>${closed?'▸':'▾'}</span><strong>${esc(sec)}</strong><em>${secTotal} contacto${secTotal===1?'':'s'}</em></button></td></tr>`);
          lastSec=sec;
        }
        if(collapsedSections.has(secKey)) return;
        const st=stateClass(c.estado);
        const phone=telHref(c.telefone||c.telemovel);
        const firstPhone = c.telefone || c.telemovel || '';
        rows.push(`<tr class="dir-contact-row" data-dir-section-row="${esc(secKey)}">
          <td><div class="dir-person"><span class="dir-avatar">${esc(initials(c.nome))}</span><div class="dir-name"><strong>${esc(c.nome)}</strong><small>ID: ${esc(c.firebaseId||c.id)}</small></div></div></td>
          <td>${esc(c.funcao||'—')}</td>
          <td>${esc(c.armazem||'—')}</td>
          <td>${esc(c.seccao||'—')}</td>
          <td><div class="dir-contact">${firstPhone?`<a href="tel:${esc(phone)}">☎ ${esc(firstPhone)}</a>`:'<span class="dir-muted">☎ —</span>'}${c.email?`<a href="mailto:${esc(c.email)}">✉ ${esc(c.email)}</a>`:'<span class="dir-muted">✉ —</span>'}</div></td>
          <td>${esc(c.extensao||'—')}</td>
          <td><span class="dir-pill ${st}">${st==='ativo'?'Ativo':st==='ausente'?'Ausente':'Inativo'} <span>●</span></span></td>
          <td><div class="dir-actions">
            <button class="dir-icon-btn" type="button" title="Ver" data-dir-action="view" data-id="${esc(c.id)}">☎</button>
            ${c.email?`<a class="dir-icon-btn mail" title="Email" href="mailto:${esc(c.email)}">✉</a>`:`<button class="dir-icon-btn mail" type="button" title="Sem email" disabled>✉</button>`}
            <button class="dir-icon-btn" type="button" title="Editar" data-dir-action="edit" data-id="${esc(c.id)}">✎</button>
          </div></td>
        </tr>`);
      });
      tbody.innerHTML=rows.join('');
    }
    const summary=$('dirTableSummary');
    if(summary) summary.textContent= total ? `${total} contacto${total===1?'':'s'} encontrados` : '0 contactos encontrados';
    renderPagination(total,1);
  }

  function renderPagination(){
    const wrap=$('dirPagination');
    if(wrap) wrap.innerHTML='';
  }

  function renderDonut(){
    const counts=new Map();
    contactos.forEach(c=>counts.set(c.armazem||'Sem armazém',(counts.get(c.armazem||'Sem armazém')||0)+1));
    const sorted=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
    const total=Math.max(1,contactos.length);
    const colors=['#38bdf8','#8b5cf6','#22c55e','#f59e0b','#94a3b8','#ef4444'];
    let acc=0;
    const parts=sorted.slice(0,6).map(([_,n],i)=>{ const start=acc; acc+=n/total*100; return `${colors[i]} ${start}% ${acc}%`; });
    const donut=$('dirDonut'); if(donut) donut.style.background=`conic-gradient(${parts.join(',')||'#1e293b 0 100%'})`;
    const legend=$('dirDonutLegend');
    if(legend){
      if(!contactos.length){
        legend.innerHTML = '<div class="dir-legend-row dir-total-row"><span class="dir-legend-dot" style="--c:#334155"></span><span>Sem contactos registados</span><strong>0</strong></div>';
      } else {
        const top = sorted.slice(0,6);
        const outros = sorted.slice(6).reduce((s,x)=>s+x[1],0);
        legend.innerHTML = top.map(([label,n],i)=>`<div class="dir-legend-row"><span class="dir-legend-dot" style="--c:${colors[i%colors.length]}"></span><span>${esc(label)}</span><strong>${n}</strong><small>${((n/total)*100).toFixed(1)}%</small></div>`).join('')
          + (outros ? `<div class="dir-legend-row"><span class="dir-legend-dot" style="--c:#94a3b8"></span><span>Outros armazéns</span><strong>${outros}</strong><small></small></div>` : '')
          + `<div class="dir-legend-row dir-total-row"><span></span><span>Total</span><strong>${contactos.length}</strong><small></small></div>`;
      }
    }
  }

  function renderAlerts(){
    const noExt=contactos.filter(c=>!c.extensao).length;
    const noPhone=contactos.filter(c=>!c.telefone&&!c.telemovel&&!c.email).length;
    const ausentes=contactos.filter(c=>stateClass(c.estado)==='ausente').length;
    const alerts=[];
    if(noExt) alerts.push({c:'#f59e0b',t:`${noExt} contactos sem extensão atribuída`,p:'Atribua extensões para facilitar o contacto interno.',time:'Atual'});
    if(ausentes) alerts.push({c:'#f97316',t:`${ausentes} contactos ausentes`,p:'Verifique a disponibilidade da equipa.',time:'Hoje'});
    if(noPhone) alerts.push({c:'#ef4444',t:`${noPhone} contactos sem contacto direto`,p:'Atualize telefone, telemóvel ou email.',time:'Atual'});
    if(!alerts.length) alerts.push({c:'#22c55e',t:'Sem alertas críticos neste momento.',p:'Diretório operacional.',time:'—'});
    const el=$('dirAlertsList'); if(el) el.innerHTML=alerts.map(a=>`<div class="ck-list-row"><span class="ck-list-dot" style="--c:${a.c}"></span><div><strong>${esc(a.t)}</strong><p>${esc(a.p)}</p></div><time>${esc(a.time)}</time></div>`).join('');
  }

  function renderRecent(){
    const recent=[...contactos].sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0)).slice(0,4);
    const el=$('dirRecentRecords');
    if(el) el.innerHTML=recent.length? recent.map(c=>`<div class="ck-mini-row"><span class="ck-list-dot" style="--c:#22c55e"></span><div><strong>Contacto ${esc(c.nome)} atualizado</strong><p>${esc(c.armazem)} · ${esc(c.seccao)}</p></div><time>${formatDate(c.updatedAt||c.createdAt)}</time></div>`).join('') : '<div class="ck-mini-row"><span class="ck-list-dot"></span><div><strong>Sem atualizações registadas.</strong></div><time>—</time></div>';
  }

  function render(){
    updateFilters();
    const list=getFiltered();
    updateKpis(list); renderTable(list); renderDonut(); renderAlerts(); renderRecent();
  }

  function getForm(){
    return normalizeContact({
      id: editId || uid(), firebaseId: editId || null,
      nome:$('dirFormNome')?.value,
      funcao:$('dirFormFuncao')?.value,
      armazem:$('dirFormArmazem')?.value,
      seccao:$('dirFormSeccao')?.value,
      telefone:$('dirFormTelefone')?.value,
      telemovel:$('dirFormTelemovel')?.value,
      email:$('dirFormEmail')?.value,
      extensao:$('dirFormExtensao')?.value,
      estado:$('dirFormEstado')?.value,
      observacoes:$('dirFormObs')?.value,
      updatedAt:nowIso(),
      createdAt: contactos.find(c=>c.id===editId)?.createdAt || nowIso()
    });
  }
  function fillForm(c={}){
    const set=(id,v)=>{const el=$(id); if(el) el.value=v||'';};
    set('dirFormNome',c.nome); set('dirFormFuncao',c.funcao); set('dirFormArmazem',c.armazem); set('dirFormSeccao',c.seccao); set('dirFormTelefone',c.telefone); set('dirFormTelemovel',c.telemovel); set('dirFormEmail',c.email); set('dirFormExtensao',c.extensao); set('dirFormEstado',c.estado||'Ativo'); set('dirFormObs',c.observacoes);
  }
  function openModal(id){
    editId=id||null;
    const c=contactos.find(x=>x.id===id || x.firebaseId===id);
    $('dirModalTitle').textContent=c?'Editar contacto':'Novo contacto';
    fillForm(c||{});
    const del=$('dirBtnApagarModal'); if(del) del.style.display=c?'inline-flex':'none';
    const modal=$('dirModalContacto'); if(modal) modal.style.display='block';
  }
  function closeModal(){ const m=$('dirModalContacto'); if(m) m.style.display='none'; editId=null; }
  async function saveContact(){
    const data=getForm();
    if(!data.nome || data.nome==='Sem nome'){ alert('Preenche o nome do contacto.'); return; }
    try{
      if(dbReady()){
        const payload={...data}; delete payload.id;
        if(editId && contactos.find(c=>c.id===editId)?.firebaseId){ await window.db.collection(COLLECTION).doc(String(contactos.find(c=>c.id===editId).firebaseId)).set(payload,{merge:true}); }
        else { await window.db.collection(COLLECTION).add(payload); }
      } else {
        if(editId){ const idx=contactos.findIndex(c=>c.id===editId); if(idx>=0) contactos[idx]=data; }
        else contactos.unshift(data);
        saveLocal(); render();
      }
      closeModal();
    }catch(err){ console.error(err); alert('Erro ao guardar contacto: '+(err.message||err)); }
  }
  async function deleteContact(id){
    const c=contactos.find(x=>x.id===id || x.firebaseId===id); if(!c) return;
    if(!confirm(`Apagar contacto ${c.nome}?`)) return;
    try{
      if(dbReady() && c.firebaseId) await window.db.collection(COLLECTION).doc(String(c.firebaseId)).delete();
      else { contactos=contactos.filter(x=>x.id!==c.id); saveLocal(); render(); }
      closeModal();
    }catch(err){ console.error(err); alert('Erro ao apagar contacto: '+(err.message||err)); }
  }
  function openDetail(id){
    const c=contactos.find(x=>x.id===id || x.firebaseId===id); if(!c) return;
    detailId=c.id;
    $('dirDetailTitle').textContent=c.nome;
    const grid=$('dirDetailGrid');
    if(grid) grid.innerHTML=[
      ['Nome',c.nome],['Função',c.funcao||'—'],['Armazém',c.armazem],['Secção',c.seccao],['Telefone',c.telefone||'—'],['Telemóvel',c.telemovel||'—'],['Email',c.email||'—'],['Extensão',c.extensao||'—'],['Estado',c.estado],['Observações',c.observacoes||'—']
    ].map(([k,v])=>`<div class="ck-detail-item"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
    const modal=$('dirModalDetalhe'); if(modal) modal.style.display='block';
  }
  function closeDetail(){ const m=$('dirModalDetalhe'); if(m) m.style.display='none'; detailId=null; }

  function exportCsv(){
    const rows=[['Nome','Função','Armazém','Secção','Telefone','Telemóvel','Email','Extensão','Estado','Observações'],...getFiltered().map(c=>[c.nome,c.funcao,c.armazem,c.seccao,c.telefone,c.telemovel,c.email,c.extensao,c.estado,c.observacoes])];
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`diretorio-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  function buildCsvFrom(list){
    const rows=[['Nome','Função','Armazém','Secção','Telefone','Telemóvel','Email','Extensão','Estado','Observações'],...list.map(c=>[c.nome,c.funcao,c.armazem,c.seccao,c.telefone,c.telemovel,c.email,c.extensao,c.estado,c.observacoes])];
    return rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  }
  function downloadCsv(csv, filename){
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function exportAllCsv(){
    downloadCsv(buildCsvFrom(contactos), `diretorio-backup-todos-${new Date().toISOString().slice(0,10)}.csv`);
  }
  function openDeleteAllModal(){
    const total=$('dirDeleteAllTotal'); if(total) total.textContent=`${contactos.length} contacto${contactos.length===1?'':'s'}`;
    const fb=$('dirDeleteAllFirebase'); if(fb) fb.textContent=dbReady()?'Ligado':'Sem ligação / fallback local';
    const phrase=$('dirDeleteAllPhrase'); if(phrase) phrase.value='';
    const check=$('dirDeleteAllBackup'); if(check) check.checked=false;
    updateDeleteAllState();
    const modal=$('dirModalApagarTodos'); if(modal) modal.style.display='block';
  }
  function closeDeleteAllModal(){
    const modal=$('dirModalApagarTodos'); if(modal) modal.style.display='none';
  }
  function updateDeleteAllState(){
    const phrase=($('dirDeleteAllPhrase')?.value||'').trim();
    const checked=!!$('dirDeleteAllBackup')?.checked;
    const btn=$('dirBtnConfirmarApagarTodos');
    if(btn) btn.disabled = !(phrase==='APAGAR TODOS' && checked && contactos.length>0);
  }
  async function deleteAllContacts(){
    const phrase=($('dirDeleteAllPhrase')?.value||'').trim();
    const checked=!!$('dirDeleteAllBackup')?.checked;
    if(phrase!=='APAGAR TODOS' || !checked){ alert('Para apagar tudo tens de escrever APAGAR TODOS e confirmar a cópia de segurança.'); return; }
    if(!contactos.length){ alert('Não existem contactos para apagar.'); closeDeleteAllModal(); return; }
    const totalBefore=contactos.length;
    const finalOk=confirm(`Última confirmação: apagar definitivamente ${totalBefore} contacto${totalBefore===1?'':'s'} do Diretório?`);
    if(!finalOk) return;
    const btn=$('dirBtnConfirmarApagarTodos');
    if(btn){ btn.disabled=true; btn.textContent='A apagar...'; }
    try{
      if(dbReady()){
        const snap=await window.db.collection(COLLECTION).get();
        let batch=window.db.batch();
        let ops=0;
        let done=0;
        const commitBatch=async()=>{ if(ops>0){ await batch.commit(); batch=window.db.batch(); ops=0; } };
        for(const doc of snap.docs){
          batch.delete(doc.ref);
          ops++; done++;
          if(ops>=450) await commitBatch();
        }
        await commitBatch();
      }
      contactos=[];
      localStorage.removeItem(LOCAL_KEY);
      collapsedSections.clear();
      collapsedArmazens.clear();
      naturalCollapseInitialized=false;
      render();
      closeDeleteAllModal();
      alert(`Diretório limpo: ${totalBefore} contacto${totalBefore===1?'':'s'} apagado${totalBefore===1?'':'s'}.`);
    }catch(err){
      console.error(err);
      alert('Erro ao apagar todos os contactos: '+(err.message||err));
    }finally{
      if(btn){ btn.textContent='Apagar definitivamente'; updateDeleteAllState(); }
    }
  }
  async function importRows(rows){
    const mapped=rows.map(r=>normalizeContact({
      nome:r.Nome||r.nome||r.Name||r.name,
      funcao:r.Função||r.Funcao||r.Cargo||r.funcao||r.role,
      armazem:r.Armazém||r.Armazem||r.Local||r.local||r.armazem,
      seccao:r.Secção||r.Seccao||r.Secao||r.Departamento||r.seccao,
      telefone:r.Telefone||r.phone||r.Tel,
      telemovel:r.Telemóvel||r.Telemovel||r.Mobile||r.telemovel,
      email:r.Email||r.email,
      extensao:r.Extensão||r.Extensao||r.Extension||r.extensao,
      estado:r.Estado||r.estado||'Ativo',
      observacoes:r.Observações||r.Observacoes||r.Notas||r.notas
    })).filter(c=>c.nome && c.nome!=='Sem nome');
    if(!mapped.length){ alert('Não encontrei contactos válidos no ficheiro.'); return; }
    if(!confirm(`Importar ${mapped.length} contactos para o diretório?`)) return;
    try{
      if(dbReady()){
        let batch=window.db.batch(); let ops=0;
        mapped.forEach(c=>{ const data={...c}; delete data.id; delete data.firebaseId; batch.set(window.db.collection(COLLECTION).doc(),data); ops++; if(ops>=450){ batch.commit(); batch=window.db.batch(); ops=0; } });
        if(ops) await batch.commit();
      }else{ contactos=[...mapped,...contactos]; saveLocal(); render(); }
      alert('Importação concluída.');
    }catch(err){ console.error(err); alert('Erro ao importar: '+(err.message||err)); }
  }
  function handleImport(file){
    if(!file) return;
    const reader=new FileReader();
    reader.onload=async e=>{
      try{
        let rows=[];
        if(file.name.toLowerCase().endsWith('.csv')){
          const text=e.target.result; const lines=String(text).split(/\r?\n/).filter(Boolean); const headers=lines.shift().split(/[;,]/).map(h=>h.trim().replace(/^"|"$/g,''));
          rows=lines.map(line=>{ const cols=line.split(/[;,]/).map(c=>c.trim().replace(/^"|"$/g,'')); const obj={}; headers.forEach((h,i)=>obj[h]=cols[i]||''); return obj; });
        }else{
          if(!window.XLSX) throw new Error('Biblioteca Excel indisponível.');
          const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}); rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
        }
        await importRows(rows);
      }catch(err){ console.error(err); alert('Erro ao ler ficheiro: '+(err.message||err)); }
    };
    if(file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file,'UTF-8'); else reader.readAsArrayBuffer(file);
  }

  function bind(){
    $('dirSearch')?.addEventListener('input',()=>{currentPage=1; render();});
    $('dirFilterArmazem')?.addEventListener('change',()=>{currentPage=1; render();});
    $('dirFilterSeccao')?.addEventListener('change',()=>{currentPage=1; render();});
    $('dirBtnLimpar')?.addEventListener('click',()=>{ $('dirSearch').value=''; $('dirFilterArmazem').value=''; $('dirFilterSeccao').value=''; currentPage=1; render(); });
    $('dirBtnNovo')?.addEventListener('click',()=>openModal());
    $('dirBtnGuardar')?.addEventListener('click',saveContact);
    $('dirBtnApagarModal')?.addEventListener('click',()=>{ if(editId) deleteContact(editId); });
    $('dirBtnEditarDetalhe')?.addEventListener('click',()=>{ const id=detailId; closeDetail(); openModal(id); });
    $('dirBtnExportar')?.addEventListener('click',exportCsv);
    $('dirBtnImportar')?.addEventListener('click',()=>$('dirImportInput')?.click());
    $('dirImportInput')?.addEventListener('change',(e)=>handleImport(e.target.files?.[0]));
    $('dirBtnAbrir')?.addEventListener('click',()=>{collapsedSections.clear(); collapsedArmazens.clear(); render();});
    $('dirBtnFechar')?.addEventListener('click',()=>{collapsedSections.clear(); getFiltered().forEach(c=>collapsedArmazens.add(armazemKey(c.armazem))); render();});
    $('dirBtnApagarTodos')?.addEventListener('click',openDeleteAllModal);
    $('dirBtnBackupAntesApagar')?.addEventListener('click',exportAllCsv);
    $('dirBtnConfirmarApagarTodos')?.addEventListener('click',deleteAllContacts);
    $('dirDeleteAllPhrase')?.addEventListener('input',updateDeleteAllState);
    $('dirDeleteAllBackup')?.addEventListener('change',updateDeleteAllState);
    document.addEventListener('click',e=>{
      const close=e.target.closest('[data-dir-close]'); if(close){ const target=close.getAttribute('data-dir-close'); if(target==='detalhe') closeDetail(); else if(target==='apagar-todos') closeDeleteAllModal(); else closeModal(); }
      const armToggle=e.target.closest('.dir-armazem-toggle'); if(armToggle){ const key=armToggle.dataset.dirArmazem; if(key){ collapsedArmazens.has(key)?collapsedArmazens.delete(key):collapsedArmazens.add(key); render(); } return; }
      const secToggle=e.target.closest('.dir-section-toggle'); if(secToggle){ const key=secToggle.dataset.dirSection; if(key){ collapsedSections.has(key)?collapsedSections.delete(key):collapsedSections.add(key); render(); } return; }
      const action=e.target.closest('[data-dir-action]'); if(action){ const id=action.dataset.id; const type=action.dataset.dirAction; if(type==='view') openDetail(id); if(type==='edit') openModal(id); }
    });
  }

  async function start(){
    bind();
    contactos=loadLocal(); seedIfEmpty(); applyNaturalCollapse(); render();
    if(dbReady()){
      try{
        if(unsubscribe) unsubscribe();
        unsubscribe=window.db.collection(COLLECTION).onSnapshot(snap=>{
          contactos=[]; snap.forEach(doc=>contactos.push(normalizeContact({firebaseId:doc.id,id:doc.id,...doc.data()})));
          if(!contactos.length){ contactos=loadLocal(); seedIfEmpty(); }
          saveLocal(); applyNaturalCollapse(); render();
        },err=>{ console.warn('Diretório Firebase indisponível:',err); contactos=loadLocal(); seedIfEmpty(); applyNaturalCollapse(); render(); });
      }catch(err){ console.warn('Erro a iniciar Firebase diretório:',err); }
    }
  }
  document.addEventListener('DOMContentLoaded',start);
  window.AppBragaDiretorio={render,exportCsv,exportAllCsv,openModal,openDeleteAllModal};
})();
