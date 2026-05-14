/* =========================
   FIREBASE INIT
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

window.firebaseApp = initializeApp(firebaseConfig);
window.db = getFirestore(window.firebaseApp);
window.auth = getAuth(window.firebaseApp);
