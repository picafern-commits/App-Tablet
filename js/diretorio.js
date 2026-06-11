
// ===== DIRETORIO TELEFONICO APP BRAGA V1.32.1 =====
(function(){
  const COLLECTION = 'diretorioTelefonico';
  let contactos = [];
  let contactoEditId = null;
  let unsubscribe = null;
  let collapsed = new Set();

  const $ = (id) => document.getElementById(id);
  const norm = (v) => String(v || '').trim();
  const lower = (v) => norm(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const telHref = (v) => norm(v).replace(/[^0-9+]/g,'');

  function setEstado(text, ok=true){
    const el = $('diretorioEstado');
    if(!el) return;
    el.textContent = text;
    el.style.background = ok ? '' : 'rgba(220,38,38,.25)';
  }

  function getValores(){
    return {
      nome: norm($('dirNome')?.value),
      seccao: norm($('dirSeccao')?.value) || 'Sem Secção',
      extensao: norm($('dirExtensao')?.value),
      telefone: norm($('dirTelefone')?.value),
      telemovel: norm($('dirTelemovel')?.value),
      email: norm($('dirEmail')?.value),
      local: norm($('dirLocal')?.value) || 'Sem Local',
      observacoes: norm($('dirObs')?.value),
      updatedAtMs: Date.now()
    };
  }

  function preencherModal(c={}){
    if($('dirNome')) $('dirNome').value = c.nome || '';
    if($('dirSeccao')) $('dirSeccao').value = c.seccao || '';
    if($('dirExtensao')) $('dirExtensao').value = c.extensao || '';
    if($('dirTelefone')) $('dirTelefone').value = c.telefone || '';
    if($('dirTelemovel')) $('dirTelemovel').value = c.telemovel || '';
    if($('dirEmail')) $('dirEmail').value = c.email || '';
    if($('dirLocal')) $('dirLocal').value = c.local || '';
    if($('dirObs')) $('dirObs').value = c.observacoes || '';
  }

  function atualizarFiltros(){
    const selSec = $('diretorioFiltroSeccao');
    const selLoc = $('diretorioFiltroLocal');
    if(!selSec || !selLoc) return;
    const currentSec = selSec.value;
    const currentLoc = selLoc.value;
    const seccoes = [...new Set(contactos.map(c => norm(c.seccao) || 'Sem Secção'))].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
    const locais = [...new Set(contactos.map(c => norm(c.local) || 'Sem Local'))].sort((a,b)=>a.localeCompare(b,'pt',{numeric:true}));
    selSec.innerHTML = '<option value="">Todas</option>' + seccoes.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    selLoc.innerHTML = '<option value="">Todos</option>' + locais.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    selSec.value = currentSec;
    selLoc.value = currentLoc;
  }

  function filtrados(){
    const q = lower($('diretorioPesquisa')?.value || '');
    const sec = lower($('diretorioFiltroSeccao')?.value || '');
    const loc = lower($('diretorioFiltroLocal')?.value || '');
    return contactos.filter(c => {
      const blob = lower([c.nome,c.extensao,c.telefone,c.telemovel,c.email,c.seccao,c.local,c.observacoes].join(' '));
      if(q && !blob.includes(q)) return false;
      if(sec && lower(c.seccao) !== sec) return false;
      if(loc && lower(c.local) !== loc) return false;
      return true;
    });
  }

  function agrupar(lista){
    const groups = new Map();
    lista.forEach(c => {
      const key = norm(c.seccao) || 'Sem Secção';
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    });
    for(const arr of groups.values()){
      arr.sort((a,b)=> String(a.nome||'').localeCompare(String(b.nome||''),'pt',{numeric:true}));
    }
    return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'pt',{numeric:true}));
  }

  window.renderDiretorio = function(){
    atualizarFiltros();
    const list = filtrados();
    const total = $('diretorioTotal');
    const seccoes = $('diretorioSeccoes');
    const telemoveis = $('diretorioTelemoveis');
    if(total) total.textContent = list.length;
    if(seccoes) seccoes.textContent = new Set(list.map(c => norm(c.seccao)||'Sem Secção')).size;
    if(telemoveis) telemoveis.textContent = list.filter(c => norm(c.telemovel)).length;

    const container = $('diretorioLista');
    if(!container) return;
    if(!list.length){
      container.innerHTML = '<div class="dir-empty">Ainda não existem contactos para mostrar.</div>';
      return;
    }

    container.innerHTML = agrupar(list).map(([sec, arr]) => {
      const isCollapsed = collapsed.has(sec);
      return `<article class="diretorio-section ${isCollapsed ? 'collapsed' : ''}" data-sec="${esc(sec)}">
        <div class="diretorio-section-head" onclick="toggleDiretorioSecao('${esc(sec).replace(/'/g,'\\&#39;')}')">
          <div class="diretorio-section-title"><span>☎</span><span>${esc(sec)}</span><span class="diretorio-count">${arr.length}</span></div>
          <div class="diretorio-chevron">⌄</div>
        </div>
        <div class="diretorio-table-wrap">
          <table class="diretorio-table">
            <thead><tr><th>Ações</th><th>Nome</th><th>Extensão</th><th>Telefone</th><th>Telemóvel</th><th>Email</th><th>Local</th><th>Obs.</th></tr></thead>
            <tbody>${arr.map(c => rowHtml(c)).join('')}</tbody>
          </table>
        </div>
      </article>`;
    }).join('');
  };

  function rowHtml(c){
    const phone = telHref(c.telefone);
    const mobile = telHref(c.telemovel);
    const email = norm(c.email);
    return `<tr>
      <td><div class="diretorio-row-actions">
        <button class="dir-icon-btn" title="Editar" onclick="editarContactoDiretorio('${esc(c.firebaseId)}')">✎</button>
        <button class="dir-icon-btn copy" title="Copiar contacto" onclick="copiarContactoDiretorio('${esc(c.firebaseId)}')">⧉</button>
        <button class="dir-icon-btn delete" title="Apagar" onclick="apagarContactoDiretorio('${esc(c.firebaseId)}')">×</button>
      </div></td>
      <td>${esc(c.nome || '-')}</td>
      <td>${esc(c.extensao || '-')}</td>
      <td>${phone ? `<a href="tel:${esc(phone)}">${esc(c.telefone)}</a>` : '<span class="dir-muted">-</span>'}</td>
      <td>${mobile ? `<a href="tel:${esc(mobile)}">${esc(c.telemovel)}</a>` : '<span class="dir-muted">-</span>'}</td>
      <td>${email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '<span class="dir-muted">-</span>'}</td>
      <td>${esc(c.local || '-')}</td>
      <td>${esc(c.observacoes || '-')}</td>
    </tr>`;
  }

  window.toggleDiretorioSecao = function(sec){
    const val = String(sec || '').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    if(collapsed.has(val)) collapsed.delete(val); else collapsed.add(val);
    window.renderDiretorio();
  };
  window.expandirDiretorio = function(){ collapsed.clear(); window.renderDiretorio(); };
  window.colapsarDiretorio = function(){ contactos.forEach(c=>collapsed.add(norm(c.seccao)||'Sem Secção')); window.renderDiretorio(); };
  window.limparFiltrosDiretorio = function(){ if($('diretorioPesquisa')) $('diretorioPesquisa').value=''; if($('diretorioFiltroSeccao')) $('diretorioFiltroSeccao').value=''; if($('diretorioFiltroLocal')) $('diretorioFiltroLocal').value=''; window.renderDiretorio(); };

  window.abrirModalDiretorio = function(id){
    contactoEditId = id || null;
    const c = contactos.find(x => String(x.firebaseId) === String(id));
    preencherModal(c || {});
    if($('modalDiretorioTitulo')) $('modalDiretorioTitulo').textContent = c ? 'Editar Contacto' : 'Novo Contacto';
    const modal = $('modalDiretorio');
    if(modal) modal.style.display = 'flex';
    setTimeout(()=> $('dirNome')?.focus(), 80);
  };
  window.fecharModalDiretorio = function(){ const modal = $('modalDiretorio'); if(modal) modal.style.display='none'; contactoEditId=null; };
  window.editarContactoDiretorio = function(id){ window.abrirModalDiretorio(id); };

  window.guardarContactoDiretorio = async function(){
    try{
      const dados = getValores();
      if(!dados.nome){ alert('Preenche pelo menos o nome do contacto.'); return; }
      if(!window.db?.collection) throw new Error('Firebase indisponível.');
      if(contactoEditId){
        await window.db.collection(COLLECTION).doc(String(contactoEditId)).update(dados);
      } else {
        dados.createdAtMs = Date.now();
        await window.db.collection(COLLECTION).add(dados);
      }
      window.fecharModalDiretorio();
      setEstado('Guardado');
    }catch(err){
      console.error('Erro ao guardar contacto:', err);
      alert('Erro ao guardar contacto: ' + (err?.message || err));
      setEstado('Erro ao guardar', false);
    }
  };

  window.apagarContactoDiretorio = async function(id){
    try{
      const c = contactos.find(x => String(x.firebaseId) === String(id));
      if(!confirm(`Apagar contacto ${c?.nome || ''}?`)) return;
      await window.db.collection(COLLECTION).doc(String(id)).delete();
      setEstado('Contacto apagado');
    }catch(err){
      console.error('Erro ao apagar contacto:', err);
      alert('Erro ao apagar contacto: ' + (err?.message || err));
    }
  };

  window.copiarContactoDiretorio = async function(id){
    const c = contactos.find(x => String(x.firebaseId) === String(id));
    if(!c) return;
    const txt = `${c.nome || ''}\nExt: ${c.extensao || '-'}\nTelefone: ${c.telefone || '-'}\nTelemóvel: ${c.telemovel || '-'}\nEmail: ${c.email || '-'}\nLocal: ${c.local || '-'}`;
    try{
      await navigator.clipboard.writeText(txt);
      setEstado('Contacto copiado');
    }catch(e){
      prompt('Copia o contacto:', txt);
    }
  };

  window.exportarDiretorioCSV = function(){
    const rows = [['Nome','Secção','Extensão','Telefone','Telemóvel','Email','Local','Observações'], ...filtrados().map(c => [c.nome,c.seccao,c.extensao,c.telefone,c.telemovel,c.email,c.local,c.observacoes])];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'diretorio-telefonico-app-braga.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  window.atualizarDiretorio = function(){ iniciarDiretorio(true); };

  function iniciarDiretorio(force=false){
    if(unsubscribe && force){ try{ unsubscribe(); }catch(e){} unsubscribe=null; }
    if(unsubscribe) return;
    if(!window.db?.collection){ setEstado('Firebase indisponível', false); return; }
    setEstado('A carregar...');
    unsubscribe = window.db.collection(COLLECTION).onSnapshot((snap)=>{
      contactos = [];
      snap.forEach(doc => contactos.push({firebaseId: doc.id, ...doc.data()}));
      contactos.sort((a,b)=> String(a.seccao||'').localeCompare(String(b.seccao||''),'pt',{numeric:true}) || String(a.nome||'').localeCompare(String(b.nome||''),'pt',{numeric:true}));
      localStorage.setItem('appBraga_diretorio_cache', JSON.stringify(contactos));
      setEstado(`${contactos.length} contactos`);
      window.renderDiretorio();
    }, (err)=>{
      console.error('Erro realtime diretorio:', err);
      try{ contactos = JSON.parse(localStorage.getItem('appBraga_diretorio_cache') || '[]'); }catch(e){ contactos=[]; }
      setEstado('Offline / cache', false);
      window.renderDiretorio();
    });
  }

  document.addEventListener('DOMContentLoaded', ()=> iniciarDiretorio());
})();
