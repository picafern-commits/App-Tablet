function esperarFirebase(callback) {
    const check = setInterval(() => {
        if (window.db) {
            clearInterval(check);
            callback(window.db);
        }
    }, 100);
}

esperarFirebase((db) => {
    console.log("Firebase ligado");

    // COLOCA AQUI O onSnapshot / listeners
});
