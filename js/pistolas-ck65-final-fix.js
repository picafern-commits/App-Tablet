
/* =========================================================
   APP BRAGA - PISTOLAS CK65 FINAL FIX
   Corrige Editar / Ver Mais / Apagar com Firebase v8
   ========================================================= */

(function () {
  function pistolasSafe(value) {
    return String(value ?? "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c;
    });
  }

  function getListaPistolasFinal() {
    if (Array.isArray(window.pistolasData)) return window.pistolasData;
    if (Array.isArray(window.pistolas)) return window.pistolas;
    if (Array.isArray(window.listaPistolas)) return window.listaPistolas;
    return [];
  }

  function getPistolaIdFinal(pistola, index) {
    return pistola?.idDoc ||
      pistola?.firebaseId ||
      pistola?.id ||
      pistola?.docId ||
      pistola?._ref ||
      `local-pistola-${index}`;
  }

  function normalizarId(value) {
    return String(value ?? "").trim();
  }

  function encontrarPistolaFinal(ref) {
    if (ref && typeof ref === "object") return ref;

    const id = normalizarId(ref);
    const lista = getListaPistolasFinal();

    return lista.find(function (p, index) {
      const ids = [
        p.idDoc,
        p.firebaseId,
        p.id,
        p.docId,
        p._ref,
        `local-pistola-${index}`,
        String(index)
      ].filter(Boolean).map(normalizarId);

      return ids.includes(id);
    });
  }

  function preencherFormPistola(pistola) {
    const campos = {
      editP_num: pistola.num,
      editP_nome: pistola.nome,
      editP_password: pistola.password,
      editP_cn: pistola.cn,
      editP_sn: pistola.sn,
      editP_mac: pistola.mac,
      editP_operador: pistola.operador,
      editP_armazem: pistola.armazem,
      editP_prontas: pistola.prontas
    };

    Object.entries(campos).forEach(function ([id, value]) {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    });
  }

  function lerFormPistola() {
    function val(id) {
      return document.getElementById(id)?.value?.trim() || "";
    }

    return {
      num: val("editP_num"),
      nome: val("editP_nome"),
      password: val("editP_password"),
      cn: val("editP_cn"),
      sn: val("editP_sn"),
      mac: val("editP_mac"),
      operador: val("editP_operador"),
      armazem: val("editP_armazem"),
      prontas: val("editP_prontas"),
      updatedAt: Date.now()
    };
  }

  function abrirModalPistolaFinal(titulo) {
    const h3 = document.querySelector("#modalEditarPistola h3");
    if (h3) h3.textContent = titulo || "Editar Pistola CK65";

    const modal = document.getElementById("modalEditarPistola");
    if (modal) {
      modal.style.display = "flex";
      modal.classList.add("open");
    }
  }

  window.abrirAdicionarPistola = function () {
    window.pistolaEditRef = "__new__";
    window.pistolaAtual = null;
    preencherFormPistola({});
    abrirModalPistolaFinal("Adicionar Pistola CK65");
  };

  window.editarPistola = function (ref) {
    const pistola = encontrarPistolaFinal(ref);

    if (!pistola) {
      console.error("Pistola não encontrada para editar:", ref, getListaPistolasFinal());
      if (typeof mostrarMensagem === "function") {
        mostrarMensagem("Pistola não encontrada.", "erro");
      } else {
        alert("Pistola não encontrada.");
      }
      return;
    }

    window.pistolaAtual = pistola;
    window.pistolaEditRef = getPistolaIdFinal(pistola, getListaPistolasFinal().indexOf(pistola));
    window.pistolaEditId = window.pistolaEditRef;
    window.currentEditingPistolaId = window.pistolaEditRef;

    preencherFormPistola(pistola);
    abrirModalPistolaFinal("Editar Pistola CK65");
  };

  window.verMaisPistola = function (ref) {
    const pistola = encontrarPistolaFinal(ref);

    if (!pistola) {
      console.error("Pistola não encontrada para ver mais:", ref, getListaPistolasFinal());
      alert("Pistola não encontrada.");
      return;
    }

    alert(
`Pistola CK65

Nº: ${pistola.num || "-"}
Nome: ${pistola.nome || "-"}
Password: ${pistola.password || "-"}
CN: ${pistola.cn || "-"}
SN: ${pistola.sn || "-"}
MAC: ${pistola.mac || "-"}
Operador: ${pistola.operador || "-"}
Armazém: ${pistola.armazem || "-"}
Prontas: ${pistola.prontas || "-"}`
    );
  };

  window.fecharEditarPistola = function () {
    const modal = document.getElementById("modalEditarPistola");
    if (modal) {
      modal.style.display = "none";
      modal.classList.remove("open");
    }

    window.pistolaAtual = null;
    window.pistolaEditRef = null;
    window.pistolaEditId = null;
    window.currentEditingPistolaId = null;
  };

  window.guardarEdicaoPistola = async function () {
    const payload = lerFormPistola();

    if (!payload.nome && !payload.num) {
      if (typeof mostrarMensagem === "function") {
        mostrarMensagem("Preenche pelo menos o número ou o nome da pistola.", "erro");
      } else {
        alert("Preenche pelo menos o número ou o nome da pistola.");
      }
      return;
    }

    try {
      const ref = window.pistolaEditRef;

      if (ref === "__new__") {
        const data = { ...payload, createdAt: Date.now() };

        if (window.db?.collection) {
          const docRef = await window.db.collection("pistolas").add(data);
          window.pistolasData = getListaPistolasFinal();
          window.pistolasData.unshift({ idDoc: docRef.id, firebaseId: docRef.id, ...data });
        }
      } else {
        if (window.db?.collection && ref && !String(ref).startsWith("local-pistola-")) {
          await window.db.collection("pistolas").doc(String(ref)).set(payload, { merge: true });
        }

        const lista = getListaPistolasFinal();
        const idx = lista.findIndex(function (item, index) {
          return normalizarId(getPistolaIdFinal(item, index)) === normalizarId(ref);
        });

        if (idx >= 0) lista[idx] = { ...lista[idx], ...payload };
      }

      window.fecharEditarPistola();
      if (typeof window.renderPistolas === "function") window.renderPistolas(getListaPistolasFinal());

      if (typeof mostrarMensagem === "function") {
        mostrarMensagem("Pistola guardada.");
      }
    } catch (error) {
      console.error("Erro ao guardar pistola:", error);
      if (typeof mostrarMensagem === "function") {
        mostrarMensagem("Erro ao guardar pistola.", "erro");
      } else {
        alert("Erro ao guardar pistola.");
      }
    }
  };

  window.apagarPistola = async function (ref) {
    const pistola = encontrarPistolaFinal(ref);
    const id = pistola ? getPistolaIdFinal(pistola, getListaPistolasFinal().indexOf(pistola)) : ref;

    if (!confirm("Apagar esta pistola?")) return;

    try {
      if (window.db?.collection && id && !String(id).startsWith("local-pistola-")) {
        await window.db.collection("pistolas").doc(String(id)).delete();
      }

      window.pistolasData = getListaPistolasFinal().filter(function (item, index) {
        return normalizarId(getPistolaIdFinal(item, index)) !== normalizarId(id);
      });

      if (typeof window.renderPistolas === "function") window.renderPistolas(window.pistolasData);
    } catch (error) {
      console.error("Erro ao apagar pistola:", error);
      alert("Erro ao apagar pistola.");
    }
  };

  window.renderPistolas = function (lista) {
    const container = document.getElementById("listaPistolas");
    if (!container) return;

    let items = Array.isArray(lista) ? lista.slice() : getListaPistolasFinal().slice();

    items.sort(function (a, b) {
      return String(a.nome || a.num || "").localeCompare(
        String(b.nome || b.num || ""),
        "pt",
        { numeric: true, sensitivity: "base" }
      );
    });

    const totalEl = document.getElementById("countPistolas");
    const bragaEl = document.getElementById("countPistolasBraga");
    const reservaEl = document.getElementById("countPistolasReserva");

    if (totalEl) totalEl.textContent = String(items.length);
    if (bragaEl) bragaEl.textContent = String(items.filter(p => String(p.armazem || "").toLowerCase().includes("braga")).length);
    if (reservaEl) reservaEl.textContent = String(items.filter(p => String(p.armazem || "").toLowerCase().includes("vila") || String(p.operador || "").toLowerCase().includes("reserva")).length);

    if (!items.length) {
      container.innerHTML = '<div class="reference-empty">Sem pistolas registadas.</div>';
      return;
    }

    container.innerHTML = items.map(function (pistola, index) {
      const id = getPistolaIdFinal(pistola, index);
      const jsId = JSON.stringify(String(id));

      return `
        <div class="pc-card pistol-card">
          <div class="pc-name">${pistolasSafe(pistola.nome || "Pistola CK65")}</div>
          <div class="meta-line">Nº: <span class="meta-value">${pistolasSafe(pistola.num || "-")}</span></div>
          <div class="meta-line">Operador: <span class="meta-value">${pistolasSafe(pistola.operador || "-")}</span></div>
          <div class="meta-line">Armazém: <span class="meta-value">${pistolasSafe(pistola.armazem || "-")}</span></div>
          <div class="meta-line">CN: <span class="meta-value">${pistolasSafe(pistola.cn || "-")}</span></div>
          <div class="meta-line">SN: <span class="meta-value">${pistolasSafe(pistola.sn || "-")}</span></div>

          <div class="item-actions">
            <button class="secondary-btn" type="button" onclick='editarPistola(${jsId})'>Editar</button>
            <button class="secondary-btn" type="button" onclick='verMaisPistola(${jsId})'>Ver Mais</button>
            <button class="secondary-btn btn-delete" type="button" onclick='apagarPistola(${jsId})'>Apagar</button>
          </div>
        </div>
      `;
    }).join("");
  };

  // Re-render depois de todos os scripts antigos carregarem.
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      if (document.getElementById("listaPistolas")) {
        window.renderPistolas(getListaPistolasFinal());
      }
    }, 600);
  });

  window.addEventListener("pageshow", function () {
    setTimeout(function () {
      if (document.getElementById("listaPistolas")) {
        window.renderPistolas(getListaPistolasFinal());
      }
    }, 300);
  });
})();
