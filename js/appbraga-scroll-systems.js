
// AppBraga v1.58.153 — força scroll nas páginas novas após carregar.
(function(){
  try{
    document.documentElement.style.overflowY='auto';
    document.body.style.overflowY='auto';
    document.body.style.height='auto';
    document.body.style.maxHeight='none';
    document.body.classList.add('appbraga-scroll-ok');
  }catch(_){}
})();


// AppBraga v1.58.153 — desbloqueio extra do scroll no Scanner IA e páginas novas.
(function(){
  function unlockScroll(){
    try{
      var html=document.documentElement;
      var body=document.body;
      [html,body].forEach(function(el){
        if(!el) return;
        el.style.setProperty('position','static','important');
        el.style.setProperty('height','auto','important');
        el.style.setProperty('min-height','100vh','important');
        el.style.setProperty('max-height','none','important');
        el.style.setProperty('overflow-y','auto','important');
        el.style.setProperty('overflow-x','auto','important');
        el.style.setProperty('-webkit-overflow-scrolling','touch','important');
      });
      document.querySelectorAll('.ck-page,.scanner-main,.scanner-left,.scanner-side,.scanner-upload-panel,.scanner-list-panel,.ck-panel,.ck-main').forEach(function(el){
        el.style.setProperty('height','auto','important');
        el.style.setProperty('max-height','none','important');
        el.style.setProperty('overflow','visible','important');
      });
      document.querySelectorAll('.ck-table-wrap,.scanner-table-wrap').forEach(function(el){
        el.style.setProperty('max-height','none','important');
        el.style.setProperty('overflow-x','auto','important');
        el.style.setProperty('overflow-y','visible','important');
      });
      body.classList.add('appbraga-scroll-unlocked');
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', unlockScroll); else unlockScroll();
  window.addEventListener('load', unlockScroll);
  setTimeout(unlockScroll, 250);
  setTimeout(unlockScroll, 1000);
})();


// AppBraga v1.58.153 — desbloqueio final do scroll na página Notificações.
(function(){
  function unlockNotificationsScroll(){
    try{
      if(!document.body || !document.body.classList.contains('notificacoes-futurista-page')) return;
      var html=document.documentElement;
      var body=document.body;
      [html,body].forEach(function(el){
        el.style.setProperty('position','static','important');
        el.style.setProperty('height','auto','important');
        el.style.setProperty('min-height','100vh','important');
        el.style.setProperty('max-height','none','important');
        el.style.setProperty('overflow-y','auto','important');
        el.style.setProperty('overflow-x','auto','important');
        el.style.setProperty('overscroll-behavior-y','auto','important');
        el.style.setProperty('touch-action','pan-y','important');
        el.style.setProperty('-webkit-overflow-scrolling','touch','important');
      });
      document.querySelectorAll('.ck-page,.ck-main,.not-left,.not-side,.ck-panel,.not-compose-panel,.not-list-panel').forEach(function(el){
        el.style.setProperty('position','relative','important');
        el.style.setProperty('height','auto','important');
        el.style.setProperty('min-height','0','important');
        el.style.setProperty('max-height','none','important');
        el.style.setProperty('overflow','visible','important');
      });
      document.querySelectorAll('.ck-table-wrap').forEach(function(el){
        el.style.setProperty('max-height','none','important');
        el.style.setProperty('overflow-x','auto','important');
        el.style.setProperty('overflow-y','visible','important');
      });
      document.body.classList.add('notificacoes-scroll-ok');
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', unlockNotificationsScroll); else unlockNotificationsScroll();
  window.addEventListener('load', unlockNotificationsScroll);
  window.addEventListener('resize', unlockNotificationsScroll);
  setTimeout(unlockNotificationsScroll,250);
  setTimeout(unlockNotificationsScroll,900);
  setTimeout(unlockNotificationsScroll,1800);
})();
