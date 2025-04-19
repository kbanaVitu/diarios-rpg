import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import "../firebase/config.js"; // Corrected the path to config.js
import { db } from "../firebase/config.js";

// 0 - Funções para mostrar alertas personalizados.
function createAlert(type, message) {
  const alertElement = document.createElement("div");
  alertElement.className = type === "error" ? "custom-error-alert" : "custom-success-alert";
  alertElement.textContent = message;
  document.body.appendChild(alertElement);

  setTimeout(() => {
    alertElement.style.display = "block";
  }, 0);

  setTimeout(() => {
    alertElement.remove();
  }, 3000);
}

function showErrorAlert(message) {
  createAlert("error", message);
}

function showSuccessAlert(message) {
  const alertElement = document.createElement("div");
  alertElement.className = "custom-success-alert";
  alertElement.textContent = message;
  document.body.appendChild(alertElement);

  setTimeout(() => {
    alertElement.style.display = "block";
  }, 0);

  
}

//1 - Captura o evento de envio do formulário de login.
document.getElementById("login-form").addEventListener("submit", async function (event) {
  event.preventDefault(); 

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
 
  console.log("Username:", username);
  console.log("Password:", password);

  const q = query(
    collection(db, "users"),
    where("username", "==", username),
    where("password", "==", password)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log("Usuario não encontrado ou senha incorreta.");
    showErrorAlert("Player não encontrado ou senha incorreta.");
  } else {
    console.log("Usuario encontrado com sucesso.");
    showSuccessAlert("Player encontrado com sucesso.");
    const playerName = querySnapshot.docs[0].data().player;
    sessionStorage.setItem("playerName", playerName);
    console.log("Jogador logado:", sessionStorage.getItem("playerName"));
    window.location.href = "../../index.html";
  }
});

//Todo: Redirecionar pra tela inicial e tirar necessidade de fazer login de novo.

/*Todo: Funções de validação que serão chamadas para validar permissão de acesso as páginas.
Código será implementado após a finalização de todos os CRUDs.*/