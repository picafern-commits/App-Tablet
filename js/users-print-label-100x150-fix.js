
/* =========================================================
   APP BRAGA - USERS PRINT LABEL 100x150 FINAL FIX
   Zebra ZD421 - etiqueta única 100mm x 150mm
   ========================================================= */

(function () {
  function esc(value) {
    return String(value ?? "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c;
    });
  }

  function clean(value) {
    return String(value ?? "").trim();
  }

  function buildRows(user) {
    const fields = [
      ["Zona", user.zona],
      ["User PC/EYE", user.user_pc_eye],
      ["Pass Remote", user.pass_remote],
      ["Pass Eye Peak", user.pass_eye_peak],
      ["Op. Pistola", user.op_pistola],
      ["Pass Pistola", user.pass_pistola],
      ["Nome PC", user.nome_pc],
      ["TeamViewer", user.teamviewer],
      ["User MO365", user.user_mo365],
      ["PW MO365", user.pw_mo365],
      ["Email Bragalis", user.email_bragalis],
      ["Pass Bragalis", user.pass_bragalis]
    ];

    const rows = fields
      .filter(function ([_, value]) { return clean(value) !== ""; })
      .map(function ([label, value]) {
        return `
          <div class="label-row">
            <div class="label-key">${esc(label)}</div>
            <div class="label-value">${esc(value)}</div>
          </div>
        `;
      })
      .join("");

    return rows || `
      <div class="label-row">
        <div class="label-key">Sem dados</div>
        <div class="label-value">Este user não tem campos preenchidos.</div>
      </div>
    `;
  }

  window.imprimirUser = function (user) {
    if (!user) {
      if (typeof mostrarMensagem === "function") {
        mostrarMensagem("User não encontrado.", "erro");
      } else {
        alert("User não encontrado.");
      }
      return;
    }

    const nome = clean(user.nome) || "User";
    const rows = buildRows(user);

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Etiqueta User - ${esc(nome)}</title>
<style>
  @page {
    size: 100mm 150mm;
    margin: 0;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html,
  body {
    width: 100mm;
    height: 150mm;
    max-width: 100mm;
    max-height: 150mm;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: #fff !important;
    color: #000 !important;
    font-family: Arial, Helvetica, sans-serif;
  }

  body {
    display: block;
  }

  .sheet {
    width: 100mm;
    height: 150mm;
    max-width: 100mm;
    max-height: 150mm;
    overflow: hidden;
    padding: 5mm;
    background: #fff;
    color: #000;
    page-break-before: avoid;
    page-break-after: avoid;
    page-break-inside: avoid;
    break-before: avoid;
    break-after: avoid;
    break-inside: avoid;
  }

  .label-box {
    width: 90mm;
    height: 140mm;
    max-height: 140mm;
    overflow: hidden;
    border: 0.6mm solid #000;
    border-radius: 2mm;
    padding: 3.5mm;
    background: #fff;
  }

  .label-header {
    border-bottom: 0.45mm solid #000;
    padding-bottom: 2.2mm;
    margin-bottom: 2.5mm;
  }

  .label-small {
    font-size: 9px;
    line-height: 1.1;
    font-weight: 900;
    letter-spacing: .03em;
    color: #000;
    text-transform: uppercase;
  }

  h1 {
    margin: 1.2mm 0 0 0;
    padding: 0;
    font-size: 18px;
    line-height: 1.05;
    font-weight: 900;
    color: #000;
    word-break: break-word;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 1.35mm;
  }

  .label-row {
    border: 0.38mm solid #000;
    border-radius: 1.3mm;
    padding: 1.35mm 1.6mm;
    min-height: 7.2mm;
    background: #fff;
    overflow: hidden;
  }

  .label-key {
    font-size: 8.4px;
    line-height: 1;
    font-weight: 900;
    color: #000;
    text-transform: uppercase;
    margin-bottom: .75mm;
  }

  .label-value {
    font-size: 10.8px;
    line-height: 1.12;
    font-weight: 800;
    color: #000;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .footer {
    position: absolute;
    left: 8.5mm;
    right: 8.5mm;
    bottom: 7mm;
    border-top: 0.35mm solid #000;
    padding-top: 1.2mm;
    font-size: 8px;
    line-height: 1;
    color: #000;
    font-weight: 900;
    text-transform: uppercase;
  }

  @media print {
    html,
    body {
      width: 100mm !important;
      height: 150mm !important;
      overflow: hidden !important;
    }

    .sheet {
      width: 100mm !important;
      height: 150mm !important;
      overflow: hidden !important;
    }

    body > * {
      page-break-after: avoid !important;
      page-break-before: avoid !important;
      page-break-inside: avoid !important;
      break-after: avoid !important;
      break-before: avoid !important;
      break-inside: avoid !important;
    }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="label-box">
      <div class="label-header">
        <div class="label-small">Etiqueta User · App Braga</div>
        <h1>${esc(nome)}</h1>
      </div>

      <div class="rows">
        ${rows}
      </div>

      <div class="footer">Autozitania / Bragalis</div>
    </div>
  </div>
<script>
  window.onload = function () {
    setTimeout(function () {
      window.focus();
      window.print();
    }, 250);
  };
</script>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "100mm";
    iframe.style.height = "150mm";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(function () {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(function () {
          if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1500);
      }
    }, 500);
  };
})();
