/* =========================
   FIREBASE GLOBAL INIT
========================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSgw",
  authDomain: "app.firebaseapp.com",
  projectId: "app",
  storageBucket: "app.appspot.com",
  messagingSenderId: "123456",
  appId: "1:123:web"
};

const firebaseApp = initializeApp(firebaseConfig);

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

window.firebaseApp = firebaseApp;
window.db = db;
window.auth = auth;

window.firebaseReady = true;

console.log("Firebase global ready");
