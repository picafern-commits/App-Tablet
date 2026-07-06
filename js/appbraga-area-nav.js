/* AppBraga v1.58.163 — abre/fecha menus estáticos de navegação por área */
(function(){
  'use strict';
  function closeAll(except){
    document.querySelectorAll('.ab-hero-area-actions.open').forEach(function(nav){
      if(except && nav === except) return;
      nav.classList.remove('open');
      var b = nav.querySelector('.ab-hero-area-toggle');
      if(b){ b.classList.remove('active'); b.setAttribute('aria-expanded','false'); }
    });
  }
  function wire(){
    document.querySelectorAll('.ab-hero-area-actions').forEach(function(nav){
      if(nav.dataset.wired === '1') return;
      nav.dataset.wired = '1';
      var btn = nav.querySelector('.ab-hero-area-toggle');
      if(btn){
        btn.addEventListener('click', function(ev){
          ev.preventDefault(); ev.stopPropagation();
          var willOpen = !nav.classList.contains('open');
          closeAll(nav);
          nav.classList.toggle('open', willOpen);
          btn.classList.toggle('active', willOpen);
          btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        });
      }
      nav.addEventListener('click', function(ev){ ev.stopPropagation(); });
    });
  }
  document.addEventListener('click', function(){ closeAll(); });
  document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape') closeAll(); });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  try{ new MutationObserver(wire).observe(document.documentElement, {childList:true, subtree:true}); }catch(e){}
})();
