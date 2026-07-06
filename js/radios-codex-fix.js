(() => {
  'use strict';

  const VERSION = '1.58.165';
  const COLLECTION = 'radios';
  const RECORDS_COLLECTION = 'radiosIntervencoes';
  const LEGACY_RECORDS_COLLECTION = 'radioHistory';
  const WEEKLY_COLLECTION = 'radiosRegistosSemanais';
  const LOCAL_WEEKLY_KEY = 'appbraga_radios_weekly_fallback_v15889';
  const LEGACY_WEEKLY_COLLECTIONS = ['radioWeeklyRecords','radiosWeeklyRecords','radiosWeekly','radioWeekly','weeklyRadios','registosSemanaisRadios','radioRegistosSemanais'];
  const LEGACY_WEEKLY_LOCAL_KEYS = ['appbraga_radios_weekly_fallback_v15888','radioWeeklyRecords','appbraga_radio_weekly_records'];
  const LOCAL_RADIOS_KEY = 'appbraga_radios_fallback_v15888';
  const LOCAL_RECORDS_KEY = 'appbraga_radios_records_fallback_v15888';

  const state = {
    radios: [],
    records: [],
    weekly: [],
    weeklyPrimary: [],
    weeklyLegacy: [],
    weeklyLegacyUnsubs: [],
    weeklyEditingId: null,
    weeklyRows: [],
    page: 1,
    pageSize: 10,
    selectedId: '',
    editingId: null,
    unsubscribeRadios: null,
    unsubscribeRecords: null,
    unsubscribeLegacyRecords: null,
    unsubscribeWeekly: null,
    legacyRecords: [],
    recordMode: 'Intervenção'
  };

  const $ = (id) => document.getElementById(id);
  const text = (value) => String(value ?? '').trim();
  const lower = (value) => text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const uid = () => `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function toast(message, type = 'ok') {
    if (typeof window.mostrarMensagem === 'function') {
      try { window.mostrarMensagem(message, type === 'error' ? 'erro' : 'sucesso'); return; } catch (_) {}
    }
    let node = document.querySelector('.rd-toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'rd-toast';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.className = `rd-toast ${type}`;
    requestAnimationFrame(() => node.classList.add('show'));
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function db() {
    return window.db && typeof window.db.collection === 'function' ? window.db : null;
  }

  function loadLocal(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch (_) { return fallback; }
  }

  function saveLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function sampleRadios() {
    return [
      ['RAD-001','4532107893','Motorola XT420','Braga','Disponível','',''],
      ['RAD-002','4532107894','Kenwood TK-3501','Vila Real','Em uso','Ricardo',''],
      ['RAD-003','4532107895','Hytera PD405','Armazém','Em carga','',''],
      ['RAD-004','4532107896','Motorola XT420','Loja','Disponível','',''],
      ['RAD-005','4532107897','Kenwood TK-3501','Oficina','Avariada','','Falha no botão PTT'],
      ['RAD-006','4532107898','Hytera PD405','Braga','Em uso','Equipa Loja',''],
      ['RAD-007','4532107899','Motorola XT420','Vila Real','Disponível','',''],
      ['RAD-008','4532107900','Kenwood TK-3501','Armazém','Em carga','',''],
      ['RAD-009','4532107901','Hytera PD405','Loja','Em uso','Armazém',''],
      ['RAD-010','4532107902','Motorola XT420','Oficina','Disponível','','']
    ].map(([codigo, serie, modelo, local, estado, user, notas], index) => ({
      id: `sample-${index + 1}`,
      codigo,
      nome: codigo,
      serial: serie,
      numeroSerie: serie,
      modelo,
      local,
      estado,
      userNome: user,
      user,
      notas,
      createdAt: Date.now() - (index + 1) * 8640000,
      updatedAt: Date.now() - (index + 1) * 3600000
    }));
  }

  function normalizeEstado(value, radio = {}) {
    const raw = lower(value || radio.estado || radio.status || '');
    const assigned = !!(radio.userNome || radio.user || radio.utilizador || radio.operadorAtual || radio.assignedTo);
    if (raw.includes('avari')) return 'Avariada';
    if (raw.includes('carga') || raw.includes('charging')) return 'Em carga';
    if (raw.includes('manut') || raw.includes('repar')) return 'Em manutenção';
    if (raw.includes('uso') || raw.includes('utiliza') || raw.includes('atrib') || assigned) return 'Em uso';
    return 'Disponível';
  }

  function estadoKey(value) {
    const raw = lower(value);
    if (raw.includes('avari')) return 'avariada';
    if (raw.includes('carga')) return 'carga';
    if (raw.includes('manut')) return 'manutencao';
    if (raw.includes('uso') || raw.includes('utiliza') || raw.includes('atrib')) return 'uso';
    return 'disponivel';
  }

  function estadoClass(value) {
    const key = estadoKey(value);
    return key === 'uso' ? 'uso' : key === 'carga' ? 'carga' : key === 'avariada' ? 'avariada' : key === 'manutencao' ? 'manutencao' : 'disponivel';
  }

  function estadoIcon(value) {
    const key = estadoKey(value);
    return key === 'uso' ? '👤' : key === 'carga' ? '⚡' : key === 'avariada' ? '!' : key === 'manutencao' ? '🛠' : '✓';
  }

  function radioCode(radio) {
    return radio.codigo || radio.nome || radio.idInterno || radio.ref || radio.id || 'RAD';
  }

  function radioSerial(radio) {
    return radio.serial || radio.numeroSerie || radio.sn || radio.serie || radio.mac || '-';
  }

  function radioModel(radio) {
    return radio.modelo || radio.model || radio.nomeModelo || 'Rádio';
  }

  function radioLocal(radio) {
    return radio.local || radio.localizacao || radio.location || 'Sem local';
  }

  function radioUser(radio) {
    return radio.userNome || radio.user || radio.utilizador || radio.operadorAtual || radio.assignedTo || '';
  }

  function formatDate(value) {
    if (!value) return '—';
    let date = null;
    if (typeof value === 'object' && typeof value.toDate === 'function') date = value.toDate();
    else if (typeof value === 'number') date = new Date(value);
    else if (typeof value === 'string') date = new Date(value);
    if (!date || Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('pt-PT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  }

  function isoLocalNow() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }



  function isoDate(date = new Date()) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function currentWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day + 1);
    return isoDate(d);
  }

  function weekLabel(value) {
    if (!value) return '—';
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const startLabel = d.toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit' });
    const endLabel = end.toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit', year:'numeric' });
    return `${startLabel} a ${endLabel}`;
  }


  function dateToMs(value) {
    if (!value) return 0;
    if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  function isoWeekStartFromKey(value) {
    const m = String(value || '').match(/^(\d{4})-?W(\d{1,2})$/i);
    if (!m) return '';
    const year = Number(m[1]);
    const week = Number(m[2]);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
    return monday.toISOString().slice(0, 10);
  }

  function recordWeekStart(record = {}) {
    if (record.semana) return String(record.semana).slice(0, 10);
    if (record.weekStart) return String(record.weekStart).slice(0, 10);
    if (record.startDate) return String(record.startDate).slice(0, 10);
    if (record.dataSemana) return String(record.dataSemana).slice(0, 10);
    if (record.weekKey) return isoWeekStartFromKey(record.weekKey) || String(record.weekKey);
    const ms = dateToMs(record.startAt || record.weekAt || record.data || record.createdAt || record.updatedAt);
    return ms ? currentWeekStart(new Date(ms)) : currentWeekStart();
  }

  function normalizeWeeklyAssignment(item = {}, index = 0) {
    const radioId = item.radioId || item.radioDocId || item.idRadio || item.id || item.codigo || `legacy-${index}`;
    const codigo = item.codigo || item.radioCodigo || item.radioNome || item.nomeRadio || item.nome || `Rádio ${index + 1}`;
    const serial = item.serial || item.radioSerial || item.numeroSerie || item.sn || item.serie || '';
    const user1 = item.user1Nome || item.userNome || item.user || item.utilizador || '';
    const user2 = item.user2Nome || '';
    const local = item.local || item.localizacao || item.piso || item.zone || item.zona || '';
    const estado = item.estado || item.status || (user1 || user2 ? 'Em uso' : 'Disponível');
    return {
      radioId: String(radioId),
      codigo,
      serial,
      modelo: item.modelo || item.model || item.radioModelo || 'Rádio',
      local,
      estado: normalizeEstado(estado, item),
      bateria: item.bateria || item.battery || 'OK',
      presente: item.presente !== false && item.presenca !== false,
      ok: item.ok !== false && !lower(item.estado || '').includes('avari'),
      notas: item.notas || item.obs || item.observacoes || [user1 && `User 1: ${user1}`, user2 && `User 2: ${user2}`, item.piso && `Piso: ${item.piso}`].filter(Boolean).join(' | '),
      user1Id: item.user1Id || item.userId || '',
      user1Nome: user1,
      user2Id: item.user2Id || '',
      user2Nome: user2,
      piso: item.piso || ''
    };
  }

  function normalizeWeeklyRecord(raw = {}, id = '', source = WEEKLY_COLLECTION) {
    const semana = recordWeekStart(raw);
    const sourceRows = Array.isArray(raw.radios) ? raw.radios : Array.isArray(raw.assignments) ? raw.assignments : Array.isArray(raw.items) ? raw.items : Array.isArray(raw.registos) ? raw.registos : [];
    const rows = sourceRows.map(normalizeWeeklyAssignment);
    const savedAt = dateToMs(raw.savedAt || raw.updatedAt || raw.createdAt || raw.startAt || raw.data) || Date.now();
    const total = Number(raw.total ?? rows.length ?? 0);
    const ok = Number(raw.ok ?? rows.filter((row) => row.ok && row.presente !== false && !['Avariada','Em manutenção'].includes(normalizeEstado(row.estado))).length);
    const alertas = Number(raw.alertas ?? Math.max(0, total - ok));
    return {
      ...raw,
      id: id || raw.id || raw.recordId || semana,
      _sourceCollection: source,
      _legacy: source !== WEEKLY_COLLECTION || Array.isArray(raw.assignments),
      semana,
      weekKey: raw.weekKey || raw.week || '',
      label: raw.label || raw.titulo || '',
      responsavel: raw.responsavel || raw.tecnico || raw.userNome || raw.user || raw.criadoPor || '',
      observacoes: raw.observacoes || raw.obs || '',
      radios: rows,
      total,
      ok,
      alertas,
      savedAt,
      updatedAt: dateToMs(raw.updatedAt) || savedAt,
      createdAt: dateToMs(raw.createdAt) || savedAt
    };
  }

  function mergeWeeklyRecords() {
    const map = new Map();
    [...(state.weeklyLegacy || []), ...(state.weeklyPrimary || [])].forEach((item) => {
      const key = item._legacy
        ? `${item._sourceCollection || 'legacy'}:${item.id || item.recordId || item.weekKey || item.semana || Math.random()}`
        : String(item.semana || item.weekKey || item.id || '');
      if (!key) return;
      const current = map.get(key);
      if (!current || Number(item.savedAt || 0) > Number(current.savedAt || 0)) {
        map.set(key, item);
      }
    });
    state.weekly = [...map.values()].sort((a, b) => String(b.semana || '').localeCompare(String(a.semana || '')) || Number(b.savedAt || 0) - Number(a.savedAt || 0));
  }

  function weeklyRowFromRadio(radio, existing = null) {
    return {
      radioId: String(radio.id),
      codigo: radioCode(radio),
      serial: radioSerial(radio),
      modelo: radioModel(radio),
      local: existing?.local ?? radioLocal(radio),
      estado: existing?.estado ?? normalizeEstado(radio.estado, radio),
      bateria: existing?.bateria ?? 'OK',
      presente: existing?.presente ?? true,
      ok: existing?.ok ?? true,
      notas: existing?.notas ?? ''
    };
  }

  function weeklyCounts(reg) {
    const rows = Array.isArray(reg?.radios) ? reg.radios : [];
    const total = Number(reg?.total ?? rows.length ?? 0);
    const ok = Number(reg?.ok ?? rows.filter((row) => row.ok && row.presente !== false && !['Avariada','Em manutenção'].includes(normalizeEstado(row.estado))).length);
    const alertas = Number(reg?.alertas ?? rows.filter((row) => !row.ok || row.presente === false || ['Avariada','Em manutenção'].includes(normalizeEstado(row.estado))).length);
    return { total, ok, alertas };
  }

  function latestWeekly() {
    return [...state.weekly].sort((a, b) => String(b.semana || '').localeCompare(String(a.semana || '')) || Number(b.savedAt || 0) - Number(a.savedAt || 0))[0] || null;
  }

  function getRadioRecords(radioId) {
    const all = [...state.records, ...state.legacyRecords];
    return all.filter((record) => String(record.radioId || record.radioDocId || '') === String(radioId))
      .sort((a, b) => Number(b.createdAt || b.dataMs || 0) - Number(a.createdAt || a.dataMs || 0));
  }

  function lastRecordLabel(radio) {
    const records = getRadioRecords(radio.id);
    if (records.length) return formatDate(records[0].createdAt || records[0].dataMs || records[0].createdAtLabel);
    return formatDate(radio.updatedAt || radio.atribuidoAt || radio.devolvidoAt || radio.createdAt);
  }

  function filteredRadios() {
    const q = lower($('rdSearch')?.value || '');
    const local = lower($('rdFilterLocal')?.value || '');
    const estado = $('rdFilterEstado')?.value || '';
    return state.radios.filter((radio) => {
      const haystack = lower([radioCode(radio), radioSerial(radio), radioModel(radio), radioLocal(radio), radioUser(radio), radio.mac, radio.rf, radio.canal, radio.notas].join(' '));
      const matchQ = !q || haystack.includes(q);
      const matchLocal = !local || lower(radioLocal(radio)) === local;
      const matchEstado = !estado || estadoKey(normalizeEstado(radio.estado, radio)) === estado;
      return matchQ && matchLocal && matchEstado;
    }).sort((a, b) => String(radioCode(a)).localeCompare(String(radioCode(b)), 'pt', { numeric: true, sensitivity: 'base' }));
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = String(value);
  }

  function stats() {
    const total = state.radios.length;
    const counts = { disponivel:0, uso:0, carga:0, avariada:0, manutencao:0 };
    state.radios.forEach((radio) => { counts[estadoKey(normalizeEstado(radio.estado, radio))] += 1; });
    const since = Date.now() - 30 * 86400000;
    const recentRecords = state.records.filter((record) => Number(record.createdAt || 0) >= since).length;
    return { total, ...counts, recentRecords };
  }

  function renderKpis() {
    const s = stats();
    setText('rdKpiTotal', s.total);
    setText('rdKpiDisponiveis', s.disponivel);
    setText('rdKpiUso', s.uso);
    setText('rdKpiAvariadas', s.avariada);
    setText('rdKpiCarga', s.carga);
    setText('rdKpiIntervencoes', s.recentRecords || state.records.length);
  }

  function renderFilters() {
    const select = $('rdFilterLocal');
    if (!select) return;
    const current = select.value;
    const locals = [...new Set(state.radios.map(radioLocal).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
    select.innerHTML = '<option value="">Todos os locais</option>' + locals.map((local) => `<option value="${esc(local)}">${esc(local)}</option>`).join('');
    if (locals.includes(current)) select.value = current;
  }

  function renderTable() {
    const body = $('rdTableBody');
    if (!body) return;
    const list = filteredRadios();
    const total = list.length;
    const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), maxPage);
    const start = (state.page - 1) * state.pageSize;
    const pageItems = list.slice(start, start + state.pageSize);

    body.innerHTML = pageItems.length ? pageItems.map((radio) => {
      const estado = normalizeEstado(radio.estado, radio);
      return `<tr data-radio-id="${esc(radio.id)}">
        <td><div class="rd-id"><strong>${esc(radioCode(radio))}</strong><small>SN: ${esc(radioSerial(radio))}</small></div></td>
        <td><strong>${esc(radioModel(radio))}</strong></td>
        <td><strong>${esc(radioLocal(radio))}</strong></td>
        <td><span class="rd-state ${estadoClass(estado)}"><span>${estadoIcon(estado)}</span>${esc(estado)}</span></td>
        <td>${esc(lastRecordLabel(radio))}</td>
        <td>
          <button class="rd-action-btn" type="button" title="Ver" data-action="view" data-id="${esc(radio.id)}">⊙</button>
          <button class="rd-action-btn" type="button" title="Editar" data-action="edit" data-id="${esc(radio.id)}">✎</button>
          <span class="rd-menu"><button class="rd-action-btn" type="button" title="Mais" data-action="menu">⋮</button><span class="rd-menu-pop">
            <button type="button" data-action="use" data-id="${esc(radio.id)}">Registar utilização</button>
            <button type="button" data-action="return" data-id="${esc(radio.id)}">Registar devolução</button>
            <button type="button" data-action="record" data-id="${esc(radio.id)}">Registar intervenção</button>
            <button type="button" data-action="delete" data-id="${esc(radio.id)}">Apagar</button>
          </span></span>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="6"><div class="reference-empty">Sem rádios para mostrar.</div></td></tr>`;

    const end = total ? Math.min(start + state.pageSize, total) : 0;
    setText('rdTableSummary', `${total ? start + 1 : 0}-${end} de ${total}`);
    renderPagination(total);
  }

  function renderPagination(total) {
    const node = $('rdPagination');
    if (!node) return;
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    let html = `<button type="button" ${state.page <= 1 ? 'disabled' : ''} data-page="${state.page - 1}">«</button>`;
    for (let i = 1; i <= pages; i += 1) {
      if (pages > 6 && i !== 1 && i !== pages && Math.abs(i - state.page) > 1) {
        if (i === 2 || i === pages - 1) html += `<span class="ck-page-dots">…</span>`;
        continue;
      }
      html += `<button type="button" class="${i === state.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button type="button" ${state.page >= pages ? 'disabled' : ''} data-page="${state.page + 1}">»</button>`;
    node.innerHTML = html;
  }

  function renderAlerts() {
    const node = $('rdAlertsList');
    if (!node) return;
    const bad = state.radios.filter((radio) => estadoKey(normalizeEstado(radio.estado, radio)) === 'avariada');
    const maint = state.radios.filter((radio) => estadoKey(normalizeEstado(radio.estado, radio)) === 'manutencao');
    const alerts = [];
    if (bad.length) alerts.push(`${bad.length} rádio${bad.length === 1 ? '' : 's'} avariad${bad.length === 1 ? 'a' : 'as'} requer${bad.length === 1 ? '' : 'em'} intervenção.`);
    if (maint.length) alerts.push(`${maint.length} rádio${maint.length === 1 ? '' : 's'} em manutenção.`);
    node.innerHTML = alerts.length ? alerts.map((item) => `<div class="ck-list-item"><strong>${esc(item)}</strong><small>Verifique o estado antes de entregar à equipa.</small></div>`).join('') : `<div class="ck-list-item"><span>Sem alertas críticos neste momento.</span></div>`;
  }

  function renderSummaryBars() {
    const node = $('rdSummaryBars');
    if (!node) return;
    const s = stats();
    const total = s.total || 1;
    const rows = [
      ['Disponíveis', s.disponivel, 'green'],
      ['Em utilização', s.uso, 'blue'],
      ['Em carga', s.carga, 'yellow'],
      ['Avariadas', s.avariada, 'red'],
      ['Em manutenção', s.manutencao, 'orange']
    ];
    node.innerHTML = rows.map(([label, count, color]) => {
      const pct = s.total ? Math.round((count / total) * 1000) / 10 : 0;
      return `<div class="rd-bar-row"><span>${esc(label)}</span><div class="rd-bar-track"><div class="rd-bar-fill ${color}" style="width:${pct}%"></div></div><strong>${count}</strong><small>${pct.toFixed(1)}%</small></div>`;
    }).join('');
  }

  function recordLabel(record) {
    const code = record.radioCodigo || record.radioNome || record.codigo || 'Rádio';
    const tipo = record.tipo || 'Registo';
    if (tipo === 'Utilização') return `${code} marcada como em utilização`;
    if (tipo === 'Devolução') return `${code} registada como devolvida`;
    if (tipo === 'Carga') return `${code} colocada em carga`;
    if (tipo === 'Avaria') return `${code} registada como avariada`;
    return `${code} — ${tipo}`;
  }

  function renderRecent() {
    const node = $('rdRecentRecords');
    if (!node) return;
    const items = [...state.records, ...state.legacyRecords]
      .sort((a, b) => Number(b.createdAt || b.dataMs || 0) - Number(a.createdAt || a.dataMs || 0))
      .slice(0, 5);
    node.innerHTML = items.length ? items.map((record) => `<div class="ck-mini-row"><span class="ck-dot ${estadoClass(record.estadoDepois || record.estado || record.tipo)}"></span><strong>${esc(recordLabel(record))}</strong><small>${esc(formatDate(record.createdAt || record.dataMs))}</small></div>`).join('') : `<div class="ck-list-item"><span>Sem registos recentes.</span></div>`;
  }

  function renderRecordSelect(selectedId = '') {
    const select = $('rdRecordRadio');
    if (!select) return;
    const current = selectedId || state.selectedId || select.value || '';
    select.innerHTML = state.radios.map((radio) => `<option value="${esc(radio.id)}" ${String(radio.id) === String(current) ? 'selected' : ''}>${esc(radioCode(radio))} — ${esc(radioSerial(radio))}</option>`).join('');
  }



  function renderWeeklySummary() {
    const node = $('rdWeeklySummaryCards');
    if (!node) return;
    const week = currentWeekStart();
    const latest = latestWeekly();
    const latestCounts = weeklyCounts(latest || {});
    node.innerHTML = `
      <div><small>Semana atual</small><strong>${esc(weekLabel(week))}</strong></div>
      <div><small>Último registo</small><strong>${latest ? esc(weekLabel(latest.semana)) : '—'}</strong></div>
      <div><small>Alertas</small><strong class="${latestCounts.alertas ? 'rd-weekly-bad' : ''}">${latest ? latestCounts.alertas : 0}</strong></div>`;
  }

  function renderWeeklyList() {
    renderWeeklySummary();
    const body = $('rdWeeklyBody');
    if (!body) return;
    const list = [...state.weekly].sort((a, b) => String(b.semana || '').localeCompare(String(a.semana || '')) || Number(b.savedAt || 0) - Number(a.savedAt || 0));
    body.innerHTML = list.length ? list.map((reg) => {
      const counts = weeklyCounts(reg);
      const alertClass = counts.alertas ? 'rd-weekly-alert' : 'rd-weekly-ok';
      return `<tr data-weekly-id="${esc(reg.id || reg.semana)}">
        <td><strong>${esc(reg.label || weekLabel(reg.semana))}</strong><small class="rd-weekly-sub">${esc(reg.recordId || reg.weekKey || reg.semana || '')}${reg._legacy ? ' · antigo' : ''}</small></td>
        <td>${esc(reg.responsavel || '—')}</td>
        <td><strong>${counts.total}</strong></td>
        <td><span class="rd-weekly-pill ok">${counts.ok}</span></td>
        <td><span class="rd-weekly-pill ${alertClass}">${counts.alertas}</span></td>
        <td>${esc(formatDate(reg.savedAt || reg.updatedAt || reg.createdAt))}</td>
        <td class="rd-weekly-actions-cell">
          <button class="rd-action-btn" type="button" title="Editar" data-weekly-action="edit" data-id="${esc(reg.id || reg.semana)}">✎</button>
          <button class="rd-action-btn" type="button" title="Apagar" data-weekly-action="delete" data-id="${esc(reg.id || reg.semana)}">🗑</button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="7"><div class="reference-empty">Sem registos semanais guardados.</div></td></tr>`;
  }

  function renderWeeklyEditorRows() {
    const body = $('rdWeeklyRows');
    if (!body) return;
    state.weeklyRows = state.weeklyRows.length ? state.weeklyRows : state.radios.map((radio) => weeklyRowFromRadio(radio));
    body.innerHTML = state.weeklyRows.map((row, index) => `<tr data-weekly-row="${index}">
      <td><strong>${esc(row.codigo)}</strong><small>SN: ${esc(row.serial || '-')}</small></td>
      <td><label class="rd-check"><input type="checkbox" data-weekly-field="presente" ${row.presente !== false ? 'checked' : ''}><span>Sim</span></label></td>
      <td><input type="text" data-weekly-field="local" value="${esc(row.local || '')}" placeholder="Local"></td>
      <td><select data-weekly-field="estado">
        ${['Disponível','Em uso','Em carga','Avariada','Em manutenção'].map((value) => `<option value="${value}" ${normalizeEstado(row.estado) === value ? 'selected' : ''}>${value}</option>`).join('')}
      </select></td>
      <td><select data-weekly-field="bateria">
        ${['OK','Baixa','A carregar','Sem bateria','Não testada'].map((value) => `<option value="${value}" ${String(row.bateria || 'OK') === value ? 'selected' : ''}>${value}</option>`).join('')}
      </select></td>
      <td><label class="rd-check"><input type="checkbox" data-weekly-field="ok" ${row.ok !== false ? 'checked' : ''}><span>OK</span></label></td>
      <td><input type="text" data-weekly-field="notas" value="${esc(row.notas || '')}" placeholder="Notas"></td>
    </tr>`).join('') || `<tr><td colspan="7"><div class="reference-empty">Sem rádios para conferir.</div></td></tr>`;
    updateWeeklyModalStats();
  }

  function readWeeklyEditorRows() {
    const rows = [];
    document.querySelectorAll('#rdWeeklyRows tr[data-weekly-row]').forEach((tr) => {
      const index = Number(tr.dataset.weeklyRow);
      const base = state.weeklyRows[index] || {};
      const get = (field) => tr.querySelector(`[data-weekly-field="${field}"]`);
      rows.push({
        ...base,
        presente: !!get('presente')?.checked,
        local: text(get('local')?.value),
        estado: text(get('estado')?.value) || 'Disponível',
        bateria: text(get('bateria')?.value) || 'OK',
        ok: !!get('ok')?.checked,
        notas: text(get('notas')?.value)
      });
    });
    state.weeklyRows = rows;
    return rows;
  }

  function updateWeeklyModalStats() {
    const node = $('rdWeeklyModalStats');
    if (!node) return;
    const rows = readWeeklyEditorRowsNoLoop();
    const total = rows.length;
    const ok = rows.filter((row) => row.ok && row.presente !== false && !['Avariada','Em manutenção'].includes(normalizeEstado(row.estado)) && !['Baixa','Sem bateria','Não testada'].includes(row.bateria)).length;
    const alertas = Math.max(0, total - ok);
    node.innerHTML = `<span><small>Total</small><strong>${total}</strong></span><span><small>OK</small><strong>${ok}</strong></span><span><small>Alertas</small><strong class="${alertas ? 'rd-weekly-bad' : ''}">${alertas}</strong></span>`;
  }

  function readWeeklyEditorRowsNoLoop() {
    const domRows = document.querySelectorAll('#rdWeeklyRows tr[data-weekly-row]');
    if (!domRows.length) return state.weeklyRows || [];
    return Array.from(domRows).map((tr) => {
      const index = Number(tr.dataset.weeklyRow);
      const base = state.weeklyRows[index] || {};
      const get = (field) => tr.querySelector(`[data-weekly-field="${field}"]`);
      return {
        ...base,
        presente: !!get('presente')?.checked,
        local: text(get('local')?.value),
        estado: text(get('estado')?.value) || 'Disponível',
        bateria: text(get('bateria')?.value) || 'OK',
        ok: !!get('ok')?.checked,
        notas: text(get('notas')?.value)
      };
    });
  }

  function buildWeeklyRows(existing = null) {
    const existingMap = new Map((existing?.radios || []).map((row) => [String(row.radioId || row.codigo), row]));
    return state.radios.map((radio) => weeklyRowFromRadio(radio, existingMap.get(String(radio.id)) || existingMap.get(String(radioCode(radio)))));
  }

  function openWeeklyModal(id = null) {
    const currentWeek = currentWeekStart();
    const existing = id ? state.weekly.find((item) => String(item.id || item.semana) === String(id)) : state.weekly.find((item) => item.semana === currentWeek);
    state.weeklyEditingId = existing ? (existing.id || existing.semana) : currentWeek;
    $('rdWeeklyModalTitle').textContent = existing ? `Editar registo semanal — ${weekLabel(existing.semana)}` : 'Novo registo semanal dos rádios';
    $('rdWeeklySemana').value = existing?.semana || currentWeek;
    $('rdWeeklyResponsavel').value = existing?.responsavel || '';
    $('rdWeeklyObs').value = existing?.observacoes || existing?.obs || '';
    state.weeklyRows = buildWeeklyRows(existing);
    renderWeeklyEditorRows();
    $('rdModalSemanal').style.display = 'flex';
  }

  async function saveWeeklyRecord() {
    const semana = $('rdWeeklySemana')?.value || currentWeekStart();
    const rows = readWeeklyEditorRows();
    const total = rows.length;
    const ok = rows.filter((row) => row.ok && row.presente !== false && !['Avariada','Em manutenção'].includes(normalizeEstado(row.estado)) && !['Baixa','Sem bateria','Não testada'].includes(row.bateria)).length;
    const alertas = Math.max(0, total - ok);
    const payload = {
      id: semana,
      semana,
      responsavel: text($('rdWeeklyResponsavel')?.value),
      observacoes: text($('rdWeeklyObs')?.value),
      radios: rows,
      total,
      ok,
      alertas,
      savedAt: Date.now(),
      updatedAt: Date.now(),
      version: VERSION
    };
    try {
      const firestore = db();
      if (firestore) {
        await firestore.collection(WEEKLY_COLLECTION).doc(semana).set(payload, { merge: true });
      } else {
        const normalized = normalizeWeeklyRecord(payload, semana, WEEKLY_COLLECTION);
        const exists = state.weeklyPrimary.some((item) => String(item.id || item.semana) === String(semana));
        state.weeklyPrimary = exists ? state.weeklyPrimary.map((item) => String(item.id || item.semana) === String(semana) ? normalized : item) : [normalized, ...state.weeklyPrimary];
        saveLocal(LOCAL_WEEKLY_KEY, state.weeklyPrimary);
        mergeWeeklyRecords();
        renderAll();
      }
      closeModal('weekly');
      toast('Registo semanal guardado.');
    } catch (error) {
      console.error(error);
      toast('Erro ao guardar registo semanal.', 'error');
    }
  }

  async function deleteWeeklyRecord(id) {
    const item = state.weekly.find((reg) => String(reg.id || reg.semana) === String(id));
    if (!item) return toast('Registo semanal não encontrado.', 'error');
    if (!confirm(`Apagar o registo semanal de ${weekLabel(item.semana)}?`)) return;
    try {
      const firestore = db();
      if (firestore) await firestore.collection(item._sourceCollection || WEEKLY_COLLECTION).doc(item.id || item.semana || id).delete();
      else {
        state.weeklyPrimary = state.weeklyPrimary.filter((reg) => String(reg.id || reg.semana) !== String(id));
        state.weeklyLegacy = state.weeklyLegacy.filter((reg) => String(reg.id || reg.semana) !== String(id));
        saveLocal(LOCAL_WEEKLY_KEY, state.weeklyPrimary);
        mergeWeeklyRecords();
        renderAll();
      }
      toast('Registo semanal apagado.');
    } catch (error) {
      console.error(error);
      toast('Erro ao apagar registo semanal.', 'error');
    }
  }

  function exportWeeklyCsv() {
    const rows = [['Semana','Responsavel','Codigo','Serie','Local','Estado','Bateria','Presente','OK','Notas']];
    state.weekly.forEach((reg) => (reg.radios || []).forEach((row) => rows.push([
      reg.semana || '', reg.responsavel || '', row.codigo || '', row.serial || '', row.local || '', row.estado || '', row.bateria || '', row.presente === false ? 'Nao' : 'Sim', row.ok === false ? 'Nao' : 'Sim', row.notas || ''
    ])));
    if (rows.length === 1) return toast('Sem registos semanais para exportar.', 'error');
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registos-semanais-radios-v${VERSION}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function renderAll() {
    renderKpis();
    renderFilters();
    renderTable();
    renderAlerts();
    renderSummaryBars();
    renderRecent();
    renderRecordSelect();
    renderWeeklyList();
  }

  async function loadData() {
    const firestore = db();
    if (!firestore) {
      let local = loadLocal(LOCAL_RADIOS_KEY, []);
      if (!local.length) {
        local = sampleRadios();
        saveLocal(LOCAL_RADIOS_KEY, local);
      }
      state.radios = local;
      state.records = loadLocal(LOCAL_RECORDS_KEY, []);
      state.weeklyPrimary = loadLocal(LOCAL_WEEKLY_KEY, []).map((item) => normalizeWeeklyRecord(item, item.id || item.semana, WEEKLY_COLLECTION));
      state.weeklyLegacy = LEGACY_WEEKLY_LOCAL_KEYS.flatMap((key) => loadLocal(key, [])).map((item) => normalizeWeeklyRecord(item, item.id || item.semana || item.weekKey, 'localLegacy'));
      mergeWeeklyRecords();
      renderAll();
      toast('Firebase indisponível: modo local ativo.', 'error');
      return;
    }

    if (state.unsubscribeRadios) state.unsubscribeRadios();
    if (state.unsubscribeRecords) state.unsubscribeRecords();
    if (state.unsubscribeLegacyRecords) state.unsubscribeLegacyRecords();
    if (state.unsubscribeWeekly) state.unsubscribeWeekly();
    (state.weeklyLegacyUnsubs || []).forEach((unsubscribe) => { try { unsubscribe(); } catch (_) {} });
    state.weeklyLegacyUnsubs = [];

    state.unsubscribeRadios = firestore.collection(COLLECTION).onSnapshot((snapshot) => {
      state.radios = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderAll();
    }, (error) => {
      console.error('Erro radios:', error);
      state.radios = loadLocal(LOCAL_RADIOS_KEY, sampleRadios());
      renderAll();
      toast('Erro no Firebase. Modo local ativo.', 'error');
    });

    state.unsubscribeRecords = firestore.collection(RECORDS_COLLECTION).onSnapshot((snapshot) => {
      state.records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderAll();
    }, (error) => console.warn('Erro registos radios:', error));

    state.unsubscribeLegacyRecords = firestore.collection(LEGACY_RECORDS_COLLECTION).onSnapshot((snapshot) => {
      state.legacyRecords = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), _legacy: true }));
      renderAll();
    }, () => {});

    state.unsubscribeWeekly = firestore.collection(WEEKLY_COLLECTION).onSnapshot((snapshot) => {
      state.weeklyPrimary = snapshot.docs.map((doc) => normalizeWeeklyRecord(doc.data(), doc.id, WEEKLY_COLLECTION));
      mergeWeeklyRecords();
      renderAll();
    }, (error) => {
      console.warn('Erro registos semanais radios:', error);
      state.weeklyPrimary = loadLocal(LOCAL_WEEKLY_KEY, []).map((item) => normalizeWeeklyRecord(item, item.id || item.semana, WEEKLY_COLLECTION));
      mergeWeeklyRecords();
      renderAll();
    });

    LEGACY_WEEKLY_COLLECTIONS.forEach((collectionName) => {
      try {
        const unsubscribe = firestore.collection(collectionName).onSnapshot((snapshot) => {
          const normalized = snapshot.docs.map((doc) => normalizeWeeklyRecord(doc.data(), doc.id, collectionName));
          state.weeklyLegacy = [
            ...(state.weeklyLegacy || []).filter((item) => item._sourceCollection !== collectionName),
            ...normalized
          ];
          mergeWeeklyRecords();
          renderAll();
        }, (error) => console.warn(`Sem leitura em ${collectionName}:`, error));
        state.weeklyLegacyUnsubs.push(unsubscribe);
      } catch (error) {
        console.warn(`Não foi possível ligar a ${collectionName}:`, error);
      }
    });
  }

  function getRadio(id) {
    return state.radios.find((radio) => String(radio.id) === String(id));
  }

  function nextCode() {
    const nums = state.radios.map((radio) => {
      const m = String(radioCode(radio)).match(/(\d+)/g);
      return m ? Number(m[m.length - 1]) : 0;
    });
    return `RAD-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
  }

  function openRadioModal(id = null) {
    const radio = id ? getRadio(id) : null;
    state.editingId = radio ? radio.id : null;
    $('rdModalRadioTitle').textContent = radio ? `Editar ${radioCode(radio)}` : 'Nova rádio';
    $('rdFormCodigo').value = radio ? radioCode(radio) : nextCode();
    $('rdFormSerie').value = radio ? radioSerial(radio) : '';
    $('rdFormModelo').value = radio ? radioModel(radio) : '';
    $('rdFormLocal').value = radio ? radioLocal(radio) : '';
    $('rdFormEstado').value = radio ? normalizeEstado(radio.estado, radio) : 'Disponível';
    $('rdFormUser').value = radio ? radioUser(radio) : '';
    $('rdFormMac').value = radio?.mac || '';
    $('rdFormCanal').value = radio?.canal || radio?.rf || '';
    $('rdFormNotas').value = radio?.notas || '';
    $('rdModalRadio').style.display = 'flex';
    setTimeout(() => $('rdFormCodigo')?.focus(), 80);
  }

  function closeModal(kind) {
    const map = { radio:'rdModalRadio', detail:'rdModalDetalhe', record:'rdModalRegisto', weekly:'rdModalSemanal' };
    const node = $(map[kind] || kind);
    if (node) node.style.display = 'none';
  }

  function payloadFromForm() {
    const codigo = text($('rdFormCodigo')?.value);
    return {
      codigo,
      nome: codigo,
      serial: text($('rdFormSerie')?.value),
      numeroSerie: text($('rdFormSerie')?.value),
      modelo: text($('rdFormModelo')?.value) || 'Rádio',
      local: text($('rdFormLocal')?.value) || 'Sem local',
      estado: text($('rdFormEstado')?.value) || 'Disponível',
      userNome: text($('rdFormUser')?.value),
      user: text($('rdFormUser')?.value),
      mac: text($('rdFormMac')?.value),
      canal: text($('rdFormCanal')?.value),
      notas: text($('rdFormNotas')?.value),
      updatedAt: Date.now(),
      version: VERSION
    };
  }

  async function saveRadio() {
    const payload = payloadFromForm();
    if (!payload.codigo) return toast('Indica o código da rádio.', 'error');
    try {
      const firestore = db();
      if (firestore) {
        if (state.editingId) await firestore.collection(COLLECTION).doc(state.editingId).set(payload, { merge: true });
        else await firestore.collection(COLLECTION).add({ ...payload, createdAt: Date.now() });
      } else {
        if (state.editingId) state.radios = state.radios.map((radio) => radio.id === state.editingId ? { ...radio, ...payload } : radio);
        else state.radios.push({ id: uid(), ...payload, createdAt: Date.now() });
        saveLocal(LOCAL_RADIOS_KEY, state.radios);
        renderAll();
      }
      closeModal('radio');
      toast('Rádio guardada.');
    } catch (error) {
      console.error(error);
      toast('Erro ao guardar rádio.', 'error');
    }
  }

  async function deleteRadio(id) {
    const radio = getRadio(id);
    if (!radio) return toast('Rádio não encontrada.', 'error');
    if (!confirm(`Apagar ${radioCode(radio)}?`)) return;
    try {
      const firestore = db();
      if (firestore) await firestore.collection(COLLECTION).doc(id).delete();
      else {
        state.radios = state.radios.filter((item) => item.id !== id);
        saveLocal(LOCAL_RADIOS_KEY, state.radios);
        renderAll();
      }
      toast('Rádio apagada.');
    } catch (error) {
      console.error(error);
      toast('Erro ao apagar rádio.', 'error');
    }
  }

  function openDetail(id) {
    const radio = getRadio(id);
    if (!radio) return toast('Rádio não encontrada.', 'error');
    state.selectedId = id;
    $('rdDetailTitle').textContent = radioCode(radio);
    const estado = normalizeEstado(radio.estado, radio);
    const fields = [
      ['Código', radioCode(radio)], ['N.º Série', radioSerial(radio)], ['Modelo', radioModel(radio)],
      ['Local', radioLocal(radio)], ['Estado', estado], ['Utilizador', radioUser(radio) || '—'],
      ['MAC', radio.mac || '—'], ['Canal/RF', radio.canal || radio.rf || '—'], ['Notas', radio.notas || '—']
    ];
    $('rdDetailGrid').innerHTML = fields.map(([k, v]) => `<div class="ck-detail-item"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('');
    const records = getRadioRecords(id).slice(0, 6);
    $('rdDetailRecords').innerHTML = records.length ? records.map((record) => `<div class="ck-modal-list-item"><strong>${esc(record.tipo || 'Registo')}</strong><span>${esc(record.notas || record.obs || 'Sem notas')}</span><small>${esc(formatDate(record.createdAt || record.dataMs))}</small></div>`).join('') : '<div class="reference-empty">Sem registos para este rádio.</div>';
    $('rdDetailEditBtn').onclick = () => { closeModal('detail'); openRadioModal(id); };
    $('rdDetailInterventionBtn').onclick = () => { closeModal('detail'); openRecordModal('Intervenção', id); };
    $('rdModalDetalhe').style.display = 'flex';
  }

  function openRecordModal(mode = 'Intervenção', id = '') {
    state.recordMode = mode;
    state.selectedId = id || state.selectedId || state.radios[0]?.id || '';
    renderRecordSelect(state.selectedId);
    const titleMap = { 'Utilização':'Registar utilização', 'Devolução':'Registar devolução', 'Intervenção':'Registar intervenção' };
    $('rdModalRegistoTitle').textContent = titleMap[mode] || `Registar ${mode}`;
    $('rdRecordTipo').value = mode;
    const stateByMode = { 'Utilização':'Em uso', 'Devolução':'Disponível', 'Intervenção':'Disponível', 'Carga':'Em carga', 'Avaria':'Avariada' };
    $('rdRecordEstado').value = stateByMode[mode] || 'Disponível';
    const radio = getRadio(state.selectedId);
    $('rdRecordUser').value = mode === 'Devolução' ? '' : (radio ? radioUser(radio) : '');
    $('rdRecordData').value = isoLocalNow();
    $('rdRecordLocal').value = radio ? radioLocal(radio) : '';
    $('rdRecordNotas').value = '';
    $('rdModalRegisto').style.display = 'flex';
  }

  async function saveRecord() {
    const radioId = $('rdRecordRadio')?.value || '';
    const radio = getRadio(radioId);
    if (!radio) return toast('Escolhe uma rádio.', 'error');
    const tipo = text($('rdRecordTipo')?.value) || 'Intervenção';
    const estadoDepois = text($('rdRecordEstado')?.value) || 'Disponível';
    const createdAt = $('rdRecordData')?.value ? new Date($('rdRecordData').value).getTime() : Date.now();
    const user = text($('rdRecordUser')?.value);
    const local = text($('rdRecordLocal')?.value) || radioLocal(radio);
    const record = {
      radioId: String(radio.id),
      radioCodigo: radioCode(radio),
      radioNome: radioCode(radio),
      radioSerial: radioSerial(radio),
      tipo,
      estadoAntes: normalizeEstado(radio.estado, radio),
      estadoDepois,
      userNome: user,
      user,
      local,
      notas: text($('rdRecordNotas')?.value),
      createdAt,
      createdLabel: formatDate(createdAt),
      updatedAt: Date.now(),
      version: VERSION
    };
    const update = {
      estado: estadoDepois,
      local,
      userNome: estadoKey(estadoDepois) === 'uso' ? user : '',
      user: estadoKey(estadoDepois) === 'uso' ? user : '',
      updatedAt: Date.now(),
      ultimoRegisto: tipo,
      ultimoRegistoAt: createdAt
    };
    try {
      const firestore = db();
      if (firestore) {
        await firestore.collection(RECORDS_COLLECTION).add(record);
        await firestore.collection(COLLECTION).doc(radio.id).set(update, { merge: true });
      } else {
        state.records.unshift({ id: uid(), ...record });
        state.radios = state.radios.map((item) => item.id === radio.id ? { ...item, ...update } : item);
        saveLocal(LOCAL_RECORDS_KEY, state.records);
        saveLocal(LOCAL_RADIOS_KEY, state.radios);
        renderAll();
      }
      closeModal('record');
      toast('Registo guardado.');
    } catch (error) {
      console.error(error);
      toast('Erro ao guardar registo.', 'error');
    }
  }

  function downloadCsv() {
    const rows = [['Codigo','Serie','Modelo','Local','Estado','Utilizador','Ultimo registo','Notas']];
    filteredRadios().forEach((radio) => rows.push([
      radioCode(radio), radioSerial(radio), radioModel(radio), radioLocal(radio), normalizeEstado(radio.estado, radio), radioUser(radio), lastRecordLabel(radio), radio.notas || ''
    ]));
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-radios-v${VERSION}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function showAllAlerts() {
    const bad = state.radios.filter((radio) => ['avariada','manutencao'].includes(estadoKey(normalizeEstado(radio.estado, radio))));
    if (!bad.length) return toast('Sem alertas para mostrar.');
    alert(bad.map((radio) => `${radioCode(radio)} — ${normalizeEstado(radio.estado, radio)} — ${radioLocal(radio)}`).join('\n'));
  }

  function showAllRecords() {
    const items = [...state.records, ...state.legacyRecords].sort((a,b) => Number(b.createdAt || b.dataMs || 0) - Number(a.createdAt || a.dataMs || 0));
    if (!items.length) return toast('Sem registos para mostrar.');
    alert(items.slice(0, 20).map((record) => `${recordLabel(record)} — ${formatDate(record.createdAt || record.dataMs)}`).join('\n'));
  }

  function bind() {
    $('rdBtnNova')?.addEventListener('click', () => openRadioModal());
    $('rdSaveRadioBtn')?.addEventListener('click', saveRadio);
    $('rdBtnUtilizacao')?.addEventListener('click', () => openRecordModal('Utilização'));
    $('rdBtnDevolucao')?.addEventListener('click', () => openRecordModal('Devolução'));
    $('rdBtnIntervencao')?.addEventListener('click', () => openRecordModal('Intervenção'));
    $('rdBtnRelatorio')?.addEventListener('click', downloadCsv);
    $('rdBtnSemanalRapido')?.addEventListener('click', () => openWeeklyModal());
    $('rdBtnNovoSemanal')?.addEventListener('click', () => openWeeklyModal());
    $('rdBtnExportSemanal')?.addEventListener('click', exportWeeklyCsv);
    $('rdBtnVerAlertas')?.addEventListener('click', showAllAlerts);
    $('rdBtnVerRegistos')?.addEventListener('click', showAllRecords);
    $('rdSaveRecordBtn')?.addEventListener('click', saveRecord);
    $('rdWeeklySaveBtn')?.addEventListener('click', saveWeeklyRecord);
    $('rdWeeklyAllPresent')?.addEventListener('click', () => { document.querySelectorAll('#rdWeeklyRows input[data-weekly-field="presente"]').forEach((input) => { input.checked = true; }); updateWeeklyModalStats(); });
    $('rdWeeklyAllOk')?.addEventListener('click', () => { document.querySelectorAll('#rdWeeklyRows input[data-weekly-field="ok"]').forEach((input) => { input.checked = true; }); updateWeeklyModalStats(); });
    $('rdWeeklyReload')?.addEventListener('click', () => { const existing = { radios: readWeeklyEditorRows() }; state.weeklyRows = buildWeeklyRows(existing); renderWeeklyEditorRows(); });
    $('rdSearch')?.addEventListener('input', () => { state.page = 1; renderTable(); });
    $('rdFilterLocal')?.addEventListener('change', () => { state.page = 1; renderTable(); });
    $('rdFilterEstado')?.addEventListener('change', () => { state.page = 1; renderTable(); });
    $('rdBtnLimpar')?.addEventListener('click', () => { $('rdSearch').value = ''; $('rdFilterLocal').value = ''; $('rdFilterEstado').value = ''; state.page = 1; renderTable(); });
    $('rdPageSize')?.addEventListener('change', (event) => { state.pageSize = Number(event.target.value) || 10; state.page = 1; renderTable(); });
    $('rdPagination')?.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-page]');
      if (!btn || btn.disabled) return;
      state.page = Number(btn.dataset.page) || 1;
      renderTable();
    });
    $('rdTableBody')?.addEventListener('click', (event) => {
      const actionNode = event.target.closest('[data-action]');
      if (!actionNode) return;
      const action = actionNode.dataset.action;
      const row = event.target.closest('tr[data-radio-id]');
      const id = actionNode.dataset.id || row?.dataset.radioId;
      if (action === 'menu') {
        document.querySelectorAll('.rd-menu.open').forEach((menu) => { if (!menu.contains(actionNode)) menu.classList.remove('open'); });
        actionNode.closest('.rd-menu')?.classList.toggle('open');
        return;
      }
      document.querySelectorAll('.rd-menu.open').forEach((menu) => menu.classList.remove('open'));
      if (action === 'view') return openDetail(id);
      if (action === 'edit') return openRadioModal(id);
      if (action === 'use') return openRecordModal('Utilização', id);
      if (action === 'return') return openRecordModal('Devolução', id);
      if (action === 'record') return openRecordModal('Intervenção', id);
      if (action === 'delete') return deleteRadio(id);
    });

    $('rdWeeklyBody')?.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-weekly-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.weeklyAction === 'edit') return openWeeklyModal(id);
      if (btn.dataset.weeklyAction === 'delete') return deleteWeeklyRecord(id);
    });
    $('rdWeeklyRows')?.addEventListener('input', updateWeeklyModalStats);
    $('rdWeeklyRows')?.addEventListener('change', updateWeeklyModalStats);
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.rd-menu')) document.querySelectorAll('.rd-menu.open').forEach((menu) => menu.classList.remove('open'));
    });
    document.querySelectorAll('[data-rd-close]').forEach((btn) => btn.addEventListener('click', () => closeModal(btn.dataset.rdClose)));
    document.querySelectorAll('.ck-modal').forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; }));
  }

  function init() {
    if (!$('rdTableBody')) return;
    bind();
    renderAll();
    setTimeout(loadData, 80);
  }

  document.addEventListener('DOMContentLoaded', init);

  window.RadiosPage = { openRadioModal, closeModal, openRecordModal, openWeeklyModal, saveRadio, saveRecord, saveWeeklyRecord, deleteRadio, deleteWeeklyRecord, downloadCsv, exportWeeklyCsv, renderAll };
})();
