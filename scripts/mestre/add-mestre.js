document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("mestre-form");
  const mensagem = document.getElementById("mensagem");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = form.nome.value;

    try {
      const mestreCriado = await window.createMestre(nome);
      mensagem.textContent = `Mestre "${mestreCriado.nome}" criado com sucesso!`;
      form.reset();
    } catch (error) {
      console.error(error);
      mensagem.textContent = "Erro ao criar mestre. Verifique o console.";
    }
  });
});
