(function(){
  'use strict';
  const VERSION = '1.58.163';
  const TEAMS_COLLECTION = 'equipasSemanais';
  const LEGACY_TEAMS_COLLECTION = 'weeklyTeams';
  const CONFIG_COLLECTION = 'config';
  const CONFIG_DOC = 'equipasSemanais';
  const LEGACY_CONFIG_COLLECTION = 'appConfig';
  const LEGACY_CONFIG_DOC = 'weeklyTeamsRotation';
  const HISTORY_COLLECTION = 'equipasSemanaisHistorico';
  const LEGACY_HISTORY_COLLECTION = 'weeklyTeamsHistory';
  const LOCAL_TEAMS_KEY = 'appbraga.equipasSemanais.v123';
  const LOCAL_CONFIG_KEY = 'appbraga.equipasSemanais.config.v123';
  const LOCAL_HISTORY_KEY = 'appbraga.equipasSemanais.history.v123';

  const $ = (id)=>document.getElementById(id);
  const db = ()=>window.db || null;
  let teams = [];
  let users = [];
  let history = [];
  let rotationStart = mondayOf(new Date()).toISOString().slice(0,10);
  let firstTeamId = '';
  let page = 1;
  let pageSize = 10;
  let editingId = null;
  let selectedMembers = [];
  let unsubTeams = null;
  let unsubConfig = null;
  let unsubHistory = null;

  function escapeHtml(value){return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
  function toast(message,type){if(typeof window.mostrarMensagem==='function') return window.mostrarMensagem(message,type||'sucesso'); console[type==='erro'?'error':'log'](message);}
  function initials(name){return String(name||'?').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';}
  function userId(user){return String(user.idDoc||user.id||user.uid||user.email_bragalis||user.email||user.nome||'');}
  function userName(user){return String(user.nome||user.name||user.displayName||user.username||user.email_bragalis||user.email||userId(user)||'Sem nome');}

  function tsToMs(value){
    if(!value)return 0;
    if(typeof value==='number')return value;
    if(value?.toMillis)return value.toMillis();
    if(value?.seconds)return Number(value.seconds)*1000;
    const t=Date.parse(value);
    return Number.isFinite(t)?t:0;
  }
  function normalizeMember(member,index){
    if(typeof member==='string')return {id:`m-${index}-${member}`,nome:member};
    const m=member||{};
    const nome=String(m.nome||m.name||m.displayName||m.username||m.email||m.id||`Membro ${index+1}`).trim();
    return {id:String(m.id||m.uid||m.idDoc||m.email||nome||`m-${index}`),nome,email:m.email||m.email_bragalis||''};
  }
  function normalizeTeam(data,id){
    const d=data||{};
    const rawMembers=Array.isArray(d.members)?d.members:(Array.isArray(d.membros)?d.membros:(Array.isArray(d.users)?d.users:(Array.isArray(d.utilizadores)?d.utilizadores:[])));
    const members=rawMembers.map(normalizeMember).filter(m=>m.nome);
    const nome=String(d.nome||d.name||d.equipa||d.nomeEquipa||d.teamName||'Equipa sem nome').trim();
    const createdAtMs=tsToMs(d.createdAtMs||d.createdAt||d.criadoEm||d.created||d.dataCriacao);
    const updatedAtMs=tsToMs(d.updatedAtMs||d.updatedAt||d.atualizadoEm||d.updated||d.dataAtualizacao);
    return {
      ...d,
      idDoc:id||d.idDoc||d.id||`local-${Date.now()}`,
      id:id||d.id||d.idDoc||'',
      nome,
      members,
      membros:members,
      responsavel:String(d.responsavel||d.responsavelNome||d.owner||d.leader||d.coordenador||'').trim(),
      ordem:Number(d.ordem??d.order??d.posicao??9999),
      situacao:String(d.situacao||d.estado||d.status||'ativa').toLowerCase(),
      weekStart:String(d.weekStart||d.semanaInicio||d.dataInicio||d.startDate||'').slice(0,10),
      notas:String(d.notas||d.notes||d.observacoes||''),
      createdAtMs:createdAtMs||updatedAtMs||Date.now(),
      updatedAtMs:updatedAtMs||createdAtMs||Date.now()
    };
  }
  function mondayOf(date){const d=new Date(date);d.setHours(0,0,0,0);const day=d.getDay();const diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return d;}
  function addDays(date,days){const d=new Date(date);d.setDate(d.getDate()+days);return d;}
  function daysBetween(a,b){return Math.round((mondayOf(a)-mondayOf(b))/(24*60*60*1000));}
  function fmtDate(date){try{return new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}catch{return new Date(date).toISOString().slice(0,10);}}
  function fmtDateTime(ms){if(!ms)return '—';try{return new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(ms));}catch{return '—';}}
  function weekKey(date){return mondayOf(date).toISOString().slice(0,10);}
  function weekNumber(date){const d=mondayOf(date);const jan4=new Date(d.getFullYear(),0,4);const first=mondayOf(jan4);return Math.floor((d-first)/(7*24*60*60*1000))+1;}
  function periodLabel(start){return `${fmtDate(start)}<br><span>a</span><br>${fmtDate(addDays(start,6))}`;}

  function orderedTeams(){return [...teams].sort((a,b)=>{const ao=Number(a.ordem||9999);const bo=Number(b.ordem||9999);if(ao!==bo)return ao-bo;return String(a.nome||'').localeCompare(String(b.nome||''),'pt');});}
  function getRotationInfo(baseDate=new Date()){
    let list=orderedTeams();
    if(!list.length)return {list,current:null,next:null,currentIndex:-1,weekStart:mondayOf(baseDate),nextWeekStart:addDays(mondayOf(baseDate),7)};
    const firstIndex=firstTeamId?list.findIndex(t=>t.idDoc===firstTeamId):-1;
    if(firstIndex>0)list=[...list.slice(firstIndex),...list.slice(0,firstIndex)];
    const start=mondayOf(new Date(String(rotationStart||weekKey(new Date()))+'T00:00:00'));
    const nowWeek=mondayOf(baseDate);
    const diffWeeks=Math.floor((nowWeek-start)/(7*24*60*60*1000));
    const idx=((diffWeeks%list.length)+list.length)%list.length;
    return {list,current:list[idx],next:list[(idx+1)%list.length],currentIndex:idx,weekStart:nowWeek,nextWeekStart:addDays(nowWeek,7)};
  }
  function teamForWeek(start){const info=getRotationInfo(start);return info.current;}
  function situationForWeek(start){const today=mondayOf(new Date());const diff=daysBetween(start,today);if(diff===0)return 'ativa';if(diff>0&&diff<=7)return 'agendada';return diff>7?'planeada':'ativa';}
  function weekUntilLabel(start){const today=mondayOf(new Date());const diff=Math.round((mondayOf(start)-today)/(7*24*60*60*1000));if(diff===0)return 'Esta semana';if(diff===1)return 'Próxima semana';if(diff>1)return `Daqui a ${diff} semanas`;return `${Math.abs(diff)} semana(s) atrás`;}

  function saveLocal(){try{localStorage.setItem(LOCAL_TEAMS_KEY,JSON.stringify(teams));localStorage.setItem(LOCAL_CONFIG_KEY,JSON.stringify({rotationStart,firstTeamId}));localStorage.setItem(LOCAL_HISTORY_KEY,JSON.stringify(history));}catch{}}
  function loadLocal(){try{teams=JSON.parse(localStorage.getItem(LOCAL_TEAMS_KEY)||'[]')||[];}catch{teams=[];}try{history=JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY)||'[]')||[];}catch{history=[];}try{const cfg=JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY)||'{}');if(cfg.rotationStart)rotationStart=cfg.rotationStart;if(cfg.firstTeamId)firstTeamId=cfg.firstTeamId;}catch{}}
  async function addHistory(action,teamName){const payload={action,teamName:teamName||'',createdAtMs:Date.now(),user:(window.currentUser?.nome||window.currentUser?.email||'Sistema')};history.unshift({idDoc:`local-h-${Date.now()}`,...payload});history=history.slice(0,50);saveLocal();try{if(db()?.collection)await db().collection(HISTORY_COLLECTION).add(payload);}catch(e){console.warn('Histórico local:',e);}render();}

  async function loadUsers(){
    try{if(db()?.collection){const snap=await db().collection('users').get();users=snap.docs.map(doc=>({idDoc:doc.id,...doc.data()}));}else if(Array.isArray(window.usersData))users=window.usersData;}
    catch(e){console.warn(e);users=Array.isArray(window.usersData)?window.usersData:[];}
    users.sort((a,b)=>userName(a).localeCompare(userName(b),'pt'));
    const select=$('eqUserSelect'); if(select) select.innerHTML='<option value="">Selecionar user...</option>'+users.map(u=>`<option value="${escapeHtml(userId(u))}">${escapeHtml(userName(u))}</option>`).join('');
  }
  function hydrateConfig(data){
    if(!data)return;
    const start=data.rotationStart||data.dataInicio||data.startDate||data.inicioRotacao||data.inicio;
    const first=data.firstTeamId||data.primeiraEquipaId||data.equipaInicialId||data.currentTeamId||data.equipaAtualId;
    if(start)rotationStart=String(start).slice(0,10);
    if(first)firstTeamId=String(first);
  }
  function mergeTeamLists(primary,secondary){
    const map=new Map();
    [...secondary,...primary].forEach(t=>{
      const key=String(t.idDoc||t.id||t.nome||Math.random());
      map.set(key,t);
    });
    return [...map.values()].map((t,i)=>normalizeTeam(t,t.idDoc||t.id||`local-${i}`));
  }
  async function loadLegacyOnce(){
    if(!db()?.collection)return;
    try{
      const [oldSnap,newSnap,oldCfg,newCfg,oldHist,newHist]=await Promise.all([
        db().collection(TEAMS_COLLECTION).get().catch(()=>null),
        db().collection(LEGACY_TEAMS_COLLECTION).get().catch(()=>null),
        db().collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get().catch(()=>null),
        db().collection(LEGACY_CONFIG_COLLECTION).doc(LEGACY_CONFIG_DOC).get().catch(()=>null),
        db().collection(HISTORY_COLLECTION).orderBy('createdAtMs','desc').limit(30).get().catch(()=>null),
        db().collection(LEGACY_HISTORY_COLLECTION).orderBy('createdAtMs','desc').limit(30).get().catch(()=>null)
      ]);
      const primary=oldSnap?oldSnap.docs.map(doc=>normalizeTeam(doc.data(),doc.id)):[];
      const secondary=newSnap?newSnap.docs.map(doc=>normalizeTeam(doc.data(),doc.id)):[];
      teams=mergeTeamLists(primary,secondary);
      if(oldCfg?.exists)hydrateConfig(oldCfg.data());
      else if(newCfg?.exists)hydrateConfig(newCfg.data());
      const hist=[];
      if(oldHist)oldHist.docs.forEach(doc=>hist.push({idDoc:doc.id,...doc.data()}));
      if(newHist&&!hist.length)newHist.docs.forEach(doc=>hist.push({idDoc:doc.id,...doc.data()}));
      if(hist.length)history=hist;
      saveLocal();render();
    }catch(e){console.warn('Compatibilidade equipas antigas:',e);}
  }
  function listenData(){
    loadLocal(); render();
    if(!db()?.collection)return;
    try{
      if(Array.isArray(unsubTeams))unsubTeams.forEach(fn=>{try{fn();}catch{}}); else unsubTeams?.();
      unsubConfig?.();unsubHistory?.();
      unsubTeams=[];
      unsubTeams.push(db().collection(TEAMS_COLLECTION).onSnapshot(snap=>{
        const primary=snap.docs.map(doc=>normalizeTeam(doc.data(),doc.id));
        if(primary.length){teams=primary;saveLocal();render();}
        else loadLegacyOnce();
      },err=>{console.error(err);toast('Erro ao carregar equipas semanais.','erro');loadLegacyOnce();}));
      unsubTeams.push(db().collection(LEGACY_TEAMS_COLLECTION).onSnapshot(snap=>{
        if(teams.length)return;
        const legacy=snap.docs.map(doc=>normalizeTeam(doc.data(),doc.id));
        if(legacy.length){teams=legacy;saveLocal();render();}
      },()=>{}));
      unsubConfig=db().collection(CONFIG_COLLECTION).doc(CONFIG_DOC).onSnapshot(doc=>{if(doc.exists)hydrateConfig(doc.data());saveLocal();render();},()=>{db().collection(LEGACY_CONFIG_COLLECTION).doc(LEGACY_CONFIG_DOC).get().then(d=>{if(d.exists)hydrateConfig(d.data());saveLocal();render();}).catch(()=>{});});
      unsubHistory=db().collection(HISTORY_COLLECTION).orderBy('createdAtMs','desc').limit(30).onSnapshot(snap=>{history=snap.docs.map(doc=>({idDoc:doc.id,...doc.data()}));if(!history.length)loadLegacyOnce();saveLocal();render();},()=>{});
      loadLegacyOnce();
    }catch(e){console.error(e);loadLegacyOnce();}
  }

  function buildRows(){
    const info=getRotationInfo();
    const list=info.list;
    const weeks=[];
    const start=mondayOf(new Date());
    const count=Math.max(18,list.length*4,18);
    for(let i=0;i<count;i++){
      const weekStart=addDays(start,i*7);
      const team=list.length?list[(info.currentIndex+i)%list.length]:null;
      if(team)weeks.push({weekStart,team,situacao:situationForWeek(weekStart)});
    }
    return weeks;
  }
  function filteredRows(){
    const q=String($('eqSearch')?.value||'').trim().toLowerCase();
    const fs=$('eqFilterSemana')?.value||'';
    const ft=$('eqFilterEquipa')?.value||'';
    const sit=$('eqFilterSituacao')?.value||'';
    let rows=buildRows();
    if(q)rows=rows.filter(r=>[r.team.nome,...(r.team.members||[]).map(m=>m.nome||m.name)].join(' ').toLowerCase().includes(q));
    if(ft)rows=rows.filter(r=>r.team.idDoc===ft);
    if(sit)rows=rows.filter(r=>r.situacao===sit);
    if(fs==='atual')rows=rows.filter(r=>daysBetween(r.weekStart,new Date())===0);
    if(fs==='proxima')rows=rows.filter(r=>daysBetween(r.weekStart,new Date())===7);
    if(fs==='futuras')rows=rows.filter(r=>r.weekStart>mondayOf(new Date()));
    return rows;
  }
  function renderTeamOptions(){const sel=$('eqFilterEquipa');if(!sel)return;const cur=sel.value;sel.innerHTML='<option value="">Todas as equipas</option>'+orderedTeams().map(t=>`<option value="${escapeHtml(t.idDoc)}">${escapeHtml(t.nome||'Equipa sem nome')}</option>`).join('');sel.value=cur;}
  function renderKpis(rows){
    const teamList=orderedTeams(); const current=getRotationInfo().current; const membersTotal=teamList.reduce((a,t)=>a+(Array.isArray(t.members)?t.members.length:0),0);
    $('eqKpiTotal')&&( $('eqKpiTotal').textContent=teamList.length );
    $('eqKpiAtivas')&&( $('eqKpiAtivas').textContent=current?1:0 );
    $('eqKpiPessoas')&&( $('eqKpiPessoas').textContent=membersTotal );
    $('eqKpiHistorico')&&( $('eqKpiHistorico').textContent=history.length );
    const next=getRotationInfo().nextWeekStart;
    $('eqKpiProxima')&&( $('eqKpiProxima').textContent=fmtDate(next) );
    $('eqKpiProximaSub')&&( $('eqKpiProximaSub').textContent=weekUntilLabel(next) );
  }
  function renderAvatars(members){const list=Array.isArray(members)?members:[];const shown=list.slice(0,4);let html=shown.map(m=>`<span class="eq-avatar" title="${escapeHtml(m.nome||m.name||'Membro')}">${escapeHtml(initials(m.nome||m.name))}</span>`).join('');if(list.length>4)html+=`<span class="eq-more">+${list.length-4}</span>`;return html||'<span class="eq-team-sub">Sem membros</span>';}
  function renderTable(){
    const body=$('eqTableBody'); if(!body)return; const rows=filteredRows(); const total=rows.length; const startIdx=(page-1)*pageSize; const pageRows=rows.slice(startIdx,startIdx+pageSize);
    if(!pageRows.length){body.innerHTML='<tr><td colspan="8"><div class="eq-empty">Sem equipas para mostrar.</div></td></tr>';}
    else body.innerHTML=pageRows.map(r=>{
      const team=r.team; const members=Array.isArray(team.members)?team.members:[]; const created=team.createdAtMs||team.updatedAtMs; const isCurrent=r.situacao==='ativa';
      return `<tr>
        <td><div class="eq-week-cell"><span class="eq-star">${isCurrent?'★':'☆'}</span><span>Semana ${weekNumber(r.weekStart)} ${isCurrent?'<span class="eq-current-badge">ATUAL</span>':''}</span></div></td>
        <td><div class="eq-period">${periodLabel(r.weekStart)}</div></td>
        <td><div class="eq-team-name">${escapeHtml(team.nome||'Equipa sem nome')}</div><div class="eq-team-sub">● ${members.length} membros</div></td>
        <td><div class="eq-avatars">${renderAvatars(members)}</div></td>
        <td><div class="eq-resp"><span class="eq-resp-avatar">${escapeHtml(initials(team.responsavel||members[0]?.nome||'R'))}</span>${escapeHtml(team.responsavel||members[0]?.nome||'Sem responsável')}</div></td>
        <td><span class="eq-badge ${escapeHtml(r.situacao)}">${r.situacao==='ativa'?'Ativa':r.situacao==='agendada'?'Agendada':'Planeada'}</span></td>
        <td>${created?fmtDateTime(created):'—'}</td>
        <td><div class="eq-actions"><button class="eq-icon-btn" data-action="edit" data-id="${escapeHtml(team.idDoc)}" title="Editar">✎</button><button class="eq-icon-btn" data-action="detail" data-week="${escapeHtml(weekKey(r.weekStart))}" data-id="${escapeHtml(team.idDoc)}" title="Ver membros">👥</button><button class="eq-icon-btn danger" data-action="delete" data-id="${escapeHtml(team.idDoc)}" title="Apagar">⋮</button></div></td>
      </tr>`;
    }).join('');
    const from=total?startIdx+1:0,to=Math.min(startIdx+pageSize,total);$('eqTableSummary')&&($('eqTableSummary').textContent=`${from}-${to} de ${total} registos`);renderPagination(total);
  }
  function renderPagination(total){const box=$('eqPagination');if(!box)return;const pages=Math.max(1,Math.ceil(total/pageSize));if(page>pages)page=pages;let html=`<button ${page<=1?'disabled':''} data-page="${page-1}">«</button>`;for(let i=1;i<=pages;i++){if(i<=5||i===pages||Math.abs(i-page)<=1){html+=`<button class="${i===page?'active':''}" data-page="${i}">${i}</button>`;}else if(i===6&&pages>7){html+=`<button disabled>…</button>`;}}html+=`<button ${page>=pages?'disabled':''} data-page="${page+1}">»</button>`;box.innerHTML=html;}
  function renderSide(){
    const current=getRotationInfo().current; const members=Array.isArray(current?.members)?current.members:[]; const total=members.length||1; const box=$('eqResumoSemana');
    if(box){box.innerHTML=(current?members.slice(0,4).map((m,i)=>`<div class="eq-summary-row"><span><span class="eq-dot" style="background:${['#8b5cf6','#2478ff','#43e57f','#22d3ee'][i%4]}"></span>${escapeHtml(m.nome||m.name||'Membro')}</span><strong>1</strong><span>${Math.round(100/total)}%</span></div>`).join('')+`<div class="eq-summary-row"><span>Total</span><strong>${members.length}</strong><span>100%</span></div>`:'<div class="eq-empty">Sem equipa ativa.</div>');}
    const act=$('eqActivityList'); if(act){const list=history.slice(0,5);act.innerHTML=list.length?list.map((h,i)=>`<div class="eq-activity-item"><span class="eq-activity-bullet" style="background:${['#8b5cf6','#43e57f','#22d3ee','#ffd342'][i%4]}"></span><div><div class="eq-activity-title">${escapeHtml(h.action||'Atualização')}</div><div class="eq-activity-sub">${escapeHtml(h.teamName||h.user||'Sistema')}</div></div><span class="eq-activity-time">${fmtDateTime(h.createdAtMs)}</span></div>`).join(''):'<div class="eq-empty">Sem atualizações registadas.</div>';}
  }
  function render(){renderTeamOptions();const rows=filteredRows();renderKpis(rows);renderTable();renderSide();}

  function openModal(team){editingId=team?.idDoc||null;selectedMembers=Array.isArray(team?.members)?team.members.map(m=>({...m})):[];$('eqModalTitle')&&($('eqModalTitle').textContent=editingId?'Editar equipa semanal':'Nova equipa semanal');$('eqFormNome')&&($('eqFormNome').value=team?.nome||'');$('eqFormSemana')&&($('eqFormSemana').value=rotationStart||weekKey(new Date()));$('eqFormResponsavel')&&($('eqFormResponsavel').value=team?.responsavel||'');$('eqFormSituacao')&&($('eqFormSituacao').value=team?.situacao||'agendada');$('eqFormNotas')&&($('eqFormNotas').value=team?.notas||'');renderSelected();$('eqModal')?.classList.add('is-open');$('eqModal')?.setAttribute('aria-hidden','false');}
  function closeModal(){editingId=null;selectedMembers=[];$('eqModal')?.classList.remove('is-open');$('eqModal')?.setAttribute('aria-hidden','true');}
  function renderSelected(){const count=$('eqMembersCount'),box=$('eqSelectedMembers');if(count)count.textContent=`${selectedMembers.length} membros`;if(!box)return;if(!selectedMembers.length){box.textContent='Ainda não escolheste nenhum membro.';return;}box.innerHTML=selectedMembers.map(m=>`<span class="eq-chip">${escapeHtml(m.nome||m.name||memberKey(m))}<button type="button" data-remove-member="${escapeHtml(m.id||m.idDoc||m.nome)}">×</button></span>`).join('');}
  function addMember(){const id=$('eqUserSelect')?.value;if(!id)return;const user=users.find(u=>userId(u)===id);if(!user)return;if(selectedMembers.some(m=>String(m.id)===id))return toast('Esse user já está na equipa.','erro');selectedMembers.push({id,nome:userName(user),email:user.email||user.email_bragalis||''});$('eqUserSelect').value='';renderSelected();}
  async function saveTeam(){const nome=String($('eqFormNome')?.value||'').trim();if(!nome)return toast('Escreve o nome da equipa.','erro');if(!selectedMembers.length)return toast('Adiciona pelo menos um membro.','erro');const payload={nome,weekStart:$('eqFormSemana')?.value||weekKey(new Date()),dataInicio:$('eqFormSemana')?.value||weekKey(new Date()),responsavel:String($('eqFormResponsavel')?.value||'').trim(),situacao:$('eqFormSituacao')?.value||'agendada',estado:$('eqFormSituacao')?.value||'agendada',notas:String($('eqFormNotas')?.value||'').trim(),members:selectedMembers,membros:selectedMembers,ordem:editingId?(teams.find(t=>t.idDoc===editingId)?.ordem||teams.length+1):teams.length+1,updatedAtMs:Date.now(),updatedAt:new Date()};try{if(db()?.collection){if(editingId)await db().collection(TEAMS_COLLECTION).doc(editingId).set(payload,{merge:true});else await db().collection(TEAMS_COLLECTION).add({...payload,createdAtMs:Date.now()});}else{if(editingId){const i=teams.findIndex(t=>t.idDoc===editingId);if(i>=0)teams[i]={...teams[i],...payload};}else teams.push(normalizeTeam({idDoc:`local-${Date.now()}`,createdAtMs:Date.now(),...payload},`local-${Date.now()}`));saveLocal();render();}await addHistory(editingId?'Equipa atualizada':'Nova equipa criada',nome);closeModal();toast(editingId?'Equipa atualizada.':'Equipa criada.');}catch(e){console.error(e);toast('Erro ao guardar equipa.','erro');}}
  async function deleteTeam(id){const t=teams.find(x=>x.idDoc===id);if(!t)return;if(!confirm(`Apagar ${t.nome||'esta equipa'}?`))return;try{if(db()?.collection&&!String(id).startsWith('local-'))await db().collection(TEAMS_COLLECTION).doc(id).delete();teams=teams.filter(x=>x.idDoc!==id);saveLocal();await addHistory('Equipa apagada',t.nome);render();toast('Equipa apagada.');}catch(e){console.error(e);toast('Erro ao apagar equipa.','erro');}}
  async function setCurrentTeam(teamId){const t=teams.find(x=>x.idDoc===teamId);if(!t)return;rotationStart=weekKey(new Date());firstTeamId=teamId;try{if(db()?.collection)await db().collection(CONFIG_COLLECTION).doc(CONFIG_DOC).set({rotationStart,dataInicio:rotationStart,firstTeamId,primeiraEquipaId:firstTeamId,updatedAtMs:Date.now(),updatedAt:new Date()},{merge:true});saveLocal();await addHistory('Rotação manual executada',t.nome);render();toast('Rotação atualizada.');}catch(e){console.error(e);toast('Erro ao rodar equipa.','erro');}}
  function openDetail(id,week){const t=teams.find(x=>x.idDoc===id);if(!t)return;$('eqDetailTitle')&&($('eqDetailTitle').textContent=t.nome||'Equipa');$('eqDetailSubtitle')&&($('eqDetailSubtitle').textContent=`Semana de ${fmtDate(new Date(week+'T00:00:00'))}`);const body=$('eqDetailBody');if(body){body.innerHTML=`<div class="eq-detail-grid"><div class="eq-detail-block"><strong>Responsável</strong>${escapeHtml(t.responsavel||'Sem responsável')}</div><div class="eq-detail-block"><strong>Situação</strong><span class="eq-badge ${escapeHtml(t.situacao||'planeada')}">${escapeHtml(t.situacao||'Planeada')}</span></div><div class="eq-detail-block" style="grid-column:1/-1"><strong>Membros</strong><div class="eq-detail-members">${(t.members||[]).map(m=>`<span class="eq-chip">${escapeHtml(m.nome||m.name||'Membro')}</span>`).join('')||'Sem membros'}</div></div><div class="eq-detail-block" style="grid-column:1/-1"><strong>Notas</strong>${escapeHtml(t.notas||'Sem notas.')}</div></div>`;}$('eqDetailModal')?.classList.add('is-open');$('eqDetailModal')?.setAttribute('aria-hidden','false');}
  function exportCsv(){const rows=filteredRows();const csv=['Semana;Periodo;Equipa;Membros;Responsavel;Situacao'].concat(rows.map(r=>[weekNumber(r.weekStart),`${fmtDate(r.weekStart)} a ${fmtDate(addDays(r.weekStart,6))}`,r.team.nome,(r.team.members||[]).map(m=>m.nome).join(', '),r.team.responsavel||'',r.situacao].map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';'))).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`equipas-semanais-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);}
  function importCsv(file){const reader=new FileReader();reader.onload=async()=>{const lines=String(reader.result||'').split(/\r?\n/).filter(Boolean);let imported=0;for(const line of lines.slice(1)){const cols=line.split(';').map(c=>c.replace(/^"|"$/g,'').replaceAll('""','"'));if(!cols[2])continue;const payload={nome:cols[2],responsavel:cols[4]||'',situacao:cols[5]||'planeada',members:(cols[3]||'').split(',').map(x=>x.trim()).filter(Boolean).map((nome,i)=>({id:`csv-${Date.now()}-${i}`,nome})),ordem:teams.length+imported+1,createdAtMs:Date.now(),updatedAtMs:Date.now()};payload.membros=payload.members;if(db()?.collection)await db().collection(TEAMS_COLLECTION).add(payload);else teams.push({idDoc:`local-csv-${Date.now()}-${imported}`,...payload});imported++;}saveLocal();render();toast(`${imported} equipa(s) importada(s).`);};reader.readAsText(file,'utf-8');}
  async function duplicateLast(){const list=orderedTeams();const t=list.at(-1);if(!t)return toast('Não há equipa para duplicar.','erro');const payload={...t,nome:`${t.nome||'Equipa'} cópia`,ordem:list.length+1,createdAtMs:Date.now(),updatedAtMs:Date.now(),updatedAt:new Date()};payload.membros=payload.members||payload.membros||[];delete payload.idDoc;delete payload.id;try{if(db()?.collection)await db().collection(TEAMS_COLLECTION).add(payload);else teams.push({idDoc:`local-${Date.now()}`,...payload});saveLocal();await addHistory('Equipa duplicada',payload.nome);render();toast('Equipa duplicada.');}catch(e){console.error(e);}}

  function bind(){
    ['eqSearch','eqFilterSemana','eqFilterEquipa','eqFilterSituacao'].forEach(id=>$(id)?.addEventListener(id==='eqSearch'?'input':'change',()=>{page=1;render();}));
    $('eqPageSize')?.addEventListener('change',()=>{pageSize=Number($('eqPageSize').value)||10;page=1;render();});
    $('eqBtnLimpar')?.addEventListener('click',()=>{['eqSearch','eqFilterSemana','eqFilterEquipa','eqFilterSituacao'].forEach(id=>{$(id).value='';});page=1;render();});
    $('eqPagination')?.addEventListener('click',e=>{const btn=e.target.closest('button[data-page]');if(!btn||btn.disabled)return;page=Number(btn.dataset.page)||1;render();});
    $('eqBtnNova')?.addEventListener('click',()=>openModal(null));
    $('eqBtnGuardar')?.addEventListener('click',saveTeam);
    $('eqBtnAddMember')?.addEventListener('click',addMember);
    document.querySelectorAll('[data-eq-close]').forEach(b=>b.addEventListener('click',closeModal));
    $('eqModal')?.addEventListener('click',e=>{if(e.target.id==='eqModal')closeModal();});
    $('eqSelectedMembers')?.addEventListener('click',e=>{const b=e.target.closest('[data-remove-member]');if(!b)return;selectedMembers=selectedMembers.filter(m=>String(m.id)!==b.dataset.removeMember);renderSelected();});
    $('eqTableBody')?.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const id=b.dataset.id;if(b.dataset.action==='edit')openModal(teams.find(t=>t.idDoc===id));if(b.dataset.action==='delete')deleteTeam(id);if(b.dataset.action==='detail')openDetail(id,b.dataset.week);});
    $('eqBtnRodar')?.addEventListener('click',()=>{const info=getRotationInfo();if(info.next) setCurrentTeam(info.next.idDoc);});
    $('eqBtnDuplicar')?.addEventListener('click',duplicateLast);
    $('eqBtnExportar')?.addEventListener('click',exportCsv);
    $('eqBtnImportar')?.addEventListener('click',()=>$('eqImportFile')?.click());
    $('eqImportFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importCsv(f);e.target.value='';});
    $('eqBtnAbrirTudo')?.addEventListener('click',()=>{pageSize=50;$('eqPageSize').value='50';render();});
    $('eqBtnFecharTudo')?.addEventListener('click',()=>{pageSize=10;$('eqPageSize').value='10';page=1;render();});
    document.querySelectorAll('[data-eq-detail-close]').forEach(b=>b.addEventListener('click',()=>{$('eqDetailModal')?.classList.remove('is-open');$('eqDetailModal')?.setAttribute('aria-hidden','true');}));
    $('eqDetailModal')?.addEventListener('click',e=>{if(e.target.id==='eqDetailModal'){$('eqDetailModal')?.classList.remove('is-open');}});
    window.addEventListener('beforeunload',()=>{try{if(Array.isArray(unsubTeams))unsubTeams.forEach(fn=>fn&&fn());else unsubTeams?.();unsubConfig?.();unsubHistory?.();}catch{}});
  }
  function seedIfEmpty(){if(teams.length)return;teams=[{idDoc:'local-alfa',nome:'Equipa Alfa',responsavel:'Ricardo Silva',ordem:1,situacao:'ativa',members:[{id:'1',nome:'Ricardo Silva'},{id:'2',nome:'Joana Santos'},{id:'3',nome:'Miguel Costa'},{id:'4',nome:'Ana Ferreira'},{id:'5',nome:'Tiago Oliveira'}],createdAtMs:Date.now()-86400000,updatedAtMs:Date.now()-3600000},{idDoc:'local-bravo',nome:'Equipa Bravo',responsavel:'Joana Santos',ordem:2,situacao:'agendada',members:[{id:'6',nome:'Carla Mendes'},{id:'7',nome:'Bruno Costa'},{id:'8',nome:'Luís Pereira'}],createdAtMs:Date.now()-7200000,updatedAtMs:Date.now()-7200000}];history=[{idDoc:'local-h1',action:'Equipa Alfa atualizada',teamName:'Ricardo Silva',createdAtMs:Date.now()-3600000},{idDoc:'local-h2',action:'Nova equipa criada',teamName:'Equipa Bravo',createdAtMs:Date.now()-7200000}];saveLocal();}
  function init(){bind();loadUsers();loadLocal();if(!db()?.collection)seedIfEmpty();listenData();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
