import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyClCMg_cN9uftjqCLfKnvpFiKAANxjxTZY",
  authDomain: "rpg-diaries.firebaseapp.com",
  projectId: "rpg-diaries",
  storageBucket: "rpg-diaries.firebasestorage.app",
  messagingSenderId: "328444038132",
  appId: "1:328444038132:web:0bb0106508dffb6fb587a1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
