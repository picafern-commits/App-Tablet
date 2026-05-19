
/* FIREBASE GLOBAL INIT */

import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getAuth }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSgw4rhBLW5mq4QClulubf6e0hf5lDJbo",
  authDomain: "toner-manager-756c4.firebaseapp.com",
  databaseURL: "https://toner-manager-756c4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "toner-manager-756c4",
  storageBucket: "toner-manager-756c4.firebasestorage.app",
  messagingSenderId: "1004492465437",
  appId: "1:1004492465437:web:6a745933c51fc17b04adf4"
};

const firebaseApp = initializeApp(firebaseConfig);

window.firebaseApp = firebaseApp;
window.db = getFirestore(firebaseApp);
window.auth = getAuth(firebaseApp);
window.firebaseReady = true;

console.log("Firebase ready");
