(function(){
  document.querySelectorAll(".portal-area-card").forEach(function(card){
    card.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); window.location.href = card.getAttribute("href"); }
    });
  });
})();
