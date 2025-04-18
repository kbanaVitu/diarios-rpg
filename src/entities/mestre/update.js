window.updateMestre = async function (docId, novoNome) {
  if (!docId || !novoNome) throw new Error("ID e novo nome são obrigatórios");

  await db.collection("mestres").doc(docId).update({
    nome: novoNome.trim()
  });
};
