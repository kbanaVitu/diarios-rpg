// Coloquei condição pq qnd tava testando apareceu q tava inicializando mais de uma vez, não descobri o motivo
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  };

  // Inicializa o Firebase
  firebase.initializeApp(firebaseConfig);


  // Torna o Firestore acessível globalmente
  const db = firebase.firestore();
  window.db = db;
}
