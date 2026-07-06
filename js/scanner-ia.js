/* AppBraga v1.58.166 — Scanner IA futurista funcional */
(() => {
  'use strict';

  const VERSION = '1.58.166';
  const COLLECTION = 'scannerIaDigitalizacoes';
  const LOCAL_KEY = 'appbraga_scanner_ia_history_v158125';
  const state = { original:null, processed:null, selectedFile:null, selectedMeta:null, ocrText:'', items:[], page:1, pageSize:10, unsub:null, processing:false };
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (v) => String(v ?? '').trim();
  const lower = (v) => text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const uid = () => `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const db = () => window.db && typeof window.db.collection === 'function' ? window.db : null;

  const els = {};

  function loadLocal(){ try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') || []; } catch(_) { return []; } }
  function saveLocal(list){ try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0,250))); } catch(_){} }
  function toast(msg,type='ok'){
    if(typeof window.mostrarMensagem === 'function'){
      try{ window.mostrarMensagem(msg, type === 'error' ? 'erro' : 'sucesso'); return; }catch(_){}
    }
    let n = document.querySelector('.scanner-toast');
    if(!n){ n = document.createElement('div'); n.className = 'scanner-toast'; document.body.appendChild(n); }
    n.textContent = msg; n.className = `scanner-toast ${type}`; requestAnimationFrame(()=>n.classList.add('show'));
    clearTimeout(n._t); n._t = setTimeout(()=>n.classList.remove('show'), 2600);
  }
  function setStatus(message,type='info'){
    if(els.status){ els.status.textContent = message; els.status.dataset.type = type; }
    if(els.confidence){ els.confidence.textContent = type === 'ok' ? 'Concluído' : type === 'warn' ? 'Atenção' : type === 'error' ? 'Erro' : state.processing ? 'A processar' : 'Pronto'; els.confidence.className = `scanner-status-pill ${type === 'ok' ? 'ok' : type === 'warn' ? 'warn' : type === 'error' ? 'error' : 'neutral'}`; }
  }
  function normalizeFileName(value){
    const base = text(value) || todayName();
    return base.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'') || todayName();
  }
  function todayName(){ const d = new Date(); const pad = n => String(n).padStart(2,'0'); return `Documento_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`; }
  function fmtDate(v){ try{ const d = v && typeof v.toDate === 'function' ? v.toDate() : new Date(v); if(!isNaN(d)) return d.toLocaleDateString('pt-PT'); }catch(_){} return '—'; }
  function fmtTime(v){ try{ const d = v && typeof v.toDate === 'function' ? v.toDate() : new Date(v); if(!isNaN(d)) return d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}); }catch(_){} return ''; }
  function toMs(v){ if(!v) return 0; if(typeof v === 'number') return v; if(v && typeof v.toDate === 'function') return v.toDate().getTime(); const t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0; }
  function sizeText(bytes){ const n = Number(bytes||0); if(n >= 1024*1024*1024) return (n/1024/1024/1024).toFixed(2)+' GB'; if(n >= 1024*1024) return (n/1024/1024).toFixed(1)+' MB'; if(n >= 1024) return Math.round(n/1024)+' KB'; return n ? n+' B' : '—'; }
  function extOf(name,type){ const n = lower(name); if(type && type.includes('pdf')) return 'PDF'; if(type && type.includes('word')) return 'DOCX'; if(type && type.includes('image')) return (n.split('.').pop() || 'IMG').toUpperCase(); const e = (n.split('.').pop() || '').toUpperCase(); return e || 'FIC'; }
  function typeClass(tipo){ const t=lower(tipo); if(t.includes('pdf')) return 'pdf'; if(t.includes('doc')) return 'doc'; if(['jpg','jpeg','png','webp','img'].some(x=>t.includes(x))) return 'img'; return 'doc'; }
  function statusClass(st){ const s=lower(st); if(s.includes('erro')) return 'error'; if(s.includes('process')) return 'processing'; return 'ok'; }
  function normalize(item,id){
    const name = text(item.name || item.nome || item.fileName || item.ficheiro || item.documento || 'Documento sem nome');
    const ext = text(item.ext || item.tipoFicheiro || extOf(name,item.mimeType || item.type));
    const docType = text(item.docType || item.tipo || item.categoria || item.tipoDocumento || (ext === 'PDF' ? 'PDF' : ['JPG','JPEG','PNG','WEBP'].includes(ext) ? 'JPG/PNG' : 'Documento'));
    const status = text(item.status || item.estado || 'Concluído');
    return {
      id: id || item.id || uid(),
      name,
      ext,
      docType,
      size: Number(item.size || item.tamanho || 0),
      status,
      createdAt: item.createdAt || item.data || item.created || Date.now(),
      updatedAt: item.updatedAt || item.updated || item.createdAt || item.data || Date.now(),
      ocrText: text(item.ocrText || item.texto || item.analise || ''),
      confidence: Number(item.confidence ?? item.precisao ?? (status === 'Concluído' ? 92 : status.includes('Erro') ? 20 : 62)),
      source: text(item.source || item.origem || 'local'),
      raw: item
    };
  }
  function currentRows(){
    const q = lower(els.search?.value || ''); const typ = text(els.filterType?.value || ''); const st = text(els.filterStatus?.value || '');
    let rows = state.items.slice();
    if(q) rows = rows.filter(x => lower([x.name,x.ext,x.docType,x.status,x.ocrText].join(' ')).includes(q));
    if(typ) rows = rows.filter(x => lower(x.docType) === lower(typ) || lower(x.ext) === lower(typ));
    if(st) rows = rows.filter(x => lower(x.status) === lower(st));
    rows.sort((a,b)=>toMs(b.createdAt)-toMs(a.createdAt));
    return rows;
  }
  function renderFilters(){
    if(!els.filterType) return;
    const cur = els.filterType.value;
    const types = [...new Set(state.items.map(x => x.docType || x.ext).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt'));
    els.filterType.innerHTML = '<option value="">Todos os tipos</option>' + types.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
    els.filterType.value = cur;
  }
  function renderTable(){
    renderFilters();
    const rows = currentRows(); const total = rows.length; const pages = Math.max(1, Math.ceil(total / state.pageSize)); if(state.page > pages) state.page = pages;
    const start = (state.page-1)*state.pageSize; const pageRows = rows.slice(start, start+state.pageSize);
    if(els.historyBody){
      els.historyBody.innerHTML = pageRows.length ? pageRows.map(x => `
        <tr>
          <td><div class="scanner-doc-cell"><span class="scanner-doc-icon ${typeClass(x.ext)}">${esc(x.ext.slice(0,3))}</span><div class="scanner-doc-main"><strong>${esc(x.name)}</strong><small>${esc(x.ocrText ? x.ocrText.slice(0,78) : 'Sem análise detalhada')}</small></div></div></td>
          <td><span class="scanner-badge ${typeClass(x.ext)}">${esc(x.docType || x.ext)}</span></td>
          <td>${esc(sizeText(x.size))}</td>
          <td><strong>${fmtDate(x.createdAt)}</strong><br><small>${fmtTime(x.createdAt)}</small></td>
          <td><span class="scanner-badge ${statusClass(x.status)}">${esc(x.status)}</span></td>
          <td><div class="scanner-actions"><button class="ck-icon-btn" title="Ver análise" data-view="${esc(x.id)}">👁</button><button class="ck-icon-btn" title="Descarregar/gerar PDF" data-pdf="${esc(x.id)}">⇩</button><button class="ck-icon-btn" title="Apagar" data-del="${esc(x.id)}">⋮</button></div></td>
        </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:#9fb6d8;padding:24px;font-weight:900">Sem digitalizações para mostrar.</td></tr>';
    }
    const end = total ? Math.min(total,start+state.pageSize) : 0;
    if(els.pageInfo) els.pageInfo.textContent = `${total ? start+1 : 0}-${end} de ${total} registos`;
    if(els.pagination){
      let html = `<button class="ck-page-btn" ${state.page<=1?'disabled':''} data-page="${state.page-1}">«</button>`;
      const max = Math.min(pages,5); let from = Math.max(1, Math.min(state.page-2, pages-max+1));
      for(let p=from; p<from+max; p++) html += `<button class="ck-page-btn ${p===state.page?'active':''}" data-page="${p}">${p}</button>`;
      html += `<button class="ck-page-btn" ${state.page>=pages?'disabled':''} data-page="${state.page+1}">»</button>`;
      els.pagination.innerHTML = html;
    }
    renderStats();
    renderSide();
  }
  function renderStats(){
    const all = state.items; const now = Date.now(); const month = all.filter(x => now - toMs(x.createdAt) < 31*86400000);
    const ok = month.filter(x => lower(x.status).includes('concl')).length;
    const processing = all.filter(x => lower(x.status).includes('process')).length + (state.processing ? 1 : 0);
    const errors = month.filter(x => lower(x.status).includes('erro')).length;
    const storage = all.reduce((sum,x)=>sum+Number(x.size||0),0);
    const last = all.slice().sort((a,b)=>toMs(b.createdAt)-toMs(a.createdAt))[0];
    setText('scannerKpiTotal', all.length);
    setText('scannerKpiSuccess', ok);
    setText('scannerKpiProcessing', processing);
    setText('scannerKpiErrors', errors);
    setText('scannerKpiStorage', sizeText(storage));
    setText('scannerKpiLast', last ? (fmtDate(last.createdAt) === new Date().toLocaleDateString('pt-PT') ? 'Hoje' : fmtDate(last.createdAt)) : '—');
    setText('scannerKpiLastSub', last ? (fmtTime(last.createdAt) || 'Registada') : 'Sem registos');
  }
  function setText(id,val){ const el=$(id); if(el) el.textContent = val; }
  function renderSide(){
    const all = state.items; const total = Math.max(1,all.length); const errors = all.filter(x=>lower(x.status).includes('erro')).length; const mids = all.filter(x=>!lower(x.status).includes('erro') && Number(x.confidence || 0) < 80).length; const high = Math.max(0,all.length-errors-mids);
    const hp = Math.round(high/total*1000)/10, mp = Math.round(mids/total*1000)/10, ep = Math.round(errors/total*1000)/10;
    setText('scannerAccHigh', `${hp}%`); setText('scannerAccMid', `${mp}%`); setText('scannerAccErr', `${ep}%`);
    const donut=$('scannerAccuracyDonut'); if(donut) donut.style.background = `conic-gradient(#57df72 0 ${hp}%, #ffbc52 ${hp}% ${hp+mp}%, #ff5567 ${hp+mp}% 100%)`;
    const types = {};
    all.forEach(x=>{ const k=x.docType || x.ext || 'Outros'; types[k]=(types[k]||0)+1; });
    const top = Object.entries(types).sort((a,b)=>b[1]-a[1]).slice(0,4);
    if(els.typeBars){
      els.typeBars.innerHTML = top.length ? top.map(([name,count],i)=>{
        const pct = Math.round(count/total*1000)/10;
        const icon = lower(name).includes('pdf')?'▧':lower(name).includes('jpg')||lower(name).includes('png')?'▧':lower(name).includes('doc')?'▤':'▣';
        return `<div class="scanner-type-row"><div class="scanner-type-name"><span class="scanner-type-icon">${icon}</span>${esc(name)}</div><div class="scanner-bar-track"><div class="scanner-bar-fill" style="width:${pct}%"></div></div><div class="scanner-type-count">${count} (${pct}%)</div></div>`;
      }).join('') : '<div class="ck-empty" style="padding:10px 0;color:#9fb6d8;font-weight:800">Sem documentos registados.</div>';
    }
  }
  function loadImage(file){ return new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=URL.createObjectURL(file); }); }
  function fitDimensions(w,h,maxSide){ const scale=Math.min(1,maxSide/Math.max(w,h)); return {w:Math.round(w*scale),h:Math.round(h*scale)}; }
  function ensureCanvas(){ return els.canvas; }
  function luminance(r,g,b){ return 0.299*r + 0.587*g + 0.114*b; }
  function autoCropBounds(imageData){
    const {width,height,data}=imageData; let minX=width,minY=height,maxX=0,maxY=0,found=false; const step=Math.max(2,Math.floor(Math.max(width,height)/700));
    for(let y=0;y<height;y+=step){ for(let x=0;x<width;x+=step){ const i=(y*width+x)*4; const l=luminance(data[i],data[i+1],data[i+2]); const sat=Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2]); if(l>132 && sat<120){ found=true; minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); } } }
    if(!found) return null; const margin=Math.round(Math.min(width,height)*0.015); minX=Math.max(0,minX-margin); minY=Math.max(0,minY-margin); maxX=Math.min(width,maxX+margin); maxY=Math.min(height,maxY+margin); const cropW=maxX-minX,cropH=maxY-minY; if(cropW<width*.35 || cropH<height*.35) return null; return {x:minX,y:minY,w:cropW,h:cropH};
  }
  function enhanceImage(imageData){
    const src=imageData.data; const out=new ImageData(imageData.width,imageData.height); const dst=out.data; const contrast=1.18, brightness=10;
    for(let i=0;i<src.length;i+=4){ let r=((src[i]-128)*contrast)+128+brightness, g=((src[i+1]-128)*contrast)+128+brightness, b=((src[i+2]-128)*contrast)+128+brightness; const l=luminance(r,g,b); if(l>206){r=g=b=255;} else if(l<42){r=g=b=0;} dst[i]=Math.max(0,Math.min(255,r)); dst[i+1]=Math.max(0,Math.min(255,g)); dst[i+2]=Math.max(0,Math.min(255,b)); dst[i+3]=255; }
    return out;
  }
  function drawImageToCanvas(img){
    const canvas=ensureCanvas(); if(!canvas) return; const ctx=canvas.getContext('2d',{willReadFrequently:true}); const dims=fitDimensions(img.naturalWidth||img.width,img.naturalHeight||img.height,1800); canvas.width=dims.w; canvas.height=dims.h; ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height); state.original=ctx.getImageData(0,0,canvas.width,canvas.height); state.processed=state.original; if(els.empty) els.empty.style.display='none'; if(els.fileCard) els.fileCard.hidden=true; canvas.hidden=false; autoEnhance();
  }
  function autoEnhance(){
    if(!state.original) return; const canvas=ensureCanvas(); const ctx=canvas.getContext('2d',{willReadFrequently:true}); let source=state.original;
    if(els.autoCrop?.checked){ const bounds=autoCropBounds(source); if(bounds){ const tmp=document.createElement('canvas'); tmp.width=bounds.w; tmp.height=bounds.h; tmp.getContext('2d').putImageData(source,-bounds.x,-bounds.y); source=tmp.getContext('2d').getImageData(0,0,tmp.width,tmp.height); } }
    const enhanced=enhanceImage(source); canvas.width=enhanced.width; canvas.height=enhanced.height; ctx.putImageData(enhanced,0,0); state.processed=enhanced; setStatus('Documento preparado. Podes gerar PDF ou correr OCR.','ok');
  }
  function rotateCanvas(){ const canvas=ensureCanvas(); if(!canvas || canvas.hidden) return; const tmp=document.createElement('canvas'); tmp.width=canvas.height; tmp.height=canvas.width; const tctx=tmp.getContext('2d'); tctx.translate(tmp.width/2,tmp.height/2); tctx.rotate(Math.PI/2); tctx.drawImage(canvas,-canvas.width/2,-canvas.height/2); canvas.width=tmp.width; canvas.height=tmp.height; canvas.getContext('2d').drawImage(tmp,0,0); state.processed=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height); setStatus('Imagem rodada.','ok'); }
  function resetImage(){ if(!state.original) return; const canvas=ensureCanvas(); canvas.width=state.original.width; canvas.height=state.original.height; canvas.getContext('2d').putImageData(state.original,0,0); state.processed=state.original; setStatus('Imagem original reposta.','info'); }
  async function ensureTesseract(){ if(window.Tesseract) return; await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  async function runOcr(){
    const canvas=ensureCanvas(); if(!canvas || canvas.hidden){ setStatus('Seleciona uma imagem primeiro.','warn'); return; }
    try{ state.processing=true; renderStats(); setStatus('A ler texto com OCR... pode demorar um pouco.','info'); await ensureTesseract(); const result=await Tesseract.recognize(canvas.toDataURL('image/png'),'por+eng',{logger:()=>{}}); state.ocrText=text(result?.data?.text); if(els.ocrBox) els.ocrBox.textContent=state.ocrText || 'Não foi possível detetar texto.'; setStatus(state.ocrText?'OCR concluído.':'OCR concluído, mas não encontrou texto.', state.ocrText?'ok':'warn'); await saveCurrentRecord('Concluído', state.ocrText ? 94 : 65); }catch(e){ setStatus('Erro no OCR: '+(e.message||e),'error'); await saveCurrentRecord('Erro na análise',20); } finally{ state.processing=false; renderStats(); }
  }
  async function createPdf(){
    const canvas=ensureCanvas(); if(!canvas || canvas.hidden){ setStatus('Seleciona uma imagem primeiro.','warn'); return; }
    if(!window.jspdf?.jsPDF){ setStatus('Biblioteca PDF ainda não carregou. Tenta novamente.','warn'); return; }
    const { jsPDF } = window.jspdf; const format=els.format?.value||'a4'; const orientation=canvas.width>canvas.height?'landscape':'portrait'; const pdf=new jsPDF({orientation,unit:'mm',format}); const pageW=pdf.internal.pageSize.getWidth(), pageH=pdf.internal.pageSize.getHeight(), margin=7; let drawW=pageW-margin*2, drawH=canvas.height*drawW/canvas.width; if(drawH>pageH-margin*2){ drawH=pageH-margin*2; drawW=canvas.width*drawH/canvas.height; } const x=(pageW-drawW)/2,y=(pageH-drawH)/2; pdf.setFillColor(255,255,255); pdf.rect(0,0,pageW,pageH,'F'); pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',x,y,drawW,drawH,undefined,'FAST');
    if(state.ocrText && els.includeOcr?.checked){ pdf.addPage(format,'portrait'); pdf.setFontSize(12); pdf.text('Texto detetado por OCR',12,14); pdf.setFontSize(9); pdf.text(pdf.splitTextToSize(state.ocrText,pageW-24),12,24); }
    const fileName=normalizeFileName(els.fileName?.value||todayName())+'.pdf'; pdf.save(fileName); await saveCurrentRecord('Concluído',92,{name:fileName, ext:'PDF', size: Math.round(canvas.toDataURL('image/jpeg',.85).length*0.75)}); setStatus('PDF criado: '+fileName,'ok'); toast('PDF criado com sucesso.');
  }
  async function saveCurrentRecord(status='Concluído', confidence=90, override={}){
    if(!els.saveFirebase?.checked) return;
    const f=state.selectedFile; const meta={ id:uid(), name: override.name || normalizeFileName(els.fileName?.value || f?.name || todayName()), ext: override.ext || extOf(f?.name || override.name || '', f?.type || ''), docType: els.docType?.value || 'Documento', size: override.size || f?.size || 0, status, confidence, ocrText: state.ocrText || '', createdAt: Date.now(), updatedAt: Date.now(), source: 'scanner-ia' };
    const database=db();
    try{ if(database){ const doc=await database.collection(COLLECTION).add(meta); meta.id=doc.id; } else throw new Error('local'); }catch(_){ const list=loadLocal(); list.unshift(meta); saveLocal(list); state.items=[normalize(meta,meta.id),...state.items.filter(x=>x.id!==meta.id)]; renderTable(); }
  }
  async function handleFile(file){
    if(!file) return; if(file.size > 25*1024*1024){ setStatus('O ficheiro é maior que 25MB.','warn'); return; }
    state.selectedFile=file; state.selectedMeta={name:file.name,type:file.type,size:file.size}; state.ocrText=''; if(els.ocrBox) els.ocrBox.textContent='A análise aparece aqui depois do processamento.'; if(els.fileName && !els.fileName.value) els.fileName.value = (file.name || todayName()).replace(/\.[^.]+$/,'');
    const isImage = file.type && file.type.startsWith('image/');
    if(isImage){ try{ state.processing=true; renderStats(); setStatus('A preparar imagem...','info'); const img=await loadImage(file); drawImageToCanvas(img); await saveCurrentRecord('Concluído',90,{name:file.name, ext:extOf(file.name,file.type), size:file.size}); }catch(e){ setStatus('Erro ao abrir imagem: '+(e.message||e),'error'); await saveCurrentRecord('Erro na análise',15,{name:file.name, ext:extOf(file.name,file.type), size:file.size}); } finally{ state.processing=false; renderStats(); } }
    else { if(els.empty) els.empty.style.display='none'; if(els.canvas) els.canvas.hidden=true; if(els.fileCard){ els.fileCard.hidden=false; els.fileCard.innerHTML=`<strong>${esc(file.name)}</strong><small>${esc(extOf(file.name,file.type))} · ${esc(sizeText(file.size))}</small><small>Documento registado. Para análise OCR completa, usa imagem/foto ou exporta para PDF no sistema original.</small>`; } setStatus('Ficheiro registado no histórico.','ok'); await saveCurrentRecord('Concluído',88,{name:file.name, ext:extOf(file.name,file.type), size:file.size}); }
  }
  function viewRecord(id){ const x=state.items.find(i=>i.id===id); if(!x) return; alert(`${x.name}\n\nTipo: ${x.docType}\nEstado: ${x.status}\nData: ${fmtDate(x.createdAt)} ${fmtTime(x.createdAt)}\n\n${x.ocrText || 'Sem texto/análise guardada.'}`); }
  async function deleteRecord(id){ const x=state.items.find(i=>i.id===id); if(!x) return; if(!confirm(`Apagar registo "${x.name}"?`)) return; try{ const database=db(); if(database && !id.startsWith('local_')) await database.collection(COLLECTION).doc(id).delete(); else throw new Error('local'); toast('Registo apagado.'); }catch(_){ const list=loadLocal().filter(i=>(i.id||'')!==id); saveLocal(list); state.items=state.items.filter(i=>i.id!==id); renderTable(); toast('Registo apagado localmente.'); } }
  function exportCsv(){ const rows=currentRows(); const header=['Documento','Tipo','Extensao','Tamanho','Estado','Data','Precisao','Texto']; const csv=[header,...rows.map(x=>[x.name,x.docType,x.ext,sizeText(x.size),x.status,new Date(toMs(x.createdAt)||Date.now()).toISOString(),x.confidence,x.ocrText])].map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n'); const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`scanner-ia-${new Date().toISOString().slice(0,10)}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  function clearCache(){ if(!confirm('Limpar histórico local/cache do Scanner IA? Os dados do Firebase não são apagados.')) return; localStorage.removeItem(LOCAL_KEY); state.items=state.items.filter(x=>!x.id.startsWith('local_')); renderTable(); toast('Cache local limpa.'); }
  function bind(){
    Object.assign(els,{input:$('scannerIaInput'),camera:$('scannerIaCamera'),drop:$('scannerDropZone'),pick:$('scannerPickBtn'),canvas:$('scannerIaCanvas'),empty:$('scannerIaEmpty'),fileCard:$('scannerFileCard'),fileName:$('scannerIaFileName'),docType:$('scannerIaDocType'),format:$('scannerIaFormat'),autoCrop:$('scannerIaAutoCrop'),includeOcr:$('scannerIaIncludeOcr'),saveFirebase:$('scannerIaSaveFirebase'),status:$('scannerIaStatus'),ocrBox:$('scannerIaOcrBox'),confidence:$('scannerConfidenceBadge'),historyBody:$('scannerHistoryBody'),search:$('scannerSearch'),filterType:$('scannerFilterType'),filterStatus:$('scannerFilterStatus'),pageSize:$('scannerPageSize'),pageInfo:$('scannerPageInfo'),pagination:$('scannerPagination'),typeBars:$('scannerTypeBars')});
    [els.input,els.camera].forEach(inp=>inp?.addEventListener('change',e=>handleFile(e.target.files?.[0])));
    els.pick?.addEventListener('click',()=>els.input?.click());
    els.drop?.addEventListener('click',(e)=>{ if(e.target === els.drop || e.target.closest('.scanner-drop-zone')) els.input?.click(); });
    els.drop?.addEventListener('dragover',e=>{e.preventDefault(); els.drop.classList.add('drag');}); els.drop?.addEventListener('dragleave',()=>els.drop.classList.remove('drag')); els.drop?.addEventListener('drop',e=>{e.preventDefault(); els.drop.classList.remove('drag'); handleFile(e.dataTransfer.files?.[0]);});
    $('scannerNewBtn')?.addEventListener('click',()=>els.input?.click()); $('scannerHistoryBtn')?.addEventListener('click',()=>document.querySelector('.scanner-list-panel')?.scrollIntoView({behavior:'smooth'})); $('scannerModelsBtn')?.addEventListener('click',()=>toast('Modelos IA ativos: OCR por imagem + PDF A4.')); $('scannerSettingsBtn')?.addEventListener('click',()=>toast('Configurações rápidas aplicadas no painel principal.')); $('scannerClearCacheBtn')?.addEventListener('click',clearCache); $('scannerExportBtn')?.addEventListener('click',exportCsv); $('scannerReportBtn')?.addEventListener('click',exportCsv); $('scannerClearFilters')?.addEventListener('click',()=>{ if(els.search) els.search.value=''; if(els.filterType) els.filterType.value=''; if(els.filterStatus) els.filterStatus.value=''; state.page=1; renderTable(); });
    els.autoCrop?.addEventListener('change',autoEnhance); [els.search,els.filterType,els.filterStatus].forEach(el=>el?.addEventListener('input',()=>{state.page=1;renderTable();})); els.pageSize?.addEventListener('change',()=>{state.pageSize=Number(els.pageSize.value||10);state.page=1;renderTable();});
    els.pagination?.addEventListener('click',e=>{const b=e.target.closest('[data-page]'); if(!b||b.disabled) return; state.page=Number(b.dataset.page||1); renderTable();});
    document.addEventListener('click',e=>{ const v=e.target.closest('[data-view]'); if(v) viewRecord(v.dataset.view); const d=e.target.closest('[data-del]'); if(d) deleteRecord(d.dataset.del); const p=e.target.closest('[data-pdf]'); if(p) { const x=state.items.find(i=>i.id===p.dataset.pdf); if(x && state.selectedFile && x.name === state.selectedFile.name && !els.canvas?.hidden) createPdf(); else toast('Para descarregar PDF, abre/cria o documento no scanner atual.'); } });
    document.addEventListener('keydown',e=>{ if(e.ctrlKey && e.key.toLowerCase()==='o'){ e.preventDefault(); els.input?.click(); } });
    const quickActions=[['enhance',autoEnhance],['rotate',rotateCanvas],['ocr',runOcr],['pdf',createPdf],['reset',resetImage]];
    quickActions.forEach(([name,fn])=>{ const b=document.querySelector(`[data-scanner-action="${name}"]`); b?.addEventListener('click',fn); });
    if(!els.fileName?.value) els.fileName.value=todayName();
    setStatus('Pronto. Escolhe um ficheiro ou tira uma fotografia.','info');
    startData();
  }
  function startData(){
    const local=loadLocal().map(x=>normalize(x,x.id)); state.items=local; renderTable();
    const database=db();
    if(database){ try{ state.unsub=database.collection(COLLECTION).orderBy('createdAt','desc').limit(250).onSnapshot(snap=>{ const cloud=snap.docs.map(d=>normalize(d.data(),d.id)); const localOnly=loadLocal().filter(x=>String(x.id||'').startsWith('local_')).map(x=>normalize(x,x.id)); const ids=new Set(cloud.map(x=>x.id)); state.items=[...cloud,...localOnly.filter(x=>!ids.has(x.id))]; renderTable(); },err=>{ console.warn('scanner snapshot',err); }); }catch(e){ console.warn(e); } }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();
