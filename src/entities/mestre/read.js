window.getMestres = async function () {
  const snapshot = await db.collection("mestres").orderBy("MestreId").get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
