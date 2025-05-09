import {
    db, collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
    query, where, orderBy, serverTimestamp
  } from '../../firebase/firebaseInit.js';
  
  
  export async function createDiario(mestreId, campanhaId, personagemId, { ano, conteudo }) {
    // Verificação opcional (só para debug)
    console.log(`Criando diário para: mestre=${mestreId}, campanha=${campanhaId}, personagem=${personagemId}`);
    
    const docRef = await addDoc(
      collection(db, 
        "mestres", mestreId,
        "campanhas", campanhaId,
        "personagens", personagemId,
        "diarios"
      ),
      {
        ano: ano?.trim() || null,
        conteudo: conteudo.trim(),
        criadoEm: serverTimestamp()
      }
    );
    
    return docRef;
  }
  

  export async function getDiariosByPersonagem(mestreId, campanhaId, personagemId) {
    const querySnapshot = await getDocs(
      collection(db, 
        "mestres", mestreId,
        "campanhas", campanhaId,
        "personagens", personagemId,
        "diarios"
      )
    );
  
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
  

  export async function updateDiario(mestreDocId, campanhaDocId, personagemDocId, diarioDocId, { ano, conteudo }) {
    if (!mestreDocId || !campanhaDocId || !personagemDocId || !diarioDocId || !ano || !conteudo?.trim()) {
      throw new Error("Todos os parâmetros são obrigatórios");
    }
  
    const q = query(
      collection(db, "mestres", mestreDocId, "campanhas", campanhaDocId, "personagens", personagemDocId, "diarios"),
      where("ano", "==", Number(ano)),
      where("__name__", "!=", diarioDocId)
    );
  
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error(`Já existe um diário para o ano ${ano} deste personagem.`);
    }
  
    const diarioRef = doc(
      db, "mestres", mestreDocId,
      "campanhas", campanhaDocId,
      "personagens", personagemDocId,
      "diarios", diarioDocId
    );
  
    await updateDoc(diarioRef, {
      ano: Number(ano),
      conteudo: conteudo.trim(),
      atualizadoEm: serverTimestamp()
    });
  }
  
  export async function deleteDiario(mestreDocId, campanhaDocId, personagemDocId, diarioDocId) {
    if (!mestreDocId || !campanhaDocId || !personagemDocId || !diarioDocId) {
      throw new Error("Todos os IDs são obrigatórios");
    }
  
    const diarioRef = doc(
      db, "mestres", mestreDocId,
      "campanhas", campanhaDocId,
      "personagens", personagemDocId,
      "diarios", diarioDocId
    );
  
    await deleteDoc(diarioRef);
  }
