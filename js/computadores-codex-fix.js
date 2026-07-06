(() => {
  'use strict';

  const VERSION = '1.58.165';
  const COLLECTION = 'computadores';
  const LEGACY_COLLECTION = 'pcs';
  const RECORDS_COLLECTION = 'computadoresIntervencoes';
  const LEGACY_RECORDS_COLLECTIONS = ['pcHistory','computadoresHistorico','pcsHistorico','pcsIntervencoes'];
  const LOCAL_COMPUTERS_KEY = 'appbraga_computadores_fallback_v15890';
  const LOCAL_RECORDS_KEY = 'appbraga_computadores_records_fallback_v15890';

  const state = {
    computers: [],
    primaryComputers: [],
    legacyComputers: [],
    records: [],
    primaryRecords: [],
    legacyRecords: [],
    page: 1,
    pageSize: 10,
    selectedId: '',
    editingId: null,
    recordMode: 'Intervenção',
    unsubscribeComputers: null,
    unsubscribeLegacyComputers: null,
    unsubscribeRecords: null,
    legacyRecordUnsubs: []
  };

  const INSTALL_STEPS = [
    'TEAMVIEWER HOST',
    'TEAMS',
    'DNS',
    'NOME DO SISTEMA',
    'Atribuir Dominio',
    'Desinstalar MCFee',
    'Instalar Sophos',
    'MICROSOFT 365',
    'Instalar Impressora',
    'Alterar Energia',
    'Apagar User',
    'Criar novo user'
  ];

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
    let node = document.querySelector('.cp-toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'cp-toast';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.className = `cp-toast ${type}`;
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

  function sampleComputers() {
    return [
      ['PC-001','DELL5821901','Receção-01','Dell Optiplex','Receção','Ana','Operacional'],
      ['PC-002','HP5821902','Expedição-02','HP ProDesk','Expedição','Rafael','Em uso'],
      ['PC-003','LEN5821903','Balcão-01','Lenovo ThinkCentre','Loja','','Por configurar'],
      ['PC-004','DELL5821904','Armazém-01','Dell Optiplex','Armazém','Ricardo','Em uso'],
      ['PC-005','HP5821905','Direção-01','HP EliteDesk','Escritório','Sílvia','Em manutenção'],
      ['PC-006','LEN5821906','Vendas-01','Lenovo ThinkCentre','Loja','João','Operacional'],
      ['PC-007','DELL5821907','Marketing-01','Dell Optiplex','Escritório','Marta','Operacional'],
      ['PC-008','HP5821908','Contabilidade-01','HP ProDesk','Escritório','Paulo','Em uso'],
      ['PC-009','LEN5821909','Suporte-01','Lenovo ThinkCentre','TI','Tiago','Em manutenção'],
      ['PC-010','DELL5821910','Sala Reuniões-01','Dell Optiplex','Escritório','','Por configurar']
    ].map(([codigo, serial, nome, modelo, local, user, estado], index) => ({
      id: `sample-${index + 1}`,
      codigo,
      serial,
      numeroSerie: serial,
      nome,
      hostname: nome,
      modelo,
      local,
      localizacao: local,
      userNome: user,
      user,
      estado,
      createdAt: Date.now() - (index + 1) * 8640000,
      updatedAt: Date.now() - (index + 1) * 3600000
    }));
  }

  function normalizeEstado(value, computer = {}) {
    const raw = lower(value || computer.estado || computer.status || computer.situacao || '');
    const assigned = !!(computer.userNome || computer.user || computer.utilizador || computer.assignedTo || computer.responsavel);
    if (raw.includes('manut') || raw.includes('repar') || raw.includes('avari')) return 'Em manutenção';
    if (raw.includes('config') || raw.includes('setup') || raw.includes('novo')) return 'Por configurar';
    if (raw.includes('inativo') || raw.includes('desativ') || raw.includes('abat')) return 'Inativo';
    if (raw.includes('uso') || raw.includes('utiliza') || raw.includes('atrib') || assigned) return 'Em uso';
    return 'Operacional';
  }

  function estadoKey(value) {
    const raw = lower(value);
    if (raw.includes('manut') || raw.includes('repar') || raw.includes('avari')) return 'manutencao';
    if (raw.includes('config') || raw.includes('setup') || raw.includes('novo')) return 'configuracao';
    if (raw.includes('inativo') || raw.includes('desativ') || raw.includes('abat')) return 'inativo';
    if (raw.includes('uso') || raw.includes('utiliza') || raw.includes('atrib')) return 'uso';
    return 'operacional';
  }

  function estadoClass(value) { return estadoKey(value); }

  function estadoIcon(value) {
    const key = estadoKey(value);
    return key === 'uso' ? '👤' : key === 'manutencao' ? '🛠' : key === 'configuracao' ? '⚙️' : key === 'inativo' ? '○' : '✓';
  }

  function computerCode(c) { return c.codigo || c.idInterno || c.ref || c.pcId || c.id || c.hostname || c.nome || 'PC'; }
  function computerSerial(c) { return c.serial || c.numeroSerie || c.sn || c.serie || c.serviceTag || c.etiqueta || c.mac || '-'; }
  function computerName(c) { return c.nome || c.hostname || c.name || c.computador || computerCode(c); }
  function computerModel(c) { return c.modelo || c.model || c.marcaModelo || c.marca || 'Computador'; }
  function computerLocal(c) { return c.local || c.localizacao || c.location || c.seccao || 'Sem local'; }
  function computerUser(c) { return c.userNome || c.user || c.utilizador || c.assignedTo || c.responsavel || ''; }

  function formatDate(value) {
    if (!value) return '—';
    let date = null;
    if (typeof value === 'object' && typeof value.toDate === 'function') date = value.toDate();
    else if (typeof value === 'number') date = new Date(value);
    else if (typeof value === 'string') date = new Date(value);
    if (!date || Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function inputDateTimeLocal(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function parseDateTimeLocal(value) {
    const d = value ? new Date(value) : new Date();
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }


  function installProgress(item = {}) {
    const steps = Array.isArray(item.passos) ? item.passos : [];
    const total = steps.length || INSTALL_STEPS.length || 1;
    const done = steps.filter((step) => !!step.feito || !!step.ok || step.estado === 'OK').length;
    return { steps, total, done, percent: Math.round((done / total) * 100) };
  }

  function normalizeInstallSteps(raw = []) {
    const list = Array.isArray(raw) ? raw : [];
    return INSTALL_STEPS.map((name, index) => {
      const found = list.find((step) => lower(step.passo || step.nome || step.label || step.name || '') === lower(name)) || list[index] || {};
      return { passo: name, feito: !!(found.feito || found.ok || found.done || found.checked || found.estado === 'OK') };
    });
  }

  function readFormChecklist() {
    return INSTALL_STEPS.map((step, index) => ({ passo: step, feito: !!$('cpFormStep' + index)?.checked }));
  }

  function renderComputerChecklist(steps = []) {
    const checklist = $('cpFormChecklist');
    if (!checklist) return;
    const normalized = normalizeInstallSteps(steps);
    checklist.innerHTML = INSTALL_STEPS.map((step, index) => `
      <label class="cp-modal-check-item">
        <input type="checkbox" id="cpFormStep${index}" ${normalized[index]?.feito ? 'checked' : ''}>
        <span>${esc(step)}</span>
      </label>
    `).join('');
  }

  function renderInstallChecklist() {
    renderComputerChecklist([]);
  }

  function mergeComputers() {
    const map = new Map();
    [...state.legacyComputers, ...state.primaryComputers].forEach((item) => {
      const key = lower(item.id || item.codigo || item.pcId || item.hostname || item.nome || item.serial || item.numeroSerie);
      if (!key) return;
      const normalized = normalizeComputer(item);
      map.set(key, { ...(map.get(key) || {}), ...normalized });
    });
    state.computers = Array.from(map.values()).sort((a, b) => text(computerCode(a)).localeCompare(text(computerCode(b)), 'pt', { numeric: true }));
  }

  function normalizeComputer(item = {}) {
    const codigo = item.codigo || item.idInterno || item.pcId || item.ref || item.hostname || item.nome || item.id;
    const serial = item.serial || item.numeroSerie || item.sn || item.serie || item.serviceTag || item.etiqueta || item.mac || '';
    const nome = item.nome || item.hostname || item.name || codigo || 'Computador';
    const estado = normalizeEstado(item.estado || item.status || item.situacao, item);
    return {
      ...item,
      id: item.id || codigo || serial || uid(),
      sourceCollection: item._collection || item.sourceCollection || '',
      codigo,
      serial,
      numeroSerie: serial,
      nome,
      hostname: item.hostname || nome,
      modelo: item.modelo || item.model || item.marcaModelo || item.marca || 'Computador',
      local: item.local || item.localizacao || item.location || item.seccao || 'Sem local',
      userNome: item.userNome || item.user || item.utilizador || item.assignedTo || item.responsavel || '',
      estado,
      updatedAt: item.updatedAt || item.dataAtualizacao || item.createdAt || item.data || Date.now()
    };
  }

  function normalizeRecord(item = {}) {
    const computerId = item.computerId || item.pcId || item.computadorId || item.equipamentoId || item.idComputador || item.radioId || '';
    return {
      ...item,
      id: item.id || item.recordId || uid(),
      computerId,
      codigo: item.codigo || item.pcCodigo || item.computerCode || item.equipamento || item.hostname || '',
      tipo: item.tipo || item.type || item.acao || 'Intervenção',
      estado: normalizeEstado(item.estado || item.estadoDepois || item.status || ''),
      user: item.user || item.userNome || item.utilizador || item.tecnico || item.responsavel || '',
      local: item.local || item.localizacao || item.location || '',
      notas: item.notas || item.obs || item.observacoes || item.descricao || '',
      createdAt: item.createdAt || item.data || item.date || item.timestamp || item.updatedAt || Date.now()
    };
  }

  function recordsForComputer(computer) {
    const id = computer.id;
    const code = lower(computerCode(computer));
    const serial = lower(computerSerial(computer));
    const name = lower(computerName(computer));
    return state.records.filter((r) => {
      const rid = lower(r.computerId || r.pcId || r.computadorId || r.equipamentoId || '');
      const rcode = lower(r.codigo || r.pcCodigo || r.computerCode || r.equipamento || r.hostname || '');
      const rserial = lower(r.serial || r.numeroSerie || r.sn || '');
      return rid === lower(id) || rcode === code || rserial === serial || rcode === name;
    }).sort((a,b) => recordTime(b) - recordTime(a));
  }

  function recordTime(r) {
    const v = r.createdAt || r.data || r.date || r.timestamp || 0;
    if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate().getTime();
    const d = typeof v === 'number' ? new Date(v) : new Date(v);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function lastRecord(computer) {
    const own = recordsForComputer(computer)[0];
    return own?.createdAt || computer.lastRecordAt || computer.ultimaIntervencao || computer.updatedAt || computer.createdAt;
  }

  function filteredComputers() {
    const q = lower($('cpSearch')?.value || '');
    const local = lower($('cpFilterLocal')?.value || '');
    const estado = $('cpFilterEstado')?.value || '';
    return state.computers.filter((c) => {
      const hay = lower([computerCode(c), computerSerial(c), computerName(c), computerModel(c), computerLocal(c), computerUser(c), normalizeEstado(c.estado,c)].join(' '));
      const okQ = !q || hay.includes(q);
      const okLocal = !local || lower(computerLocal(c)) === local;
      const okEstado = !estado || estadoKey(normalizeEstado(c.estado, c)) === estado;
      return okQ && okLocal && okEstado;
    });
  }

  function render() {
    mergeComputers();
    renderFilters();
    renderKpis();
    renderTable();
    renderSide();
    fillRecordSelect();
  }

  function renderFilters() {
    const select = $('cpFilterLocal');
    if (!select) return;
    const current = select.value;
    const locals = Array.from(new Set(state.computers.map(computerLocal).filter(Boolean))).sort((a,b) => a.localeCompare(b, 'pt'));
    select.innerHTML = '<option value="">Todos os locais</option>' + locals.map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    select.value = locals.includes(current) ? current : '';
  }

  function renderKpis() {
    const total = state.computers.length;
    const count = (key) => state.computers.filter((c) => estadoKey(normalizeEstado(c.estado,c)) === key).length;
    const thirtyDays = Date.now() - 30 * 86400000;
    const rec30 = state.records.filter((r) => recordTime(r) >= thirtyDays).length;
    setText('cpKpiTotal', total);
    setText('cpKpiOperacionais', count('operacional'));
    setText('cpKpiUso', count('uso'));
    setText('cpKpiManutencao', count('manutencao'));
    setText('cpKpiConfig', count('configuracao'));
    setText('cpKpiIntervencoes', rec30);
  }

  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }

  function renderTable() {
    const body = $('cpTableBody');
    if (!body) return;
    const rows = filteredComputers();
    const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageRows = rows.slice(start, start + state.pageSize);
    if (!pageRows.length) {
      body.innerHTML = `<tr><td colspan="7"><div class="ck-empty">Sem computadores para mostrar.</div></td></tr>`;
    } else {
      body.innerHTML = pageRows.map((c) => {
        const estado = normalizeEstado(c.estado, c);
        return `<tr>
          <td><strong class="ck-linklike">${esc(computerCode(c))}</strong><small>SN: ${esc(computerSerial(c))}</small></td>
          <td><strong>${esc(computerName(c))}</strong><small>${esc(computerModel(c))}</small></td>
          <td>${esc(computerLocal(c))}</td>
          <td>${esc(computerUser(c) || '—')}</td>
          <td><span class="ck-status cp-badge ${estadoClass(estado)}">${esc(estadoIcon(estado))} ${esc(estado)}</span></td>
          <td>${esc(formatDate(lastRecord(c)))}</td>
          <td>
            <div class="ck-actions">
              <button class="ck-icon-btn" type="button" title="Ver" data-cp-action="view" data-id="${esc(c.id)}">⊙</button>
              <button class="ck-icon-btn" type="button" title="Editar" data-cp-action="edit" data-id="${esc(c.id)}">✎</button>
              <button class="ck-icon-btn" type="button" title="Mais" data-cp-action="menu" data-id="${esc(c.id)}">⋮</button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }
    const end = rows.length ? Math.min(start + state.pageSize, rows.length) : 0;
    setText('cpTableSummary', `${rows.length ? start + 1 : 0}-${end} de ${rows.length}`);
    renderPagination(totalPages);
  }



  function renderInstallationRecords() {
    const wrap = $('cpInstallRecords');
    const counter = $('cpInstallCount');
    if (!wrap) return;
    const records = state.computers
      .filter((c) => Array.isArray(c.passos) && c.passos.length)
      .sort((a, b) => recordTime({ createdAt: b.createdAt || b.created || b.data || b.updatedAt }) - recordTime({ createdAt: a.createdAt || a.created || a.data || a.updatedAt }));
    if (counter) counter.textContent = records.length;
    if (!records.length) {
      wrap.innerHTML = `<div class="ck-empty">Ainda não existem registos de instalação. Guarda um computador com a checklist para aparecer aqui.</div>`;
      return;
    }
    wrap.innerHTML = records.map((pc) => {
      const progress = installProgress(pc);
      const cls = progress.percent >= 100 ? 'ok' : progress.percent >= 65 ? 'warn' : 'bad';
      const dateLabel = pc.data && pc.data !== 'Sem Data' ? pc.data : formatDate(pc.createdAt || pc.created || pc.updatedAt);
      const steps = progress.steps.map((step) => `
        <li class="${step.feito ? 'done' : 'open'}"><span></span>${esc(step.passo || step.nome || step.label || '-')}</li>
      `).join('');
      return `
        <div class="cp-install-card" data-install-id="${esc(pc.id)}">
          <div class="cp-install-card-head">
            <div>
              <h3>${esc(computerName(pc))}</h3>
              <p>Data: <strong>${esc(dateLabel || 'Sem Data')}</strong></p>
            </div>
            <strong class="cp-install-percent ${cls}">${progress.percent}%</strong>
          </div>
          <div class="cp-install-progress"><span style="width:${progress.percent}%"></span></div>
          <ul class="cp-install-steps">${steps}</ul>
          <div class="cp-install-card-actions">
            <button class="ck-btn small" type="button" data-cp-install-action="copy" data-id="${esc(pc.id)}">Copiar para novo</button>
            <button class="ck-btn small danger" type="button" data-cp-install-action="delete" data-id="${esc(pc.id)}">Apagar</button>
          </div>
        </div>`;
    }).join('');
  }
  function renderPagination(totalPages) {
    const node = $('cpPagination');
    if (!node) return;
    const btn = (label, page, disabled = false, active = false) => `<button type="button" class="${active ? 'active' : ''}" ${disabled ? 'disabled' : ''} data-cp-page="${page}">${label}</button>`;
    let html = btn('«', Math.max(1, state.page - 1), state.page <= 1);
    for (let p = 1; p <= totalPages; p++) {
      if (p > 1 && p < totalPages && Math.abs(p - state.page) > 1) {
        if (!html.endsWith('<span>…</span>')) html += '<span>…</span>';
        continue;
      }
      html += btn(String(p), p, false, p === state.page);
    }
    html += btn('»', Math.min(totalPages, state.page + 1), state.page >= totalPages);
    node.innerHTML = html;
  }

  function renderSide() {
    const total = state.computers.length || 1;
    const counts = {
      operacional: state.computers.filter((c) => estadoKey(normalizeEstado(c.estado,c)) === 'operacional').length,
      uso: state.computers.filter((c) => estadoKey(normalizeEstado(c.estado,c)) === 'uso').length,
      manutencao: state.computers.filter((c) => estadoKey(normalizeEstado(c.estado,c)) === 'manutencao').length,
      configuracao: state.computers.filter((c) => estadoKey(normalizeEstado(c.estado,c)) === 'configuracao').length
    };
    const alerts = counts.manutencao + counts.configuracao;
    const alertNode = $('cpAlertas');
    if (alertNode) alertNode.innerHTML = alerts ? `${alerts} computador${alerts === 1 ? '' : 'es'} requer${alerts === 1 ? '' : 'em'} atenção.` : 'Sem alertas críticos neste momento.';
    const summary = $('cpResumoEstado');
    if (summary) {
      const row = (label, key, cls) => {
        const n = counts[key] || 0;
        const pct = state.computers.length ? ((n / total) * 100) : 0;
        return `<div class="cp-progress-row"><span>${esc(label)}</span><div class="cp-progress-track"><div class="cp-progress-bar ${cls || ''}" style="width:${pct}%"></div></div><strong>${n}</strong><small>${pct.toFixed(1)}%</small></div>`;
      };
      summary.innerHTML = row('Operacionais','operacional','') + row('Em utilização','uso','uso') + row('Em manutenção','manutencao','manutencao') + row('Por configurar','configuracao','configuracao');
    }
    const latest = $('cpUltimosRegistos');
    if (latest) {
      const rows = [...state.records].sort((a,b) => recordTime(b) - recordTime(a)).slice(0,4);
      latest.innerHTML = rows.length ? rows.map((r) => {
        const cls = estadoKey(r.estado) === 'manutencao' ? 'bad' : estadoKey(r.estado) === 'configuracao' ? 'warn' : 'ok';
        const label = r.codigo || computerCode(findComputerById(r.computerId) || {}) || 'Computador';
        return `<div class="cp-recent-row"><span class="cp-recent-dot ${cls}"></span><div class="cp-recent-main"><strong>${esc(r.tipo)} – ${esc(label)}</strong><small>${esc(r.notas || 'Registo de computador')}</small></div><small>${esc(formatDate(r.createdAt))}</small></div>`;
      }).join('') : 'Sem intervenções registadas.';
    }
  }

  function fillRecordSelect() {
    const select = $('cpRecordComputer');
    if (!select) return;
    const current = select.value;
    select.innerHTML = state.computers.map((c) => `<option value="${esc(c.id)}">${esc(computerCode(c))} — ${esc(computerName(c))}</option>`).join('');
    if (state.computers.some((c) => c.id === current)) select.value = current;
  }

  function findComputerById(id) {
    return state.computers.find((c) => String(c.id) === String(id));
  }

  function openModal(id) { const el = $(id); if (el) el.style.display = 'flex'; }
  function closeModal(id) { const el = $(id); if (el) el.style.display = 'none'; }

  function openComputerModal(computer = null) {
    state.editingId = computer?.id || null;
    setText('cpModalComputadorTitle', computer ? 'Editar computador' : 'Novo computador');
    $('cpFormCodigo').value = computer ? computerCode(computer) : nextCode();
    $('cpFormSerie').value = computer ? computerSerial(computer) === '-' ? '' : computerSerial(computer) : '';
    $('cpFormNome').value = computer ? computerName(computer) : '';
    $('cpFormModelo').value = computer ? computerModel(computer) : '';
    $('cpFormLocal').value = computer ? computerLocal(computer) : '';
    $('cpFormUser').value = computer ? computerUser(computer) : '';
    $('cpFormEstado').value = computer ? normalizeEstado(computer.estado, computer) : 'Por configurar';
    $('cpFormIp').value = computer?.ip || computer?.ipAddress || '';
    $('cpFormOs').value = computer?.os || computer?.sistema || computer?.licenca || '';
    if ($('cpFormData')) $('cpFormData').value = computer?.data || computer?.dataInstalacao || '';
    $('cpFormNotas').value = computer?.notas || computer?.obs || '';
    renderComputerChecklist(computer?.passos || computer?.checklist || []);
    openModal('cpModalComputador');
  }

  function nextCode() {
    const nums = state.computers.map((c) => String(computerCode(c)).match(/(\d+)/)?.[1]).filter(Boolean).map(Number);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `PC-${String(next).padStart(3,'0')}`;
  }

  async function saveComputer() {
    const payload = {
      codigo: text($('cpFormCodigo').value) || nextCode(),
      serial: text($('cpFormSerie').value),
      numeroSerie: text($('cpFormSerie').value),
      nome: text($('cpFormNome').value) || text($('cpFormCodigo').value),
      hostname: text($('cpFormNome').value) || text($('cpFormCodigo').value),
      modelo: text($('cpFormModelo').value) || 'Computador',
      local: text($('cpFormLocal').value) || 'Sem local',
      localizacao: text($('cpFormLocal').value) || 'Sem local',
      userNome: text($('cpFormUser').value),
      user: text($('cpFormUser').value),
      estado: $('cpFormEstado').value,
      ip: text($('cpFormIp').value),
      os: text($('cpFormOs').value),
      data: text($('cpFormData')?.value || ''),
      dataInstalacao: text($('cpFormData')?.value || ''),
      notas: text($('cpFormNotas').value),
      passos: readFormChecklist(),
      checklist: readFormChecklist(),
      percentInstalacao: installProgress({ passos: readFormChecklist() }).percent,
      tipoRegisto: 'computador',
      updatedAt: new Date().toISOString(),
      appVersion: VERSION
    };
    if (!payload.nome) { toast('Preenche o nome do computador.', 'error'); return; }
    const database = db();
    try {
      if (database) {
        const currentComputer = state.editingId ? findComputerById(state.editingId) : null;
        const targetCollection = currentComputer?.sourceCollection || (currentComputer?.legacy ? LEGACY_COLLECTION : COLLECTION);
        if (state.editingId && !String(state.editingId).startsWith('local_') && !String(state.editingId).startsWith('sample-')) {
          await database.collection(targetCollection).doc(state.editingId).set(payload, { merge: true });
        } else {
          await database.collection(COLLECTION).add({ ...payload, createdAt: new Date().toISOString() });
        }
      } else {
        const list = loadLocal(LOCAL_COMPUTERS_KEY, state.primaryComputers.length ? state.primaryComputers : []);
        if (state.editingId) {
          const idx = list.findIndex((c) => String(c.id) === String(state.editingId));
          if (idx >= 0) list[idx] = { ...list[idx], ...payload, id: state.editingId };
          else list.push({ ...payload, id: state.editingId });
        } else list.push({ ...payload, id: uid(), createdAt: new Date().toISOString() });
        saveLocal(LOCAL_COMPUTERS_KEY, list);
        state.primaryComputers = list;
      }
      closeModal('cpModalComputador');
      toast('Computador guardado.');
      render();
    } catch (err) {
      console.error(err);
      toast('Não consegui guardar no Firebase. Guardei localmente.', 'error');
      const list = loadLocal(LOCAL_COMPUTERS_KEY, []);
      list.push({ ...payload, id: state.editingId || uid(), createdAt: new Date().toISOString() });
      saveLocal(LOCAL_COMPUTERS_KEY, list);
      state.primaryComputers = list;
      closeModal('cpModalComputador');
      render();
    }
  }

  async function deleteComputer(computer) {
    if (!computer) return;
    if (!confirm(`Apagar ${computerCode(computer)}?`)) return;
    const database = db();
    try {
      if (database && !String(computer.id).startsWith('local_') && !String(computer.id).startsWith('sample-')) await database.collection(COLLECTION).doc(computer.id).delete();
      const list = loadLocal(LOCAL_COMPUTERS_KEY, []).filter((c) => String(c.id) !== String(computer.id));
      saveLocal(LOCAL_COMPUTERS_KEY, list);
      state.primaryComputers = state.primaryComputers.filter((c) => String(c.id) !== String(computer.id));
      toast('Computador apagado.');
      render();
    } catch (err) {
      console.error(err);
      toast('Erro ao apagar computador.', 'error');
    }
  }

  function openRecordModal(mode = 'Intervenção', computer = null) {
    state.recordMode = mode;
    setText('cpModalRegistoTitle', mode === 'Atribuição' ? 'Registar atribuição' : mode === 'Devolução' ? 'Registar devolução' : 'Registar intervenção');
    setText('cpModalRegistoSubtitle', mode === 'Atribuição' ? 'Atribua o computador a um utilizador.' : mode === 'Devolução' ? 'Registe a devolução e deixe o computador operacional.' : 'Guarde o registo e atualize o estado do computador.');
    fillRecordSelect();
    if (computer) $('cpRecordComputer').value = computer.id;
    $('cpRecordTipo').value = mode;
    $('cpRecordEstado').value = mode === 'Atribuição' ? 'Em uso' : mode === 'Devolução' ? 'Operacional' : (computer ? normalizeEstado(computer.estado, computer) : 'Operacional');
    $('cpRecordUser').value = computer ? computerUser(computer) : '';
    $('cpRecordData').value = inputDateTimeLocal();
    $('cpRecordLocal').value = computer ? computerLocal(computer) : '';
    $('cpRecordNotas').value = '';
    openModal('cpModalRegisto');
  }

  async function saveRecord() {
    const computer = findComputerById($('cpRecordComputer').value);
    if (!computer) { toast('Seleciona um computador.', 'error'); return; }
    const createdAt = parseDateTimeLocal($('cpRecordData').value);
    const payload = {
      computerId: computer.id,
      codigo: computerCode(computer),
      serial: computerSerial(computer),
      nome: computerName(computer),
      tipo: $('cpRecordTipo').value,
      estado: $('cpRecordEstado').value,
      user: text($('cpRecordUser').value),
      userNome: text($('cpRecordUser').value),
      local: text($('cpRecordLocal').value) || computerLocal(computer),
      notas: text($('cpRecordNotas').value),
      createdAt,
      appVersion: VERSION
    };
    const update = {
      estado: payload.estado,
      local: payload.local,
      localizacao: payload.local,
      userNome: payload.estado === 'Operacional' && payload.tipo === 'Devolução' ? '' : payload.user,
      user: payload.estado === 'Operacional' && payload.tipo === 'Devolução' ? '' : payload.user,
      lastRecordAt: createdAt,
      updatedAt: new Date().toISOString()
    };
    const database = db();
    try {
      if (database) {
        await database.collection(RECORDS_COLLECTION).add(payload);
        if (!String(computer.id).startsWith('local_') && !String(computer.id).startsWith('sample-')) await database.collection(COLLECTION).doc(computer.id).set(update, { merge: true });
      } else {
        const records = loadLocal(LOCAL_RECORDS_KEY, []);
        records.push({ ...payload, id: uid() });
        saveLocal(LOCAL_RECORDS_KEY, records);
        state.primaryRecords = records;
        const comps = loadLocal(LOCAL_COMPUTERS_KEY, state.primaryComputers);
        const idx = comps.findIndex((c) => String(c.id) === String(computer.id));
        if (idx >= 0) comps[idx] = { ...comps[idx], ...update };
        saveLocal(LOCAL_COMPUTERS_KEY, comps);
        state.primaryComputers = comps;
      }
      closeModal('cpModalRegisto');
      toast('Registo guardado.');
      render();
    } catch (err) {
      console.error(err);
      toast('Erro ao guardar registo.', 'error');
    }
  }

  function openDetail(computer) {
    if (!computer) return;
    state.selectedId = computer.id;
    setText('cpDetailTitle', `${computerCode(computer)} — ${computerName(computer)}`);
    const estado = normalizeEstado(computer.estado, computer);
    const progress = installProgress({ passos: normalizeInstallSteps(computer.passos || computer.checklist || []) });
    $('cpDetailGrid').innerHTML = [
      ['Código', computerCode(computer)], ['N.º Série', computerSerial(computer)], ['Nome', computerName(computer)], ['Modelo', computerModel(computer)],
      ['Local', computerLocal(computer)], ['Utilizador', computerUser(computer) || '—'], ['Estado', estado], ['IP', computer.ip || '—'], ['SO / Licença', computer.os || computer.sistema || computer.licenca || '—'], ['Instalação', `${progress.done}/${progress.total} · ${progress.percent}%`], ['Notas', computer.notas || computer.obs || '—']
    ].map(([k,v]) => `<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
    const stepHtml = `<div class="cp-detail-install"><div class="cp-install-progress compact"><span style="width:${progress.percent}%"></span></div><ul class="cp-install-steps compact">${progress.steps.map((step) => `<li class="${step.feito ? 'done' : 'open'}"><span></span>${esc(step.passo)}</li>`).join('')}</ul></div>`;
    const recs = recordsForComputer(computer).slice(0,6);
    $('cpDetailRecords').innerHTML = stepHtml + (recs.length ? recs.map((r) => `<div class="ck-modal-list-row"><strong>${esc(r.tipo)} · ${esc(formatDate(r.createdAt))}</strong><span>${esc(r.notas || r.estado || 'Sem notas')}</span></div>`).join('') : '<div class="ck-empty">Sem registos recentes.</div>');
    openModal('cpModalDetalhe');
  }

  function exportCsv() {
    const rows = filteredComputers();
    const header = ['Codigo','Serie','Nome','Modelo','Local','Utilizador','Estado','Instalacao %','Ultima intervencao','Notas'];
    const csvRows = [header, ...rows.map((c) => [computerCode(c), computerSerial(c), computerName(c), computerModel(c), computerLocal(c), computerUser(c), normalizeEstado(c.estado,c), installProgress({ passos: normalizeInstallSteps(c.passos || c.checklist || []) }).percent, formatDate(lastRecord(c)), c.notas || ''])];
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `computadores-appbraga-v${VERSION}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }



  async function saveInstallComputer() {
    const nameEl = $('cpInstallNome');
    const dateEl = $('cpInstallData');
    const nome = text(nameEl?.value || '');
    let data = text(dateEl?.value || '');
    if (!nome) { toast('Nome do computador obrigatório.', 'error'); return; }
    if (!data) data = 'Sem Data';
    const passos = INSTALL_STEPS.map((step, index) => ({ passo: step, feito: !!$('cpStep' + index)?.checked }));
    const payload = {
      nome,
      hostname: nome,
      codigo: nome,
      modelo: 'Computador',
      local: 'Sem local',
      localizacao: 'Sem local',
      estado: installProgress({ passos }).percent >= 100 ? 'Operacional' : 'Por configurar',
      data,
      passos,
      created: new Date(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      appVersion: VERSION,
      tipoRegisto: 'instalacao_computador'
    };
    const database = db();
    try {
      if (database) {
        await database.collection(LEGACY_COLLECTION).add(payload);
      } else {
        const list = loadLocal(LOCAL_COMPUTERS_KEY, []);
        list.push({ ...payload, id: uid(), sourceCollection: LEGACY_COLLECTION, legacy: true });
        saveLocal(LOCAL_COMPUTERS_KEY, list);
        state.legacyComputers = list.map(normalizeComputer);
      }
      if (nameEl) nameEl.value = '';
      if (dateEl) dateEl.value = '';
      renderInstallChecklist();
      toast('Computador guardado com checklist.');
      render();
    } catch (err) {
      console.error(err);
      toast('Erro no Firebase. Guardei localmente.', 'error');
      const list = loadLocal(LOCAL_COMPUTERS_KEY, []);
      list.push({ ...payload, id: uid(), sourceCollection: LEGACY_COLLECTION, legacy: true });
      saveLocal(LOCAL_COMPUTERS_KEY, list);
      state.legacyComputers = list.map(normalizeComputer);
      if (nameEl) nameEl.value = '';
      if (dateEl) dateEl.value = '';
      renderInstallChecklist();
      render();
    }
  }

  async function deleteInstallComputer(pc) {
    if (!pc) return;
    if (!confirm(`Apagar o registo de instalação de ${computerName(pc)}?`)) return;
    const collection = pc.sourceCollection || (pc.legacy ? LEGACY_COLLECTION : COLLECTION);
    const database = db();
    try {
      if (database && !String(pc.id).startsWith('local_') && !String(pc.id).startsWith('sample-')) {
        await database.collection(collection).doc(pc.id).delete();
      } else {
        const list = loadLocal(LOCAL_COMPUTERS_KEY, []);
        const next = list.filter((c) => String(c.id) !== String(pc.id));
        saveLocal(LOCAL_COMPUTERS_KEY, next);
        state.primaryComputers = next.map(normalizeComputer);
      }
      toast('Registo apagado.');
      render();
    } catch (err) {
      console.error(err);
      toast('Erro ao apagar registo.', 'error');
    }
  }

  function copyInstallToForm(pc) {
    if (!pc) return;
    const nameEl = $('cpInstallNome');
    const dateEl = $('cpInstallData');
    if (nameEl) nameEl.value = computerName(pc);
    if (dateEl && pc.data && pc.data !== 'Sem Data') dateEl.value = pc.data;
    renderInstallChecklist();
    const steps = Array.isArray(pc.passos) ? pc.passos : [];
    steps.forEach((step, index) => {
      const cb = $('cpStep' + index);
      if (cb) cb.checked = !!step.feito;
    });
    document.querySelector('.cp-install-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function bindEvents() {
    $('cpBtnNovo')?.addEventListener('click', () => openComputerModal());
    $('cpSaveComputerBtn')?.addEventListener('click', saveComputer);
    $('cpBtnAtribuir')?.addEventListener('click', () => openRecordModal('Atribuição'));
    $('cpBtnDevolver')?.addEventListener('click', () => openRecordModal('Devolução'));
    $('cpBtnIntervencao')?.addEventListener('click', () => openRecordModal('Intervenção'));
    $('cpBtnRelatorio')?.addEventListener('click', exportCsv);
    $('cpChecklistAllBtn')?.addEventListener('click', () => document.querySelectorAll('#cpFormChecklist input[type="checkbox"]').forEach((cb) => { cb.checked = true; }));
    $('cpChecklistClearBtn')?.addEventListener('click', () => document.querySelectorAll('#cpFormChecklist input[type="checkbox"]').forEach((cb) => { cb.checked = false; }));
    $('cpInstallSaveBtn')?.addEventListener('click', saveInstallComputer);
    $('cpSaveRecordBtn')?.addEventListener('click', saveRecord);
    $('cpBtnLimpar')?.addEventListener('click', () => { $('cpSearch').value=''; $('cpFilterLocal').value=''; $('cpFilterEstado').value=''; state.page=1; renderTable(); });
    ['cpSearch','cpFilterLocal','cpFilterEstado'].forEach((id) => $(id)?.addEventListener('input', () => { state.page=1; renderTable(); }));
    $('cpPageSize')?.addEventListener('change', (e) => { state.pageSize = Number(e.target.value) || 10; state.page=1; renderTable(); });
    document.addEventListener('click', (e) => {
      const close = e.target.closest('[data-cp-close]');
      if (close) {
        const type = close.getAttribute('data-cp-close');
        closeModal(type === 'computer' ? 'cpModalComputador' : type === 'detail' ? 'cpModalDetalhe' : 'cpModalRegisto');
      }
      const pageBtn = e.target.closest('[data-cp-page]');
      if (pageBtn && !pageBtn.disabled) { state.page = Number(pageBtn.getAttribute('data-cp-page')) || 1; renderTable(); }
      const installAction = e.target.closest('[data-cp-install-action]');
      if (installAction) {
        const pc = findComputerById(installAction.getAttribute('data-id'));
        if (!pc) return;
        const a = installAction.getAttribute('data-cp-install-action');
        if (a === 'copy') copyInstallToForm(pc);
        if (a === 'delete') deleteInstallComputer(pc);
      }
      const action = e.target.closest('[data-cp-action]');
      if (action) {
        const computer = findComputerById(action.getAttribute('data-id'));
        if (!computer) return;
        const a = action.getAttribute('data-cp-action');
        if (a === 'view') openDetail(computer);
        if (a === 'edit') openComputerModal(computer);
        if (a === 'menu') openComputerMenu(computer);
      }
    });
    $('cpDetailEditBtn')?.addEventListener('click', () => { const c = findComputerById(state.selectedId); closeModal('cpModalDetalhe'); openComputerModal(c); });
    $('cpDetailInterventionBtn')?.addEventListener('click', () => { const c = findComputerById(state.selectedId); closeModal('cpModalDetalhe'); openRecordModal('Intervenção', c); });
  }

  function openComputerMenu(computer) {
    const choice = prompt(`Ações para ${computerCode(computer)}:\n1 - Registar atribuição\n2 - Registar devolução\n3 - Registar intervenção\n4 - Apagar`, '3');
    if (choice === '1') openRecordModal('Atribuição', computer);
    else if (choice === '2') openRecordModal('Devolução', computer);
    else if (choice === '3') openRecordModal('Intervenção', computer);
    else if (choice === '4') deleteComputer(computer);
  }

  function subscribe() {
    const database = db();
    const localComputers = loadLocal(LOCAL_COMPUTERS_KEY, []);
    const localRecords = loadLocal(LOCAL_RECORDS_KEY, []);
    state.primaryComputers = localComputers.length ? localComputers.map(normalizeComputer) : [];
    state.primaryRecords = localRecords.map(normalizeRecord);
    if (!database) {
      if (!state.primaryComputers.length) state.primaryComputers = sampleComputers();
      state.records = state.primaryRecords;
      render();
      return;
    }
    try {
      state.unsubscribeComputers = database.collection(COLLECTION).onSnapshot((snap) => {
        state.primaryComputers = snap.docs.map((d) => normalizeComputer({ id: d.id, _collection: COLLECTION, ...d.data() }));
        if (!state.primaryComputers.length && !state.legacyComputers.length && localComputers.length) state.primaryComputers = localComputers.map(normalizeComputer);
        render();
      }, () => { state.primaryComputers = localComputers.length ? localComputers.map(normalizeComputer) : sampleComputers(); render(); });
    } catch (_) {}
    try {
      state.unsubscribeLegacyComputers = database.collection(LEGACY_COLLECTION).onSnapshot((snap) => {
        state.legacyComputers = snap.docs.map((d) => normalizeComputer({ id: d.id, legacy: true, _collection: LEGACY_COLLECTION, ...d.data() }));
        render();
      }, () => { render(); });
    } catch (_) {}
    try {
      state.unsubscribeRecords = database.collection(RECORDS_COLLECTION).onSnapshot((snap) => {
        state.primaryRecords = snap.docs.map((d) => normalizeRecord({ id: d.id, ...d.data() }));
        mergeRecords();
        render();
      }, () => { mergeRecords(); render(); });
    } catch (_) {}
    LEGACY_RECORDS_COLLECTIONS.forEach((collection) => {
      try {
        const unsub = database.collection(collection).onSnapshot((snap) => {
          const rest = state.legacyRecords.filter((r) => r._collection !== collection);
          const next = snap.docs.map((d) => normalizeRecord({ id: d.id, _collection: collection, legacy: true, ...d.data() }));
          state.legacyRecords = [...rest, ...next];
          mergeRecords();
          render();
        }, () => {});
        state.legacyRecordUnsubs.push(unsub);
      } catch (_) {}
    });
    setTimeout(() => { if (!state.primaryComputers.length && !state.legacyComputers.length) { state.primaryComputers = localComputers.length ? localComputers.map(normalizeComputer) : sampleComputers(); render(); } }, 1400);
  }

  function mergeRecords() {
    const map = new Map();
    [...state.legacyRecords, ...state.primaryRecords].forEach((r) => {
      const key = lower(r.id || `${r.computerId}-${r.codigo}-${r.createdAt}-${r.tipo}`);
      if (key) map.set(key, { ...(map.get(key) || {}), ...r });
    });
    state.records = Array.from(map.values()).sort((a,b) => recordTime(b) - recordTime(a));
  }

  function init() {
    try {
      document.documentElement.classList.add('cp-v15895-ready');
      document.querySelectorAll('.ck-version').forEach((node) => { node.innerHTML = 'Versão&nbsp; v1.58.165'; });
      document.querySelectorAll('.app-braga-version-fixed,.version-pill,.app-version-badge,#appVersionBadge').forEach((node) => {
        if (node && !node.classList.contains('ck-version')) node.style.display = 'none';
      });
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations?.().then((regs) => regs.forEach((reg) => reg.update?.())).catch(() => {});
      }
    } catch (_) {}
    renderComputerChecklist([]);
    bindEvents();
    state.pageSize = Number($('cpPageSize')?.value || 10);
    subscribe();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
