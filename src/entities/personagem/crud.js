import {
    db, collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
    query, orderBy, serverTimestamp, getDoc
  } from '../../firebase/firebaseInit.js';
  
  export async function createPersonagem(mestreDocId, campanhaDocId, { nome, playerName, classe }) {
    if (!mestreDocId || !campanhaDocId || !nome?.trim() || !playerName?.trim() || !classe?.trim()) {
      throw new Error("Todos os parâmetros são obrigatórios");
    }
  
    const docRef = await addDoc(
      collection(db, "mestres", mestreDocId, "campanhas", campanhaDocId, "personagens"),
      {
        nome: nome.trim(),
        playerName: playerName.trim(),
        classe: classe.trim(),
        criadoEm: serverTimestamp()
      }
    );
  
    return docRef;
  }
  

  export async function getPersonagensByCampanha(mestreDocId, campanhaDocId) {
    if (!mestreDocId || !campanhaDocId) {
      throw new Error("IDs do mestre e da campanha são obrigatórios");
    }
  
    const q = query(
      collection(db, "mestres", mestreDocId, "campanhas", campanhaDocId, "personagens"),
      orderBy("criadoEm", "asc")
    );
  
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id, 
      ...doc.data()
    }));
  }
  
  export async function updatePersonagem(mestreDocId, campanhaDocId, personagemDocId, novosDados) {
    if (!mestreDocId || !campanhaDocId || !personagemDocId || !novosDados) {
      throw new Error("Todos os parâmetros são obrigatórios");
    }
  
    const camposAtualizados = {};
    if (novosDados.nome) camposAtualizados.nome = novosDados.nome.trim();
    if (novosDados.playerName) camposAtualizados.playerName = novosDados.playerName.trim();
    if (novosDados.classe) camposAtualizados.classe = novosDados.classe.trim();
  
    camposAtualizados.atualizadoEm = serverTimestamp();
  
    const personagemRef = doc(
      db,
      "mestres", mestreDocId,
      "campanhas", campanhaDocId,
      "personagens", personagemDocId
    );
  
    await updateDoc(personagemRef, camposAtualizados);
  }

  export async function deletePersonagem(mestreDocId, campanhaDocId, personagemDocId) {
    if (!mestreDocId || !campanhaDocId || !personagemDocId) {
      throw new Error("IDs do mestre, campanha e personagem são obrigatórios");
    }
  
    const personagemRef = doc(
      db,
      "mestres", mestreDocId,
      "campanhas", campanhaDocId,
      "personagens", personagemDocId
    );
  
    await deleteDoc(personagemRef);
  }

export async function getPersonagemById(mestreDocId, campanhaDocId, personagemDocId) {
  if (!mestreDocId || !campanhaDocId || !personagemDocId) {
    throw new Error("IDs do mestre, campanha e personagem são obrigatórios");
  }

  const personagemRef = doc(
    db,
    "mestres", mestreDocId,
    "campanhas", campanhaDocId,
    "personagens", personagemDocId
  );

  const snapshot = await getDoc(personagemRef);
  
  if (!snapshot.exists()) {
    throw new Error("Personagem não encontrado");
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}
