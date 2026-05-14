
window.filtrarPistolasComFiltros = function(){

  const texto =
    normalizarTexto(
      el("searchPistolas")?.value
    );

  const filtradas =
    (window.pistolasData || []).filter(p => {

      return [
        p.nome,
        p.num,
        p.operador,
        p.armazem
      ].some(v =>
        normalizarTexto(v)
          .includes(texto)
      );

    });

  renderPistolas(filtradas);

}
