
window.appReady = false;

function bootCheck(){

  if(window.firebaseReady && window.db){

    window.appReady = true;

    document.dispatchEvent(
      new Event("app-ready")
    );

    console.log("APP READY");
    return;
  }

  setTimeout(bootCheck, 100);

}

bootCheck();
