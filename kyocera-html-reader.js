
/* KYOCERA HTML TONER AUTO REFRESH */

async function atualizarTonerViaHTML(impressora){

  try{

    if(!window.electronAPI) return;

    const r = await window.electronAPI
      .getPrinterTonerHTML(impressora.ip);

    if(r && r.success){

      impressora.toner = r.toner;

      console.log(
        'Toner atualizado:',
        impressora.ip,
        r.toner + '%'
      );

    }

  }catch(e){
    console.error(e);
  }

}

async function atualizarTodasImpressoras(){

  try{

    if(!Array.isArray(window.impressoras)) return;

    for(const impressora of window.impressoras){

      if(!impressora.ip) continue;

      await atualizarTonerViaHTML(impressora);

    }

  }catch(e){
    console.error(e);
  }

}

window.addEventListener('load', ()=>{

  setTimeout(()=>{

    atualizarTodasImpressoras();

    setInterval(()=>{
      atualizarTodasImpressoras();
    },10000);

  },4000);

});
