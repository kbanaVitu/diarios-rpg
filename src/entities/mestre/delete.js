window.deleteMestre = async function (docId) {
  if (!docId) throw new Error("ID do mestre é obrigatório");

  await db.collection("mestres").doc(docId).delete();
};
