/* =========================
   APP BOOTSTRAP
========================= */

window.appReady = false;

function waitFirebase(){

  if(
    window.firebaseReady &&
    window.db &&
    window.auth
  ){

    window.appReady = true;

    document.dispatchEvent(
      new Event("app-ready")
    );

    console.log("APP READY");

    return;

  }

  setTimeout(waitFirebase, 200);

}

waitFirebase();
