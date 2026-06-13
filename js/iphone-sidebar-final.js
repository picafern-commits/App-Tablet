/* APP BRAGA - mobile sidebar v3 */
(function () {
  "use strict";

  var ICONS = {
    dashboard: '<path d="M3 13h8V3H3v10Z"/><path d="M13 21h8V11h-8v10Z"/><path d="M13 9h8V3h-8v6Z"/><path d="M3 21h8v-6H3v6Z"/>',
    tasks: '<path d="M9 11l2 2 4-5"/><path d="M20 6 9 17l-5-5"/><path d="M4 4h16v16H4z"/>',
    toner: '<path d="M7 7h10l2 4v8H5v-8l2-4Z"/><path d="M8 7V4h8v3"/><path d="M8 14h8"/><path d="M9 17h6"/>',
    stock: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v6l4 2"/>',
    scanner: '<path d="M4 7V5a1 1 0 0 1 1-1h3"/><path d="M16 4h3a1 1 0 0 1 1 1v2"/><path d="M20 17v2a1 1 0 0 1-1 1h-3"/><path d="M8 20H5a1 1 0 0 1-1-1v-2"/><path d="M7 12h10"/><path d="M9 9h6"/><path d="M9 15h6"/>',
    tag: '<path d="M20 12 12 20l-8-8V4h8l8 8Z"/><path d="M7.5 7.5h.01"/>',
    printer: '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>',
    maintenance: '<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.3 2.3-2.8-2.8 2.1-2.5Z"/>',
    computer: '<path d="M4 5h16v11H4z"/><path d="M8 21h8"/><path d="M12 16v5"/>',
    handheld: '<path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M10 17h4"/>',
    radio: '<path d="M7 10h10v10H7z"/><path d="M9 10V6l6-3"/><path d="M10 14h4"/><path d="M10 17h2"/><path d="M16 17h.01"/>',
    network: '<path d="M12 3v6"/><path d="M6 15H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/><path d="M6 21h12"/><path d="M6 15v6"/><path d="M18 15v6"/><path d="M12 15v6"/>',
    directory: '<path d="M4 4h16v16H4z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
    info: '<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/><path d="M12 10v7"/><path d="M12 7h.01"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    diagnostic: '<path d="M4 13h4l2-7 4 14 2-7h4"/><path d="M3 3h18v18H3z"/>',
    settings: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"/>'
  };

  var NAV_GROUPS = [
    {
      title: "Operacao",
      items: [
        ["index.html", "Hoje", "dashboard"],
        ["tarefas.html", "Tarefas", "tasks"],
        ["add-toner.html", "Adicionar Toner", "toner"],
        ["stock.html", "Stock", "stock"],
        ["historico.html", "Historico", "history"],
        ["scanner-ia.html", "Scanner IA", "scanner"],
        ["etiquetas-word.html", "Etiquetas Word", "tag"]
      ]
    },
    {
      title: "Equipamentos",
      items: [
        ["impressoras.html", "Impressoras", "printer"],
        ["manutencao-impressoras.html", "Manutencao", "maintenance"],
        ["computadores.html", "Computadores", "computer"],
        ["pistolas.html", "Pistolas CK65", "handheld"],
        ["radios.html", "Radios", "radio"]
      ]
    },
    {
      title: "Infraestrutura",
      items: [
        ["portas.html", "Portas Rede", "network"],
        ["diretorio.html", "Diretorio", "directory"],
        ["informacoes.html", "Informacoes", "info"]
      ]
    },
    {
      title: "Sistema",
      items: [
        ["users.html", "Users", "users"],
        ["diagnostico.html", "Diagnostico", "diagnostic"],
        ["config.html", "Configuracoes", "settings"]
      ]
    }
  ];

  function iconSvg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.info) + '</svg>';
  }

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
  }

  function pageName() {
    return (location.pathname || "").split("/").pop() || "index.html";
  }

  function ensureButton() {
    var button = document.querySelector(".app-menu-toggle");
    if (!button) {
      button = document.createElement("button");
      button.className = "app-menu-toggle";
      button.type = "button";
      document.body.appendChild(button);
    }
    button.classList.add("app-mobile-sidebar-button");
    button.textContent = document.body.classList.contains("sidebar-open") ? "x" : "Menu";
    button.setAttribute("aria-label", "Abrir menu");
    button.setAttribute("aria-expanded", document.body.classList.contains("sidebar-open") ? "true" : "false");
    return button;
  }

  function ensureOverlay() {
    var overlay = document.querySelector(".app-sidebar-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "app-sidebar-overlay";
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function ensureDrawer() {
    var drawer = document.querySelector(".app-mobile-sidebar-new");
    var current = pageName();
    if (!drawer) {
      drawer = document.createElement("nav");
      drawer.className = "app-mobile-sidebar-new";
      drawer.setAttribute("aria-label", "Menu principal");
      document.body.appendChild(drawer);
    }
    drawer.innerHTML = [
      '<div class="app-mobile-sidebar-head">',
      '<div class="app-mobile-sidebar-logo">AB</div>',
      '<div><strong>App Braga</strong><span>Centro operacional</span></div>',
      '</div>',
      NAV_GROUPS.map(function (group) {
        return '<section class="app-mobile-sidebar-group">' +
          '<p>' + group.title + '</p>' +
          group.items.map(function (item) {
            var active = item[0] === current ? " active" : "";
            return '<a class="' + active + '" href="' + item[0] + '">' +
              '<span class="app-mobile-sidebar-icon">' + iconSvg(item[2]) + '</span>' +
              '<span>' + item[1] + '</span>' +
              '</a>';
          }).join("") +
          '</section>';
      }).join("")
    ].join("");
    return drawer;
  }

  function setClosed() {
    var drawer = ensureDrawer();
    var overlay = ensureOverlay();
    var button = ensureButton();
    drawer.classList.remove("open");
    overlay.classList.remove("show");
    document.body.classList.remove("sidebar-open");
    button.textContent = "Menu";
    button.setAttribute("aria-expanded", "false");
  }

  function setOpen() {
    var drawer = ensureDrawer();
    var overlay = ensureOverlay();
    var button = ensureButton();
    drawer.classList.add("open");
    overlay.classList.add("show");
    document.body.classList.add("sidebar-open");
    button.textContent = "x";
    button.setAttribute("aria-expanded", "true");
  }

  function toggle() {
    document.body.classList.contains("sidebar-open") ? setClosed() : setOpen();
  }

  function bindOnce() {
    if (document.documentElement.dataset.mobileSidebarV2 === "1") return;
    document.documentElement.dataset.mobileSidebarV2 = "1";

    var startX = 0;
    var startY = 0;
    var tracking = false;

    document.addEventListener("click", function (event) {
      var button = event.target.closest && event.target.closest(".app-menu-toggle");
      if (!button || !isMobile()) return;
      event.preventDefault();
      event.stopPropagation();
      toggle();
    }, true);

    document.addEventListener("click", function (event) {
      if (!isMobile()) return;
      if (event.target.closest && event.target.closest(".app-sidebar-overlay")) {
        event.preventDefault();
        setClosed();
      }
      if (event.target.closest && event.target.closest(".app-mobile-sidebar-new a[href]")) {
        setClosed();
      }
    }, true);

    document.addEventListener("touchstart", function (event) {
      if (!isMobile() || !event.touches || !event.touches.length) return;
      if (event.target.closest && event.target.closest("input, textarea, select, button, a")) return;
      var touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = (startX >= 34 && startX <= 118) || document.body.classList.contains("sidebar-open");
    }, { passive: true });

    document.addEventListener("touchmove", function (event) {
      if (!tracking || !isMobile() || !event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      var dx = touch.clientX - startX;
      var dy = Math.abs(touch.clientY - startY);
      if (Math.abs(dx) > 18 && dy < 34) event.preventDefault();
    }, { passive: false });

    document.addEventListener("touchend", function (event) {
      if (!tracking || !isMobile() || !event.changedTouches || !event.changedTouches.length) return;
      var touch = event.changedTouches[0];
      var dx = touch.clientX - startX;
      var dy = Math.abs(touch.clientY - startY);
      tracking = false;
      if (dy > 72 || Math.abs(dx) < 56) return;
      if (dx > 0 && startX >= 34 && startX <= 118) setOpen();
      if (dx < 0 && document.body.classList.contains("sidebar-open")) setClosed();
    }, { passive: true });
  }

  function init() {
    bindOnce();
    ensureButton();
    ensureOverlay();
    ensureDrawer();
    if (isMobile()) setClosed();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("pageshow", function () { setTimeout(init, 40); });
  window.addEventListener("resize", function () {
    setTimeout(function () {
      if (isMobile()) setClosed();
    }, 80);
  });

  window.AppBragaSidebar = {
    open: setOpen,
    close: setClosed,
    toggle: toggle
  };
})();
