// Coloquei condição pq qnd tava testando apareceu q tava inicializando mais de uma vez, não descobri o motivo
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "AIzaSyClCMg_cN9uftjqCLfKnvpFiKAANxjxTZY",
    authDomain: "rpg-diaries.firebaseapp.com",
    projectId: "rpg-diaries",
    storageBucket: "rpg-diaries.firebasestorage.app",
    messagingSenderId: "328444038132",
    appId: "1:328444038132:web:0bb0106508dffb6fb587a1"
  };

  // Inicializa o Firebase
  firebase.initializeApp(firebaseConfig);


  // Torna o Firestore acessível globalmente
  const db = firebase.firestore();
  window.db = db;
}
