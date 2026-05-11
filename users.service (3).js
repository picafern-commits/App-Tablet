
// Firebase Config Compatível GitHub Pages + Electron

window.firebaseConfigBraga = {
  apiKey: "AIzaSyCSgw4rhBLW5mq4QClulubf6e0hf5lDJbo",
  authDomain: "toner-manager-756c4.firebaseapp.com",
  projectId: "toner-manager-756c4"
};

if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfigBraga);
}

window.db = firebase.firestore();

console.log("Firebase ligada com sucesso");
