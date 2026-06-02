
/* APP BRAGA - FAST LOAD */
(function(){
  if(window.__appBragaFastLoadReady) return;
  window.__appBragaFastLoadReady = true;

  function afterIdle(fn){
    if("requestIdleCallback" in window) requestIdleCallback(fn, {timeout:900});
    else setTimeout(fn, 300);
  }

  function prefetchPages(){
    try{
      const done = new Set();
      document.querySelectorAll('a[href$=".html"]').forEach(a=>{
        const href = a.getAttribute("href");
        if(!href || done.has(href)) return;
        done.add(href);
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = href;
        link.as = "document";
        document.head.appendChild(link);
      });
    }catch(e){}
  }

  function navigationFeedback(){
    document.addEventListener("click", function(ev){
      const a = ev.target && ev.target.closest ? ev.target.closest('a[href$=".html"]') : null;
      if(!a) return;
      document.documentElement.classList.add("page-is-navigating");
    }, true);
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    navigationFeedback();
    afterIdle(prefetchPages);
  });

  window.appBragaAfterIdle = afterIdle;
})();
