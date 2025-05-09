import {
    db, collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
    query, orderBy, serverTimestamp
  } from '../../firebase/firebaseInit.js';
  
  export async function createMestre(nome) {
    if (!nome?.trim()) throw new Error("Nome do mestre é obrigatório");
  
    const docRef = await addDoc(collection(db, "mestres"), {
      nome: nome.trim(),
      criadoEm: serverTimestamp()
    });
  
    return docRef;
  }

  export async function getMestres() {
    const q = query(collection(db, "mestres"), orderBy("criadoEm", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id, 
      ...doc.data() 
    }));
  }
 
  export async function updateMestre(mestreDocId, novoNome) {
    if (!mestreDocId || !novoNome?.trim()) {
      throw new Error("ID do mestre e novo nome são obrigatórios");
    }
  
    await updateDoc(doc(db, "mestres", mestreDocId), {
      nome: novoNome.trim(),
      atualizadoEm: serverTimestamp()
    });
  }
  
  export async function deleteMestre(mestreDocId) {
    if (!mestreDocId) throw new Error("ID do mestre é obrigatório");
    await deleteDoc(doc(db, "mestres", mestreDocId));
  }
