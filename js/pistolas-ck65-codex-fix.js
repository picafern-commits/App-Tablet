(function(){
  const VERSION = '1.58.153';
  const LOCAL_KEYS = {
    pistols: 'appbraga-ck65-pistols-v1',
    interventions: 'appbraga-ck65-interventions-v1'
  };
  const COLLECTIONS = {
    pistols: 'pistolas',
    interventions: 'pistolasIntervencoes'
  };

  const state = {
    pistols: [],
    interventions: [],
    filtered: [],
    page: 1,
    pageSize: 10,
    currentEditId: null,
    currentDetailId: null,
    currentInterventionId: null,
    menuId: null,
    unsubscribers: []
  };

  function $(id){ return document.getElementById(id); }
  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c] || c;
    });
  }
  function norm(v){
    return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }
  function getDb(){
    try{ if(typeof getDbAppBraga === 'function') return getDbAppBraga(); }catch(e){}
    return window.db || (window.firebase && firebase.firestore ? firebase.firestore() : null);
  }
  function readLocal(key){
    try{ return JSON.parse(localStorage.getItem(key) || '[]') || []; }catch(e){ return []; }
  }
  function writeLocal(key, data){
    try{ localStorage.setItem(key, JSON.stringify(Array.isArray(data) ? data : [])); }catch(e){}
  }
  function notify(msg, type){
    if(typeof window.mostrarMensagem === 'function') window.mostrarMensagem(msg, type || 'ok');
    else alert(msg);
  }
  function nowDate(){ return new Date(); }
  function toMs(v){
    if(!v) return 0;
    if(typeof v === 'number') return v;
    if(v instanceof Date) return v.getTime();
    if(v && typeof v.toDate === 'function') return v.toDate().getTime();
    if(v && typeof v.toMillis === 'function') return v.toMillis();
    if(v && v.seconds) return v.seconds * 1000;
    const str = String(v).trim();
    if(!str) return 0;
    if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str) || /^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str).getTime() || 0;
    if(/^\d{2}\/\d{2}\/\d{4}/.test(str)){
      const [datePart, timePart] = str.split(' ');
      const [d,m,y] = datePart.split('/');
      return new Date(`${y}-${m}-${d}${timePart ? 'T' + timePart : ''}`).getTime() || 0;
    }
    return new Date(str).getTime() || 0;
  }
  function two(v){ return String(v).padStart(2,'0'); }
  function isToday(ms){
    if(!ms) return false;
    const a = new Date(ms); const b = new Date();
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  }
  function isYesterday(ms){
    if(!ms) return false;
    const a = new Date(ms);
    const b = new Date();
    b.setHours(0,0,0,0);
    const y = new Date(b.getTime() - 86400000);
    return a.getDate() === y.getDate() && a.getMonth() === y.getMonth() && a.getFullYear() === y.getFullYear();
  }
  function formatDateTime(value, compact){
    const ms = toMs(value);
    if(!ms) return '—';
    const d = new Date(ms);
    if(compact){
      return `${two(d.getDate())}/${two(d.getMonth()+1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;
    }
    if(isToday(ms)) return `Hoje, ${two(d.getHours())}:${two(d.getMinutes())}`;
    if(isYesterday(ms)) return `Ontem, ${two(d.getHours())}:${two(d.getMinutes())}`;
    return `${two(d.getDate())}/${two(d.getMonth()+1)}, ${two(d.getHours())}:${two(d.getMinutes())}`;
  }
  function formatInputDateTime(value){
    const ms = toMs(value) || Date.now();
    const d = new Date(ms);
    return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
  }
  function formatPct(num, total){
    if(!total) return '0.0%';
    return `${((num/total) * 100).toFixed(1)}%`;
  }
  function thirtyDaysAgo(){ return Date.now() - (30 * 24 * 60 * 60 * 1000); }
  function safeMenuId(id){ return `ckMenu_${String(id).replace(/[^a-zA-Z0-9_-]/g,'_')}`; }
  function pistolIdOf(item, index){ return item?.idDoc || item?.firebaseId || item?.id || item?.localId || `local-ck65-${index}`; }
  function interventionIdOf(item, index){ return item?.idDoc || item?.firebaseId || item?.id || item?.localId || `local-ck65-int-${index}`; }
  function statusMeta(raw){
    const value = norm(raw);
    if(value.includes('avari')) return { key:'broken', label:'Avariada', short:'Crítico' };
    if(value.includes('reserv')) return { key:'reserved', label:'Reservada', short:'Atenção' };
    if(value.includes('manuten') || value.includes('repar')) return { key:'maintenance', label:'Em manutenção', short:'Atenção' };
    return { key:'available', label:'Disponível', short:'OK' };
  }
  function deriveLegacyStatus(item){
    if(item && item.estado) return item.estado;
    const prontas = String(item?.prontas ?? '').trim();
    const op = norm(item?.operador);
    if(op.includes('reserva')) return 'Reservada';
    if(prontas && prontas !== '0' && prontas !== 'nao') return 'Disponível';
    return 'Disponível';
  }
  function generateCodeFromIndex(index){ return `CK65-${String(index + 1).padStart(3,'0')}`; }
  function normalizePistol(item, index){
    const id = pistolIdOf(item, index);

    const rawCode = String(item?.codigo || item?.codigoInterno || item?.num || '').trim();
    let code = rawCode || generateCodeFromIndex(index);
    if(/^\d+$/.test(code)) code = `CK65-${String(Number(code)).padStart(3,'0')}`;
    if(/^ck65[-_ ]?\d+$/i.test(code)){
      const n = code.match(/\d+$/)?.[0] || String(index + 1);
      code = `CK65-${String(Number(n)).padStart(3,'0')}`;
    }

    const serial = String(item?.serie || item?.sn || item?.cn || item?.mac || '').trim();
    const local = String(item?.local || item?.armazem || item?.localizacao || '').trim() || 'Sem local';
    const estado = statusMeta(item?.estado || deriveLegacyStatus(item));
    const ultimaIntervencaoAt = item?.ultimaIntervencaoAt || item?.lastInterventionAt || item?.updatedAt || item?.createdAt || null;

    let model = String(item?.modelo || '').trim();
    if(!model) model = 'CK65';

    return {
      raw: item || {},
      id,
      code,
      serial,
      model,
      local,
      estado,
      operador: String(item?.operador || '').trim(),
      password: String(item?.password || '').trim(),
      cn: String(item?.cn || '').trim(),
      sn: String(item?.sn || '').trim(),
      mac: String(item?.mac || '').trim(),
      notes: String(item?.notas || item?.obs || '').trim(),
      createdAt: item?.createdAt || nowDate(),
      updatedAt: item?.updatedAt || nowDate(),
      ultimaIntervencaoAt,
      ultimaIntervencaoTexto: String(item?.ultimaIntervencaoTexto || item?.lastInterventionText || '').trim()
    };
  }
  function normalizeIntervention(item, index){
    const id = interventionIdOf(item, index);
    const when = item?.dataAt || item?.data || item?.createdAt || item?.updatedAt || nowDate();
    return {
      raw: item || {},
      id,
      pistolId: String(item?.pistolaId || item?.ck65Id || '').trim(),
      pistolCode: String(item?.pistolaCodigo || item?.codigo || item?.num || '').trim(),
      type: String(item?.tipo || 'Intervenção').trim(),
      technician: String(item?.tecnico || item?.operador || '').trim(),
      local: String(item?.local || item?.armazem || '').trim(),
      notes: String(item?.notas || item?.descricao || '').trim(),
      statusAfter: statusMeta(item?.estadoApos || item?.estado || 'Em manutenção'),
      dateAt: when,
      createdAt: item?.createdAt || when,
      updatedAt: item?.updatedAt || when
    };
  }
  function sortByCode(list){
    return list.slice().sort(function(a,b){
      return String(a.code || '').localeCompare(String(b.code || ''), 'pt', { numeric:true, sensitivity:'base' });
    });
  }
  function sortRecent(list){
    return list.slice().sort(function(a,b){
      return toMs(b.dateAt || b.updatedAt || b.createdAt) - toMs(a.dateAt || a.updatedAt || a.createdAt);
    });
  }
  function getInterventionsForPistol(id){
    return sortRecent(state.interventions.filter(function(item){ return String(item.pistolId) === String(id); }));
  }
  function syncPistolsFromLocal(){
    state.pistols = sortByCode(readLocal(LOCAL_KEYS.pistols).map(normalizePistol));
  }
  function syncInterventionsFromLocal(){
    state.interventions = sortRecent(readLocal(LOCAL_KEYS.interventions).map(normalizeIntervention));
  }
  function persistCurrentToLocal(){
    writeLocal(LOCAL_KEYS.pistols, state.pistols.map(function(p){ return p.raw && Object.keys(p.raw).length ? ({ ...p.raw, idDoc: p.id }) : serializePistolForSave(p); }));
    writeLocal(LOCAL_KEYS.interventions, state.interventions.map(function(i){ return i.raw && Object.keys(i.raw).length ? ({ ...i.raw, idDoc: i.id }) : serializeInterventionForSave(i); }));
  }
  function serializePistolForSave(p){
    return {
      idDoc: p.id,
      codigo: p.code,
      num: p.code,
      serie: p.serial,
      modelo: p.model,
      nome: p.model,
      local: p.local,
      armazem: p.local,
      estado: p.estado.label,
      operador: p.operador,
      cn: p.cn,
      sn: p.sn,
      mac: p.mac,
      password: p.password,
      notas: p.notes,
      ultimaIntervencaoAt: p.ultimaIntervencaoAt || null,
      ultimaIntervencaoTexto: p.ultimaIntervencaoTexto || '',
      updatedAt: p.updatedAt || nowDate(),
      createdAt: p.createdAt || nowDate()
    };
  }
  function serializeInterventionForSave(i){
    return {
      idDoc: i.id,
      pistolaId: i.pistolId,
      pistolaCodigo: i.pistolCode,
      tipo: i.type,
      tecnico: i.technician,
      local: i.local,
      notas: i.notes,
      estadoApos: i.statusAfter.label,
      dataAt: i.dateAt,
      updatedAt: i.updatedAt || nowDate(),
      createdAt: i.createdAt || nowDate()
    };
  }

  function renderKpis(){
    const total = state.pistols.length;
    const counts = { available:0, maintenance:0, broken:0, reserved:0 };
    state.pistols.forEach(function(p){ counts[p.estado.key] = (counts[p.estado.key] || 0) + 1; });
    const interventions30 = state.interventions.filter(function(item){ return toMs(item.dateAt) >= thirtyDaysAgo(); }).length;
    $('ckKpiTotal').textContent = total;
    $('ckKpiDisponiveis').textContent = counts.available || 0;
    $('ckKpiManutencao').textContent = counts.maintenance || 0;
    $('ckKpiAvariadas').textContent = counts.broken || 0;
    $('ckKpiReservadas').textContent = counts.reserved || 0;
    $('ckKpiIntervencoes').textContent = interventions30;
  }

  function renderFilterOptions(){
    const select = $('ckFilterLocal');
    const current = select.value;
    const locations = Array.from(new Set(state.pistols.map(function(p){ return p.local; }).filter(Boolean))).sort(function(a,b){
      return a.localeCompare(b, 'pt', { sensitivity:'base' });
    });
    select.innerHTML = '<option value="">Todos os locais</option>' + locations.map(function(local){
      return `<option value="${esc(local)}">${esc(local)}</option>`;
    }).join('');
    select.value = locations.includes(current) ? current : '';
  }

  function applyFilters(resetPage){
    const query = norm($('ckSearch').value);
    const localFilter = norm($('ckFilterLocal').value);
    const stateFilter = norm($('ckFilterEstado').value);
    let list = state.pistols.slice();
    if(query){
      list = list.filter(function(p){
        return [p.code, p.serial, p.model, p.local, p.operador, p.estado.label, p.cn, p.sn, p.mac].some(function(value){
          return norm(value).includes(query);
        });
      });
    }
    if(localFilter){ list = list.filter(function(p){ return norm(p.local) === localFilter; }); }
    if(stateFilter){ list = list.filter(function(p){ return norm(p.estado.label) === stateFilter; }); }
    state.filtered = sortByCode(list);
    if(resetPage) state.page = 1;
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    if(state.page > totalPages) state.page = totalPages;
    renderTable();
  }

  function renderTable(){
    const tbody = $('ckTableBody');
    const total = state.filtered.length;
    const startIndex = total ? ((state.page - 1) * state.pageSize) : 0;
    const pageItems = state.filtered.slice(startIndex, startIndex + state.pageSize);

    if(!pageItems.length){
      tbody.innerHTML = '<tr><td colspan="6" class="ck-empty">Sem pistolas registadas com os filtros atuais.</td></tr>';
    }else{
      tbody.innerHTML = pageItems.map(function(p){
        const menuId = safeMenuId(p.id);
        const meta = p.estado;
        return `
          <tr>
            <td>
              <div class="ck-code-cell">
                <a href="javascript:void(0)" class="ck-code-link" onclick='window.CK65Page.openDetail(${JSON.stringify(String(p.id))})'>${esc(p.code)}</a>
                <span class="ck-code-sub">${esc(p.serial || 'Sem série')}</span>
              </div>
            </td>
            <td>${esc(p.model)}</td>
            <td>${esc(p.local)}</td>
            <td><span class="ck-state ${meta.key}">${meta.key === 'available' ? '✓' : meta.key === 'maintenance' ? '🛠' : meta.key === 'broken' ? '⚠' : '⏲'} ${esc(meta.label)}</span></td>
            <td>${esc(p.ultimaIntervencaoTexto || formatDateTime(p.ultimaIntervencaoAt))}</td>
            <td>
              <div class="ck-actions">
                <button class="ck-icon-btn" type="button" title="Ver" onclick='window.CK65Page.openDetail(${JSON.stringify(String(p.id))})'><span class="ck-eye-dot"></span></button>
                <button class="ck-icon-btn" type="button" title="Intervenção" onclick='window.CK65Page.openInterventionModal(${JSON.stringify(String(p.id))})'>⌁</button>
                <div>
                  <button class="ck-icon-btn" type="button" title="Mais" onclick='window.CK65Page.toggleMenu(event, ${JSON.stringify(String(p.id))})'>⋮</button>
                  <div class="ck-menu" id="${menuId}">
                    <button type="button" onclick='window.CK65Page.openPistolModal(${JSON.stringify(String(p.id))})'>Editar</button>
                    <button type="button" class="delete" onclick='window.CK65Page.deletePistol(${JSON.stringify(String(p.id))})'>Apagar</button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    const from = total ? startIndex + 1 : 0;
    const to = Math.min(total, startIndex + state.pageSize);
    $('ckTableSummary').textContent = `${from}-${to} de ${total}`;
    renderPagination(total);
  }

  function renderPagination(total){
    const wrap = $('ckPagination');
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    const buttons = [];
    buttons.push(`<button class="ck-page-btn" ${state.page <= 1 ? 'disabled' : ''} type="button" onclick="window.CK65Page.goPage(${state.page - 1})">«</button>`);
    for(let i=1;i<=totalPages;i++){
      if(totalPages > 7 && i !== 1 && i !== totalPages && Math.abs(i - state.page) > 1){
        if((i === 2 && state.page > 4) || (i === totalPages - 1 && state.page < totalPages - 3)) buttons.push('<span style="padding:0 4px;opacity:.7;">…</span>');
        continue;
      }
      buttons.push(`<button class="ck-page-btn ${i === state.page ? 'active' : ''}" type="button" onclick="window.CK65Page.goPage(${i})">${i}</button>`);
    }
    buttons.push(`<button class="ck-page-btn" ${state.page >= totalPages ? 'disabled' : ''} type="button" onclick="window.CK65Page.goPage(${state.page + 1})">»</button>`);
    wrap.innerHTML = buttons.join('');
  }

  function renderAlerts(){
    const wrap = $('ckAlertsList');
    const alerts = state.pistols.filter(function(p){ return p.estado.key === 'broken' || p.estado.key === 'maintenance'; })
      .sort(function(a,b){
        const severity = { broken:0, maintenance:1, reserved:2, available:3 };
        return severity[a.estado.key] - severity[b.estado.key] || String(a.code).localeCompare(String(b.code), 'pt', { numeric:true, sensitivity:'base' });
      })
      .slice(0, 5);

    if(!alerts.length){
      wrap.innerHTML = '<div class="ck-empty">Sem alertas críticos neste momento.</div>';
      return;
    }

    wrap.innerHTML = alerts.map(function(p){
      const crit = p.estado.key === 'broken';
      return `
        <div class="ck-alert ${crit ? 'crit' : ''}">
          <span class="ck-alert-dot"></span>
          <div>
            <div class="ck-alert-title">${esc(p.code)} — ${esc(p.estado.label)}</div>
            <span class="ck-alert-sub">${esc(p.local)}</span>
          </div>
          <small>${crit ? 'Crítico' : 'Atenção'}</small>
        </div>
      `;
    }).join('');
  }

  function renderSummaryBars(){
    const wrap = $('ckSummaryBars');
    const total = state.pistols.length;
    const entries = [
      { key:'available', label:'Disponíveis' },
      { key:'maintenance', label:'Em manutenção' },
      { key:'broken', label:'Avariadas' },
      { key:'reserved', label:'Reservadas' }
    ];
    const counts = { available:0, maintenance:0, broken:0, reserved:0 };
    state.pistols.forEach(function(p){ counts[p.estado.key] = (counts[p.estado.key] || 0) + 1; });
    wrap.innerHTML = entries.map(function(entry){
      const value = counts[entry.key] || 0;
      const pct = total ? ((value / total) * 100) : 0;
      return `
        <div class="ck-bar">
          <span>${entry.label}</span>
          <span class="ck-bar-line"><span class="ck-bar-fill ${entry.key}" style="width:${pct.toFixed(1)}%"></span></span>
          <strong>${value}</strong>
          <small>${formatPct(value, total)}</small>
        </div>
      `;
    }).join('');
  }

  function renderRecentInterventions(){
    const wrap = $('ckRecentInterventions');
    const recent = sortRecent(state.interventions).slice(0,4);
    if(!recent.length){
      wrap.innerHTML = '<div class="ck-empty">Sem intervenções registadas.</div>';
      return;
    }
    wrap.innerHTML = recent.map(function(item){
      const severity = item.statusAfter.key === 'broken' ? 'bad' : (item.statusAfter.key === 'maintenance' ? 'warn' : '');
      return `
        <div class="ck-mini-row">
          <span class="ck-mini-dot ${severity}"></span>
          <div>
            <div class="ck-mini-title">${esc(formatDateTime(item.dateAt, true))} &nbsp; ${esc(item.pistolCode || 'CK65')}</div>
            <div class="ck-mini-sub">${esc(item.type)}${item.technician ? ' — ' + esc(item.technician) : ''}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderAll(){
    renderKpis();
    renderFilterOptions();
    applyFilters(false);
    renderAlerts();
    renderSummaryBars();
    renderRecentInterventions();
    fillInterventionPistolOptions();
  }

  function openModal(el){ if(el){ el.style.display = 'flex'; } }
  function closeModal(el){ if(el){ el.style.display = 'none'; } }

  function clearPistolForm(){
    $('ckFormCodigo').value = '';
    $('ckFormSerie').value = '';
    $('ckFormModelo').value = 'CK65';
    $('ckFormLocal').value = '';
    $('ckFormEstado').value = 'Disponível';
    $('ckFormOperador').value = '';
    $('ckFormCn').value = '';
    $('ckFormSn').value = '';
    $('ckFormMac').value = '';
    $('ckFormPassword').value = '';
    $('ckFormNotas').value = '';
  }

  function getPistolById(id){
    return state.pistols.find(function(item){ return String(item.id) === String(id); }) || null;
  }

  function openPistolModal(id){
    closeAllMenus();
    state.currentEditId = id || null;
    if(id){
      const item = getPistolById(id);
      if(!item){ notify('Pistola não encontrada.', 'erro'); return; }
      $('ckModalPistolaTitle').textContent = 'Editar pistola CK65';
      $('ckModalPistolaSubtitle').textContent = 'Atualize os dados da pistola selecionada.';
      $('ckFormCodigo').value = item.code;
      $('ckFormSerie').value = item.serial;
      $('ckFormModelo').value = item.model;
      $('ckFormLocal').value = item.local;
      $('ckFormEstado').value = item.estado.label;
      $('ckFormOperador').value = item.operador;
      $('ckFormCn').value = item.cn;
      $('ckFormSn').value = item.sn;
      $('ckFormMac').value = item.mac;
      $('ckFormPassword').value = item.password;
      $('ckFormNotas').value = item.notes;
    } else {
      $('ckModalPistolaTitle').textContent = 'Nova pistola CK65';
      $('ckModalPistolaSubtitle').textContent = 'Preencha os dados da pistola.';
      clearPistolForm();
      $('ckFormCodigo').value = `CK65-${String(state.pistols.length + 1).padStart(3,'0')}`;
    }
    openModal($('ckModalPistola'));
  }

  function closePistolModal(){ closeModal($('ckModalPistola')); state.currentEditId = null; }
  function closeDetailModal(){ closeModal($('ckModalDetalhe')); state.currentDetailId = null; }
  function closeInterventionModal(){ closeModal($('ckModalIntervencao')); state.currentInterventionId = null; }

  async function savePistol(){
    const payload = {
      codigo: $('ckFormCodigo').value.trim(),
      num: $('ckFormCodigo').value.trim(),
      serie: $('ckFormSerie').value.trim(),
      modelo: $('ckFormModelo').value.trim() || 'CK65',
      nome: $('ckFormModelo').value.trim() || 'CK65',
      local: $('ckFormLocal').value.trim() || 'Sem local',
      armazem: $('ckFormLocal').value.trim() || 'Sem local',
      estado: $('ckFormEstado').value,
      operador: $('ckFormOperador').value.trim(),
      cn: $('ckFormCn').value.trim(),
      sn: $('ckFormSn').value.trim(),
      mac: $('ckFormMac').value.trim(),
      password: $('ckFormPassword').value.trim(),
      notas: $('ckFormNotas').value.trim(),
      updatedAt: nowDate()
    };
    if(!payload.codigo){ payload.codigo = `CK65-${String(state.pistols.length + 1).padStart(3,'0')}`; payload.num = payload.codigo; }
    if(!payload.serie && !payload.codigo){ notify('Preenche pelo menos o código ou o número de série.', 'erro'); return; }

    const db = getDb();
    try{
      if(state.currentEditId){
        const current = getPistolById(state.currentEditId);
        payload.createdAt = current?.createdAt || nowDate();
        payload.ultimaIntervencaoAt = current?.ultimaIntervencaoAt || null;
        payload.ultimaIntervencaoTexto = current?.ultimaIntervencaoTexto || '';
        if(db && db.collection && !String(state.currentEditId).startsWith('local-ck65-')){
          await db.collection(COLLECTIONS.pistols).doc(String(state.currentEditId)).set(payload, { merge:true });
        } else {
          const idx = state.pistols.findIndex(function(item){ return String(item.id) === String(state.currentEditId); });
          if(idx >= 0){
            state.pistols[idx] = normalizePistol({ ...serializePistolForSave(state.pistols[idx]), ...payload, idDoc: state.currentEditId }, idx);
            persistCurrentToLocal();
            renderAll();
          }
        }
        try{ window.AppBragaSystems?.criarMovimento?.('Editar CK65', { area:'CK65', titulo:`Pistola atualizada — ${payload.codigo}`, equipamento:payload.codigo, localizacao:payload.local, estado:payload.estado }); }catch(e){}
        notify('Pistola atualizada com sucesso.');
      } else {
        payload.createdAt = nowDate();
        payload.ultimaIntervencaoAt = null;
        payload.ultimaIntervencaoTexto = '';
        if(db && db.collection){
          await db.collection(COLLECTIONS.pistols).add(payload);
        } else {
          const localId = `local-ck65-${Date.now()}`;
          state.pistols.unshift(normalizePistol({ ...payload, idDoc: localId }, 0));
          persistCurrentToLocal();
          renderAll();
        }
        try{ window.AppBragaSystems?.criarMovimento?.('Nova CK65', { area:'CK65', titulo:`Nova pistola — ${payload.codigo}`, equipamento:payload.codigo, localizacao:payload.local, estado:payload.estado }); }catch(e){}
        notify('Pistola criada com sucesso.');
      }
      closePistolModal();
    } catch(error){
      console.error('Erro ao guardar pistola CK65:', error);
      notify('Erro ao guardar a pistola CK65.', 'erro');
    }
  }

  async function deletePistol(id){
    closeAllMenus();
    const item = getPistolById(id);
    if(!item) return;
    if(!confirm(`Apagar ${item.code}?`)) return;
    const db = getDb();
    try{
      if(db && db.collection && !String(id).startsWith('local-ck65-')){
        await db.collection(COLLECTIONS.pistols).doc(String(id)).delete();
      } else {
        state.pistols = state.pistols.filter(function(p){ return String(p.id) !== String(id); });
        state.interventions = state.interventions.filter(function(i){ return String(i.pistolId) !== String(id); });
        persistCurrentToLocal();
        renderAll();
      }
      try{ window.AppBragaSystems?.criarMovimento?.('Apagar CK65', { area:'CK65', titulo:`Pistola removida — ${item.code}`, equipamento:item.code, localizacao:item.local, estado:item.estado.label }); }catch(e){}
      notify('Pistola apagada.');
    } catch(error){
      console.error('Erro ao apagar pistola CK65:', error);
      notify('Erro ao apagar a pistola.', 'erro');
    }
  }

  function fillInterventionPistolOptions(selectedId){
    const select = $('ckIntervPistola');
    const list = sortByCode(state.pistols);
    select.innerHTML = list.map(function(item){
      return `<option value="${esc(item.id)}">${esc(item.code)} — ${esc(item.local)}</option>`;
    }).join('');
    if(selectedId){ select.value = String(selectedId); }
  }

  function openInterventionModal(pistolId){
    state.currentInterventionId = pistolId || null;
    fillInterventionPistolOptions(pistolId || state.currentDetailId || (state.pistols[0] && state.pistols[0].id));
    const pistol = getPistolById($('ckIntervPistola').value);
    $('ckIntervTipo').value = 'Diagnóstico';
    $('ckIntervTecnico').value = '';
    $('ckIntervData').value = formatInputDateTime(nowDate());
    $('ckIntervEstado').value = pistol ? pistol.estado.label : 'Disponível';
    $('ckIntervLocal').value = pistol ? pistol.local : '';
    $('ckIntervNotas').value = '';
    openModal($('ckModalIntervencao'));
  }

  async function saveIntervention(){
    const pistolId = $('ckIntervPistola').value;
    const pistol = getPistolById(pistolId);
    if(!pistol){ notify('Seleciona uma pistola.', 'erro'); return; }
    const whenRaw = $('ckIntervData').value;
    const when = whenRaw ? new Date(whenRaw) : nowDate();
    const status = $('ckIntervEstado').value;
    const local = $('ckIntervLocal').value.trim() || pistol.local;
    const payload = {
      pistolaId: pistol.id,
      pistolaCodigo: pistol.code,
      tipo: $('ckIntervTipo').value,
      tecnico: $('ckIntervTecnico').value.trim(),
      local,
      notas: $('ckIntervNotas').value.trim(),
      estadoApos: status,
      dataAt: when,
      createdAt: when,
      updatedAt: nowDate()
    };
    const updatePistol = {
      estado: status,
      local,
      armazem: local,
      ultimaIntervencaoAt: when,
      ultimaIntervencaoTexto: formatDateTime(when),
      updatedAt: nowDate()
    };
    const db = getDb();
    try{
      if(db && db.collection){
        await db.collection(COLLECTIONS.interventions).add(payload);
        if(!String(pistol.id).startsWith('local-ck65-')){
          await db.collection(COLLECTIONS.pistols).doc(String(pistol.id)).set(updatePistol, { merge:true });
        }
      } else {
        state.interventions.unshift(normalizeIntervention({ ...payload, idDoc:`local-ck65-int-${Date.now()}` }, 0));
        const idx = state.pistols.findIndex(function(item){ return String(item.id) === String(pistol.id); });
        if(idx >= 0){
          state.pistols[idx] = normalizePistol({ ...serializePistolForSave(state.pistols[idx]), ...updatePistol, idDoc: pistol.id }, idx);
        }
        persistCurrentToLocal();
        renderAll();
      }
      try{
        window.AppBragaSystems?.criarMovimento?.('Intervenção CK65', {
          area:'CK65',
          titulo:`${payload.tipo} — ${payload.pistolaCodigo}`,
          descricao:payload.notas,
          equipamento:payload.pistolaCodigo,
          localizacao:payload.local,
          estado:payload.estadoApos
        });
        if(statusMeta(status).key === 'broken' || statusMeta(status).key === 'maintenance'){
          window.AppBragaSystems?.criarNotificacao?.('CK65 requer atenção', `${payload.pistolaCodigo} ficou em estado ${status}.`, {
            area:'CK65',
            tipo:'ck65',
            equipamento:payload.pistolaCodigo,
            localizacao:payload.local,
            prioridade: statusMeta(status).key === 'broken' ? 'alta' : 'normal'
          });
        }
      }catch(e){}
      closeInterventionModal();
      notify('Intervenção registada com sucesso.');
    } catch(error){
      console.error('Erro ao registar intervenção CK65:', error);
      notify('Erro ao registar a intervenção.', 'erro');
    }
  }

  function openDetail(id){
    const pistol = getPistolById(id);
    if(!pistol){ notify('Pistola não encontrada.', 'erro'); return; }
    state.currentDetailId = id;
    $('ckDetailTitle').textContent = `${pistol.code} — ${pistol.model}`;
    $('ckDetailGrid').innerHTML = [
      ['Código', pistol.code],
      ['N.º Série', pistol.serial || 'Sem série'],
      ['Modelo', pistol.model],
      ['Estado', pistol.estado.label],
      ['Local', pistol.local],
      ['Operador', pistol.operador || '—'],
      ['CN', pistol.cn || '—'],
      ['SN', pistol.sn || '—'],
      ['MAC', pistol.mac || '—'],
      ['Password', pistol.password || '—'],
      ['Última intervenção', pistol.ultimaIntervencaoTexto || formatDateTime(pistol.ultimaIntervencaoAt)],
      ['Notas', pistol.notes || 'Sem observações']
    ].map(function(entry){
      return `<div class="ck-detail-item"><span>${esc(entry[0])}</span><strong>${esc(entry[1])}</strong></div>`;
    }).join('');

    const history = getInterventionsForPistol(id).slice(0, 6);
    $('ckDetailInterventions').innerHTML = history.length ? history.map(function(item){
      return `<div class="ck-modal-list-item"><div class="title">${esc(item.type)} — ${esc(formatDateTime(item.dateAt, true))}</div><div class="sub">${esc(item.technician || 'Sem técnico')} · ${esc(item.local || pistol.local)}${item.notes ? ' · ' + esc(item.notes) : ''}</div></div>`;
    }).join('') : '<div class="ck-empty">Sem intervenções registadas para esta pistola.</div>';

    $('ckDetailEditBtn').onclick = function(){ closeDetailModal(); openPistolModal(id); };
    $('ckDetailInterventionBtn').onclick = function(){ closeDetailModal(); openInterventionModal(id); };
    openModal($('ckModalDetalhe'));
  }

  function exportReport(){
    const list = state.filtered.length ? state.filtered : state.pistols;
    if(!list.length){ notify('Não existem dados para exportar.', 'erro'); return; }
    const lines = [
      ['Código','Série','Modelo','Local','Estado','Última intervenção','Operador','CN','SN','MAC','Notas'].join(';')
    ];
    list.forEach(function(item){
      lines.push([
        item.code,
        item.serial,
        item.model,
        item.local,
        item.estado.label,
        item.ultimaIntervencaoTexto || formatDateTime(item.ultimaIntervencaoAt, true),
        item.operador,
        item.cn,
        item.sn,
        item.mac,
        item.notes
      ].map(function(v){ return `"${String(v ?? '').replace(/"/g, '""')}"`; }).join(';'));
    });
    const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-ck65-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function showAlertsRedirect(){ window.location.href = 'notificacoes.html'; }
  function showInterventionsRedirect(){ window.location.href = 'historico.html'; }

  function closeAllMenus(){
    document.querySelectorAll('.ck-menu.open').forEach(function(el){ el.classList.remove('open'); });
    state.menuId = null;
  }
  function toggleMenu(ev, id){
    ev.stopPropagation();
    const menu = $(safeMenuId(id));
    if(!menu) return;
    const isOpen = menu.classList.contains('open');
    closeAllMenus();
    if(!isOpen){ menu.classList.add('open'); state.menuId = id; }
  }

  function goPage(page){ state.page = Math.max(1, page || 1); renderTable(); }

  function bindEvents(){
    $('ckSearch').addEventListener('input', function(){ applyFilters(true); });
    $('ckFilterLocal').addEventListener('change', function(){ applyFilters(true); });
    $('ckFilterEstado').addEventListener('change', function(){ applyFilters(true); });
    $('ckBtnLimpar').addEventListener('click', function(){
      $('ckSearch').value = '';
      $('ckFilterLocal').value = '';
      $('ckFilterEstado').value = '';
      applyFilters(true);
    });
    $('ckPageSize').addEventListener('change', function(){ state.pageSize = Number(this.value || 10); state.page = 1; renderTable(); });
    $('ckBtnNova').addEventListener('click', function(){ openPistolModal(); });
    $('ckBtnIntervencao').addEventListener('click', function(){ openInterventionModal(); });
    $('ckBtnRelatorio').addEventListener('click', exportReport);
    $('ckBtnVerAlertas').addEventListener('click', showAlertsRedirect);
    $('ckBtnVerIntervencoes').addEventListener('click', showInterventionsRedirect);
    $('ckSavePistolBtn').addEventListener('click', savePistol);
    $('ckSaveInterventionBtn').addEventListener('click', saveIntervention);
    $('ckIntervPistola').addEventListener('change', function(){
      const pistol = getPistolById(this.value);
      if(pistol){
        $('ckIntervEstado').value = pistol.estado.label;
        $('ckIntervLocal').value = pistol.local;
      }
    });
    document.addEventListener('click', function(){ closeAllMenus(); });
    ['ckModalPistola','ckModalDetalhe','ckModalIntervencao'].forEach(function(id){
      const modal = $(id);
      if(!modal) return;
      modal.addEventListener('click', function(ev){ if(ev.target === modal) closeModal(modal); });
    });
  }

  function loadFromFirebase(){
    const db = getDb();
    if(!db || !db.collection){
      syncPistolsFromLocal();
      syncInterventionsFromLocal();
      renderAll();
      return;
    }

    try{
      const unsubPistols = db.collection(COLLECTIONS.pistols).onSnapshot(function(snapshot){
        state.pistols = sortByCode(snapshot.docs.map(function(doc, index){ return normalizePistol({ idDoc: doc.id, firebaseId: doc.id, ...doc.data() }, index); }));
        writeLocal(LOCAL_KEYS.pistols, snapshot.docs.map(function(doc){ return { idDoc: doc.id, firebaseId: doc.id, ...doc.data() }; }));
        renderAll();
      }, function(error){
        console.warn('CK65 pistols snapshot fallback', error);
        syncPistolsFromLocal();
        renderAll();
      });
      state.unsubscribers.push(unsubPistols);
    } catch(error){
      console.warn('CK65 pistols listener error', error);
      syncPistolsFromLocal();
    }

    try{
      const unsubInts = db.collection(COLLECTIONS.interventions).onSnapshot(function(snapshot){
        state.interventions = sortRecent(snapshot.docs.map(function(doc, index){ return normalizeIntervention({ idDoc: doc.id, firebaseId: doc.id, ...doc.data() }, index); }));
        writeLocal(LOCAL_KEYS.interventions, snapshot.docs.map(function(doc){ return { idDoc: doc.id, firebaseId: doc.id, ...doc.data() }; }));
        renderAll();
      }, function(error){
        console.warn('CK65 interventions snapshot fallback', error);
        syncInterventionsFromLocal();
        renderAll();
      });
      state.unsubscribers.push(unsubInts);
    } catch(error){
      console.warn('CK65 interventions listener error', error);
      syncInterventionsFromLocal();
    }
  }


  function forceScrollUnlock(){
    try{
      document.documentElement.style.height = 'auto';
      document.documentElement.style.minHeight = '100%';
      document.documentElement.style.overflowY = 'auto';
      document.body.style.height = 'auto';
      document.body.style.minHeight = '100vh';
      document.body.style.overflowY = 'auto';
      document.body.style.overflowX = 'hidden';
      document.body.classList.add('ck-scroll-ready');
    }catch(e){}
  }

  function init(){
    forceScrollUnlock();
    if(!$('ckTableBody')) return;
    window.CK65Page = {
      version: VERSION,
      openPistolModal,
      closePistolModal,
      openDetail,
      closeDetailModal,
      openInterventionModal,
      closeInterventionModal,
      deletePistol,
      toggleMenu,
      goPage
    };
    bindEvents();
    syncPistolsFromLocal();
    syncInterventionsFromLocal();
    renderAll();
    loadFromFirebase();
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('pageshow', forceScrollUnlock);
  setTimeout(forceScrollUnlock, 500);
  setTimeout(forceScrollUnlock, 1500);
})();
