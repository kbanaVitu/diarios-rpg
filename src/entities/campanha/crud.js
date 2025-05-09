import {
    db, collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
    query, orderBy, serverTimestamp
  } from '../../firebase/firebaseInit.js';
  
  export async function createCampanha({ mestreDocId, titulo, sistema }) {
    if (!mestreDocId || !sistema?.trim() || !titulo?.trim()) {
      throw new Error("mestreDocId, sistema e título são obrigatórios");
    }
  
    const docRef = await addDoc(
      collection(db, "mestres", mestreDocId, "campanhas"),
      {
        sistema: sistema.trim(),
        titulo: titulo.trim(),
        criadoEm: serverTimestamp()
      }
    );
  
    return docRef;
  }
  
  export async function getCampanhasByMestre(mestreDocId) {
    if (!mestreDocId) throw new Error("ID do mestre é obrigatório");
  
    const q = query(
      collection(db, "mestres", mestreDocId, "campanhas"),
      orderBy("criadoEm", "desc")
    );
  
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id, 
      ...doc.data() 
    }));
  }
  
  export async function updateCampanha({ mestreDocId, campanhaDocId, titulo, sistema }) {
    if (!mestreDocId || !campanhaDocId || !titulo?.trim() || !sistema?.trim()) {
      throw new Error("Todos os campos são obrigatórios");
    }
  
    const campanhaRef = doc(db, "mestres", mestreDocId, "campanhas", campanhaDocId);
    await updateDoc(campanhaRef, {
      titulo: titulo.trim(),
      sistema: sistema.trim(),
      atualizadoEm: serverTimestamp()
    });
  }
  
  export async function deleteCampanha(mestreDocId, campanhaDocId) {
    if (!mestreDocId || !campanhaDocId) {
      throw new Error("IDs do mestre e da campanha são obrigatórios");
    }
  
    const campanhaRef = doc(db, "mestres", mestreDocId, "campanhas", campanhaDocId);
    await deleteDoc(campanhaRef);
  }
