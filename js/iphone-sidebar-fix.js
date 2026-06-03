
/* APP BRAGA - IPHONE SIDEBAR FIX */
(function () {
  function fixSidebarText() {
    document.body.classList.toggle("is-iphone-layout", window.innerWidth <= 768);

    var sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    sidebar.querySelectorAll("a").forEach(function (a) {
      var text = (a.textContent || "").trim();

      if (!text) return;

      if (!a.querySelector(".sidebar-link-text")) {
        a.innerHTML = '<span class="sidebar-link-text">' + text + '</span>';
      }
    });
  }

  function ensureMenuButton() {
    var sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    var btn = document.querySelector(".app-menu-toggle");

    if (!btn) {
      btn = document.createElement("button");
      btn.className = "app-menu-toggle";
      btn.type = "button";
      btn.setAttribute("aria-label", "Abrir menu");
      btn.textContent = "☰";
      document.body.appendChild(btn);
    }

    var overlay = document.querySelector(".app-sidebar-overlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "app-sidebar-overlay";
      document.body.appendChild(overlay);
    }

    function open() {
      sidebar.classList.add("app-open");
      document.body.classList.add("sidebar-open");
      overlay.classList.add("show");
      btn.textContent = "×";
    }

    function close() {
      sidebar.classList.remove("app-open");
      document.body.classList.remove("sidebar-open");
      overlay.classList.remove("show");
      btn.textContent = "☰";
    }

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      sidebar.classList.contains("app-open") ? close() : open();
    };

    overlay.onclick = close;

    sidebar.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", close);
    });
  }

  function init() {
    fixSidebarText();
    ensureMenuButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("resize", fixSidebarText);
})();


/* Etiqueta completa */
.etq-sheet,
.print-label,
.etiqueta-word,
.word-label{
 border:2px solid #000 !important;
 box-sizing:border-box !important;
}

