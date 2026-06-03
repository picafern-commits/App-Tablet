
// ===== REAL FIREBASE USER UPDATE FIX =====

(function(){

  function attachEditTracking(){

    document.querySelectorAll("[data-user-id]").forEach((btn)=>{

      btn.onclick = function(){

        window.currentEditingUserId =
          this.dataset.userId;

      };

    } );

  }

  const observer = new MutationObserver(()=>{
    attachEditTracking( );
  } );

  observer.observe(document.body,{
    childList:true,
    subtree:true
  } );

})( );


/* Etiqueta completa */
.etq-sheet,
.print-label,
.etiqueta-word,
.word-label{
 border:2px solid #000 !important;
 box-sizing:border-box !important;
}

