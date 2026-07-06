(() => {
  'use strict';

  const VERSION = '1.58.166';
  const COLLECTION = 'portas';
  const HISTORY_COLLECTION = 'portasHistorico';
  const LOCAL_KEY = 'appbraga_portas_rede_fallback_v158109';
  const LOCAL_HISTORY_KEY = 'appbraga_portas_rede_history_fallback_v158109';

  const state = {
    portas: [], history: [], page: 1, pageSize: 10, editingId: null,
    unsubscribePortas: null, unsubscribeHistory: null
  };

  const $ = (id) => document.getElementById(id);
  const text = (v) => String(v ?? '').trim();
  const lower = (v) => text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const uid = () => `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  function esc(v){return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function db(){return window.db && typeof window.db.collection === 'function' ? window.db : null;}
  function loadLocal(key, fallback=[]){try{return JSON.parse(localStorage.getItem(key)||'null') || fallback;}catch{return fallback;}}
  function saveLocal(key, value){try{localStorage.setItem(key, JSON.stringify(value));}catch{}}
  function toast(message, type='ok'){
    let node = document.querySelector('.pr-toast');
    if(!node){node=document.createElement('div');node.className='pr-toast';document.body.appendChild(node);}
    node.textContent = message; node.className = `pr-toast ${type}`;
    requestAnimationFrame(()=>node.classList.add('show'));
    clearTimeout(node._timer); node._timer=setTimeout(()=>node.classList.remove('show'),2600);
  }
  function toMs(value){
    if(!value) return 0;
    if(typeof value === 'object' && typeof value.toDate === 'function') return value.toDate().getTime();
    if(typeof value === 'number') return value;
    const n = new Date(value).getTime(); return Number.isNaN(n) ? 0 : n;
  }
  function formatDate(value, full=false){
    const ms = toMs(value); if(!ms) return '—';
    return new Date(ms).toLocaleString('pt-PT', full ? {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'} : {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  }
  function todayKey(){return new Date().toISOString().slice(0,10);}
  function isoNow(){return new Date().toISOString();}

  function normalizeEstado(value, porta={}){
    const raw = lower(value || porta.estado || porta.status || '');
    if(raw.includes('erro') || raw.includes('falha') || raw.includes('down')) return 'Erro';
    if(raw.includes('desativ') || raw.includes('inativ') || raw.includes('disabled') || raw.includes('livre')) return 'Desativada';
    if(raw.includes('monitor')) return 'Não monitorizada';
    if(raw.includes('ativa') || raw.includes('ocup') || raw.includes('active') || raw.includes('up')) return 'Ativa';
    const hasAny = !!(porta.ip || porta.dispositivo || porta.equipamento || porta.user || porta.utilizador);
    return hasAny ? 'Ativa' : 'Desativada';
  }
  function estadoKey(value){
    const raw = lower(value);
    if(raw.includes('erro')) return 'erro';
    if(raw.includes('desativ') || raw.includes('inativ') || raw.includes('livre')) return 'desativada';
    if(raw.includes('monitor')) return 'monitorizar';
    return 'ativa';
  }
  function estadoIcon(value){const k=estadoKey(value); return k==='erro'?'×':k==='desativada'?'⊘':k==='monitorizar'?'○':'✓';}
  function statusDotClass(value){const k=estadoKey(value); return k==='erro'?'bad':k==='desativada'||k==='monitorizar'?'warn':'';}

  function normalizePorta(doc){
    const data = doc && typeof doc.data === 'function' ? doc.data() : (doc || {});
    const id = doc && typeof doc.data === 'function' ? doc.id : (data.id || data.firebaseId || uid());
    const estado = normalizeEstado(data.estado || data.status, data);
    const portaNome = data.porta || data.nome || data.codigo || data.idPorta || data.port || '';
    const codigo = data.codigo || data.idInterno || data.idPorta || data.id || '';
    const dispositivo = data.dispositivo || data.equipamento || data.device || data.user || data.utilizador || '';
    return {
      ...data,
      id,
      firebaseId:id,
      porta: portaNome || codigo || 'Sem porta',
      codigo: codigo || '',
      switchNome: data.switchNome || data.switch || data.switchName || data.sw || 'Sem switch',
      ip: data.ip || data.IP || '',
      dispositivo,
      vlan: data.vlan || data.VLAN || '',
      vlanNome: data.vlanNome || data.vlanName || data.nomeVlan || '',
      estado,
      velocidade: data.velocidade || data.speed || data.vel || (estadoKey(estado)==='ativa' ? '1 Gbps' : ''),
      duplex: data.duplex || data.fullDuplex || (estadoKey(estado)==='ativa' ? 'Full Duplex' : ''),
      tipo: data.tipo || data.type || 'Acesso',
      local: data.local || data.localizacao || '',
      notas: data.notas || data.obs || '',
      updatedAt: data.updatedAt || data.alteradoEm || data.ultimaVerificacao || data.lastCheck || data.createdAt || Date.now(),
      createdAt: data.createdAt || data.criadoEm || Date.now()
    };
  }

  function normalizeHistory(doc){
    const data = doc && typeof doc.data === 'function' ? doc.data() : (doc || {});
    const id = doc && typeof doc.data === 'function' ? doc.id : (data.id || uid());
    return {
      ...data,
      id,
      portaId: data.portaId || data.portId || data.refId || '',
      porta: data.porta || data.nome || data.codigo || '',
      tipo: data.tipo || data.acao || data.action || 'Atualização',
      descricao: data.descricao || data.description || data.notas || '',
      autor: data.autor || data.user || data.responsavel || 'Sistema',
      createdAt: data.createdAt || data.data || data.date || Date.now()
    };
  }

  function seedPortas(){
    return [
      ['Gi0/1','PR-0001','SW-Core-01','192.168.1.10','Servidor-Files','10','Gestão','Ativa','1 Gbps','Full Duplex','Acesso'],
      ['Gi0/2','PR-0002','SW-Core-01','192.168.1.20','Servidor-Backup','10','Gestão','Ativa','1 Gbps','Full Duplex','Trunk'],
      ['Gi0/3','PR-0003','SW-Core-01','192.168.2.15','PC-Admin-01','20','Funcionários','Ativa','1 Gbps','Full Duplex','Acesso'],
      ['Gi0/4','PR-0004','SW-Core-01','','Não atribuído','','Sem VLAN','Desativada','','','Acesso'],
      ['Gi0/5','PR-0005','SW-Access-01','192.168.2.25','PC-Vendas-01','20','Funcionários','Ativa','100 Mbps','Full Duplex','Acesso'],
      ['Gi0/6','PR-0006','SW-Access-01','192.168.2.26','PC-Vendas-02','20','Funcionários','Erro','','','Acesso'],
      ['Gi0/7','PR-0007','SW-Access-01','192.168.3.30','Impressora-Piso1','30','Impressoras','Ativa','100 Mbps','Full Duplex','Acesso'],
      ['Gi0/8','PR-0008','SW-Access-01','','Não atribuído','','Sem VLAN','Desativada','','','Acesso'],
      ['Gi0/9','PR-0009','SW-Access-02','192.168.4.40','AP-WiFi-Piso2','40','WiFi','Ativa','1 Gbps','Full Duplex','Trunk'],
      ['Gi0/10','PR-0010','SW-Access-02','192.168.4.41','AP-WiFi-Piso2-2','40','WiFi','Ativa','1 Gbps','Full Duplex','Trunk']
    ].map((r,i)=>normalizePorta({id:`sample-${i+1}`,porta:r[0],codigo:r[1],switchNome:r[2],ip:r[3],dispositivo:r[4],vlan:r[5],vlanNome:r[6],estado:r[7],velocidade:r[8],duplex:r[9],tipo:r[10],updatedAt:Date.now()-(i+1)*900000,createdAt:Date.now()-(i+3)*86400000}));
  }

  function getFiltered(){
    const q = lower($('prSearch')?.value || '');
    const fs = $('prFilterSwitch')?.value || '';
    const fv = $('prFilterVlan')?.value || '';
    const fe = $('prFilterEstado')?.value || '';
    return state.portas.filter(p=>{
      const hay = lower([p.porta,p.codigo,p.switchNome,p.ip,p.dispositivo,p.vlan,p.vlanNome,p.estado,p.local,p.notas].join(' '));
      const okQ = !q || hay.includes(q);
      const okS = !fs || p.switchNome === fs;
      const okV = !fv || String(p.vlan || '') === String(fv);
      const okE = !fe || estadoKey(p.estado) === fe;
      return okQ && okS && okV && okE;
    }).sort((a,b)=>String(a.switchNome).localeCompare(String(b.switchNome), 'pt', {numeric:true}) || String(a.porta).localeCompare(String(b.porta), 'pt', {numeric:true}));
  }

  function updateFilters(){
    const currentS = $('prFilterSwitch')?.value || '';
    const currentV = $('prFilterVlan')?.value || '';
    const switches = [...new Set(state.portas.map(p=>p.switchNome).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
    const vlans = [...new Set(state.portas.map(p=>String(p.vlan || '')).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt',{numeric:true}));
    if($('prFilterSwitch')) $('prFilterSwitch').innerHTML = '<option value="">Todos os switches</option>' + switches.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if($('prFilterVlan')) $('prFilterVlan').innerHTML = '<option value="">Todas as VLANs</option>' + vlans.map(v=>`<option value="${esc(v)}">VLAN ${esc(v)}</option>`).join('');
    if($('prFilterSwitch')) $('prFilterSwitch').value = switches.includes(currentS) ? currentS : '';
    if($('prFilterVlan')) $('prFilterVlan').value = vlans.includes(currentV) ? currentV : '';
  }

  function computeStats(){
    const total = state.portas.length;
    const count = key => state.portas.filter(p=>estadoKey(p.estado)===key).length;
    const now = Date.now();
    const today = todayKey();
    return {
      total, ativa: count('ativa'), desativada: count('desativada'), erro: count('erro'), monitorizar: count('monitorizar'),
      hoje: state.history.filter(h=>new Date(toMs(h.createdAt)).toISOString().slice(0,10)===today).length,
      hist30: state.history.filter(h=>now-toMs(h.createdAt)<=30*86400000).length
    };
  }

  function renderKpis(stats){
    const set=(id,v)=>{const el=$(id); if(el) el.textContent = v;};
    set('prKpiTotal', stats.total); set('prKpiAtivas', stats.ativa); set('prKpiDesativadas', stats.desativada); set('prKpiErros', stats.erro); set('prKpiHoje', stats.hoje); set('prKpiHistorico', stats.hist30);
    if($('prListCount')) $('prListCount').textContent = stats.total;
  }

  function renderTable(){
    const tbody = $('prTableBody'); if(!tbody) return;
    const list = getFiltered();
    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if(state.page > totalPages) state.page = totalPages;
    const start = (state.page-1)*state.pageSize;
    const pageItems = list.slice(start, start+state.pageSize);
    if(!pageItems.length){tbody.innerHTML = `<tr><td colspan="9"><div class="ck-empty">Sem portas de rede para mostrar.</div></td></tr>`;}
    else tbody.innerHTML = pageItems.map(p=>{
      const k=estadoKey(p.estado); const dot=statusDotClass(p.estado); const typeCls=lower(p.tipo).includes('trunk')?' trunk':'';
      return `<tr>
        <td><div class="ck-code-cell"><span class="pr-port-icon ${esc(k)}">🔌</span><div><a class="ck-code-link" data-action="detail" data-id="${esc(p.id)}">${esc(p.porta)}</a><span class="ck-code-sub">ID: ${esc(p.codigo || p.id || '-')}</span></div></div></td>
        <td><span class="pr-switch-main">${esc(p.switchNome)}</span><span class="pr-sub">${esc(p.local || '')}</span></td>
        <td><span class="pr-ip-main">${esc(p.ip || '—')}</span><span class="pr-sub">${esc(p.dispositivo || 'Não atribuído')}</span></td>
        <td><strong>${esc(p.vlan || '—')}</strong><span class="pr-sub">${esc(p.vlanNome || 'Sem VLAN')}</span></td>
        <td><span class="ck-state ${esc(k)}">${estadoIcon(p.estado)} ${esc(p.estado)}</span></td>
        <td><strong>${esc(p.velocidade || '—')}</strong><span class="pr-sub">${esc(p.duplex || '')}</span></td>
        <td><span class="pr-type${typeCls}">${esc(p.tipo || 'Acesso')}</span></td>
        <td><strong>${formatDate(p.updatedAt, false)}</strong><span class="pr-status-dot ${dot}"></span><span class="pr-sub">${formatDate(p.updatedAt, true).split(', ')[1] || ''}</span></td>
        <td><div class="ck-actions"><button class="ck-icon-btn" title="Ver" data-action="detail" data-id="${esc(p.id)}">⊙</button><button class="ck-icon-btn" title="Editar" data-action="edit" data-id="${esc(p.id)}">✎</button><button class="ck-icon-btn" title="Mais" data-action="menu" data-id="${esc(p.id)}">⋮</button><div class="ck-menu" id="prMenu-${esc(p.id)}"><button data-action="toggle" data-id="${esc(p.id)}">Alterar estado</button><button data-action="history" data-id="${esc(p.id)}">Histórico</button><button class="delete" data-action="delete" data-id="${esc(p.id)}">Apagar</button></div></div></td>
      </tr>`;
    }).join('');
    const end = Math.min(start + pageItems.length, list.length);
    if($('prTableSummary')) $('prTableSummary').textContent = `${list.length ? start+1 : 0}-${end} de ${list.length} registos`;
    renderPagination(totalPages);
  }

  function renderPagination(totalPages){
    const box=$('prPagination'); if(!box) return;
    let html = `<button class="ck-page-btn" ${state.page<=1?'disabled':''} data-page="prev">«</button>`;
    const max=5; let start=Math.max(1,state.page-2), end=Math.min(totalPages,start+max-1); start=Math.max(1,end-max+1);
    for(let i=start;i<=end;i++) html += `<button class="ck-page-btn ${i===state.page?'active':''}" data-page="${i}">${i}</button>`;
    html += `<button class="ck-page-btn" ${state.page>=totalPages?'disabled':''} data-page="next">»</button>`;
    box.innerHTML=html;
  }

  function renderDonut(stats){
    const total = Math.max(1, stats.total);
    const vals = [stats.ativa, stats.desativada, stats.erro, stats.monitorizar];
    const colors = ['#55df72','#ff9f2f','#ff5567','#9babbe'];
    let acc = 0; const parts=[];
    vals.forEach((v,i)=>{const s=acc; const e=acc+(v/total)*100; parts.push(`${colors[i]} ${s}% ${e}%`); acc=e;});
    if($('prDonut')) $('prDonut').style.background = `conic-gradient(${parts.join(',')})`;
    const rows = [['Ativas',stats.ativa,colors[0]],['Desativadas',stats.desativada,colors[1]],['Erros',stats.erro,colors[2]],['Não monitorizadas',stats.monitorizar,colors[3]]];
    if($('prDonutLegend')) $('prDonutLegend').innerHTML = rows.map(([label,val,color])=>`<div class="pr-legend-row"><i class="pr-legend-dot" style="background:${color}"></i><span>${label}</span><small>${val}</small><em>${((val/total)*100).toFixed(1)}%</em></div>`).join('');
  }

  function renderAlerts(){
    const box=$('prAlertsList'); if(!box) return;
    const erros = state.portas.filter(p=>estadoKey(p.estado)==='erro');
    const desat = state.portas.filter(p=>estadoKey(p.estado)==='desativada');
    const alerts=[];
    if(erros.length) alerts.push({type:'crit',title:`${erros.length} porta${erros.length>1?'s':''} com erro de ligação`,sub:erros.slice(0,4).map(p=>p.porta).join(', '),time:'Agora'});
    if(desat.length) alerts.push({type:'warn',title:`${desat.length} porta${desat.length>1?'s':''} desativada${desat.length>1?'s':''}`,sub:desat.slice(0,4).map(p=>p.porta).join(', '),time:'Atual'});
    if(!state.history.length) alerts.push({type:'ok',title:'Sem alterações recentes registadas',sub:'Adiciona uma porta ou faz uma alteração para criar histórico.',time:'—'});
    box.innerHTML = alerts.length ? alerts.map(a=>`<div class="ck-alert ${a.type==='crit'?'crit':a.type==='ok'?'ok':''}"><i class="ck-alert-dot"></i><div><span class="ck-alert-title">${esc(a.title)}</span><span class="ck-alert-sub">${esc(a.sub)}</span></div><small>${esc(a.time)}</small></div>`).join('') : '<div class="ck-empty">Sem alertas críticos neste momento.</div>';
  }

  function renderRecent(){
    const box=$('prRecentRecords'); if(!box) return;
    const list = [...state.history].sort((a,b)=>toMs(b.createdAt)-toMs(a.createdAt)).slice(0,5);
    if(!list.length){box.innerHTML='<div class="ck-empty">Sem atualizações registadas.</div>';return;}
    box.innerHTML = list.map(h=>`<div class="ck-mini-row"><i class="ck-mini-dot ${lower(h.tipo).includes('apag')?'bad':lower(h.tipo).includes('erro')?'warn':''}"></i><div><span class="ck-mini-title">${esc(h.porta || 'Porta')} — ${esc(h.tipo)}</span><div class="ck-mini-sub">${esc(h.descricao || h.autor || '')}</div></div><small>${formatDate(h.createdAt)}</small></div>`).join('');
  }

  function renderAll(){
    updateFilters();
    const stats=computeStats();
    renderKpis(stats); renderTable(); renderDonut(stats); renderAlerts(); renderRecent();
  }

  function getById(id){return state.portas.find(p=>String(p.id)===String(id) || String(p.firebaseId)===String(id));}
  function formData(){
    const data={
      porta:text($('prFormPorta')?.value), codigo:text($('prFormCodigo')?.value), switchNome:text($('prFormSwitch')?.value), ip:text($('prFormIp')?.value), dispositivo:text($('prFormDispositivo')?.value), vlan:text($('prFormVlan')?.value), vlanNome:text($('prFormVlanNome')?.value), estado:text($('prFormEstado')?.value) || 'Ativa', velocidade:text($('prFormVelocidade')?.value), duplex:text($('prFormDuplex')?.value), tipo:text($('prFormTipo')?.value) || 'Acesso', local:text($('prFormLocal')?.value), notas:text($('prFormNotas')?.value), updatedAt: Date.now()
    };
    if(!data.porta) data.porta = data.codigo || `Porta-${Date.now()}`;
    return data;
  }
  function fillForm(p={}){
    const set=(id,v)=>{const el=$(id); if(el) el.value = v ?? '';};
    set('prFormPorta',p.porta); set('prFormCodigo',p.codigo); set('prFormSwitch',p.switchNome); set('prFormIp',p.ip); set('prFormDispositivo',p.dispositivo); set('prFormVlan',p.vlan); set('prFormVlanNome',p.vlanNome); set('prFormEstado',p.estado || 'Ativa'); set('prFormVelocidade',p.velocidade); set('prFormDuplex',p.duplex); set('prFormTipo',p.tipo || 'Acesso'); set('prFormLocal',p.local); set('prFormNotas',p.notas);
  }
  function openModal(id){const el=$(id); if(el) el.style.display='flex';}
  function closeModal(id){const el=$(id); if(el) el.style.display='none';}

  async function addHistory(porta, tipo, descricao){
    const entry = {id:uid(), portaId:porta.id || porta.firebaseId || '', porta:porta.porta || porta.codigo || '', tipo, descricao, autor:'Ricardo', createdAt:Date.now()};
    state.history.unshift(entry); saveLocal(LOCAL_HISTORY_KEY,state.history);
    if(db()){
      try{await db().collection(HISTORY_COLLECTION).add({...entry, createdAt: firebase.firestore.FieldValue.serverTimestamp()});}catch(e){console.warn('Histórico local', e);}
    }
  }

  async function savePorta(){
    const data = formData();
    const d = db();
    try{
      if(state.editingId){
        const current=getById(state.editingId) || {};
        if(d && !String(state.editingId).startsWith('local_') && !String(state.editingId).startsWith('sample-')) await d.collection(COLLECTION).doc(state.editingId).set(data,{merge:true});
        else {state.portas=state.portas.map(p=>p.id===state.editingId?normalizePorta({...p,...data,id:p.id}):p); saveLocal(LOCAL_KEY,state.portas); renderAll();}
        await addHistory({...current,...data,id:state.editingId}, 'Editada', 'Dados da porta atualizados');
        toast('Porta atualizada.');
      }else{
        data.createdAt = Date.now();
        if(d) await d.collection(COLLECTION).add(data);
        else {const p=normalizePorta({...data,id:uid()}); state.portas.push(p); saveLocal(LOCAL_KEY,state.portas); renderAll(); await addHistory(p,'Criada','Nova porta de rede adicionada');}
        toast('Porta criada.');
      }
      closeModal('prModalPorta'); state.editingId=null;
    }catch(e){console.error(e); toast('Não foi possível guardar. Usei fallback local.', 'error'); const p=normalizePorta({...data,id:state.editingId||uid(),createdAt:Date.now()}); state.portas=state.editingId?state.portas.map(x=>x.id===state.editingId?p:x):[p,...state.portas]; saveLocal(LOCAL_KEY,state.portas); renderAll(); closeModal('prModalPorta');}
  }

  async function deletePorta(id){
    const p=getById(id); if(!p) return;
    if(!confirm(`Apagar a porta ${p.porta}?`)) return;
    try{
      if(db() && !String(id).startsWith('local_') && !String(id).startsWith('sample-')) await db().collection(COLLECTION).doc(id).delete();
      state.portas=state.portas.filter(x=>x.id!==id); saveLocal(LOCAL_KEY,state.portas); renderAll();
      await addHistory(p,'Apagada','Porta removida'); toast('Porta apagada.');
    }catch(e){console.error(e); toast('Não foi possível apagar.', 'error');}
  }
  async function toggleEstado(id){
    const p=getById(id); if(!p) return;
    const order=['Ativa','Desativada','Erro','Não monitorizada'];
    const next=order[(order.indexOf(p.estado)+1)%order.length] || 'Ativa';
    try{
      if(db() && !String(id).startsWith('local_') && !String(id).startsWith('sample-')) await db().collection(COLLECTION).doc(id).set({estado:next,updatedAt:Date.now()},{merge:true});
      state.portas=state.portas.map(x=>x.id===id?normalizePorta({...x,estado:next,updatedAt:Date.now()}):x); saveLocal(LOCAL_KEY,state.portas); renderAll();
      await addHistory({...p,estado:next}, 'Estado alterado', `${p.estado} → ${next}`); toast('Estado alterado.');
    }catch(e){console.error(e); toast('Não foi possível alterar estado.', 'error');}
  }

  function showDetail(id){
    const p=getById(id); if(!p) return;
    if($('prDetailTitle')) $('prDetailTitle').textContent = `Porta ${p.porta}`;
    const rows=[['ID',p.codigo||p.id],['Switch',p.switchNome],['IP',p.ip||'—'],['Dispositivo',p.dispositivo||'Não atribuído'],['VLAN',`${p.vlan||'—'} ${p.vlanNome?'- '+p.vlanNome:''}`],['Estado',p.estado],['Velocidade',`${p.velocidade||'—'} ${p.duplex||''}`],['Tipo',p.tipo],['Local',p.local||'—'],['Notas',p.notas||'—']];
    if($('prDetailGrid')) $('prDetailGrid').innerHTML = rows.map(([k,v])=>`<div class="ck-detail-item"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
    const hist=state.history.filter(h=>h.portaId===p.id || h.porta===p.porta).sort((a,b)=>toMs(b.createdAt)-toMs(a.createdAt)).slice(0,8);
    if($('prDetailHistory')) $('prDetailHistory').innerHTML = hist.length ? hist.map(h=>`<div class="ck-modal-list-item"><div class="title">${esc(h.tipo)} · ${formatDate(h.createdAt,true)}</div><div class="sub">${esc(h.descricao || h.autor || '')}</div></div>`).join('') : '<div class="ck-empty">Sem histórico para esta porta.</div>';
    openModal('prModalDetalhe');
  }
  function showHistory(id=''){
    const list = (id ? state.history.filter(h=>h.portaId===id || h.porta===(getById(id)||{}).porta) : state.history).sort((a,b)=>toMs(b.createdAt)-toMs(a.createdAt));
    if($('prHistoryList')) $('prHistoryList').innerHTML = list.length ? list.map(h=>`<div class="ck-modal-list-item"><div class="title">${esc(h.porta || 'Porta')} — ${esc(h.tipo)} · ${formatDate(h.createdAt,true)}</div><div class="sub">${esc(h.descricao || '')} ${h.autor ? '· '+esc(h.autor) : ''}</div></div>`).join('') : '<div class="ck-empty">Sem histórico registado.</div>';
    openModal('prModalHistorico');
  }
  function showConfig(){
    const switches=[...new Set(state.portas.map(p=>p.switchNome).filter(Boolean))];
    const vlans=[...new Set(state.portas.map(p=>String(p.vlan||'')).filter(Boolean))];
    const locais=[...new Set(state.portas.map(p=>p.local).filter(Boolean))];
    const rows=[['Switches',switches.length],['VLANs',vlans.length],['Locais',locais.length],['Portas registadas',state.portas.length],['Coleção Firebase',COLLECTION],['Histórico',HISTORY_COLLECTION]];
    if($('prConfigGrid')) $('prConfigGrid').innerHTML = rows.map(([k,v])=>`<div class="ck-detail-item"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
    openModal('prModalConfig');
  }
  function exportCsv(){
    const rows=[['Porta','ID','Switch','IP','Dispositivo','VLAN','Nome VLAN','Estado','Velocidade','Duplex','Tipo','Local','Notas','Atualizado']];
    getFiltered().forEach(p=>rows.push([p.porta,p.codigo,p.switchNome,p.ip,p.dispositivo,p.vlan,p.vlanNome,p.estado,p.velocidade,p.duplex,p.tipo,p.local,p.notas,formatDate(p.updatedAt,true)]));
    const csv=rows.map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob=new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=`portas-rede-${todayKey()}.csv`; a.click(); URL.revokeObjectURL(url); toast('Relatório CSV gerado.');
  }

  function bindEvents(){
    $('prBtnNova')?.addEventListener('click',()=>{state.editingId=null; if($('prModalPortaTitle')) $('prModalPortaTitle').textContent='Nova porta de rede'; fillForm({estado:'Ativa',tipo:'Acesso'}); openModal('prModalPorta');});
    $('prBtnGuardarPorta')?.addEventListener('click',savePorta);
    $('prBtnRelatorio')?.addEventListener('click',exportCsv);
    $('prBtnHistorico')?.addEventListener('click',()=>showHistory());
    $('prBtnConfig')?.addEventListener('click',showConfig);
    $('prBtnDesativadas')?.addEventListener('click',()=>{if($('prFilterEstado')) $('prFilterEstado').value='desativada'; state.page=1; renderTable();});
    $('prBtnErros')?.addEventListener('click',()=>{if($('prFilterEstado')) $('prFilterEstado').value='erro'; state.page=1; renderTable();});
    $('prBtnVerAlertas')?.addEventListener('click',()=>{if($('prFilterEstado')) $('prFilterEstado').value='erro'; state.page=1; renderTable();});
    $('prBtnVerAtualizacoes')?.addEventListener('click',()=>showHistory());
    $('prBtnLimpar')?.addEventListener('click',()=>{['prSearch','prFilterSwitch','prFilterVlan','prFilterEstado'].forEach(id=>{const el=$(id); if(el) el.value='';}); state.page=1; renderAll();});
    ['prSearch','prFilterSwitch','prFilterVlan','prFilterEstado'].forEach(id=>$(id)?.addEventListener('input',()=>{state.page=1; renderTable();}));
    $('prPageSize')?.addEventListener('change',(e)=>{state.pageSize=Number(e.target.value)||10; state.page=1; renderTable();});
    $('prPagination')?.addEventListener('click',(e)=>{const btn=e.target.closest('[data-page]'); if(!btn || btn.disabled) return; const val=btn.dataset.page; const total=Math.max(1,Math.ceil(getFiltered().length/state.pageSize)); if(val==='prev') state.page=Math.max(1,state.page-1); else if(val==='next') state.page=Math.min(total,state.page+1); else state.page=Number(val)||1; renderTable();});
    document.body.addEventListener('click',(e)=>{
      const close=e.target.closest('[data-pr-close]'); if(close){closeModal(`prModal${close.dataset.prClose.charAt(0).toUpperCase()+close.dataset.prClose.slice(1)}`); if(close.dataset.prClose==='porta') closeModal('prModalPorta'); if(close.dataset.prClose==='detalhe') closeModal('prModalDetalhe'); if(close.dataset.prClose==='historico') closeModal('prModalHistorico'); if(close.dataset.prClose==='config') closeModal('prModalConfig'); return;}
      const act=e.target.closest('[data-action]');
      if(act){const id=act.dataset.id; const action=act.dataset.action; document.querySelectorAll('.ck-menu.open').forEach(m=>m.classList.remove('open'));
        if(action==='detail') showDetail(id); if(action==='edit'){const p=getById(id); if(p){state.editingId=id; if($('prModalPortaTitle')) $('prModalPortaTitle').textContent=`Editar ${p.porta}`; fillForm(p); openModal('prModalPorta');}}
        if(action==='menu'){const menu=$(`prMenu-${id}`); if(menu) menu.classList.toggle('open');}
        if(action==='delete') deletePorta(id); if(action==='toggle') toggleEstado(id); if(action==='history') showHistory(id);
      } else if(!e.target.closest('.ck-menu')) document.querySelectorAll('.ck-menu.open').forEach(m=>m.classList.remove('open'));
    });
  }

  function bindFirebase(){
    const d=db();
    if(!d){state.portas=loadLocal(LOCAL_KEY, seedPortas()).map(normalizePorta); state.history=loadLocal(LOCAL_HISTORY_KEY, []); renderAll(); return;}
    try{
      state.unsubscribePortas=d.collection(COLLECTION).onSnapshot(snap=>{
        const docs=snap.docs.map(normalizePorta);
        state.portas = docs.length ? docs : loadLocal(LOCAL_KEY, seedPortas()).map(normalizePorta);
        saveLocal(LOCAL_KEY,state.portas); renderAll();
      },err=>{console.warn(err); state.portas=loadLocal(LOCAL_KEY, seedPortas()).map(normalizePorta); renderAll();});
      state.unsubscribeHistory=d.collection(HISTORY_COLLECTION).onSnapshot(snap=>{
        state.history=snap.docs.map(normalizeHistory).sort((a,b)=>toMs(b.createdAt)-toMs(a.createdAt));
        saveLocal(LOCAL_HISTORY_KEY,state.history); renderAll();
      },err=>{console.warn(err); state.history=loadLocal(LOCAL_HISTORY_KEY, []); renderAll();});
    }catch(e){console.warn(e); state.portas=loadLocal(LOCAL_KEY, seedPortas()).map(normalizePorta); state.history=loadLocal(LOCAL_HISTORY_KEY, []); renderAll();}
  }

  function init(){bindEvents(); bindFirebase();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
