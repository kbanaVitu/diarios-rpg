window.createMestre = async function (nome) {
  if (!nome) throw new Error("Nome do mestre é obrigatório");

  const mestresRef = db.collection("mestres");

  // Busca o maior MestreId atual
  const snapshot = await mestresRef.orderBy("MestreId", "desc").limit(1).get();
  const ultimoId = snapshot.empty ? 0 : snapshot.docs[0].data().MestreId;

  // Logica oara ordem crescente de MestreId
  const novoId = ultimoId + 1;
  const novoMestre = {
    MestreId: novoId,
    nome: nome.trim()
  };

  await mestresRef.doc().set(novoMestre);
  return novoMestre;
};
