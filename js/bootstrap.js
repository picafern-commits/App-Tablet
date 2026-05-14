
/* APP BOOTSTRAP */

window.appReady = false;

(function(){

  let tries = 0;

  function start(){

    tries++;

    if(
      window.firebaseReady === true &&
      window.db
    ){

      window.appReady = true;

      console.log("APP READY");

      document.dispatchEvent(
        new Event("app-ready")
      );

      return;
    }

    if(tries < 200){
      setTimeout(start, 150);
    }else{
      console.error("Firebase bootstrap timeout");
    }

  }

  start();

})();
