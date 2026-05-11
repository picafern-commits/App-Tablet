
/* KYOCERA FINAL TONER FIX */

async function atualizarTonerViaHTML(impressora){

  try{

    if(!window.electronAPI) return;

    const r = await window.electronAPI
      .getPrinterTonerHTML(impressora.ip);

    if(r && r.success){

      impressora.toner = Number(r.toner);

      if(window.renderImpressoras){
        window.renderImpressoras();
      }

      try{
        localStorage.setItem(
          'impressoras',
          JSON.stringify(window.impressoras || [])
        );
      }catch(e){}

      console.log(
        'TONER REAL:',
        impressora.ip,
        impressora.toner + '%'
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
