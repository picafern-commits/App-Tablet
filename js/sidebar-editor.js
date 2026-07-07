/* App Braga - Sidebar editavel v1.56.9 - Firebase persistente */
(function(){
  'use strict';
  const STORAGE_KEY = 'appBraga.sidebar.customLayout';
  const LEGACY_STORAGE_KEYS = ['appBraga.sidebar.customLayout.v1568','appBraga.sidebar.customLayout.v1567','appBraga.sidebar.customLayout.v1566'];
  const FIRESTORE_COLLECTION = 'config';
  const FIRESTORE_DOC = 'sidebarLayout';
  const CURRENT_VERSION = '1.58.172';

  const DEFAULT_PAGES = [
    { id:'dashboard', label:'Dashboard', href:'index.html', icon:'ðŸ ', group:'favoritos', locked:true },
    { id:'stock', label:'Stock', href:'stock.html', icon:'ðŸ“¦', group:'favoritos' },
    { id:'diretorio', label:'DiretÃ³rio', href:'diretorio.html', icon:'â˜Žï¸', group:'favoritos' },
    { id:'impressoras', label:'Impressoras', href:'impressoras.html', icon:'ðŸ–¨ï¸', group:'favoritos' },
    { id:'add-toner', label:'Adicionar Toner', href:'add-toner.html', icon:'âž•', group:'operacao' },
    { id:'historico', label:'HistÃ³rico', href:'historico.html', icon:'ðŸ§¾', group:'operacao' },
    { id:'tarefas', label:'Tarefas', href:'tarefas.html', icon:'âœ…', group:'operacao' },
    { id:'equipas-semanais', label:'Equipas Semanais', href:'equipas-semanais.html', icon:'ðŸ‘¥', group:'operacao' },
    { id:'scanner-ia', label:'Scanner IA', href:'scanner-ia.html', icon:'ðŸ“„', group:'operacao' },
    { id:'etiquetas-word', label:'Etiquetas Word', href:'/html/etiquetas-word.html?v=1.58.172', icon:'ðŸ·ï¸', group:'operacao' },
    { id:'manutencao-impressoras', label:'ManutenÃ§Ã£o Impressoras', href:'manutencao-impressoras.html', icon:'ðŸ› ï¸', group:'equipamentos' },
    { id:'computadores', label:'Computadores', href:'computadores.html', icon:'ðŸ’»', group:'equipamentos' },
    { id:'pistolas', label:'Pistolas CK65', href:'pistolas.html', icon:'ðŸ“Ÿ', group:'equipamentos' },
    { id:'radios', label:'RÃ¡dios', href:'radios.html', icon:'ðŸ“¡', group:'equipamentos' },
    { id:'portas', label:'Portas Rede', href:'portas.html', icon:'ðŸ”Œ', group:'infraestrutura' },
    { id:'informacoes', label:'InformaÃ§Ãµes', href:'informacoes.html', icon:'â„¹ï¸', group:'infraestrutura' },
    { id:'users', label:'Users', href:'users.html', icon:'ðŸ‘¥', group:'administracao' },
    { id:'diagnostico', label:'DiagnÃ³stico', href:'diagnostico.html', icon:'ðŸ©º', group:'administracao' },
    { id:'notificacoes', label:'NotificaÃ§Ãµes', href:'notificacoes.html', icon:'ðŸ””', group:'administracao' },
    { id:'config', label:'ConfiguraÃ§Ãµes', href:'config.html', icon:'âš™ï¸', group:'administracao', locked:true }
  ];

  const DEFAULT_GROUPS = [
    { id:'favoritos', label:'Favoritos', icon:'â­', locked:true, alwaysOpen:true },
    { id:'operacao', label:'OperaÃ§Ã£o', icon:'âš¡' },
    { id:'equipamentos', label:'Equipamentos', icon:'ðŸ§°' },
    { id:'infraestrutura', label:'Infraestrutura', icon:'ðŸŒ' },
    { id:'administracao', label:'AdministraÃ§Ã£o', icon:'âš™ï¸', locked:true }
  ];

  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function normaliseId(text){
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || ('grupo-' + Date.now());
  }
  function defaultLayout(){ return { version:CURRENT_VERSION, updatedAt:Date.now(), source:'default', groups:clone(DEFAULT_GROUPS), pages:clone(DEFAULT_PAGES) }; }

  function normalizePageHref(page){
    if (!page || typeof page !== 'object') return page;
    const clean = Object.assign({}, page);
    const rawHref = String(clean.href || '').trim();
    const file = rawHref.split('?')[0].split('#')[0].split('/').pop().toLowerCase();
    const rawId = String(clean.id || '').toLowerCase();
    const rawLabel = String(clean.label || '').toLowerCase();
    const isEtiquetasLegacy = file === 'etiquetas.html'
      || file === 'etiqueta.html'
      || file === 'etiquetas-word.html'
      || rawId === 'etiquetas'
      || rawId === 'etiquetas-word'
      || rawLabel.includes('etiquetas word')
      || rawLabel === 'etiquetas';
    if (isEtiquetasLegacy) {
      clean.id = 'etiquetas-word';
      clean.label = clean.label || 'Etiquetas Word';
      clean.href = '/html/etiquetas-word.html?v=1.58.172';
      clean.icon = clean.icon || 'ðŸ·ï¸';
      clean.group = clean.group || 'operacao';
    }
    return clean;
  }
  function readLocal(){
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (current) return current;
      for (const key of LEGACY_STORAGE_KEYS) {
        const legacy = JSON.parse(localStorage.getItem(key) || 'null');
        if (legacy) return legacy;
      }
    } catch(e){}
    return null;
  }
  function hasLocalLayout(){
    try {
      if (localStorage.getItem(STORAGE_KEY)) return true;
      return LEGACY_STORAGE_KEYS.some(k => !!localStorage.getItem(k));
    } catch(e){ return false; }
  }
  function writeLocal(layout){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      LEGACY_STORAGE_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
    } catch(e){}
  }
  function getDb(){ return (window.db && window.db.collection) ? window.db : null; }
  function setStatus(message, type){
    const el = document.getElementById('sidebarEditorStatus');
    if (!el) return;
    el.textContent = message || '';
    el.dataset.type = type || 'info';
  }
  function downloadText(filename, text){
    const blob = new Blob([text], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  function mergeLayout(layout){
    const base = defaultLayout();
    if (!layout || typeof layout !== 'object') return base;
    const groupsById = new Map(base.groups.map(g => [g.id, g]));
    (layout.groups || []).forEach(g => {
      if (!g || !g.id) return;
      const original = groupsById.get(g.id) || {};
      groupsById.set(g.id, Object.assign({}, original, g, { id:g.id }));
    });
    let groups = Array.from(groupsById.values());
    const groupIds = new Set(groups.map(g => g.id));
    const pagesById = new Map(base.pages.map(p => [p.id, normalizePageHref(p)]));
    (layout.pages || []).forEach(raw => {
      const p = normalizePageHref(raw);
      if (!p || !p.id) return;
      const original = pagesById.get(p.id) || {};
      const next = normalizePageHref(Object.assign({}, original, p, { id:p.id }));
      if (!groupIds.has(next.group)) next.group = 'administracao';
      pagesById.set(next.id, next);
    });
    let pages = Array.from(pagesById.values()).filter(p => p && p.href);
    /* v1.58.172: remove duplicados antigos vindos da Firebase/localStorage, sobretudo Etiquetas -> etiquetas.html. */
    const seenHref = new Set();
    pages = pages.filter(function(p){
      const key = String(p.href || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase();
      const id = String(p.id || '').toLowerCase();
      const dedupe = (id === 'etiquetas' ? 'etiquetas-word' : id) + '|' + key;
      if (seenHref.has(dedupe)) return false;
      seenHref.add(dedupe);
      return true;
    });
    if (!pages.some(p => p.id === 'dashboard')) pages.unshift(base.pages[0]);
    if (!pages.some(p => p.id === 'config')) pages.push(base.pages.find(p => p.id === 'config'));
    groups.forEach((g, idx) => { if (typeof g.order !== 'number') g.order = idx; });
    pages.forEach((p, idx) => { if (typeof p.order !== 'number') p.order = idx; if (p.visible === undefined) p.visible = true; });
    groups.sort((a,b) => (a.order||0) - (b.order||0));
    pages.sort((a,b) => (a.order||0) - (b.order||0));
    return { version:CURRENT_VERSION, updatedAt:layout.updatedAt || Date.now(), source:layout.source || 'local', groups, pages };
  }
  function getLayout(){ return mergeLayout(readLocal()); }
  function currentPage(){ return ((location.pathname || '').split('/').pop() || 'index.html').toLowerCase(); }
  function createLink(page){
    const a = document.createElement('a');
    a.href = page.href;
    a.dataset.icon = page.icon || 'â€¢';
    a.innerHTML = '<span class="sidebar-link-text"></span>';
    a.querySelector('.sidebar-link-text').textContent = page.label || page.href;
    const href = (page.href || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase();
    if (href === currentPage()) { a.classList.add('active'); a.setAttribute('aria-current','page'); }
    a.title = page.label || page.href;
    return a;
  }
  function renderSidebar(layout){
    const sidebar = document.querySelector('aside.sidebar, .sidebar');
    if (!sidebar) return;
    const nav = sidebar.querySelector('.sidebar-nav-pro, nav') || document.createElement('nav');
    nav.className = 'sidebar-nav-pro';
    nav.setAttribute('aria-label', 'NavegaÃ§Ã£o principal');
    nav.innerHTML = '';
    const groups = (layout.groups || []).filter(Boolean);
    const pages = (layout.pages || []).filter(p => p && p.visible !== false);
    groups.forEach((group, groupIndex) => {
      const groupPages = pages.filter(p => p.group === group.id);
      if (!groupPages.length && !group.locked) return;
      if (group.id === 'favoritos') {
        const sec = document.createElement('section');
        sec.className = 'sidebar-favorites';
        sec.dataset.sidebarSection = 'favorites';
        sec.innerHTML = '<div class="sidebar-section-title"><span></span><strong></strong></div>';
        sec.querySelector('span').textContent = group.icon || 'â­';
        sec.querySelector('strong').textContent = group.label || 'Favoritos';
        groupPages.forEach(p => sec.appendChild(createLink(p)));
        nav.appendChild(sec);
        const div = document.createElement('div'); div.className = 'sidebar-divider'; nav.appendChild(div);
        return;
      }
      const section = document.createElement('section');
      section.className = 'sidebar-group';
      section.dataset.sidebarGroup = group.id;
      section.innerHTML = '<button class="sidebar-group-toggle" type="button" aria-expanded="false"><span class="sidebar-group-left"><span class="sidebar-group-icon"></span><span class="sidebar-group-title"></span></span><span class="sidebar-group-chevron">â€º</span></button><div class="sidebar-group-links"></div>';
      section.querySelector('.sidebar-group-icon').textContent = group.icon || 'ðŸ“';
      section.querySelector('.sidebar-group-title').textContent = group.label || group.id;
      const links = section.querySelector('.sidebar-group-links');
      groupPages.forEach(p => links.appendChild(createLink(p)));
      const hasCurrent = !!links.querySelector('a.active');
      const saved = readGroupState(group.id);
      const isOpen = saved === null ? hasCurrent : saved;
      section.classList.toggle('is-open', !!isOpen);
      section.querySelector('.sidebar-group-toggle').setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      nav.appendChild(section);
    });
    if (!nav.parentNode) sidebar.appendChild(nav);
    sidebar.classList.add('sidebar-pro-groups','sidebar-collapsible-pro','sidebar-layout-custom-ready');
    document.documentElement.classList.add('sidebar-layout-custom-ready');
  }
  function readGroupState(id){
    try {
      const data = JSON.parse(localStorage.getItem('appBraga.sidebar.groups.open.v1557') || '{}');
      return Object.prototype.hasOwnProperty.call(data, id) ? !!data[id] : null;
    } catch(e){ return null; }
  }
  function saveGroupState(id, open){
    try {
      const key = 'appBraga.sidebar.groups.open.v1557';
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      data[id] = !!open;
      localStorage.setItem(key, JSON.stringify(data));
    } catch(e){}
  }
  function bindSidebar(){
    if (document.body.dataset.sidebarEditorBound === '1') return;
    document.body.dataset.sidebarEditorBound = '1';
    document.addEventListener('click', function(ev){
      const toggle = ev.target.closest && ev.target.closest('.sidebar-group-toggle');
      if (toggle && toggle.closest('.sidebar')) {
        const group = toggle.closest('.sidebar-group');
        if (group) saveGroupState(group.dataset.sidebarGroup, group.classList.contains('is-open'));
      }
    }, true);
  }
  async function waitForDb(timeoutMs){
    const started = Date.now();
    while (Date.now() - started < (timeoutMs || 6000)) {
      const db = getDb();
      if (db) return db;
      await new Promise(r => setTimeout(r, 160));
    }
    return null;
  }
  async function readRemoteLayout(){
    const db = await waitForDb(2500);
    if (!db) return null;
    const doc = await db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).get();
    return doc && doc.exists ? mergeLayout(Object.assign({}, doc.data(), { source:'firebase' })) : null;
  }
  async function backupRemoteLayout(db, previous){
    if (!db || !previous) return;
    try {
      const id = new Date().toISOString().replace(/[:.]/g,'-');
      await db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).collection('backups').doc(id).set(Object.assign({}, previous, { backupAt:Date.now() }));
    } catch(e){ console.warn('[SidebarEditor] backup failed', e); }
  }
  async function loadRemoteOnce(force){
    try {
      const remote = await readRemoteLayout();
      const hasLocal = hasLocalLayout();
      const local = hasLocal ? getLayout() : null;
      // Muito importante: se este dispositivo nunca guardou layout local, a Firebase ganha sempre.
      // Antes o layout padrao criava updatedAt novo em cada arranque e parecia sempre mais recente,
      // por isso os outros dispositivos nunca recebiam a sidebar personalizada.
      if (remote && (force || !hasLocal || (remote.updatedAt || 0) >= (local?.updatedAt || 0))) {
        writeLocal(remote);
        renderSidebar(remote);
        renderEditor(remote);
        setStatus('Sidebar carregada da Firebase.', 'success');
        return remote;
      }
      if (remote && hasLocal && (local.updatedAt || 0) > (remote.updatedAt || 0)) {
        setStatus('Tens alteraÃ§Ãµes locais mais recentes. Carrega em Guardar na Firebase para sincronizar.', 'warn');
      }
    } catch(e){ console.warn('[SidebarEditor] remote load failed', e); setStatus('NÃ£o consegui ler a sidebar da Firebase. A usar cÃ³pia local.', 'warn'); }
    return null;
  }
  async function saveLayout(layout, options){
    options = options || {};
    const clean = mergeLayout(Object.assign({}, layout, { updatedAt:Date.now(), version:CURRENT_VERSION, source:'firebase' }));
    writeLocal(clean);
    renderSidebar(clean);
    renderEditor(clean);
    const db = await waitForDb(5000);
    if (db) {
      try {
        const ref = db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC);
        const prevDoc = await ref.get().catch(() => null);
        if (prevDoc && prevDoc.exists) await backupRemoteLayout(db, mergeLayout(prevDoc.data()));
        await ref.set(clean, { merge:false });
        setStatus('Sidebar guardada na Firebase. Vai aparecer igual nos outros dispositivos.', 'success');
      }
      catch(e){ console.warn('[SidebarEditor] remote save failed', e); setStatus('Guardou localmente, mas falhou ao guardar na Firebase: ' + (e.message || e), 'error'); }
    } else {
      setStatus('Guardou localmente, mas a Firebase ainda nÃ£o estÃ¡ disponÃ­vel.', 'warn');
    }
    return clean;
  }
  async function reloadFromFirebase(){
    const remote = await loadRemoteOnce(true);
    if (!remote) setStatus('NÃ£o encontrei layout guardado na Firebase.', 'warn');
    return remote;
  }
  function pageOptions(groups, selected){
    return groups.map(g => '<option value="' + escapeAttr(g.id) + '"' + (g.id === selected ? ' selected' : '') + '>' + escapeHtml((g.icon || '') + ' ' + (g.label || g.id)) + '</option>').join('');
  }
  function escapeHtml(s){ return String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function escapeAttr(s){ return escapeHtml(s).replace(/'/g, '&#39;'); }
  function renderEditor(layout){
    const mount = document.getElementById('sidebarEditorMount');
    if (!mount) return;
    layout = mergeLayout(layout || getLayout());
    mount.innerHTML = `
      <div class="sidebar-editor-toolbar">
        <button type="button" class="primary-btn" id="sidebarCreateGroupBtn" data-sidebar-action="add-group" onclick="window.AppBragaSidebarEditor&&window.AppBragaSidebarEditor.createGroupInteractive&&window.AppBragaSidebarEditor.createGroupInteractive(event)">Criar aba</button>
        <button type="button" class="primary-btn" data-sidebar-action="save">Guardar na Firebase</button>
        <button type="button" class="secondary-btn" data-sidebar-action="reload-firebase">Recarregar Firebase</button>
        <button type="button" class="secondary-btn" data-sidebar-action="export">Exportar layout</button>
        <button type="button" class="secondary-btn" data-sidebar-action="import">Importar layout</button>
        <button type="button" class="secondary-btn" data-sidebar-action="reset">Restaurar padrÃ£o</button>
        <input type="file" id="sidebarImportFile" accept="application/json,.json" hidden>
      </div>
      <div id="sidebarEditorStatus" class="sidebar-editor-status" role="status"></div>
      <div class="sidebar-editor-grid">
        <section class="sidebar-editor-card">
          <h4>Abas</h4>
          <div class="sidebar-editor-list" data-sidebar-groups></div>
        </section>
        <section class="sidebar-editor-card sidebar-editor-pages-card">
          <h4>PÃ¡ginas</h4>
          <p class="sidebar-editor-hint">Muda a aba, emoji e visibilidade de cada pÃ¡gina.</p>
          <div class="sidebar-editor-list" data-sidebar-pages></div>
        </section>
      </div>
    `;
    const groupHost = mount.querySelector('[data-sidebar-groups]');
    layout.groups.forEach((g, idx) => {
      const row = document.createElement('div');
      row.className = 'sidebar-editor-row sidebar-editor-group-row';
      row.dataset.groupId = g.id;
      row.innerHTML = `
        <input class="sidebar-editor-emoji" data-field="icon" value="${escapeAttr(g.icon || '')}" maxlength="4" title="Emoji">
        <input class="sidebar-editor-name" data-field="label" value="${escapeAttr(g.label || '')}" ${g.locked ? 'readonly' : ''}>
        <div class="sidebar-editor-row-actions">
          <button type="button" data-sidebar-action="group-up" ${idx === 0 ? 'disabled' : ''}>â†‘</button>
          <button type="button" data-sidebar-action="group-down" ${idx === layout.groups.length - 1 ? 'disabled' : ''}>â†“</button>
          <button type="button" class="danger" data-sidebar-action="delete-group" ${g.locked ? 'disabled' : ''}>Apagar</button>
        </div>`;
      groupHost.appendChild(row);
    });
    const pageHost = mount.querySelector('[data-sidebar-pages]');
    layout.pages.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'sidebar-editor-row sidebar-editor-page-row';
      row.dataset.pageId = p.id;
      row.innerHTML = `
        <label class="sidebar-editor-visible"><input type="checkbox" data-field="visible" ${p.visible !== false ? 'checked' : ''} ${p.locked ? 'disabled' : ''}> Mostrar</label>
        <input class="sidebar-editor-emoji" data-field="icon" value="${escapeAttr(p.icon || '')}" maxlength="4" title="Emoji">
        <div class="sidebar-editor-page-title"><strong>${escapeHtml(p.label)}</strong><small>${escapeHtml(p.href)}</small></div>
        <select data-field="group">${pageOptions(layout.groups, p.group)}</select>
        <div class="sidebar-editor-row-actions">
          <button type="button" data-sidebar-action="page-up" ${idx === 0 ? 'disabled' : ''}>â†‘</button>
          <button type="button" data-sidebar-action="page-down" ${idx === layout.pages.length - 1 ? 'disabled' : ''}>â†“</button>
        </div>`;
      pageHost.appendChild(row);
    });
    bindEditor(mount, layout);
  }
  function collectEditor(mount, layout){
    layout = mergeLayout(layout || getLayout());
    const groups = [];
    mount.querySelectorAll('.sidebar-editor-group-row').forEach((row, idx) => {
      const old = layout.groups.find(g => g.id === row.dataset.groupId) || {};
      groups.push(Object.assign({}, old, {
        id: row.dataset.groupId,
        icon: row.querySelector('[data-field="icon"]').value.trim() || 'ðŸ“',
        label: row.querySelector('[data-field="label"]').value.trim() || old.label || 'Aba',
        order: idx
      }));
    });
    const pages = [];
    mount.querySelectorAll('.sidebar-editor-page-row').forEach((row, idx) => {
      const old = layout.pages.find(p => p.id === row.dataset.pageId) || {};
      const visibleBox = row.querySelector('[data-field="visible"]');
      pages.push(Object.assign({}, old, {
        id: row.dataset.pageId,
        icon: row.querySelector('[data-field="icon"]').value.trim() || old.icon || 'â€¢',
        group: row.querySelector('[data-field="group"]').value,
        visible: visibleBox ? !!visibleBox.checked : true,
        order: idx
      }));
    });
    return mergeLayout({ groups, pages, updatedAt:Date.now(), version:CURRENT_VERSION });
  }
  function showToast(message, type){
    try {
      if (typeof window.mostrarMensagem === 'function') return window.mostrarMensagem(message, type || 'info');
    } catch(e){}
    if (type === 'erro') console.warn(message); else console.log(message);
  }
  function openAddGroupDialog(){
    return new Promise((resolve) => {
      const old = document.getElementById('sidebarAddGroupModal');
      if (old) old.remove();
      const modal = document.createElement('div');
      modal.id = 'sidebarAddGroupModal';
      modal.className = 'sidebar-editor-modal-backdrop';
      modal.innerHTML = `
        <div class="sidebar-editor-modal" role="dialog" aria-modal="true" aria-label="Criar aba da sidebar">
          <div class="sidebar-editor-modal-head">
            <h3>Criar aba</h3>
            <button type="button" class="sidebar-editor-modal-close" data-modal-action="cancel">Ã—</button>
          </div>
          <label>Nome da aba
            <input type="text" id="sidebarNewGroupLabel" value="Nova Aba" autocomplete="off">
          </label>
          <label>Emoji da aba
            <input type="text" id="sidebarNewGroupIcon" value="ðŸ“" maxlength="6" autocomplete="off">
          </label>
          <div class="sidebar-editor-modal-actions">
            <button type="button" class="secondary-btn" data-modal-action="cancel">Cancelar</button>
            <button type="button" class="primary-btn" data-modal-action="confirm">Criar aba</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      const input = modal.querySelector('#sidebarNewGroupLabel');
      const icon = modal.querySelector('#sidebarNewGroupIcon');
      const close = (value) => { modal.remove(); resolve(value); };
      modal.addEventListener('click', (ev) => {
        const action = ev.target && ev.target.getAttribute('data-modal-action');
        if (!action && ev.target !== modal) return;
        if (action === 'cancel' || ev.target === modal) return close(null);
        if (action === 'confirm') {
          const label = (input.value || '').trim();
          if (!label) { input.focus(); return; }
          close({ label, icon:(icon.value || 'ðŸ“').trim() || 'ðŸ“' });
        }
      });
      modal.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') close(null);
        if (ev.key === 'Enter') {
          ev.preventDefault();
          const label = (input.value || '').trim();
          if (!label) { input.focus(); return; }
          close({ label, icon:(icon.value || 'ðŸ“').trim() || 'ðŸ“' });
        }
      });
      setTimeout(() => { input.focus(); input.select(); }, 40);
    });
  }

  async function createGroupInteractive(ev){
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const mount = document.getElementById('sidebarEditorMount');
    const baseLayout = mount ? collectEditor(mount, getLayout()) : getLayout();
    const result = await openAddGroupDialog();
    if (!result || !result.label) return false;
    let layout = mergeLayout(baseLayout);
    let id = normaliseId(result.label);
    let n = 2;
    while (layout.groups.some(g => g.id === id)) id = normaliseId(result.label) + '-' + (n++);
    layout.groups.push({ id, label:result.label, icon:result.icon || 'ðŸ“', order:layout.groups.length, visible:true });
    await saveLayout(layout);
    showToast('Aba criada.', 'sucesso');
    return true;
  }

  function bindEditor(mount, currentLayout){
    mount.onclick = async function(ev){
      const actionNode = ev.target && ev.target.closest ? ev.target.closest('[data-sidebar-action]') : null;
      const action = actionNode && actionNode.getAttribute('data-sidebar-action');
      if (!action || !mount.contains(actionNode)) return;
      ev.preventDefault();
      ev.stopPropagation();
      let layout = collectEditor(mount, currentLayout);
      if (action === 'add-group') {
        await createGroupInteractive(ev);
        return;
      }
      if (action === 'reset') {
        if (!confirm('Restaurar a sidebar padrÃ£o? Vai guardar tambÃ©m na Firebase.')) return;
        await saveLayout(defaultLayout());
        return;
      }
      if (action === 'save') {
        await saveLayout(layout);
        return;
      }
      if (action === 'reload-firebase') {
        await reloadFromFirebase();
        return;
      }
      if (action === 'export') {
        const data = JSON.stringify(layout, null, 2);
        downloadText('app-braga-sidebar-layout.json', data);
        setStatus('Layout exportado.', 'success');
        return;
      }
      if (action === 'import') {
        const file = mount.querySelector('#sidebarImportFile');
        if (file) file.click();
        return;
      }
      const groupRow = ev.target.closest('.sidebar-editor-group-row');
      const pageRow = ev.target.closest('.sidebar-editor-page-row');
      if (groupRow && (action === 'group-up' || action === 'group-down')) {
        const id = groupRow.dataset.groupId;
        const i = layout.groups.findIndex(g => g.id === id);
        const j = action === 'group-up' ? i - 1 : i + 1;
        if (i >= 0 && j >= 0 && j < layout.groups.length) [layout.groups[i], layout.groups[j]] = [layout.groups[j], layout.groups[i]];
        layout.groups.forEach((g, idx) => g.order = idx);
        renderEditor(layout); return;
      }
      if (groupRow && action === 'delete-group') {
        const id = groupRow.dataset.groupId;
        const group = layout.groups.find(g => g.id === id);
        if (!group || group.locked) return;
        if (!confirm('Apagar esta aba? As pÃ¡ginas passam para AdministraÃ§Ã£o.')) return;
        layout.groups = layout.groups.filter(g => g.id !== id);
        layout.pages.forEach(p => { if (p.group === id) p.group = 'administracao'; });
        renderEditor(layout); return;
      }
      if (pageRow && (action === 'page-up' || action === 'page-down')) {
        const id = pageRow.dataset.pageId;
        const i = layout.pages.findIndex(p => p.id === id);
        const j = action === 'page-up' ? i - 1 : i + 1;
        if (i >= 0 && j >= 0 && j < layout.pages.length) [layout.pages[i], layout.pages[j]] = [layout.pages[j], layout.pages[i]];
        layout.pages.forEach((p, idx) => p.order = idx);
        renderEditor(layout); return;
      }
    };
    const importFile = mount.querySelector('#sidebarImportFile');
    if (importFile && !importFile.dataset.bound) {
      importFile.dataset.bound = '1';
      importFile.addEventListener('change', async function(){
        const file = importFile.files && importFile.files[0];
        importFile.value = '';
        if (!file) return;
        try {
          const text = await file.text();
          const imported = mergeLayout(JSON.parse(text));
          await saveLayout(imported);
          setStatus('Layout importado e guardado na Firebase.', 'success');
        } catch(e) {
          console.warn('[SidebarEditor] import failed', e);
          setStatus('NÃ£o consegui importar o layout: ' + (e.message || e), 'error');
        }
      });
    }
  }

  function bindEditorGlobalFallback(){
    if (document.body.dataset.sidebarEditorGlobalBound === '1') return;
    document.body.dataset.sidebarEditorGlobalBound = '1';
    document.addEventListener('click', function(ev){
      const btn = ev.target && ev.target.closest ? ev.target.closest('[data-sidebar-action="add-group"], #sidebarCreateGroupBtn') : null;
      if (!btn) return;
      const mount = document.getElementById('sidebarEditorMount');
      if (!mount || !mount.contains(btn)) return;
      createGroupInteractive(ev);
    }, true);
  }

  function boot(){
    const layout = getLayout();
    renderSidebar(layout);
    bindSidebar();
    renderEditor(layout);
    bindEditorGlobalFallback();
    // carregar Firebase logo que o db esteja pronto e repetir para vencer cache/arranque lento
    setTimeout(() => loadRemoteOnce(false), 120);
    setTimeout(() => loadRemoteOnce(false), 700);
    setTimeout(() => loadRemoteOnce(false), 2500);
  }
  window.AppBragaSidebarEditor = { defaultLayout, getLayout, saveLayout, renderSidebar, renderEditor, createGroupInteractive, reloadFromFirebase, exportLayout:()=>downloadText('app-braga-sidebar-layout.json', JSON.stringify(getLayout(), null, 2)) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('pageshow', () => setTimeout(boot, 60));
  window.addEventListener('focus', () => setTimeout(() => loadRemoteOnce(false), 120));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => loadRemoteOnce(false), 120); });
})();



